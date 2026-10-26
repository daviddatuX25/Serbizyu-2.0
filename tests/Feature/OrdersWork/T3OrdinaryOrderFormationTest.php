<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\RespondToOrderProposal;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t3PgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T3 order proofs require PostgreSQL.');
    }
}

function t3ExpectOrderError(callable $callback, string $code): OrderError
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected OrderError '.$code);
    } catch (OrderError $error) {
        expect($error->envelope->code)->toBe($code);

        return $error;
    }

    throw new RuntimeException('unreachable');
}

/**
 * @return array{provider: User, buyer: User, listing: array<string, mixed>, correlation_id: string}
 */
function t3ActiveListingFixture(string $listingType = 'service', ?string $workShape = null): array
{
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);

    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin direct booking listing',
        'description' => 'Active approved listing used for T3 order formation.',
        'category_code' => $listingType === 'product' ? 'food' : 'home-help',
        'listing_type' => $listingType,
        'work_shape' => $workShape ?? ($listingType === 'product' ? 'A4' : 'A1'),
    ], $correlationId);

    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);
    DB::table('listing_versions')
        ->where('listing_id', $listing['id'])
        ->where('version_number', (int) $listing['current_version'])
        ->update([
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
            'published_at' => now(),
            'updated_at' => now(),
        ]);

    $listing['expected_version'] = (int) DB::table('listings')->where('id', $listing['id'])->value('current_version');

    return [
        'provider' => $provider,
        'buyer' => $buyer,
        'listing' => $listing,
        'correlation_id' => $correlationId,
    ];
}
function t3AcceptedOrderWithPaymentEvidence(string $paymentState): array
{
    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'amend-payment-base-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: 1,
        idempotencyKey: 'amend-payment-accept-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
    );
    $workId = (string) DB::table('work_instances')->where('order_id', $proposed['order_id'])->value('id');
    $payment = app(OrderPaymentObligationPort::class);
    $payment->markDueFromWorkFact($proposed['order_id'], $workId, $fx['correlation_id']);
    $obligationId = (string) DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->value('id');
    $payment->reportCashPayment(
        $proposed['order_id'],
        $obligationId,
        $fx['buyer']->id,
        $fx['correlation_id'],
        'amend-payment-report-'.Str::uuid7(),
    );
    if ($paymentState === 'settled') {
        $payment->acknowledgeCashReceipt(
            $proposed['order_id'],
            $obligationId,
            $fx['provider']->id,
            $fx['provider']->id,
            null,
            $fx['correlation_id'],
            'amend-payment-ack-'.Str::uuid7(),
        );
    }

    return [...$fx, 'order_id' => $proposed['order_id'], 'payment_obligation_id' => $obligationId];
}

it('creates an immutable proposed v1 without work or payment children', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    $lineage = DB::table('order_proposals')->where('order_id', $proposed['order_id'])->first();
    $order = DB::table('orders')->where('id', $proposed['order_id'])->first();

    expect($proposed['status'])->toBe('proposed')
        ->and($order->status)->toBe('proposed')
        ->and($order->current_proposal_id)->toBe($lineage->id)
        ->and($lineage->proposal_version)->toBe(1)
        ->and($lineage->kind)->toBe('initial')
        ->and($lineage->status)->toBe('proposed')
        ->and($lineage->proposed_by_user_id)->toBe($fx['buyer']->id)
        ->and(DB::table('order_parties')->where('order_id', $proposed['order_id'])->where('status', 'active')->count())->toBe(2)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0);
    $proposalIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['provider']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $proposed['order_id'])
        ->where('event_type', 'order.proposal_received')
        ->first();
    expect($proposalIntent)->not->toBeNull();
    $proposalPayload = json_decode((string) $proposalIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($proposalIntent->priority)->toBe('needs_action')
        ->and($proposalPayload['attention'])->toBe('needs_action')
        ->and($proposalPayload['title'])->toBeString()
        ->and($proposalPayload['body'])->toBeString()
        ->and($proposalPayload['action_url'])->toBe(route('orders.show', ['order' => $proposed['order_id']], false));
    $replayedProposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    expect($replayedProposal['order_id'])->toBe($proposed['order_id'])
        ->and(DB::table('notifications')->where('event_source_id', $proposed['order_id'])->where('event_type', 'order.proposal_received')->count())->toBe(1);

});
it('does not let a buyer accept their own initial proposal', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'buyer-self-accept-1',
        correlationId: $fx['correlation_id'],
    );

    $error = t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'buyer-self-accept-2',
            correlationId: $fx['correlation_id'],
        ),
        'COUNTERPARTY_REQUIRED',
    );

    expect($error->status)->toBe(403)
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});
it('holds selected product variant capacity without deducting physical stock', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $versionId)->value('terms'), true) ?: [];
    $terms['variants'] = [[
        'id' => 'variant-cement-40',
        'resource_key' => 'cement-40kg',
        'title' => 'Cement 40kg',
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $versionId)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'cement-40kg',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-pure-0001',
        correlationId: $fx['correlation_id'],
        input: ['quantity' => 2, 'variant_id' => 'variant-cement-40', 'lane' => 'external_cash', 'note' => 'Use the side entrance'],
    );
    $proposal = DB::table('order_proposals')->where('id', $proposed['proposal_id'])->first();
    $proposalScope = json_decode((string) $proposal->scope, true);
    $hold = DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->first();
    $movement = DB::table('stock_movements')
        ->where('reservation_id', $hold->id)
        ->where('movement_type', 'hold')
        ->first();

    expect($proposed['resource_key'])->toBe('cement-40kg')
        ->and($proposalScope['note'])->toBe('Use the side entrance')
        ->and($hold->status)->toBe('held')
        ->and((int) $hold->quantity)->toBe(2)
        ->and((int) $bucket['quantity'])->toBe(5)
        ->and((int) $movement->delta_on_hand)->toBe(0)
        ->and((int) $movement->delta_held)->toBe(2);
});

it('finalizes with standing acceptance creating terms work and external cash obligation', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-final-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-0001',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->where('snapshot_version', 1)->exists())->toBeTrue()
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('current_terms_snapshot_id'))->toBe(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->where('snapshot_version', 1)->value('id'))
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->where('status', 'not_started')->exists())->toBeTrue()
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->where('lane', 'external_cash')->where('status', 'not_due')->exists())->toBeTrue();
});
it('pins authored schema v2 through direct proposal, snapshot, and runtime formation', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $nodes = [[
        'id' => 'quality-check',
        'title' => 'Quality check',
        'node_kind' => 'execution_proof',
        'control_mode' => 'provider_advance',
        'required_proofs' => ['checklist_steps', 'metric_reading'],
        'checklist_items' => [['id' => 'seal', 'label' => 'Verify the seal', 'required' => true]],
        'metric_requirements' => [['id' => 'voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true]],
    ]];
    $version = DB::table('listing_versions')->where('listing_id', $fx['listing']['id'])->where('version_number', $fx['listing']['expected_version'])->first();
    $terms = is_string($version->terms) ? json_decode($version->terms, true, 512, JSON_THROW_ON_ERROR) : (array) $version->terms;
    $specification = [
        'shape_contract_version' => 1,
        'payload_schema_version' => 2,
        'nodes' => $nodes,
    ];
    $terms['work_specification'] = $specification;
    $terms['milestone_stages'] = $nodes;
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'updated_at' => now(),
    ]);

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-v2-authored',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-v2-authored',
        correlationId: $fx['correlation_id'],
    );

    $work = DB::table('work_instances')->where('id', $finalized['work_instance_id'])->firstOrFail();
    $snapshot = json_decode((string) DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->value('scope'), true, 512, JSON_THROW_ON_ERROR);
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);

    expect((int) $work->shape_contract_version)->toBe(1)
        ->and((int) $work->payload_schema_version)->toBe(2)
        ->and($snapshot['work_specification'])->toEqual($specification)
        ->and($structure['nodes'][0]['checklist_items'][0]['id'])->toBe('seal')
        ->and($structure['nodes'][0]['metric_requirements'][0]['unit'])->toBe('V');
});
it('rejects unsupported selected Work schema before proposal writes', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $version = DB::table('listing_versions')->where('listing_id', $fx['listing']['id'])->where('version_number', $fx['listing']['expected_version'])->first();
    $terms = is_string($version->terms) ? json_decode($version->terms, true, 512, JSON_THROW_ON_ERROR) : (array) $version->terms;
    $terms['work_specification'] = [
        'shape_contract_version' => 1,
        'payload_schema_version' => 999,
        'nodes' => [],
    ];
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'updated_at' => now(),
    ]);

    t3ExpectOrderError(fn () => app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-v2-unsupported',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    ), 'WORK_CONTRACT_VERSION_UNSUPPORTED');

    expect(DB::table('orders')->where('listing_id', $fx['listing']['id'])->count())->toBe(0)
        ->and(DB::table('order_proposals')->where('source_listing_version_id', $version->id)->count())->toBe(0);
});
it('forms an A9 digital listing with authored QA proofs as schema v2 Work', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture(workShape: 'A9');
    $nodes = [[
        'id' => 'digital-qa',
        'title' => 'Digital quality review',
        'required_proofs' => ['checklist_steps', 'metric_reading'],
        'checklist_items' => [['id' => 'content-reviewed', 'label' => 'Content reviewed', 'required' => true]],
        'metric_requirements' => [['id' => 'pixel-width', 'name' => 'Pixel width', 'unit' => 'px', 'required' => true]],
    ]];
    $version = DB::table('listing_versions')->where('listing_id', $fx['listing']['id'])->where('version_number', $fx['listing']['expected_version'])->first();
    $terms = is_string($version->terms) ? json_decode($version->terms, true, 512, JSON_THROW_ON_ERROR) : (array) $version->terms;
    $specification = ['shape_contract_version' => 1, 'payload_schema_version' => 2, 'nodes' => $nodes];
    $terms['work_specification'] = $specification;
    $terms['milestone_stages'] = $nodes;
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'updated_at' => now(),
    ]);

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-a9-proof',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    $formed = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-a9-proof',
        correlationId: $fx['correlation_id'],
    );

    $work = DB::table('work_instances')->where('id', $formed['work_instance_id'])->firstOrFail();
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    expect($work->work_shape)->toBe('A9')
        ->and((int) $work->payload_schema_version)->toBe(2)
        ->and($structure['nodes'][0]['checklist_items'][0]['id'])->toBe('content-reviewed')
        ->and($structure['nodes'][0]['metric_requirements'][0]['unit'])->toBe('px');
});
it('forms clearance-only A4 authoring as protocol v2 Work', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture('product');
    $listingVersion = DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->firstOrFail();
    $nodes = [
        ['id' => 'prep', 'node_kind' => 'checkin_intake', 'control_mode' => 'provider_advance'],
        ['id' => 'custody', 'node_kind' => 'handoff_ready', 'control_mode' => 'counterparty_handoff'],
        [
            'id' => 'recipient-clearance',
            'node_kind' => 'final_signoff',
            'control_mode' => 'counterparty_handoff',
            'approval_method' => 'worker_dropoff',
            'handoff_party' => 'worker_dropoff',
        ],
    ];
    $terms = is_string($listingVersion->terms) ? json_decode($listingVersion->terms, true, 512, JSON_THROW_ON_ERROR) : (array) $listingVersion->terms;
    $terms['work_specification'] = [
        'shape_contract_version' => 1,
        'payload_schema_version' => 2,
        'nodes' => $nodes,
    ];
    $terms['milestone_stages'] = $nodes;
    $terms['variants'] = [[
        'id' => 'clearance-product',
        'resource_key' => 'clearance-product',
        'title' => 'Clearance product',
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $listingVersion->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'updated_at' => now(),
    ]);
    app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: (string) $listingVersion->id,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'clearance-product',
    );

    $proposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-a4-clearance',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'variant_id' => 'clearance-product', 'lane' => 'external_cash'],
    );
    $formed = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposal['order_id'],
        expectedOrderVersion: (int) $proposal['version'],
        idempotencyKey: 'finalize-key-a4-clearance',
        correlationId: $fx['correlation_id'],
    );
    $work = DB::table('work_instances')->where('id', $formed['work_instance_id'])->firstOrFail();
    $snapshot = json_decode((string) DB::table('order_terms_snapshots')->where('order_id', $proposal['order_id'])->value('scope'), true, 512, JSON_THROW_ON_ERROR);

    expect($work->work_shape)->toBe('A4')
        ->and((int) $work->payload_schema_version)->toBe(2)
        ->and($snapshot['work_specification']['nodes'][2]['approval_method'])->toBe('worker_dropoff');
});

it('counters an order by appending a new immutable proposal version', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'counter-base-0001',
        correlationId: $fx['correlation_id'],
    );
    $v1 = DB::table('order_proposals')->where('id', $first['proposal_id'])->first();
    $response = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'counter',
        expectedOrderVersion: 1,
        idempotencyKey: 'counter-action-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 30000, 'note' => 'Includes the requested work'],
    );
    $replayed = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'counter',
        expectedOrderVersion: 1,
        idempotencyKey: 'counter-action-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 30000, 'note' => 'Includes the requested work'],
    );
    expect($replayed)->toEqual($response);
    $counterIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['buyer']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $first['order_id'])
        ->where('event_type', 'order.proposal_countered')
        ->first();
    expect($counterIntent)->not->toBeNull();
    $counterPayload = json_decode((string) $counterIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($counterIntent->priority)->toBe('needs_action')
        ->and($counterPayload['attention'])->toBe('needs_action')
        ->and($counterPayload['title'])->toBeString()
        ->and($counterPayload['body'])->toBeString()
        ->and($counterPayload['action_url'])->toBe(route('orders.show', ['order' => $first['order_id']], false))
        ->and(DB::table('notifications')->where('event_source_id', $first['order_id'])->where('event_type', 'order.proposal_countered')->count())->toBe(1);

    t3ExpectOrderError(
        fn () => app(RespondToOrderProposal::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $first['order_id'],
            action: 'counter',
            expectedOrderVersion: 1,
            idempotencyKey: 'counter-action-0001',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 31000, 'note' => 'Different terms'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );

    $accepted = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $first['order_id'],
        expectedOrderVersion: (int) $response['version'],
        idempotencyKey: 'counter-accept-v2-0001',
        correlationId: $fx['correlation_id'],
    );
    $acceptanceIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['provider']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $first['order_id'])
        ->where('event_type', 'order.accepted')
        ->first();
    expect($acceptanceIntent)->not->toBeNull();
    $acceptancePayload = json_decode((string) $acceptanceIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($acceptanceIntent->priority)->toBe('updates')
        ->and($acceptancePayload['attention'])->toBe('updates')
        ->and($acceptancePayload['title'])->toBeString()
        ->and($acceptancePayload['body'])->toBeString()
        ->and($acceptancePayload['action_url'])->toBe(route('orders.show', ['order' => $first['order_id']], false))
        ->and(DB::table('notifications')->where('event_source_id', $first['order_id'])->where('event_type', 'order.accepted')->count())->toBe(1);

    $v1After = DB::table('order_proposals')->where('id', $v1->id)->first();
    $v2 = DB::table('order_proposals')->where('id', $response['proposal_id'])->first();
    $terms = DB::table('order_terms_snapshots')->where('id', DB::table('orders')->where('id', $first['order_id'])->value('current_terms_snapshot_id'))->first();

    expect($accepted['status'])->toBe('accepted')
        ->and($terms)->not->toBeNull()
        ->and((int) $terms->amount_minor)->toBe(30000)
        ->and($v2->status)->toBe('accepted');

    expect($response['status'])->toBe('proposed')
        ->and($response['version'])->toBe(2)
        ->and($v1After->status)->toBe('superseded')
        ->and((int) $v1After->amount_minor)->toBe((int) $v1->amount_minor)
        ->and($v2->proposal_version)->toBe(2)
        ->and($v2->parent_proposal_id)->toBe($v1->id)
        ->and($v2->kind)->toBe('counter')
        ->and((int) $v2->amount_minor)->toBe(30000)
        ->and(DB::table('orders')->where('id', $first['order_id'])->value('current_proposal_id'))->toBe($v2->id);
});

it('declines the current proposal and releases its held capacity', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $versionId)->value('terms'), true) ?: [];
    $terms['variants'] = [[
        'id' => 'variant-decline-stock',
        'resource_key' => 'decline-stock',
        'title' => 'Decline Stock',
        'price_amount_minor' => 12500,
        'currency' => 'PHP',
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $versionId)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fx['correlation_id'],
        resourceKey: 'decline-stock',
    );
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'decline-base-0001',
        correlationId: $fx['correlation_id'],
        input: ['variant_id' => 'variant-decline-stock', 'quantity' => 2],
    );
    $heldReservation = DB::table('listing_capacity_reservations')->where('id', $first['capacity_reservation_id'])->first();
    $heldMovement = DB::table('stock_movements')->where('reservation_id', $heldReservation->id)->where('movement_type', 'hold')->first();
    expect($heldReservation->status)->toBe('held')
        ->and((int) $heldReservation->quantity)->toBe(2)
        ->and($heldMovement)->not->toBeNull()
        ->and((int) $heldMovement->delta_on_hand)->toBe(0)
        ->and((int) $heldMovement->delta_held)->toBe(2)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1);

    $declined = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'decline',
        expectedOrderVersion: 1,
        idempotencyKey: 'decline-action-0001',
        correlationId: $fx['correlation_id'],
    );
    expect(app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'decline',
        expectedOrderVersion: 1,
        idempotencyKey: 'decline-action-0001',
        correlationId: $fx['correlation_id'],
    ))->toEqual($declined);
    $declineIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['buyer']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $first['order_id'])
        ->where('event_type', 'order.proposal_declined')
        ->first();
    expect($declineIntent)->not->toBeNull();
    $declinePayload = json_decode((string) $declineIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($declineIntent->priority)->toBe('updates')
        ->and($declinePayload['attention'])->toBe('updates')
        ->and($declinePayload['action_url'])->toBe(route('orders.show', ['order' => $first['order_id']], false))
        ->and(DB::table('notifications')->where('event_source_id', $first['order_id'])->where('event_type', 'order.proposal_declined')->count())->toBe(1);

    $reservation = DB::table('listing_capacity_reservations')->where('id', $first['capacity_reservation_id'])->first();
    $release = DB::table('stock_movements')->where('reservation_id', $reservation->id)->where('movement_type', 'release')->first();

    expect(DB::table('orders')->where('id', $first['order_id'])->value('status'))->toBe('cancelled')
        ->and(DB::table('orders')->where('id', $first['order_id'])->value('cancelled_at'))->not->toBeNull()
        ->and(DB::table('order_proposals')->where('id', $first['proposal_id'])->value('status'))->toBe('declined')
        ->and($reservation->status)->toBe('released')
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3)
        ->and((int) $release->delta_on_hand)->toBe(0)
        ->and((int) $release->delta_held)->toBe(-2);
});
it('accepts a negotiated total that does not divide evenly into minor currency units per item', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'counter-uneven-base-1',
        correlationId: $fx['correlation_id'],
        input: ['quantity' => 3],
    );
    $counter = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'counter',
        expectedOrderVersion: 1,
        idempotencyKey: 'counter-uneven-amount-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10001],
    );
    $proposal = DB::table('order_proposals')->where('id', $counter['proposal_id'])->first();
    $proposalScope = json_decode((string) $proposal->scope, true);

    expect((int) $proposal->amount_minor)->toBe(10001)
        ->and($proposalScope['amount_minor'])->toBe(10001)
        ->and($proposalScope['unit_amount_minor'])->toBeNull();

    $accepted = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $first['order_id'],
        expectedOrderVersion: (int) $counter['version'],
        idempotencyKey: 'counter-uneven-accept-1',
        correlationId: $fx['correlation_id'],
    );
    $snapshot = DB::table('order_terms_snapshots')
        ->where('id', DB::table('orders')->where('id', $first['order_id'])->value('current_terms_snapshot_id'))
        ->first();
    $snapshotScope = json_decode((string) $snapshot->scope, true);

    expect($accepted['status'])->toBe('accepted')
        ->and((int) $snapshot->amount_minor)->toBe(10001)
        ->and($snapshotScope['unit_amount_minor'])->toBeNull()
        ->and($snapshotScope['items'][0]['amount_minor'])->toBe(10001)
        ->and($snapshotScope['items'][0]['unit_amount_minor'])->toBeNull();
});

it('accepts amendments as immutable new terms without rewriting payment evidence', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'amend-base-0001',
        correlationId: $fx['correlation_id'],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        expectedOrderVersion: 1,
        idempotencyKey: 'amend-accept-v1-1',
        correlationId: $fx['correlation_id'],
    );
    $originalSnapshot = DB::table('order_terms_snapshots')->where('order_id', $first['order_id'])->where('snapshot_version', 1)->first();
    $originalObligationId = (string) DB::table('payment_obligations')->where('order_id', $first['order_id'])->value('id');
    DB::table('payment_obligations')->where('id', $originalObligationId)->update([
        'lane' => 'protected_digital',
        'platform_fee_amount_minor' => 125,
        'processor_cost_amount_minor' => 45,
    ]);
    $originalObligation = DB::table('payment_obligations')->where('id', $originalObligationId)->first();
    $amendment = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $first['order_id'],
        action: 'amend',
        expectedOrderVersion: 2,
        idempotencyKey: 'amend-offer-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 30000, 'scope' => ['description' => 'Revised work scope']],
    );

    $acceptedAmendment = app(RespondToOrderProposal::class)->acceptAmendment(
        actorUserId: $fx['buyer']->id,
        orderId: $first['order_id'],
        proposalId: $amendment['proposal_id'],
        expectedOrderVersion: 3,
        idempotencyKey: 'amend-accept-0001',
        correlationId: $fx['correlation_id'],
    );
    $replayedAmendment = app(RespondToOrderProposal::class)->acceptAmendment(
        actorUserId: $fx['buyer']->id,
        orderId: $first['order_id'],
        proposalId: $amendment['proposal_id'],
        expectedOrderVersion: 3,
        idempotencyKey: 'amend-accept-0001',
        correlationId: $fx['correlation_id'],
    );
    expect($replayedAmendment)->toEqual($acceptedAmendment);
    t3ExpectOrderError(
        fn () => app(RespondToOrderProposal::class)->acceptAmendment(
            actorUserId: $fx['buyer']->id,
            orderId: $first['order_id'],
            proposalId: (string) Str::uuid7(),
            expectedOrderVersion: 3,
            idempotencyKey: 'amend-accept-0001',
            correlationId: $fx['correlation_id'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );
    $workId = (string) DB::table('work_instances')->where('order_id', $first['order_id'])->value('id');
    $dueStatus = app(OrderPaymentObligationPort::class)->markDueFromWorkFact($first['order_id'], $workId, $fx['correlation_id']);
    $dueObligation = DB::table('payment_obligations')->where('order_id', $first['order_id'])->where('status', 'due')->first();
    expect($dueStatus)->toBe('due')
        ->and((string) $dueObligation->id)->toBe($acceptedAmendment['payment_obligation_id']);

    $order = DB::table('orders')->where('id', $first['order_id'])->first();
    $newSnapshot = DB::table('order_terms_snapshots')->where('order_id', $first['order_id'])->where('snapshot_version', 2)->first();

    $updatedObligation = DB::table('payment_obligations')->where('supersedes_obligation_id', $originalObligation->id)->first();
    $supersededObligation = DB::table('payment_obligations')->where('id', $originalObligation->id)->first();

    expect((int) $originalSnapshot->amount_minor)->toBe(25000)
        ->and((int) DB::table('order_terms_snapshots')->where('id', $originalSnapshot->id)->value('amount_minor'))->toBe(25000)
        ->and((int) $newSnapshot->amount_minor)->toBe(30000)
        ->and($order->current_terms_snapshot_id)->toBe($newSnapshot->id)
        ->and($order->status)->toBe('accepted')
        ->and($updatedObligation)->not->toBeNull()
        ->and((int) $originalObligation->amount_minor)->toBe(25000)
        ->and((int) $updatedObligation->amount_minor)->toBe(30000)
        ->and($supersededObligation->status)->toBe('superseded')
        ->and($updatedObligation->status)->toBe('due')
        ->and($updatedObligation->due_at)->not->toBeNull()
        ->and($updatedObligation->due_condition)->toBe($originalObligation->due_condition)
        ->and($updatedObligation->lane)->toBe($originalObligation->lane)
        ->and((int) $updatedObligation->platform_fee_amount_minor)->toBe((int) $originalObligation->platform_fee_amount_minor)
        ->and((int) $updatedObligation->processor_cost_amount_minor)->toBe((int) $originalObligation->processor_cost_amount_minor)
        ->and($updatedObligation->payer_user_id)->toBe($originalObligation->payer_user_id)
        ->and($updatedObligation->recipient_user_id)->toBe($originalObligation->recipient_user_id)
        ->and(DB::table('payment_obligations')->where('order_id', $first['order_id'])->count())->toBe(2)
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $first['order_id'])->count())->toBe(0);
});

it('blocks a monetary amendment after payment evidence until reconciliation', function (): void {
    t3PgsqlOrSkip();

    foreach (['payer_reported_cash', 'settled'] as $paymentState) {
        $fx = t3AcceptedOrderWithPaymentEvidence($paymentState);
        $originalOrder = DB::table('orders')->where('id', $fx['order_id'])->first();
        $originalTermsId = (string) $originalOrder->current_terms_snapshot_id;
        $eventCount = DB::table('payment_events')
            ->where('payment_obligation_id', $fx['payment_obligation_id'])
            ->count();
        $amendment = app(RespondToOrderProposal::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $fx['order_id'],
            action: 'amend',
            expectedOrderVersion: (int) $originalOrder->version,
            idempotencyKey: 'evidence-amend-offer-'.Str::uuid7(),
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 30000],
        );

        $error = t3ExpectOrderError(
            fn () => app(RespondToOrderProposal::class)->acceptAmendment(
                actorUserId: $fx['buyer']->id,
                orderId: $fx['order_id'],
                proposalId: $amendment['proposal_id'],
                expectedOrderVersion: (int) $amendment['version'],
                idempotencyKey: 'evidence-amend-accept-'.Str::uuid7(),
                correlationId: $fx['correlation_id'],
            ),
            'PAYMENT_RECONCILIATION_REQUIRED',
        );
        $orderAfter = DB::table('orders')->where('id', $fx['order_id'])->first();

        expect($error->status)->toBe(409)
            ->and($orderAfter->current_terms_snapshot_id)->toBe($originalTermsId)
            ->and((int) $orderAfter->version)->toBe((int) $amendment['version'])
            ->and(DB::table('order_proposals')->where('id', $amendment['proposal_id'])->value('status'))->toBe('proposed')
            ->and(DB::table('order_terms_snapshots')->where('order_id', $fx['order_id'])->count())->toBe(1)
            ->and(DB::table('payment_obligations')->where('id', $fx['payment_obligation_id'])->value('status'))->toBe($paymentState)
            ->and((int) DB::table('payment_obligations')->where('id', $fx['payment_obligation_id'])->value('amount_minor'))->toBe(25000)
            ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $fx['payment_obligation_id'])->exists())->toBeFalse()
            ->and(DB::table('payment_events')->where('payment_obligation_id', $fx['payment_obligation_id'])->count())->toBe($eventCount);
    }
});

it('allows a scope-only amendment after payment evidence without replacing the obligation', function (): void {
    t3PgsqlOrSkip();

    $fx = t3AcceptedOrderWithPaymentEvidence('payer_reported_cash');
    $amendment = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $fx['order_id'],
        action: 'amend',
        expectedOrderVersion: 2,
        idempotencyKey: 'scope-amend-offer-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'scope' => ['description' => 'Clarified scope']],
    );
    $amendmentIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['buyer']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $fx['order_id'])
        ->where('event_type', 'order.amendment_proposed')
        ->first();
    expect($amendmentIntent)->not->toBeNull();
    $amendmentPayload = json_decode((string) $amendmentIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($amendmentIntent->priority)->toBe('needs_action')
        ->and($amendmentPayload['attention'])->toBe('needs_action')
        ->and($amendmentPayload['title'])->toBeString()
        ->and($amendmentPayload['body'])->toBeString()
        ->and($amendmentPayload['action_url'])->toBe(route('orders.show', ['order' => $fx['order_id']], false));

    $accepted = app(RespondToOrderProposal::class)->acceptAmendment(
        actorUserId: $fx['buyer']->id,
        orderId: $fx['order_id'],
        proposalId: $amendment['proposal_id'],
        expectedOrderVersion: (int) $amendment['version'],
        idempotencyKey: 'scope-amend-accept-1',
        correlationId: $fx['correlation_id'],
    );
    $replayed = app(RespondToOrderProposal::class)->acceptAmendment(
        actorUserId: $fx['buyer']->id,
        orderId: $fx['order_id'],
        proposalId: $amendment['proposal_id'],
        expectedOrderVersion: (int) $amendment['version'],
        idempotencyKey: 'scope-amend-accept-1',
        correlationId: $fx['correlation_id'],
    );
    expect($replayed)->toEqual($accepted);
    $acceptedAmendmentIntent = DB::table('notifications')
        ->where('recipient_user_id', $fx['provider']->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $fx['order_id'])
        ->where('event_type', 'order.amendment_accepted')
        ->first();
    expect($acceptedAmendmentIntent)->not->toBeNull();
    $acceptedAmendmentPayload = json_decode((string) $acceptedAmendmentIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($acceptedAmendmentIntent->priority)->toBe('updates')
        ->and($acceptedAmendmentPayload['attention'])->toBe('updates')
        ->and($acceptedAmendmentPayload['action_url'])->toBe(route('orders.show', ['order' => $fx['order_id']], false))
        ->and(DB::table('notifications')->where('event_source_id', $fx['order_id'])->where('event_type', 'order.amendment_accepted')->count())->toBe(1);

    $current = DB::table('payment_obligations')->where('id', $fx['payment_obligation_id'])->first();

    expect($accepted['payment_obligation_status'])->toBe('unchanged')
        ->and($accepted['payment_obligation_id'])->toBe($fx['payment_obligation_id'])
        ->and($current->status)->toBe('payer_reported_cash')
        ->and((int) $current->amount_minor)->toBe(25000)
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $fx['payment_obligation_id'])->exists())->toBeFalse();
});

it('rejects finalize when the listing version became stale', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-stale-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $current = (int) DB::table('listings')->where('id', $fx['listing']['id'])->value('current_version');
    $versionRow = DB::table('listing_versions')->where('listing_id', $fx['listing']['id'])->where('version_number', $current)->first();
    $pins = [
        'category_id' => $versionRow->category_id,
        'category_business_version' => $versionRow->category_business_version,
        'capability_profile_family_code' => $versionRow->capability_profile_family_code,
        'capability_profile_business_version' => $versionRow->capability_profile_business_version,
    ];

    $next = $current + 1;
    DB::table('listing_versions')->insert([
        'id' => (string) Str::uuid7(),
        'listing_id' => $fx['listing']['id'],
        'version_number' => $next,
        'description' => 'Changed after propose',
        'terms' => $versionRow->terms,
        'price_amount_minor' => 30000,
        'currency' => 'PHP',
        'payment_lane_availability' => $versionRow->payment_lane_availability,
        'availability_capacity_summary' => $versionRow->availability_capacity_summary,
        'safety_copy' => $versionRow->safety_copy,
        'effective_from' => now(),
        'effective_to' => null,
        'authored_by_user_id' => $fx['provider']->id,
        'payload_version' => 1,
        'version' => 1,
        'correlation_id' => $fx['correlation_id'],
        'published_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
        'category_id' => $pins['category_id'],
        'category_business_version' => $pins['category_business_version'],
        'capability_profile_family_code' => $pins['capability_profile_family_code'],
        'capability_profile_business_version' => $pins['capability_profile_business_version'],
        'row_version' => 1,
    ]);
    DB::table('listings')->where('id', $fx['listing']['id'])->update([
        'current_version' => $next,
        'version' => $next,
        'updated_at' => now(),
    ]);

    t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-key-stale-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('replays identical finalize without duplicating children', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-replay-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $first = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-replay-1',
        correlationId: $fx['correlation_id'],
    );
    $second = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-replay-1',
        correlationId: $fx['correlation_id'],
    );

    expect($second)->toEqual($first)
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(1);
});

it('rejects unavailable product capacity while leaving no partial proposal', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $versionId)->value('terms'), true) ?: [];
    $terms['variants'] = [[
        'id' => 'variant-out-of-stock',
        'resource_key' => 'rice-5kg',
        'title' => 'Rice 5kg',
        'price_amount_minor' => 10000,
        'currency' => 'PHP',
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $versionId)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fx['correlation_id'],
        resourceKey: 'rice-5kg',
    );
    $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't3.prehold',
        idempotencyKey: 'prehold-1',
        correlationId: $fx['correlation_id'],
    );

    $error = t3ExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'proposal-out-stock-1',
            correlationId: $fx['correlation_id'],
            input: [
                'variant_id' => 'variant-out-of-stock',
                'quantity' => 1,
                'lane' => 'external_cash',
                'slot' => ['date' => '2026-11-01'],
                'note' => 'Keep the delivery slot',
            ],
        ),
        'AVAILABILITY_CONFLICT',
    );

    expect($error->status)->toBe(409)
        ->and($error->envelope->fieldErrors)->toHaveKey('availability')
        ->and(DB::table('orders')->where('listing_id', $fx['listing']['id'])->count())->toBe(0)
        ->and(DB::table('listing_capacity_reservations')->where('listing_capacity_id', $bucket['id'])->count())->toBe(1)
        ->and(DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(0);
});

it('rejects self-booking and unauthorized finalize', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();

    t3ExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['provider']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-self-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 25000, 'currency' => 'PHP'],
        ),
        'VALIDATION_FAILED',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-authz-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $stranger = User::factory()->create();
    t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $stranger->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-authz-1',
            correlationId: $fx['correlation_id'],
        ),
        'AUTHORIZATION_DENIED',
    );
});

it('rejects unauthorized replay by a non-party even with an identical key', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-unauth-replay-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-unauth-replay-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted');

    $stranger = User::factory()->create();
    $error = t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $stranger->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-unauth-replay-1',
            correlationId: $fx['correlation_id'],
        ),
        'AUTHORIZATION_DENIED',
    );
    expect($error->status)->toBe(403);
});

it('rejects unsupported contract shape with zero state mutation and 422 order error', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-unsupported-shape-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    // Point listing to an unsupported profile shape
    $profileId = DB::table('listings')->where('id', $fx['listing']['id'])->value('capability_profile_id');
    DB::table('capability_profiles')->where('id', $profileId)->update([
        'work_shape' => 'INVALID_SHAPE',
        'updated_at' => now(),
    ]);

    $error = t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-unsupported-shape-1',
            correlationId: $fx['correlation_id'],
        ),
        'WORK_CONTRACT_VERSION_UNSUPPORTED',
    );

    expect($error->status)->toBe(422)
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('rejects missing or malformed buyer proposal with 422 order error', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-malformed-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    // Corrupt the proposal payload to have negative amount
    DB::table('order_proposals')
        ->where('id', $proposed['proposal_id'])
        ->update([
            'scope' => json_encode([
                'amount_minor' => -50,
                'currency' => 'PHP',
                'quantity' => 1,
                'listing_version_id' => (string) Str::uuid7(),
                'listing_version_number' => 1,
            ]),
        ]);

    $error = t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-malformed-1',
            correlationId: $fx['correlation_id'],
        ),
        'INVALID_PROPOSAL',
    );
    expect($error->status)->toBe(422);
});

it('rejects finalize when listing version id in proposal does not match locked source', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-ver-mismatch-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    // Change the proposal listing_version_id to a different UUID
    DB::table('order_proposals')
        ->where('id', $proposed['proposal_id'])
        ->update([
            'scope' => json_encode([
                'amount_minor' => 25000,
                'currency' => 'PHP',
                'quantity' => 1,
                'listing_version_id' => (string) Str::uuid7(),
                'listing_version_number' => (int) $fx['listing']['expected_version'],
            ]),
        ]);

    $error = t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-ver-mismatch-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );
    expect($error->status)->toBe(409);
});
it('reads the current reported obligation after a real amendment supersedes the old primary row', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'current-primary-base-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: 1,
        idempotencyKey: 'current-primary-accept-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
    );
    $original = DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->firstOrFail();
    $amendment = app(RespondToOrderProposal::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        action: 'amend',
        expectedOrderVersion: 2,
        idempotencyKey: 'current-primary-amend-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 30000],
    );
    $accepted = app(RespondToOrderProposal::class)->acceptAmendment(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        proposalId: $amendment['proposal_id'],
        expectedOrderVersion: (int) $amendment['version'],
        idempotencyKey: 'current-primary-amend-accept-'.Str::uuid7(),
        correlationId: $fx['correlation_id'],
    );
    $workId = (string) DB::table('work_instances')->where('order_id', $proposed['order_id'])->value('id');
    $payments = app(OrderPaymentObligationPort::class);
    $payments->markDueFromWorkFact($proposed['order_id'], $workId, $fx['correlation_id']);
    $payments->reportCashPayment(
        $proposed['order_id'],
        $accepted['payment_obligation_id'],
        $fx['buyer']->id,
        $fx['correlation_id'],
        'current-primary-cash-report-'.Str::uuid7(),
    );

    $financial = app(\App\Modules\PaymentObligations\Application\DealChildFinancialStateReader::class)
        ->forDealChild($proposed['order_id']);

    expect(DB::table('payment_obligations')->where('id', $original->id)->value('status'))->toBe('superseded')
        ->and($financial['obligation_id'])->toBe($accepted['payment_obligation_id'])
        ->and($financial['obligation_status'])->toBe('payer_reported_cash')
        ->and($financial['claimed'])->toBeTrue()
        ->and($financial['settled'])->toBeFalse();
});

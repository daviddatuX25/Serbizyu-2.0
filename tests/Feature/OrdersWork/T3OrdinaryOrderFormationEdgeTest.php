<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t3EdgePgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T3 order edge proofs require PostgreSQL.');
    }
}

function t3EdgeExpectOrderError(callable $callback, string $code): OrderError
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
function t3EdgeActiveListingFixture(string $listingType = 'service'): array
{
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);

    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin T3 edge listing',
        'description' => 'Edge-case listing for ordinary order formation.',
        'category_code' => $listingType === 'product' ? 'food' : 'home-help',
        'listing_type' => $listingType,
        'work_shape' => $listingType === 'product' ? 'A4' : 'A1',
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

it('replays identical propose without duplicating the order', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-replay-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    $second = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-replay-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    expect($second)->toEqual($first)
        ->and(DB::table('orders')->where('buyer_user_id', $fx['buyer']->id)->where('listing_id', $fx['listing']['id'])->count())->toBe(1)
        ->and(DB::table('audit_events')->where('action', 'order.propose')->where('target_id', $first['order_id'])->count())->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'order.proposed')->where('aggregate_id', $first['order_id'])->count())->toBe(1);
});

it('rejects propose when the listing version is already stale', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();

    t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: ((int) $fx['listing']['expected_version']) + 1,
            idempotencyKey: 'propose-stale-edge-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 25000, 'currency' => 'PHP'],
        ),
        'VERSION_CONFLICT',
    );

    expect(DB::table('orders')->where('buyer_user_id', $fx['buyer']->id)->count())->toBe(0);
});

it('commits capacity during finalization and replays without consuming it twice', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fx['correlation_id'],
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-capacity-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    expect(DB::table('listing_capacity_reservations')->count())->toBe(0)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(2);

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-capacity-edge-1',
        correlationId: $fx['correlation_id'],
    );
    $replayed = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-capacity-edge-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and($replayed)->toBe($finalized)
        ->and(DB::table('listing_capacity_reservations')->where('id', $finalized['capacity_reservation_id'])->value('status'))->toBe('committed')
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'order.accepted')->where('aggregate_id', $proposed['order_id'])->count())->toBe(1);
});

it('lets the provider finalize a pending proposal', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-provider-finalize-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-provider-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->where('accepted_by_user_id', $fx['provider']->id)->exists())->toBeTrue();
});

it('rolls back committed capacity when finalization later fails', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fx['correlation_id'],
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-rollback-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: ((int) $proposed['version']) + 1,
            idempotencyKey: 'finalize-rollback-edge-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1)
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('rejects reused propose idempotency keys with a different fingerprint', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-fingerprint-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-fingerprint-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 30000, 'currency' => 'PHP'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );
});

it('rejects reused finalize idempotency keys with a different fingerprint', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-finalize-fp-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-fp-1',
        correlationId: $fx['correlation_id'],
    );

    t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: ((int) $proposed['version']) + 99,
            idempotencyKey: 'finalize-fp-1',
            correlationId: $fx['correlation_id'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );
});

it('promotes a legacy held reservation on finalize without a second decrement', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
    );

    // Pre-hold 2 units
    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 2,
        commandScope: 'legacy.hold:'.$fx['buyer']->id,
        idempotencyKey: 'legacy-hold-key-1',
        correlationId: $fx['correlation_id'],
    );

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3);

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-legacy-hold-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 2],
    );

    // Attach legacy held capacity reservation ID to proposal
    DB::table('order_parties')
        ->where('order_id', $proposed['order_id'])
        ->where('party_type', 'buyer')
        ->update([
            'scope' => json_encode([
                'proposal' => [
                    'amount_minor' => 25000,
                    'currency' => 'PHP',
                    'quantity' => 2,
                    'listing_version_id' => $versionId,
                    'listing_version_number' => (int) $fx['listing']['expected_version'],
                    'capacity_reservation_id' => $held['reservation_id'],
                ],
            ]),
        ]);

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-legacy-hold-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and($finalized['capacity_reservation_id'])->toBe($held['reservation_id'])
        // Remaining quantity MUST still be 3 (not 1 - no second decrement!)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3)
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('status'))->toBe('committed')
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('order_id'))->toBe($proposed['order_id']);
});

it('rejects finalization with ambiguous or resource key capacity buckets', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    // Create a bucket with resource_key
    $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fx['correlation_id'],
        resourceKey: 'specific_resource_1',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-ambiguous-bucket-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-ambiguous-bucket-1',
            correlationId: $fx['correlation_id'],
        ),
        'AMBIGUOUS_CAPACITY_BUCKET',
    );
    expect($error->status)->toBe(409);
});

it('rejects capacity replay when existing reservation is not in committed status', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fx['correlation_id'],
    );

    // Create a held reservation directly with the command_scope and idempotency_key
    $scope = 'order.finalize.capacity:test-order-non-committed';
    $key = 'capacity-replay-uncommitted-1';
    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: $scope,
        idempotencyKey: $key,
        correlationId: $fx['correlation_id'],
    );

    try {
        $capacity->commitForOrder(
            listingId: $fx['listing']['id'],
            listingVersionId: $versionId,
            orderId: 'test-order-non-committed',
            quantity: 1,
            commandScope: $scope,
            idempotencyKey: $key,
            correlationId: $fx['correlation_id'],
        );
        expect(false)->toBeTrue('Expected ListingError INVALID_STATE');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('IDEMPOTENCY_CONFLICT')
            ->and($error->status)->toBe(409);
    }
});
it('rejects a supplied hold when the listing version has no capacity bucket', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-no-bucket-hold-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );

    $suppliedHoldId = (string) Str::uuid7();
    DB::table('order_parties')
        ->where('order_id', $proposed['order_id'])
        ->where('party_type', 'buyer')
        ->update([
            'scope' => json_encode([
                'proposal' => [
                    'amount_minor' => 25000,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'listing_version_id' => $proposed['listing_version_id'],
                    'listing_version_number' => (int) $proposed['listing_version_number'],
                    'capacity_reservation_id' => $suppliedHoldId,
                ],
            ], JSON_THROW_ON_ERROR),
        ]);

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-no-bucket-hold-1',
            correlationId: $fx['correlation_id'],
        ),
        'INVALID_STATE',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('listing_capacity')->where('listing_id', $fx['listing']['id'])->where('listing_version_id', $proposed['listing_version_id'])->count())->toBe(0)
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('rejects a held reservation already bound to a different order', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $foreignBuyer = User::factory()->create();
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fx['correlation_id'],
    );

    $foreignProposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-foreign-hold-owner-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );
    $targetProposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $foreignBuyer->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-foreign-hold-target-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );

    $held = app(CapacityReservationService::class)->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.foreign-hold-owner-1',
        idempotencyKey: 'legacy-foreign-hold-owner-1',
        correlationId: $fx['correlation_id'],
    );
    DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->update([
        'order_id' => $foreignProposal['order_id'],
        'updated_at' => now(),
    ]);

    DB::table('order_parties')
        ->where('order_id', $targetProposal['order_id'])
        ->where('party_type', 'buyer')
        ->update([
            'scope' => json_encode([
                'proposal' => [
                    'amount_minor' => 25000,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'listing_version_id' => $versionId,
                    'listing_version_number' => (int) $fx['listing']['expected_version'],
                    'capacity_reservation_id' => $held['reservation_id'],
                ],
            ], JSON_THROW_ON_ERROR),
        ]);

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $foreignBuyer->id,
            orderId: $targetProposal['order_id'],
            expectedOrderVersion: (int) $targetProposal['version'],
            idempotencyKey: 'finalize-foreign-hold-target-1',
            correlationId: $fx['correlation_id'],
        ),
        'INVALID_STATE',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('order_id'))->toBe($foreignProposal['order_id'])
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(2)
        ->and(DB::table('orders')->where('id', $targetProposal['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('work_instances')->where('order_id', $targetProposal['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $targetProposal['order_id'])->count())->toBe(0);
});

it('rejects finalization when the capacity hold changes between proposal reads', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 4,
        correlationId: $fx['correlation_id'],
    );
    $firstHold = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.changed-hold-first',
        idempotencyKey: 'legacy-changed-hold-first-1',
        correlationId: $fx['correlation_id'],
    );
    $changedHold = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.changed-hold-second',
        idempotencyKey: 'legacy-changed-hold-second-1',
        correlationId: $fx['correlation_id'],
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-changed-hold-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );
    DB::table('order_parties')
        ->where('order_id', $proposed['order_id'])
        ->where('party_type', 'buyer')
        ->update([
            'scope' => json_encode([
                'proposal' => [
                    'amount_minor' => 25000,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'listing_version_id' => $versionId,
                    'listing_version_number' => (int) $fx['listing']['expected_version'],
                    'capacity_reservation_id' => $firstHold['reservation_id'],
                ],
            ], JSON_THROW_ON_ERROR),
        ]);

    $source = app(OrderListingSourcePort::class);
    app()->bind(OrderListingSourcePort::class, static function () use ($source, $proposed, $changedHold): OrderListingSourcePort {
        return new class($source, $proposed['order_id'], $changedHold['reservation_id']) implements OrderListingSourcePort
        {
            private bool $changed = false;

            public function __construct(
                private readonly OrderListingSourcePort $inner,
                private readonly string $orderId,
                private readonly string $changedHoldId,
            ) {}

            public function findActiveApproved(string $listingId): ?array
            {
                return $this->inner->findActiveApproved($listingId);
            }

            public function lockActiveApproved(string $listingId): ?array
            {
                if (! $this->changed) {
                    $this->changed = true;
                    $party = DB::table('order_parties')
                        ->where('order_id', $this->orderId)
                        ->where('party_type', 'buyer')
                        ->where('status', 'active')
                        ->first();
                    $scope = json_decode((string) $party->scope, true, 512, JSON_THROW_ON_ERROR);
                    $scope['proposal']['capacity_reservation_id'] = $this->changedHoldId;
                    DB::table('order_parties')->where('id', $party->id)->update([
                        'scope' => json_encode($scope, JSON_THROW_ON_ERROR),
                    ]);
                }

                return $this->inner->lockActiveApproved($listingId);
            }
        };
    });

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-changed-hold-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect($error->status)->toBe(409)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(2)
        ->and(DB::table('listing_capacity_reservations')->where('id', $firstHold['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('listing_capacity_reservations')->where('id', $changedHold['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

<?php

declare(strict_types=1);

use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class, CreatesSettledDealChainReview::class);

it('archives only after both actual Order completion and current payment settlement', function (): void {
    $order = $this->createSettledReviewableStandaloneOrder();
    $response = $this->actingAs($order['buyer'])
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->assertJsonPath('data.status', 'archived')
        ->assertJsonPath('data.read_only', true)
        ->assertJsonPath('data.can_send', false);
    $conversationId = $response->json('data.id');

    $this->postJson('/conversations/'.$conversationId.'/messages', [
        'idempotency_key' => 'settled-order-write-attempt',
        'content' => 'This write must be denied after archive.',
        'audience' => 'participants',
    ])->assertConflict()
        ->assertJsonPath('error.code', 'CONVERSATION_ARCHIVED');
    $this->getJson('/conversations/'.$conversationId.'/messages')
        ->assertOk()
        ->assertJsonCount(0, 'data');
    expect(DB::table('conversations')->where('id', $conversationId)->value('status'))->toBe('archived');
});

it('does not archive when the payment is settled but the Order is still active', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $obligation = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    $payments = app(OrderPaymentObligationPort::class);
    $payments->markDueFromWorkFact($order['order_id'], $order['work_id'], $order['correlation_id']);
    $payments->reportCashPayment(
        $order['order_id'], (string) $obligation->id, (string) $order['buyer']->id,
        $order['correlation_id'], 'archive-payment-only-report',
    );
    $payments->acknowledgeCashReceipt(
        $order['order_id'], (string) $obligation->id, (string) $order['provider']->id,
        (string) $order['provider']->id, null, $order['correlation_id'], 'archive-payment-only-confirm',
    );

    $this->actingAs($order['buyer'])
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.read_only', false)
        ->assertJsonPath('data.can_send', true);
});

it('does not archive when Work is complete but the current payment is unsettled', function (): void {
    $buyer = \App\Models\User::factory()->create();
    $provider = \App\Models\User::factory()->create();
    $correlationId = (string) \Illuminate\Support\Str::uuid7();
    $listingId = $this->createReviewActiveServiceListing($provider, 'Archive test service');
    $listing = DB::table('listings')->where('id', $listingId)->firstOrFail();
    $listingVersion = DB::table('listing_versions')
        ->where('listing_id', $listingId)
        ->where('version_number', $listing->current_version)
        ->firstOrFail();
    $proposal = app(\App\Modules\OrdersWork\Application\SubmitOrderProposal::class)->handle(
        buyerUserId: (string) $buyer->id,
        listingId: $listingId,
        expectedListingVersion: (int) $listing->current_version,
        idempotencyKey: 'archive-work-only-proposal-'.\Illuminate\Support\Str::uuid7(),
        correlationId: $correlationId,
        input: [
            'amount_minor' => 25000,
            'currency' => 'PHP',
            'quantity' => 1,
            'listing_version_id' => (string) $listingVersion->id,
        ],
    );
    app(\App\Modules\OrdersWork\Application\FinalizeOrderAgreement::class)->handle(
        actorUserId: (string) $provider->id,
        orderId: (string) $proposal['order_id'],
        expectedOrderVersion: (int) $proposal['version'],
        idempotencyKey: 'archive-work-only-finalize-'.\Illuminate\Support\Str::uuid7(),
        correlationId: $correlationId,
    );
    $order = [
        'order_id' => (string) $proposal['order_id'],
        'work_id' => (string) DB::table('work_instances')->where('order_id', $proposal['order_id'])->value('id'),
        'buyer' => $buyer,
        'provider' => $provider,
    ];
    $work = app(WorkExecutionService::class);
    while (true) {
        $instance = DB::table('work_instances')->where('id', $order['work_id'])->firstOrFail();
        if ($instance->status === 'completed') {
            break;
        }
        $structure = is_array($instance->structure) ? $instance->structure : json_decode((string) $instance->structure, true, flags: JSON_THROW_ON_ERROR);
        $active = collect($structure['nodes'])->firstWhere('status', 'active');
        expect($active)->not->toBeNull();
        if (($active['node_kind'] ?? null) === 'final_signoff') {
            $work->advanceNode($order['order_id'], (string) $provider->id, (string) $active['id'], 'propose_completion', [], $correlationId);
            $work->advanceNode($order['order_id'], (string) $buyer->id, (string) $active['id'], 'signoff_completion', [], $correlationId);
        } else {
            $work->advanceNode($order['order_id'], (string) $provider->id, (string) $active['id'], 'complete_step', [], $correlationId);
        }
    }

    $this->actingAs($buyer)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.read_only', false)
        ->assertJsonPath('data.can_send', true);
});

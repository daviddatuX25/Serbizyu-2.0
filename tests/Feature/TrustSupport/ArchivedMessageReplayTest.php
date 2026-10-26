<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, CreatesSettledDealChainReview::class);

it('returns a persisted same-key message after the Order is completed and settled without allowing new writes', function (): void {
    $buyer = User::factory()->create();
    $provider = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $listingId = $this->createReviewActiveServiceListing($provider, 'Archived replay service');
    $listing = DB::table('listings')->where('id', $listingId)->firstOrFail();
    $version = DB::table('listing_versions')
        ->where('listing_id', $listingId)
        ->where('version_number', $listing->current_version)
        ->firstOrFail();
    $proposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: (string) $buyer->id,
        listingId: $listingId,
        expectedListingVersion: (int) $listing->current_version,
        idempotencyKey: 'archive-replay-proposal-'.Str::uuid7(),
        correlationId: $correlationId,
        input: [
            'amount_minor' => 25000,
            'currency' => 'PHP',
            'quantity' => 1,
            'listing_version_id' => (string) $version->id,
        ],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: (string) $provider->id,
        orderId: (string) $proposal['order_id'],
        expectedOrderVersion: (int) $proposal['version'],
        idempotencyKey: 'archive-replay-finalize-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $orderId = (string) $proposal['order_id'];
    $workId = (string) DB::table('work_instances')->where('order_id', $orderId)->value('id');
    $conversation = $this->actingAs($buyer)
        ->postJson('/orders/'.$orderId.'/conversation')
        ->assertCreated()
        ->json('data.id');
    $messageInput = [
        'idempotency_key' => 'message-before-order-archive',
        'content' => 'Please confirm the agreed schedule.',
        'audience' => 'participants',
    ];
    $message = $this->postJson('/conversations/'.$conversation.'/messages', $messageInput)
        ->assertCreated()
        ->json('data');

    $work = app(WorkExecutionService::class);
    while (true) {
        $instance = DB::table('work_instances')->where('id', $workId)->firstOrFail();
        if ($instance->status === 'completed') {
            break;
        }
        $structure = is_array($instance->structure) ? $instance->structure : json_decode((string) $instance->structure, true, flags: JSON_THROW_ON_ERROR);
        $active = collect($structure['nodes'])->firstWhere('status', 'active');
        expect($active)->not->toBeNull();
        if (($active['node_kind'] ?? null) === 'final_signoff') {
            $work->advanceNode($orderId, (string) $provider->id, (string) $active['id'], 'propose_completion', [], $correlationId);
            $work->advanceNode($orderId, (string) $buyer->id, (string) $active['id'], 'signoff_completion', [], $correlationId);
        } else {
            $work->advanceNode($orderId, (string) $provider->id, (string) $active['id'], 'complete_step', [], $correlationId);
        }
    }
    $obligation = DB::table('payment_obligations')
        ->where('order_id', $orderId)
        ->where('purpose', 'primary_consideration')
        ->where('status', '!=', 'superseded')
        ->orderByDesc('created_at')
        ->orderByDesc('id')
        ->firstOrFail();
    $payments = app(OrderPaymentObligationPort::class);
    $payments->reportCashPayment($orderId, (string) $obligation->id, (string) $buyer->id, $correlationId, 'archive-replay-cash-report');
    $payments->acknowledgeCashReceipt($orderId, (string) $obligation->id, (string) $provider->id, (string) $provider->id, null, $correlationId, 'archive-replay-cash-confirm');

    $this->postJson('/orders/'.$orderId.'/conversation')
        ->assertCreated()
        ->assertJsonPath('data.status', 'archived');
    $replay = $this->postJson('/conversations/'.$conversation.'/messages', $messageInput)
        ->assertCreated()
        ->json('data');
    expect($replay['id'])->toBe($message['id'])
        ->and($replay['sequence'])->toBe(1);

    $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$messageInput,
        'idempotency_key' => 'message-after-order-archive',
    ])->assertConflict()
        ->assertJsonPath('error.code', 'CONVERSATION_ARCHIVED');
});

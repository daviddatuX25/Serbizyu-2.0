<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, CreatesSettledDealChainReview::class);

it('keeps a provider with a completed current child Order in relay membership', function (): void {
    $coordinator = User::factory()->create();
    $provider = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $listingId = $this->createReviewActiveServiceListing($provider, 'Current completed relay service');
    $staged = app(StageDealChain::class)->handle(
        coordinatorUserId: (string) $coordinator->id,
        items: [['id' => $listingId, 'quantity' => 1, 'deal_chain' => null]],
        idempotencyKey: 'completed-relay-stage-'.$correlationId,
        correlationId: $correlationId,
    );
    $chainId = (string) $staged['deal_chain_id'];
    $need = DB::table('deal_needs')->where('deal_chain_id', $chainId)->firstOrFail();
    $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->where('status', 'sent')->firstOrFail();
    app(RespondToDealInvitation::class)->handle(
        actorUserId: (string) $provider->id,
        invitationId: (string) $invitation->id,
        decision: 'accept',
        expectedInvitationVersion: (int) $invitation->version,
        idempotencyKey: 'completed-relay-accept-'.$correlationId,
        correlationId: $correlationId,
    );
    $need = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
    $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);
    $formed = app(ConfirmDealNeedAgreement::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $need->id,
        invitationId: (string) $invitation->id,
        expectedNeedVersion: (int) $need->version,
        termsHash: (string) $scope['terms_hash'],
        capacityHash: (string) $scope['capacity_hash'],
        idempotencyKey: 'completed-relay-confirm-'.$correlationId,
        correlationId: $correlationId,
    );

    $orderId = (string) $formed['order_id'];
    $workId = (string) $formed['work_instance_id'];
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
            $work->advanceNode($orderId, (string) $coordinator->id, (string) $active['id'], 'signoff_completion', [], $correlationId);
        } else {
            $work->advanceNode($orderId, (string) $provider->id, (string) $active['id'], 'complete_step', [], $correlationId);
        }
    }

    expect(DB::table('orders')->where('id', $orderId)->value('status'))->toBe('completed');
    $this->actingAs($provider)
        ->postJson('/deal-chains/'.$chainId.'/relay')
        ->assertCreated()
        ->assertJsonPath('data.scope_type', 'deal_chain_relay')
        ->assertJsonPath('data.can_send', true);
});

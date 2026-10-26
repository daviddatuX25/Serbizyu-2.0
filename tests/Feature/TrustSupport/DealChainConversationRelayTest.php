<?php

declare(strict_types=1);

use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\DealCoordination\Application\WithdrawDealPartner;
use App\Models\User;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('limits relay access to current formed principals and isolates child order conversations', function (): void {
    $coordinator = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $createActiveListing = function (string $title, string $type, string $shape, int $priceMinor) use ($reviewer, $correlationId): string {
        $owner = User::factory()->create();
        $attributes = [
            'title' => $title,
            'description' => 'Published seller-authored terms for a formed relay fixture.',
            'category_code' => 'repairs',
            'listing_type' => $type,
            'work_shape' => $shape,
            'price_amount_minor' => $priceMinor,
            'currency' => 'PHP',
        ];
        if ($type === 'product') {
            $attributes['variants'] = [['id' => 'relay-product-variant', 'name' => 'Standard part', 'price' => $priceMinor / 100, 'stock' => 5, 'is_default' => true]];
        } else {
            $attributes['milestone_stages'] = [
                ['id' => 'execute-service', 'title' => 'Perform the agreed service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                ['id' => 'customer-signoff', 'title' => 'Customer accepts the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
            ];
        }
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $owner->id, (string) $owner->id), $attributes, $correlationId,
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $owner->id, (string) $owner->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: 'relay-listing-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));
        return (string) $draft['id'];
    };
    $laborId = $createActiveListing('Relay primary A1 service', 'service', 'A1', 45000);
    $staged = app(StageDealChain::class)->handle(
        coordinatorUserId: (string) $coordinator->id,
        items: [['id' => $laborId, 'quantity' => 1, 'deal_chain' => null]],
        idempotencyKey: 'communications-relay-stage-'.$correlationId,
        correlationId: $correlationId,
    );
    $chainId = (string) $staged['deal_chain_id'];
    $invitee = DB::table('deal_invitations')
        ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
        ->where('deal_needs.deal_chain_id', $chainId)
        ->where('deal_invitations.status', 'sent')
        ->first(['deal_invitations.*', 'deal_needs.id as need_id']);
    expect($invitee)->not->toBeNull();
    $inviteeUser = User::query()->findOrFail($invitee->invited_provider_user_id);

    $this->actingAs($inviteeUser)
        ->postJson('/deal-chains/'.$chainId.'/relay')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');

    app(RespondToDealInvitation::class)->handle(
        actorUserId: (string) $inviteeUser->id,
        invitationId: (string) $invitee->id,
        decision: 'accept',
        expectedInvitationVersion: (int) $invitee->version,
        idempotencyKey: 'communications-relay-accept-'.$correlationId,
        correlationId: $correlationId,
    );
    $need = DB::table('deal_needs')->where('id', $invitee->need_id)->firstOrFail();
    $scope = is_array($invitee->scope) ? $invitee->scope : json_decode((string) $invitee->scope, true, flags: JSON_THROW_ON_ERROR);
    $formed = app(ConfirmDealNeedAgreement::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $invitee->need_id,
        invitationId: (string) $invitee->id,
        expectedNeedVersion: (int) $need->version,
        termsHash: (string) $scope['terms_hash'],
        capacityHash: (string) $scope['capacity_hash'],
        idempotencyKey: 'communications-relay-form-'.$correlationId,
        correlationId: $correlationId,
    );
    $childOrderId = (string) $formed['order_id'];

    $childConversation = $this->actingAs($inviteeUser)
        ->postJson('/orders/'.$childOrderId.'/conversation')
        ->assertCreated()
        ->json('data.id');
    $this->postJson('/conversations/'.$childConversation.'/messages', [
        'idempotency_key' => 'private-child-order-message',
        'content' => 'This belongs only to the child Order conversation.',
        'audience' => 'participants',
    ])->assertCreated();

    $relay = $this->postJson('/deal-chains/'.$chainId.'/relay')
        ->assertCreated()
        ->assertJsonPath('data.scope_type', 'deal_chain_relay')
        ->json('data.id');
    $this->postJson('/conversations/'.$relay.'/messages', [
        'idempotency_key' => 'relay-only-message',
        'content' => 'This belongs to the current Deal Chain relay.',
        'audience' => 'participants',
    ])->assertCreated();

    $relayMessages = $this->actingAs($coordinator)
        ->getJson('/conversations/'.$relay.'/messages')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonMissing(['content' => 'This belongs only to the child Order conversation.'])
        ->assertJsonPath('data.0.content', 'This belongs to the current Deal Chain relay.');

    app(WithdrawDealPartner::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $invitee->need_id,
        expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $invitee->need_id)->value('version'),
        idempotencyKey: 'communications-relay-withdraw-'.$correlationId,
        correlationId: $correlationId,
    );
    $this->actingAs($inviteeUser)
        ->getJson('/conversations/'.$relay.'/messages')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');

    expect($relayMessages->json('data.0.sequence'))->toBe(1);
});

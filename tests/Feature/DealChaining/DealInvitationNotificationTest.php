<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use Database\Seeders\WorkCatalogSeeder;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('notifies the invited provider once and rolls an invitation intent back with its source command', function (): void {
    $coordinator = User::factory()->create();
    $provider = User::factory()->create();
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $correlationId = (string) Str::uuid7();
    app(WorkCatalogSeeder::class)->run();

    $draft = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        [
            'title' => 'Published Deal Chain service',
            'description' => 'A real provider-authored service for a Deal Chain invitation.',
            'category_code' => 'repairs',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
            'milestone_stages' => [
                ['id' => 'service-work', 'title' => 'Complete the service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                ['id' => 'customer-signoff', 'title' => 'Customer accepts the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
            ],
        ],
        $correlationId,
    );
    $submitted = app(SubmitListing::class)->handle(
        listingId: (string) $draft['id'],
        actor: new ResourceActor((string) $provider->id, (string) $provider->id),
        expectedVersion: (int) $draft['expected_version'],
        idempotencyKey: 'deal-invite-listing-submit-0001',
        correlationId: $correlationId,
    );
    $this->actingAs($reviewer)
        ->post(route('admin.listings.approve', $draft['id']), ['expected_version' => $submitted['expected_version']])
        ->assertRedirect(route('admin.listings.index'));

    $items = [['id' => (string) $draft['id'], 'quantity' => 1]];
    $stage = app(StageDealChain::class);
    $notificationCount = DB::table('notifications')->count();
    $notificationOutboxCount = DB::table('outbox_messages')
        ->where('event_type', 'notification.intent.recorded')
        ->count();
    $rolledBack = false;
    try {
        DB::transaction(function () use ($stage, $coordinator, $items, $correlationId): void {
            $stage->handle(
                coordinatorUserId: (string) $coordinator->id,
                items: $items,
                idempotencyKey: 'deal-invite-stage-rollback-0001',
                correlationId: $correlationId,
            );
            throw new RuntimeException('Rollback the Deal Chain source transaction.');
        });
    } catch (RuntimeException $error) {
        $rolledBack = $error->getMessage() === 'Rollback the Deal Chain source transaction.';
    }
    expect($rolledBack)->toBeTrue()
        ->and(DB::table('notifications')->count())->toBe($notificationCount)
        ->and(DB::table('outbox_messages')->where('event_type', 'notification.intent.recorded')->count())->toBe($notificationOutboxCount);

    $stageIdempotencyKey = 'deal-invite-stage-0001';
    $staged = $stage->handle(
        coordinatorUserId: (string) $coordinator->id,
        items: $items,
        idempotencyKey: $stageIdempotencyKey,
        correlationId: $correlationId,
    );
    $invitation = DB::table('deal_invitations')
        ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
        ->where('deal_needs.deal_chain_id', $staged['deal_chain_id'])
        ->where('deal_invitations.invited_provider_user_id', $provider->id)
        ->first(['deal_invitations.id', 'deal_invitations.deal_need_id', 'deal_invitations.invited_provider_user_id']);
    expect($invitation)->not->toBeNull();

    $inviteIntent = DB::table('notifications')
        ->where('recipient_user_id', $provider->id)
        ->where('event_source_type', 'deal_need')
        ->where('event_source_id', $invitation->deal_need_id)
        ->where('event_type', 'deal.invitation_received')
        ->first();
    expect($inviteIntent)->not->toBeNull();
    $invitePayload = json_decode((string) $inviteIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($inviteIntent->priority)->toBe('needs_action')
        ->and($invitePayload['attention'])->toBe('needs_action')
        ->and($invitePayload['title'])->toBeString()
        ->and($invitePayload['body'])->toBeString()
        ->and($invitePayload['action_url'])->toBe(route('deal-invitations.index', [], false))
        ->and(DB::table('notifications')->where('event_source_id', $invitation->deal_need_id)->where('event_type', 'deal.invitation_received')->count())->toBe(1)
        ->and(DB::table('notifications')->where('event_source_id', $invitation->deal_need_id)->where('recipient_user_id', $coordinator->id)->count())->toBe(0);

    $replayed = $stage->handle(
        coordinatorUserId: (string) $coordinator->id,
        items: $items,
        idempotencyKey: $stageIdempotencyKey,
        correlationId: $correlationId,
    );
    expect($replayed)->toEqual($staged)
        ->and(DB::table('notifications')->where('event_source_id', $invitation->deal_need_id)->where('event_type', 'deal.invitation_received')->count())->toBe(1);
    $acceptedInvitation = DB::table('deal_invitations')->where('id', $invitation->id)->firstOrFail();
    $accepted = app(RespondToDealInvitation::class)->handle(
        actorUserId: (string) $provider->id,
        invitationId: (string) $invitation->id,
        decision: 'accept',
        expectedInvitationVersion: (int) $acceptedInvitation->version,
        idempotencyKey: 'deal-child-invite-accept-0001',
        correlationId: $correlationId,
    );
    expect($accepted['need_status'])->toBe('awaiting_customer_confirmation');

    $need = DB::table('deal_needs')->where('id', $invitation->deal_need_id)->firstOrFail();
    $acceptedTerms = json_decode((string) DB::table('deal_invitations')->where('id', $invitation->id)->value('scope'), true, 512, JSON_THROW_ON_ERROR);
    $confirmation = app(ConfirmDealNeedAgreement::class);
    $notificationCountBeforeRollback = DB::table('notifications')->count();
    $notificationOutboxCountBeforeRollback = DB::table('outbox_messages')
        ->where('event_type', 'notification.intent.recorded')
        ->count();
    $rolledBack = false;
    try {
        DB::transaction(function () use ($confirmation, $coordinator, $staged, $invitation, $need, $acceptedTerms, $correlationId): void {
            $confirmation->handle(
                actorUserId: (string) $coordinator->id,
                dealChainId: (string) $staged['deal_chain_id'],
                dealNeedId: (string) $need->id,
                invitationId: (string) $invitation->id,
                expectedNeedVersion: (int) $need->version,
                termsHash: (string) $acceptedTerms['terms_hash'],
                capacityHash: (string) $acceptedTerms['capacity_hash'],
                idempotencyKey: 'deal-child-confirm-rollback-0001',
                correlationId: $correlationId,
            );
            throw new RuntimeException('Rollback the Deal child source transaction.');
        });
    } catch (RuntimeException $error) {
        $rolledBack = $error->getMessage() === 'Rollback the Deal child source transaction.';
    }
    expect($rolledBack)->toBeTrue()
        ->and(DB::table('orders')->where('deal_need_id', $need->id)->count())->toBe(0)
        ->and(DB::table('notifications')->count())->toBe($notificationCountBeforeRollback)
        ->and(DB::table('outbox_messages')->where('event_type', 'notification.intent.recorded')->count())->toBe($notificationOutboxCountBeforeRollback)
        ->and(DB::table('deal_needs')->where('id', $need->id)->value('status'))->toBe('awaiting_customer_confirmation');

    $formedOrder = $confirmation->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: (string) $staged['deal_chain_id'],
        dealNeedId: (string) $need->id,
        invitationId: (string) $invitation->id,
        expectedNeedVersion: (int) $need->version,
        termsHash: (string) $acceptedTerms['terms_hash'],
        capacityHash: (string) $acceptedTerms['capacity_hash'],
        idempotencyKey: 'deal-child-confirm-0001',
        correlationId: $correlationId,
    );
    $childOrder = DB::table('orders')->where('id', $formedOrder['order_id'])->firstOrFail();
    expect($childOrder->status)->toBe('accepted')
        ->and((string) $childOrder->provider_user_id)->toBe((string) $provider->id);
    $acceptedIntent = DB::table('notifications')
        ->where('recipient_user_id', $provider->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $childOrder->id)
        ->where('event_type', 'order.accepted')
        ->first();
    expect($acceptedIntent)->not->toBeNull();
    $acceptedPayload = json_decode((string) $acceptedIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($acceptedIntent->priority)->toBe('updates')
        ->and($acceptedPayload['attention'])->toBe('updates')
        ->and($acceptedPayload['action_url'])->toBe(route('orders.show', ['order' => $childOrder->id], false))
        ->and(DB::table('notifications')->where('event_source_id', $childOrder->id)->where('event_type', 'order.accepted')->count())->toBe(1);
    $this->actingAs($provider)->get($acceptedPayload['action_url'])->assertOk();

    $replayedConfirmation = $confirmation->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: (string) $staged['deal_chain_id'],
        dealNeedId: (string) $need->id,
        invitationId: (string) $invitation->id,
        expectedNeedVersion: (int) $need->version,
        termsHash: (string) $acceptedTerms['terms_hash'],
        capacityHash: (string) $acceptedTerms['capacity_hash'],
        idempotencyKey: 'deal-child-confirm-0001',
        correlationId: $correlationId,
    );
    expect($replayedConfirmation)->toEqual($formedOrder)
        ->and(DB::table('notifications')->where('event_source_id', $childOrder->id)->where('event_type', 'order.accepted')->count())->toBe(1);
});

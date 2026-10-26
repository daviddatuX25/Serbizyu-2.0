<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Shared\Application\ResourceActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('filters users by actual display name and latest canonical cohort with staff context', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $needle = 'registry-'.Str::uuid7();
    $user = User::factory()->create(['status' => 'active']);
    $other = User::factory()->create(['status' => 'active']);
    DB::table('user_profiles')->where('user_id', $user->id)->update(['display_name' => $needle.' target']);
    DB::table('user_profiles')->where('user_id', $other->id)->update(['display_name' => $needle.' other']);
    DB::table('user_profiles')->whereIn('user_id', [$user->id, $other->id])->update(['updated_at' => now()]);
    DB::table('cohort_classifications')->insert([
        'id' => (string) Str::uuid7(), 'actor_user_id' => $user->id, 'cohort_class' => 'genuine_tagudin',
        'source' => 'staff-identity-registry-test', 'classified_at' => now(), 'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->actingAs($staff)->get('/admin/users?'.http_build_query(['q' => $needle, 'cohort' => 'genuine_tagudin']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.data.0.id', (string) $user->id)
            ->where('registry.rows.data.0.title', $needle.' target')
            ->where('registry.rows.data.0.cohort', 'genuine_tagudin')
            ->where('registry.rows.meta.total', 1)
            ->where('staffContext.operator.id', (string) $staff->id)
            ->where('staffContext.cohort.selected', 'genuine_tagudin')
            ->where('staffContext.cohort.options', fn ($options) => $options->contains('genuine_tagudin') && ! $options->contains('genuine')));
});

it('resolves an actual identity verification by public reference and UUID with safe evidence metadata', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $subject = User::factory()->create(['status' => 'suspended']);
    $evidenceId = (string) Str::uuid7();
    $verificationId = (string) Str::uuid7();
    DB::table('evidence_files')->insert([
        'id' => $evidenceId, 'owner_user_id' => $subject->id, 'storage_key' => 'private/'.Str::uuid7(),
        'media_type' => 'image/jpeg', 'size_bytes' => 2048, 'content_hash' => str_repeat('a', 64),
        'evidence_type' => 'identity_document', 'data_class' => 'restricted', 'scan_status' => 'clean',
        'visibility' => 'private', 'retention_policy' => 'identity_verification', 'version' => 1,
        'correlation_id' => (string) Str::uuid7(), 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('identity_verifications')->insert([
        'id' => $verificationId, 'user_id' => $subject->id, 'verification_type' => 'government_id', 'status' => 'pending',
        'evidence_file_id' => $evidenceId, 'retention_class' => 'identity_verification', 'version' => 1,
        'correlation_id' => (string) Str::uuid7(), 'created_at' => now(), 'updated_at' => now(),
    ]);
    $reference = DB::table('identity_verifications')->where('id', $verificationId)->value('public_reference');

    foreach ([(string) $reference, $verificationId] as $ref) {
        $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $ref]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('workspace.id', $verificationId)
                ->where('workspace.reference', $reference)
                ->where('workspace.rails.case.0.state', 'pending')
                ->where('workspace.responsibility.party', 'staff')
                ->where('workspace.responsibility.user_id', null)
                ->where('workspace.rails.case.0.facts.1.value', 'suspended')
                ->where('workspace.actions.identity_review.can_review', true)
                ->where('workspace.evidence.0.id', $evidenceId)
                ->where('workspace.evidence.0.status', 'clean')
                ->missing('workspace.evidence.0.storage_key')
                ->missing('workspace.evidence.0.url'));
    }
});

it('forwards actual safe account status and active role facts into a user workspace', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $subject = User::factory()->create(['status' => 'suspended']);
    $now = now();
    DB::table('role_assignments')->insert([
        'id' => (string) Str::uuid7(), 'user_id' => $subject->id, 'role_code' => 'provide', 'status' => 'active',
        'granted_by_user_id' => $staff->id, 'effective_at' => $now, 'scope' => '{}', 'version' => 1,
        'correlation_id' => (string) Str::uuid7(), 'created_at' => $now, 'updated_at' => $now,
    ]);

    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => (string) $subject->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.kind', 'user')
            ->where('workspace.facts.0.label', 'Account status')
            ->where('workspace.facts.0.value', 'suspended')
            ->where('workspace.facts.1.label', 'Active roles')
            ->where('workspace.facts.1.value', 'provide'));
});

it('resolves an actual deal chain by persisted public reference and UUID with current child orders', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $coordinator = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L1']);
    $provider = User::factory()->create();
    $now = now();
    DB::table('role_assignments')->insert([
        'id' => (string) Str::uuid7(), 'user_id' => $coordinator->id, 'role_code' => 'buy', 'status' => 'active',
        'granted_by_user_id' => $coordinator->id, 'effective_at' => $now, 'scope' => '{}', 'version' => 1,
        'correlation_id' => (string) Str::uuid7(), 'created_at' => $now, 'updated_at' => $now,
    ]);
    $draft = app(\App\Modules\Listings\Application\CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        ['title' => 'Staff registry child listing', 'description' => 'Scoped integration fixture.', 'category_code' => 'repairs',
            'listing_type' => 'service', 'work_shape' => 'A1', 'price_amount_minor' => 45000, 'currency' => 'PHP'],
        (string) Str::uuid7(),
    );
    DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    DB::table('listing_versions')->where('listing_id', $draft['id'])->update(['published_at' => $now]);
    $staged = app(\App\Modules\DealCoordination\Application\StageDealChain::class)->handle(
        coordinatorUserId: (string) $coordinator->id,
        items: [['id' => (string) $draft['id'], 'quantity' => 1, 'deal_chain' => null]],
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $chainId = (string) $staged['deal_chain_id'];
    $need = DB::table('deal_needs')->where('deal_chain_id', $chainId)->orderBy('ordinal')->firstOrFail();
    $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->where('status', 'sent')->firstOrFail();
    app(\App\Modules\DealCoordination\Application\RespondToDealInvitation::class)->handle(
        actorUserId: (string) $invitation->invited_provider_user_id,
        invitationId: (string) $invitation->id,
        decision: 'accept',
        expectedInvitationVersion: (int) $invitation->version,
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $need = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
    $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);
    $formed = app(\App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $need->id,
        invitationId: (string) $invitation->id,
        expectedNeedVersion: (int) $need->version,
        termsHash: (string) $scope['terms_hash'],
        capacityHash: (string) $scope['capacity_hash'],
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $order = DB::table('orders')->where('id', $formed['order_id'])->firstOrFail();
    $oldOrderId = (string) $formed['order_id'];
    $currentNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
    app(\App\Modules\DealCoordination\Application\WithdrawDealPartner::class)->handle(
        actorUserId: (string) $provider->id,
        dealChainId: $chainId,
        dealNeedId: (string) $currentNeed->id,
        expectedNeedVersion: (int) $currentNeed->version,
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $replacementProvider = User::factory()->create();
    $replacementDraft = app(\App\Modules\Listings\Application\CreateListingDraft::class)->handle(
        new ResourceActor((string) $replacementProvider->id, (string) $replacementProvider->id),
        ['title' => 'Replacement child listing', 'description' => 'Scoped replacement fixture.', 'category_code' => 'repairs',
            'listing_type' => 'service', 'work_shape' => 'A1', 'price_amount_minor' => 45000, 'currency' => 'PHP'],
        (string) Str::uuid7(),
    );
    DB::table('listings')->where('id', $replacementDraft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    DB::table('listing_versions')->where('listing_id', $replacementDraft['id'])->update(['published_at' => now()]);
    $replacementNeed = DB::table('deal_needs')->where('id', $currentNeed->id)->firstOrFail();
    $replacement = app(\App\Modules\DealCoordination\Application\ChooseDealReplacement::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $replacementNeed->id,
        expectedNeedVersion: (int) $replacementNeed->version,
        listingId: (string) $replacementDraft['id'],
        variantId: null,
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $replacementInvitation = DB::table('deal_invitations')->where('id', $replacement['invitation_id'])->firstOrFail();
    $replacementScope = is_array($replacementInvitation->scope) ? $replacementInvitation->scope : json_decode((string) $replacementInvitation->scope, true, flags: JSON_THROW_ON_ERROR);
    app(\App\Modules\DealCoordination\Application\RespondToDealInvitation::class)->handle(
        actorUserId: (string) $replacementInvitation->invited_provider_user_id,
        invitationId: (string) $replacementInvitation->id,
        decision: 'accept',
        expectedInvitationVersion: (int) $replacementInvitation->version,
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $replacementNeed = DB::table('deal_needs')->where('id', $replacement['replacement_need_id'])->firstOrFail();
    $replacementOrder = app(\App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement::class)->handle(
        actorUserId: (string) $coordinator->id,
        dealChainId: $chainId,
        dealNeedId: (string) $replacementNeed->id,
        invitationId: (string) $replacementInvitation->id,
        expectedNeedVersion: (int) $replacementNeed->version,
        termsHash: (string) $replacementScope['terms_hash'],
        capacityHash: (string) $replacementScope['capacity_hash'],
        idempotencyKey: (string) Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );
    $order = DB::table('orders')->where('id', $replacementOrder['order_id'])->firstOrFail();
    $this->assertSame('cancelled', DB::table('orders')->where('id', $oldOrderId)->value('status'));
    $chain = DB::table('deal_chains')->where('id', $chainId)->firstOrFail();
    $reference = (string) $chain->public_reference;

    foreach ([(string) $reference, $chainId] as $ref) {
        $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $ref]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('workspace.title', (string) $chain->title)
                ->where('workspace.rails.agreement.state', (string) $chain->status)
                ->where('workspace.rails.agreement.reference', $reference)
                ->where('workspace.siblings.0.id', (string) $order->id)
                ->where('workspace.siblings.0.kind', 'order')
                ->where('workspace.siblings.0.reference', (string) $order->public_reference)
                ->where('workspace.siblings.0.state', (string) $order->status)
                ->missing('workspace.siblings.1.id'));
    }
});

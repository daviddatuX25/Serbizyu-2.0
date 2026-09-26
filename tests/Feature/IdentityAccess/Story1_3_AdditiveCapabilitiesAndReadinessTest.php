<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Models\User;
use App\Modules\IdentityAccess\Application\ConsentGrantService;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\Listings\Application\GovernedCatalogService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * Story 1.3 Acceptance Criteria Test Suite:
 * Manage Additive Capabilities and Profile Readiness (PRD-001, PRD-003, PRD-023, PRD-075; UX-DR14)
 *
 * Given an authenticated participant
 * When the participant requests role activation or completes profile readiness steps
 * Then capabilities attach additively, readiness state transitions monotonically, and operational gates enforce prerequisite completion
 * And revoking or missing a prerequisite disables dependent operational actions immediately without corrupting independent capabilities
 * And no global role switch, client-supplied Owner, or unsupported capability grants authority.
 */
final class Story1_3_AdditiveCapabilitiesAndReadinessTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    private RoleAssignmentService $roleService;

    private ConsentGrantService $consentService;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Story 1.3 tests require PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
        $this->roleService = app(RoleAssignmentService::class);
        $this->consentService = app(ConsentGrantService::class);

        // Ensure baseline published catalog category exists for listing creation tests
        $correlationId = (string) Str::uuid7();
        app(GovernedCatalogService::class)->ensurePublished('home-help', 'service', 'A1', $correlationId);
        app(GovernedCatalogService::class)->ensurePublished('home-help', 'product', 'A4', $correlationId);
    }

    private function createParticipant(
        string $status = 'active',
        bool $verified = true,
        ?string $password = 'Password123!',
        ?string $displayName = 'Maria Dela Cruz',
        string $serviceArea = 'Tagudin',
    ): User {
        $now = now();
        $user = User::factory()->create([
            'status' => $status,
            'phone_verified_at' => $verified ? $now : null,
            'password' => $password !== null ? Hash::make($password) : null,
        ]);

        DB::table('user_profiles')->where('user_id', $user->id)->update([
            'display_name' => $displayName ?? '',
            'service_area_display' => $serviceArea,
            'updated_at' => $now,
        ]);

        return $user;
    }

    public function test_additive_capabilities_attach_monotonically_without_persona_switching(): void
    {
        $user = $this->createParticipant();

        // 1. Participant activates "buyer" capability
        $buyerResp = $this->actingAs($user)
            ->postJson('/account/capabilities', ['role' => 'buyer']);

        $buyerResp->assertOk()
            ->assertJsonPath('data.capabilities', ['buyer'])
            ->assertJsonPath('data.active_roles', ['buyer']);

        self::assertTrue($this->roleService->hasActive($user->id, 'buyer'));
        self::assertFalse($this->roleService->hasActive($user->id, 'provider'));

        // 2. Participant subsequently activates "provider" capability
        $providerResp = $this->actingAs($user)
            ->postJson('/account/capabilities', ['role' => 'provider']);

        $providerResp->assertOk();
        $capabilities = $providerResp->json('data.capabilities');
        self::assertContains('buyer', $capabilities);
        self::assertContains('provider', $capabilities);

        // Both roles are active simultaneously without persona switching
        self::assertTrue($this->roleService->hasActive($user->id, 'buyer'));
        self::assertTrue($this->roleService->hasActive($user->id, 'provider'));

        // 3. Participant subsequently activates "merchant" and "agent" capabilities
        $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'merchant'])->assertOk();
        $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'agent'])->assertOk();

        // 4. Query capabilities index
        $indexResp = $this->actingAs($user)->getJson('/account/capabilities');
        $indexResp->assertOk();

        $allCaps = $indexResp->json('data.capabilities');
        self::assertContains('buyer', $allCaps);
        self::assertContains('provider', $allCaps);
        self::assertContains('merchant', $allCaps);
        self::assertContains('agent', $allCaps);
        self::assertSame($user->id, $indexResp->json('data.user_id'));
    }

    public function test_idempotent_capability_attachment_does_not_create_duplicate_active_records(): void
    {
        $user = $this->createParticipant();

        // First activation
        $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'provider'])->assertOk();
        $count1 = DB::table('role_assignments')
            ->where('user_id', $user->id)
            ->whereIn('role_code', ['provider', 'provide'])
            ->where('status', 'active')
            ->count();
        self::assertSame(1, $count1);

        // Repeated activation attempt
        $secondResp = $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'provider']);
        $secondResp->assertOk();

        $count2 = DB::table('role_assignments')
            ->where('user_id', $user->id)
            ->whereIn('role_code', ['provider', 'provide'])
            ->where('status', 'active')
            ->count();
        self::assertSame(1, $count2);
    }

    public function test_unsupported_and_restricted_admin_capabilities_are_rejected(): void
    {
        $user = $this->createParticipant();

        // 1. Participant attempts to self-activate "admin" capability
        $adminResp = $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'admin']);
        $adminResp->assertStatus(422)
            ->assertJsonPath('code', 'UNSUPPORTED_CAPABILITY');

        self::assertFalse($this->roleService->hasActive($user->id, 'admin'));

        // 2. Participant attempts to self-activate unrecognized capability "superuser"
        $superResp = $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'superuser']);
        $superResp->assertStatus(422)
            ->assertJsonPath('code', 'UNSUPPORTED_CAPABILITY');

        self::assertFalse($this->roleService->hasActive($user->id, 'superuser'));

        // Verify no active roles were assigned
        self::assertSame([], $this->roleService->activeRoleCodes($user->id));
    }

    public function test_profile_readiness_transitions_monotonically_from_setup_required_to_ready(): void
    {
        // Fresh participant without password and with unconfigured profile
        $user = $this->createParticipant(password: null, displayName: '', serviceArea: '');

        // 1. Initial readiness state is setup_required
        $readinessResp = $this->actingAs($user)->getJson('/account/readiness');
        $readinessResp->assertOk()
            ->assertJsonPath('data.status', 'setup_required')
            ->assertJsonPath('data.ready', false)
            ->assertJsonPath('data.profile_complete', false)
            ->assertJsonPath('data.password_set', false);
        self::assertNotEmpty($readinessResp->json('data.blockers'));

        // 2. Incomplete submission (missing password) fails and does not advance readiness
        $incompleteResp = $this->actingAs($user)->postJson('/onboarding', [
            'display_name' => 'Maria Santos',
            'area_code' => 'Tagudin',
            'role' => 'buyer',
            'password' => '',
            'password_confirmation' => '',
        ]);
        $incompleteResp->assertStatus(422);

        $checkStillIncomplete = $this->actingAs($user)->getJson('/account/readiness');
        $checkStillIncomplete->assertOk()
            ->assertJsonPath('data.status', 'setup_required')
            ->assertJsonPath('data.ready', false);

        // 3. Complete valid onboarding submission
        $completeResp = $this->actingAs($user)->postJson('/onboarding', [
            'display_name' => 'Maria Santos',
            'area_code' => 'Tagudin',
            'language_code' => 'fil',
            'role' => 'buyer',
            'password' => 'SafePass123!',
            'password_confirmation' => 'SafePass123!',
        ]);
        $completeResp->assertOk()
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.ready', true);

        // 4. Monotonic progression: readiness stays ready
        $finalReadiness = $this->actingAs($user)->getJson('/account/readiness');
        $finalReadiness->assertOk()
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.ready', true)
            ->assertJsonPath('data.profile_complete', true)
            ->assertJsonPath('data.password_set', true);
        self::assertEmpty($finalReadiness->json('data.blockers'));

        // 5. Subsequent capability activation preserves the ready state
        $this->actingAs($user)->postJson('/account/capabilities', ['role' => 'provider'])->assertOk();
        $afterCap = $this->actingAs($user)->getJson('/account/readiness');
        $afterCap->assertOk()
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.ready', true);
    }

    public function test_purpose_specific_actions_project_according_to_active_capabilities_and_readiness(): void
    {
        $user = $this->createParticipant();

        // 1. Account with only "buyer" capability
        $this->roleService->ensureActive($user->id, 'buyer', (string) Str::uuid7());
        $buyerActions = $this->roleService->purposeSpecificActions($user->id);

        self::assertArrayHasKey('buyer', $buyerActions);
        self::assertContains('browse_listings', $buyerActions['buyer']);
        self::assertContains('create_request', $buyerActions['buyer']);
        self::assertArrayNotHasKey('provider', $buyerActions);
        self::assertArrayNotHasKey('agent', $buyerActions);

        // 2. Add "provider" capability
        $this->roleService->ensureActive($user->id, 'provider', (string) Str::uuid7());
        $providerActions = $this->roleService->purposeSpecificActions($user->id);

        self::assertArrayHasKey('buyer', $providerActions);
        self::assertArrayHasKey('provider', $providerActions);
        self::assertContains('create_listing', $providerActions['provider']);
        self::assertContains('manage_listings', $providerActions['provider']);

        // 3. Add "merchant" capability
        $this->roleService->ensureActive($user->id, 'merchant', (string) Str::uuid7());
        $merchantActions = $this->roleService->purposeSpecificActions($user->id);
        self::assertArrayHasKey('merchant', $merchantActions);
        self::assertContains('create_product_listing', $merchantActions['merchant']);

        // 4. Add "agent" capability
        $this->roleService->ensureActive($user->id, 'agent', (string) Str::uuid7());
        $agentActions = $this->roleService->purposeSpecificActions($user->id);
        self::assertArrayHasKey('agent', $agentActions);
        self::assertContains('view_client_roster', $agentActions['agent']);
    }

    public function test_operational_prerequisite_gating_on_listing_creation(): void
    {
        $correlationId = (string) Str::uuid7();

        // 1. User with ONLY "buyer" capability cannot create listing draft
        $buyerOnly = $this->createParticipant();
        $this->roleService->ensureActive($buyerOnly->id, 'buyer', $correlationId);

        $deniedResp = $this->actingAs($buyerOnly)->postJson('/listings', [
            'title' => 'Electrical diagnosis in Tagudin',
            'description' => 'Will diagnose circuit issues and fix tripped switches.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]);

        $deniedResp->assertStatus(403)
            ->assertJsonPath('code', 'PREREQUISITE_FAILED');

        // 2. User with "provider" capability but incomplete profile readiness cannot create listing draft
        $unreadyProvider = $this->createParticipant(password: null, displayName: '', serviceArea: '');
        $this->roleService->ensureActive($unreadyProvider->id, 'provider', $correlationId);

        $unreadyResp = $this->actingAs($unreadyProvider)->postJson('/listings', [
            'title' => 'Electrical diagnosis in Tagudin',
            'description' => 'Will diagnose circuit issues and fix tripped switches.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]);

        $unreadyResp->assertStatus(403)
            ->assertJsonPath('code', 'PREREQUISITE_FAILED');

        // 3. User with "provider" capability AND completed profile readiness succeeds
        $readyProvider = $this->createParticipant();
        $this->roleService->ensureActive($readyProvider->id, 'provider', $correlationId);

        $successResp = $this->actingAs($readyProvider)->postJson('/listings', [
            'title' => 'Electrical diagnosis in Tagudin',
            'description' => 'Will diagnose circuit issues and fix tripped switches.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]);

        $successResp->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.title', 'Electrical diagnosis in Tagudin');
    }

    public function test_operational_prerequisite_gating_on_request_creation(): void
    {
        $correlationId = (string) Str::uuid7();

        // 1. User with ONLY "provider" capability cannot create buyer request
        $providerOnly = $this->createParticipant();
        $this->roleService->ensureActive($providerOnly->id, 'provider', $correlationId);

        $deniedReq = $this->actingAs($providerOnly)->postJson('/requests', [
            'title' => 'Need emergency aircon repair',
            'description' => 'AC unit is leaking water and not cooling.',
            'category_code' => 'home-help',
            'budget_amount' => 500,
        ]);

        $deniedReq->assertStatus(403)
            ->assertJsonPath('code', 'PREREQUISITE_FAILED');

        // 2. User with "buyer" capability succeeds
        $buyer = $this->createParticipant();
        $this->roleService->ensureActive($buyer->id, 'buyer', $correlationId);

        $successReq = $this->actingAs($buyer)->postJson('/requests', [
            'title' => 'Need emergency aircon repair',
            'description' => 'AC unit is leaking water and not cooling.',
            'category_code' => 'home-help',
            'budget_amount' => 500,
        ]);

        // Returns redirect to browse on web or 200/201 on API
        $this->assertTrue(in_array($successReq->status(), [200, 201, 302], true));
    }

    public function test_operational_prerequisite_gating_on_agent_delegation(): void
    {
        $correlationId = (string) Str::uuid7();
        $owner = $this->createParticipant();
        $this->roleService->ensureActive($owner->id, 'provider', $correlationId);

        $actingUser = $this->createParticipant();
        // actingUser does NOT have 'agent' capability initially

        $grantId = $this->consentService->grant(
            grantorUserId: $owner->id,
            granteeUserId: $actingUser->id,
            resourceType: 'listing',
            resourceId: null,
            permissionScope: ['actions' => ['listing.create']],
            correlationId: $correlationId,
        );

        // 1. Attempting acting-for without 'agent' capability is denied with 403
        $deniedAgent = $this->actingAs($actingUser)->postJson('/listings', [
            'title' => 'Assisted listing draft',
            'description' => 'Crafted on behalf of owner in Tagudin.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'acting_for_user_id' => $owner->id,
            'consent_grant_id' => $grantId,
        ]);

        $deniedAgent->assertStatus(403)
            ->assertJsonPath('code', 'AUTHORIZATION_DENIED');

        // 2. Once 'agent' capability is active, acting-for succeeds
        $this->roleService->ensureActive($actingUser->id, 'agent', $correlationId);

        $allowedAgent = $this->actingAs($actingUser)->postJson('/listings', [
            'title' => 'Assisted listing draft',
            'description' => 'Crafted on behalf of owner in Tagudin.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'acting_for_user_id' => $owner->id,
            'consent_grant_id' => $grantId,
        ]);

        $allowedAgent->assertStatus(201)
            ->assertJsonPath('data.owner_user_id', $owner->id);

        // 3. When 'agent' capability is revoked, acting-for fails immediately
        $this->roleService->revoke($actingUser->id, 'agent', $correlationId);

        $postRevokeAgent = $this->actingAs($actingUser)->postJson('/listings', [
            'title' => 'Assisted listing draft 2',
            'description' => 'Crafted on behalf of owner in Tagudin.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'acting_for_user_id' => $owner->id,
            'consent_grant_id' => $grantId,
        ]);

        $postRevokeAgent->assertStatus(403)
            ->assertJsonPath('code', 'AUTHORIZATION_DENIED');

    }

    public function test_anti_hijacking_client_supplied_owner_is_denied(): void
    {
        $correlationId = (string) Str::uuid7();
        $attacker = $this->createParticipant();
        $this->roleService->ensureActive($attacker->id, 'provider', $correlationId);

        $victim = $this->createParticipant();

        // Attacker attempts to inject victim's ID as owner without an active consent grant
        $hijackAttempt = $this->actingAs($attacker)->postJson('/listings', [
            'title' => 'Hijacked listing draft',
            'description' => 'Attempting to inject a foreign owner ID.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'owner_user_id' => $victim->id,
        ]);

        $hijackAttempt->assertStatus(403)
            ->assertJsonPath('code', 'AUTHORIZATION_DENIED');

    }

    public function test_revocation_disables_dependent_operational_actions_without_corrupting_independent_capabilities(): void
    {
        $correlationId = (string) Str::uuid7();
        $user = $this->createParticipant();

        // 1. User has both "buyer" and "provider" capabilities
        $this->roleService->ensureActive($user->id, 'buyer', $correlationId);
        $this->roleService->ensureActive($user->id, 'provider', $correlationId);

        self::assertTrue($this->roleService->hasActive($user->id, 'buyer'));
        self::assertTrue($this->roleService->hasActive($user->id, 'provider'));

        // Can create listing
        $listingResp = $this->actingAs($user)->postJson('/listings', [
            'title' => 'Carpentry and framing in Tagudin',
            'description' => 'Custom wood framing and furniture repair.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]);
        $listingResp->assertStatus(201);

        // Can create request
        $reqResp = $this->actingAs($user)->postJson('/requests', [
            'title' => 'Need carpentry assistance',
            'description' => 'Fix broken gate and hinges.',
            'category_code' => 'home-help',
            'budget_amount' => 600,
        ]);
        $this->assertTrue(in_array($reqResp->status(), [200, 201, 302], true));

        // 2. Revoke "provider" capability
        $revokeResp = $this->actingAs($user)->deleteJson('/account/capabilities/provider');
        $revokeResp->assertOk();

        // Verify provider role revoked, buyer role untouched
        self::assertFalse($this->roleService->hasActive($user->id, 'provider'));
        self::assertTrue($this->roleService->hasActive($user->id, 'buyer'));

        // 3. Creating listing is now immediately denied
        $deniedListing = $this->actingAs($user)->postJson('/listings', [
            'title' => 'Another carpentry listing',
            'description' => 'This should be blocked due to revoked provider role.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]);
        $deniedListing->assertStatus(403)
            ->assertJsonPath('code', 'PREREQUISITE_FAILED');

        // 4. Independent buyer capability remains active and operational!
        $reqResp2 = $this->actingAs($user)->postJson('/requests', [
            'title' => 'Still need plumbing assistance',
            'description' => 'Leaking pipe under kitchen sink.',
            'category_code' => 'home-help',
            'budget_amount' => 450,
        ]);
        $this->assertTrue(in_array($reqResp2->status(), [200, 201, 302], true));
    }

    public function test_onboarding_with_explicit_role_choices_attaches_capabilities_additively(): void
    {
        $user = $this->createParticipant(password: null, displayName: '', serviceArea: '');

        // Participant onboards choosing "merchant" role
        $resp = $this->actingAs($user)->postJson('/onboarding', [
            'display_name' => 'Tagudin Hardware Goods',
            'area_code' => 'Tagudin Centro',
            'language_code' => 'fil',
            'role' => 'merchant',
            'password' => 'SafeMerchant123!',
            'password_confirmation' => 'SafeMerchant123!',
        ]);

        $resp->assertOk()
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.ready', true);

        self::assertTrue($this->roleService->hasActive($user->id, 'merchant'));

        $caps = $this->roleService->activeCapabilities($user->id);
        self::assertContains('merchant', $caps);
    }
}

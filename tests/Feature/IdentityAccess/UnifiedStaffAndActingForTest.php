<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Models\User;
use App\Modules\IdentityAccess\Application\ConsentActingForAuthorizer;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class UnifiedStaffAndActingForTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_route_redirects_guests_and_denies_non_staff_users(): void
    {
        $this->get('/admin')->assertRedirect(route('auth.sign-in'));
        $this->actingAs($this->user('L1'))->get('/admin')->assertForbidden();
    }

    public function test_suspended_l4_user_is_not_staff(): void
    {
        $user = $this->user('L4');
        DB::table('users')->where('id', $user->id)->update(['status' => 'suspended']);

        $this->actingAs($user)->get('/admin')->assertForbidden();
    }

    public function test_admin_route_accepts_an_active_l4_user(): void
    {
        $user = $this->user('L4');
        $this->actingAs($user)->get('/admin')->assertOk();
        $this->getJson('/admin/identity-verifications')->assertOk();
    }

    public function test_admin_route_accepts_an_active_admin_role_without_l4_tier(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $user = $this->user('L1');
        $this->role($user, 'admin', now()->subMinute(), null);

        $this->actingAs($user)->get('/admin')->assertOk();
        $this->getJson('/admin/identity-verifications')->assertOk();
    }

    public function test_admin_route_accepts_an_active_operate_role_without_l4_tier(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $user = $this->user('L1');
        $this->role($user, 'operate', now()->subMinute(), null);

        $this->actingAs($user)->get('/admin')->assertOk();
        $this->getJson('/admin/identity-verifications')->assertOk();
    }

    public function test_admin_route_rejects_a_role_that_is_not_yet_effective_or_has_expired(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $notEffective = $this->user('L1');
        $this->role($notEffective, 'admin', now()->addMinute(), null);
        $this->actingAs($notEffective)->get('/admin')->assertForbidden();

        auth()->logout();
        $expired = $this->user('L1');
        $this->role($expired, 'operate', now()->subMinutes(2), now()->subMinute());
        $this->actingAs($expired)->get('/admin')->assertForbidden();
    }

    public function test_acting_for_requires_exact_resource_action_and_active_grant_window(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $grantor = $this->user('L1');
        $grantee = $this->user('L1');
        $grantId = (string) Str::uuid7();
        $resourceId = (string) Str::uuid7();
        $this->consent($grantId, $grantor, $grantee, $resourceId, now()->subMinute(), now()->addMinute());
        $authorizer = app(ConsentActingForAuthorizer::class);

        DB::transaction(fn () => $authorizer->assertActive(
            grantId: $grantId,
            granteeUserId: (string) $grantee->id,
            grantorUserId: (string) $grantor->id,
            correlationId: (string) Str::uuid7(),
            resourceType: 'listing',
            resourceId: $resourceId,
            requiredAction: 'listing.update',
        ));

        foreach ([
            ['listing', (string) Str::uuid7(), 'listing.update'],
            ['listing', $resourceId, 'listing.archive'],
            ['service', $resourceId, 'listing.update'],
        ] as [$resourceType, $mismatchedResource, $action]) {
            try {
                DB::transaction(fn () => $authorizer->assertActive(
                    grantId: $grantId,
                    granteeUserId: (string) $grantee->id,
                    grantorUserId: (string) $grantor->id,
                    correlationId: (string) Str::uuid7(),
                    resourceType: $resourceType,
                    resourceId: $mismatchedResource,
                    requiredAction: $action,
                ));
                self::fail('A mismatched acting-for scope must be denied.');
            } catch (\RuntimeException) {
                self::assertSame('active', DB::table('consent_grants')->where('id', $grantId)->value('status'));
            }
        }
    }

    public function test_acting_for_accepts_a_grant_at_its_start_time(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $grantor = $this->user('L1');
        $grantee = $this->user('L1');
        $grantId = (string) Str::uuid7();
        $resourceId = (string) Str::uuid7();
        $startsAt = now();
        $this->consent($grantId, $grantor, $grantee, $resourceId, $startsAt, $startsAt->copy()->addMinute());

        DB::transaction(fn () => app(ConsentActingForAuthorizer::class)->assertActive(
            grantId: $grantId,
            granteeUserId: (string) $grantee->id,
            grantorUserId: (string) $grantor->id,
            correlationId: (string) Str::uuid7(),
            resourceType: 'listing',
            resourceId: $resourceId,
            requiredAction: 'listing.update',
        ));
        self::assertSame('active', DB::table('consent_grants')->where('id', $grantId)->value('status'));
    }

    public function test_acting_for_rejects_revoked_grants(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $grantor = $this->user('L1');
        $grantee = $this->user('L1');
        $grantId = (string) Str::uuid7();
        $resourceId = (string) Str::uuid7();
        $this->consent($grantId, $grantor, $grantee, $resourceId, now()->subMinute(), now()->addMinute());
        DB::table('consent_grants')->where('id', $grantId)->update(['revoked_at' => now()]);

        try {
            DB::transaction(fn () => app(ConsentActingForAuthorizer::class)->assertActive(
                grantId: $grantId,
                granteeUserId: (string) $grantee->id,
                grantorUserId: (string) $grantor->id,
                correlationId: (string) Str::uuid7(),
                resourceType: 'listing',
                resourceId: $resourceId,
                requiredAction: 'listing.update',
            ));
            self::fail('A revoked grant must be denied.');
        } catch (\RuntimeException) {
            self::assertSame('active', DB::table('consent_grants')->where('id', $grantId)->value('status'));
        }
    }

    public function test_acting_for_rejects_a_grant_before_its_start_and_at_expiry_without_mutation(): void
    {
        $this->travelTo('2026-10-25 12:00:00');
        $grantor = $this->user('L1');
        $grantee = $this->user('L1');
        $resourceId = (string) Str::uuid7();
        $grantId = (string) Str::uuid7();
        $this->consent($grantId, $grantor, $grantee, $resourceId, now()->addMinute(), now()->addMinutes(2));
        $authorizer = app(ConsentActingForAuthorizer::class);

        try {
            DB::transaction(fn () => $authorizer->assertActive(
                grantId: $grantId,
                granteeUserId: (string) $grantee->id,
                grantorUserId: (string) $grantor->id,
                correlationId: (string) Str::uuid7(),
                resourceType: 'listing',
                resourceId: $resourceId,
                requiredAction: 'listing.update',
            ));
            self::fail('A future grant must be denied.');
        } catch (\RuntimeException) {
            self::assertSame('active', DB::table('consent_grants')->where('id', $grantId)->value('status'));
        }

        DB::table('consent_grants')->where('id', $grantId)->update([
            'starts_at' => now()->subMinutes(2),
            'expires_at' => now(),
        ]);

        try {
            DB::transaction(fn () => $authorizer->assertActive(
                grantId: $grantId,
                granteeUserId: (string) $grantee->id,
                grantorUserId: (string) $grantor->id,
                correlationId: (string) Str::uuid7(),
                resourceType: 'listing',
                resourceId: $resourceId,
                requiredAction: 'listing.update',
            ));
            self::fail('A grant at its expiry must be denied.');
        } catch (\RuntimeException) {
            self::assertSame('active', DB::table('consent_grants')->where('id', $grantId)->value('status'));
        }
    }

    private function user(string $tier): User
    {
        return User::factory()->create([
            'status' => 'active',
            'primary_access_tier' => $tier,
            'locale' => 'en',
            'timezone' => 'Asia/Manila',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
        ]);
    }

    private function role(User $user, string $role, \DateTimeInterface $effectiveAt, ?\DateTimeInterface $expiresAt): void
    {
        DB::table('role_assignments')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => (string) $user->id,
            'role_code' => $role,
            'status' => 'active',
            'granted_by_user_id' => (string) $user->id,
            'effective_at' => $effectiveAt,
            'expires_at' => $expiresAt,
            'scope' => '{}',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
        ]);
    }

    private function consent(string $grantId, User $grantor, User $grantee, string $resourceId, \DateTimeInterface $startsAt, \DateTimeInterface $expiresAt): void
    {
        DB::table('consent_grants')->insert([
            'id' => $grantId,
            'grantor_user_id' => (string) $grantor->id,
            'grantee_user_id' => (string) $grantee->id,
            'resource_type' => 'listing',
            'resource_id' => $resourceId,
            'permission_scope' => json_encode(['actions' => ['listing.update']], JSON_THROW_ON_ERROR),
            'status' => 'active',
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'revoked_at' => null,
            'suspended_at' => null,
            'consent_evidence_file_id' => null,
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

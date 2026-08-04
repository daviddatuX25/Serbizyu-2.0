<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure;

use App\Modules\IdentityAccess\Application\DemoFixtures;
use App\Shared\Contracts\CorrelationId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class IdentityRepository
{
    public function findByFixtureIdentifier(string $identifier): ?object
    {
        return DB::table('users')->where('phone_e164', DemoFixtures::loginKey($identifier))->first();
    }

    /** @param array<string,mixed> $definition */
    public function ensureFixture(string $identifier, array $definition, CorrelationId $correlationId): string
    {
        $user = $this->findByFixtureIdentifier($identifier);
        $now = now();

        if ($user === null) {
            $userId = (string) Str::uuid7();
            DB::table('users')->insert([
                'id' => $userId,
                'phone_e164' => DemoFixtures::loginKey($identifier),
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'en',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $userId = (string) $user->id;
            DB::table('users')->where('id', $userId)->update([
                'status' => 'active',
                'updated_at' => $now,
            ]);
        }

        $profile = DB::table('user_profiles')->where('user_id', $userId)->first();
        $profilePayload = [
            'display_name' => (string) $definition['display_name'],
            'public_bio' => null,
            'avatar_file_id' => null,
            'service_area_display' => (string) $definition['area'],
            'accessibility_preferences' => json_encode(['plain_language' => true], JSON_THROW_ON_ERROR),
            'language_preferences' => json_encode($definition['languages'], JSON_THROW_ON_ERROR),
            'emergency_contact_policy' => null,
            'version' => $profile === null ? 1 : ((int) $profile->version + 1),
            'correlation_id' => (string) $correlationId,
            'updated_at' => $now,
        ];
        if ($profile === null) {
            DB::table('user_profiles')->insert($profilePayload + [
                'user_id' => $userId,
                'created_at' => $now,
            ]);
        } else {
            DB::table('user_profiles')->where('user_id', $userId)->update($profilePayload);
        }

        $role = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('role_code', (string) $definition['role'])
            ->where('status', 'active')
            ->where('scope', '{}')
            ->first();
        if ($role === null) {
            DB::table('role_assignments')->insert([
                'id' => (string) Str::uuid7(),
                'user_id' => $userId,
                'role_code' => (string) $definition['role'],
                'status' => 'active',
                'granted_by_user_id' => $userId,
                'effective_at' => $now,
                'expires_at' => null,
                'scope' => '{}',
                'version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $verification = DB::table('identity_verifications')
            ->where('user_id', $userId)
            ->where('verification_type', 'provider_readiness')
            ->first();
        $verificationPayload = [
            'status' => (string) $definition['verification_status'],
            'provider' => 'fixture',
            'reason' => (string) $definition['verification_status'] === 'approved'
                ? 'Pre-approved CAPSTONE fixture; not real verification.'
                : 'Readiness is simulated and remains subject to review.',
            'retention_class' => 'capstone',
            'version' => $verification === null ? 1 : ((int) $verification->version + 1),
            'correlation_id' => (string) $correlationId,
            'updated_at' => $now,
        ];
        if ($verification === null) {
            DB::table('identity_verifications')->insert($verificationPayload + [
                'id' => (string) Str::uuid7(),
                'user_id' => $userId,
                'verification_type' => 'provider_readiness',
                'reviewed_by_user_id' => null,
                'evidence_file_id' => null,
                'reviewed_at' => null,
                'created_at' => $now,
            ]);
        } else {
            DB::table('identity_verifications')->where('id', $verification->id)->update($verificationPayload);
        }

        return $userId;
    }

    /** @param array<string,mixed> $payload */
    public function updateOnboarding(string $userId, array $payload, CorrelationId $correlationId): void
    {
        $now = now();
        $profile = DB::table('user_profiles')->where('user_id', $userId)->firstOrFail();
        DB::table('user_profiles')->where('user_id', $userId)->update([
            'display_name' => trim((string) $payload['display_name']),
            'service_area_display' => trim((string) $payload['service_area_display']),
            'language_preferences' => json_encode($payload['language_preferences'] ?? ['ilo', 'en'], JSON_THROW_ON_ERROR),
            'accessibility_preferences' => json_encode($payload['accessibility_preferences'] ?? ['plain_language' => true], JSON_THROW_ON_ERROR),
            'version' => ((int) $profile->version) + 1,
            'correlation_id' => (string) $correlationId,
            'updated_at' => $now,
        ]);

        $role = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('role_code', 'provider')
            ->where('status', 'active')
            ->where('scope', '{}')
            ->first();
        if ($role === null) {
            DB::table('role_assignments')->insert([
                'id' => (string) Str::uuid7(),
                'user_id' => $userId,
                'role_code' => 'provider',
                'status' => 'active',
                'granted_by_user_id' => $userId,
                'effective_at' => $now,
                'expires_at' => null,
                'scope' => '{}',
                'version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $verification = DB::table('identity_verifications')
            ->where('user_id', $userId)
            ->where('verification_type', 'provider_readiness')
            ->first();
        if ($verification === null) {
            DB::table('identity_verifications')->insert([
                'id' => (string) Str::uuid7(),
                'user_id' => $userId,
                'verification_type' => 'provider_readiness',
                'status' => 'pending',
                'provider' => 'fixture',
                'reviewed_by_user_id' => null,
                'evidence_file_id' => null,
                'reason' => 'Readiness requested in CAPSTONE/SANDBOX; no real verification performed.',
                'reviewed_at' => null,
                'retention_class' => 'capstone',
                'version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('identity_verifications')->where('id', $verification->id)->update([
                'status' => 'pending',
                'provider' => 'fixture',
                'reason' => 'Readiness requested in CAPSTONE/SANDBOX; no real verification performed.',
                'version' => ((int) $verification->version) + 1,
                'correlation_id' => (string) $correlationId,
                'updated_at' => $now,
            ]);
        }
    }

    /** @return array<string,mixed> */
    public function readiness(string $userId, bool $providerIntent): array
    {
        $profile = DB::table('user_profiles')->where('user_id', $userId)->first();
        $providerRole = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('role_code', 'provider')
            ->where('status', 'active')
            ->exists();
        $verification = DB::table('identity_verifications')
            ->where('user_id', $userId)
            ->where('verification_type', 'provider_readiness')
            ->latest('created_at')
            ->value('status');

        return [
            'provider_intent' => $providerIntent,
            'profile_complete' => $profile !== null && trim((string) $profile->display_name) !== '' && trim((string) $profile->service_area_display) !== '',
            'capability_ready' => $providerRole,
            'identity_review_status' => $verification,
            'can_create_draft' => $providerIntent && $providerRole,
            'claims_real_verification' => false,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\RoleCapabilityReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RoleAssignmentService implements RoleCapabilityReaderPort
{
    public const SUPPORTED_ROLES = ['buyer', 'provider', 'merchant', 'agent'];

    public const RESTRICTED_ROLES = ['admin'];

    public static function canonicalRoleCode(string $role): string
    {
        $lower = strtolower(trim($role));

        return match ($lower) {
            'buy', 'buyer', 'customer' => 'buyer',
            'provide', 'provider' => 'provider',
            'merchant', 'seller' => 'merchant',
            'agent' => 'agent',
            'admin' => 'admin',
            default => $lower,
        };
    }

    /** @return list<string> */
    public static function roleAliases(string $role): array
    {
        $canonical = self::canonicalRoleCode($role);

        return match ($canonical) {
            'buyer' => ['buyer', 'buy', 'customer'],
            'provider' => ['provider', 'provide'],
            'merchant' => ['merchant', 'seller'],
            'agent' => ['agent'],
            'admin' => ['admin'],
            default => [$role],
        };
    }

    public static function isSupportedParticipantRole(string $role): bool
    {
        return in_array(self::canonicalRoleCode($role), self::SUPPORTED_ROLES, true);
    }

    /**
     * Ensure an additive role is active for the user (idempotent upsert of active row).
     *
     * @param  array<string, mixed>  $scope
     *
     * @throws IdentityAccessError
     */
    public function ensureActive(
        string $userId,
        string $roleCode,
        string $correlationId,
        array $scope = [],
        ?string $grantedByUserId = null,
    ): string {
        $canonical = self::canonicalRoleCode($roleCode);
        if (! self::isSupportedParticipantRole($canonical) && $roleCode !== 'provide' && $roleCode !== 'buy') {
            throw new IdentityAccessError(
                'UNSUPPORTED_CAPABILITY',
                "Unsupported or restricted capability '{$roleCode}'.",
                $correlationId,
                status: 422,
                fieldErrors: ['role' => ["Capability '{$roleCode}' is not supported for participant self-activation."]],
            );
        }

        $aliases = self::roleAliases($roleCode);

        $existing = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->whereIn('role_code', $aliases)
            ->where('status', 'active')
            ->orderByDesc('created_at')
            ->first();

        if ($existing !== null) {
            return (string) $existing->id;
        }

        $id = (string) Str::uuid7();
        $now = now();

        DB::table('role_assignments')->insert([
            'id' => $id,
            'user_id' => $userId,
            'role_code' => $roleCode,
            'status' => 'active',
            'granted_by_user_id' => $grantedByUserId ?? $userId,
            'effective_at' => $now,
            'expires_at' => null,
            'scope' => json_encode($scope === [] ? new \stdClass : $scope, JSON_THROW_ON_ERROR),
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }

    public function revoke(string $userId, string $roleCode, string $correlationId): bool
    {
        $aliases = self::roleAliases($roleCode);
        $now = now();

        $updated = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->whereIn('role_code', $aliases)
            ->where('status', 'active')
            ->update([
                'status' => 'revoked',
                'version' => DB::raw('version + 1'),
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

        return $updated > 0;
    }

    public function hasActive(string $userId, string $roleCode): bool
    {
        $now = now();
        $aliases = self::roleAliases($roleCode);

        return DB::table('role_assignments')
            ->where('user_id', $userId)
            ->whereIn('role_code', $aliases)
            ->where('status', 'active')
            ->where('effective_at', '<=', $now)
            ->where(function ($query) use ($now): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->exists();
    }

    /** @return list<string> */
    public function activeRoleCodes(string $userId): array
    {
        return DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->orderBy('role_code')
            ->pluck('role_code')
            ->map(fn ($code): string => (string) $code)
            ->unique()
            ->values()
            ->all();
    }

    /** @return list<string> */
    public function activeCapabilities(string $userId): array
    {
        $codes = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->pluck('role_code')
            ->all();

        $capabilities = [];
        foreach ($codes as $code) {
            $canonical = self::canonicalRoleCode((string) $code);
            if (in_array($canonical, self::SUPPORTED_ROLES, true) && ! in_array($canonical, $capabilities, true)) {
                $capabilities[] = $canonical;
            }
        }
        sort($capabilities);

        return array_values($capabilities);
    }

    /** @return array<string, mixed> */
    public function readinessState(string $userId): array
    {
        $profile = DB::table('user_profiles')->where('user_id', $userId)->first();
        $user = DB::table('users')->where('id', $userId)->first();

        $profileComplete = $profile !== null
            && trim((string) ($profile->display_name ?? '')) !== ''
            && trim((string) ($profile->service_area_display ?? '')) !== '';
        $passwordSet = $user !== null && filled($user->password);

        $ready = $profileComplete && $passwordSet;
        $status = $ready ? 'ready' : 'setup_required';

        return [
            'status' => $status,
            'ready' => $ready,
            'profile_complete' => $profileComplete,
            'password_set' => $passwordSet,
            'display_name' => $profile?->display_name,
            'service_area_display' => $profile?->service_area_display ?? 'Tagudin',
            'blockers' => $ready ? [] : array_values(array_filter([
                ! $profileComplete ? 'Complete your profile display name and service area.' : null,
                ! $passwordSet ? 'Set an account password.' : null,
            ])),
        ];
    }

    /** @return array<string, list<string>> */
    public function purposeSpecificActions(string $userId): array
    {
        $capabilities = $this->activeCapabilities($userId);
        $readiness = $this->readinessState($userId);
        $isReady = $readiness['ready'];

        $actions = [];
        if (! $isReady) {
            $actions['onboarding'] = ['complete_profile', 'set_password'];
        }

        foreach ($capabilities as $cap) {
            $actions[$cap] = match ($cap) {
                'buyer' => ['browse_listings', 'create_request', 'view_orders'],
                'provider' => $isReady
                    ? ['create_listing', 'manage_listings', 'manage_availability']
                    : ['complete_profile_for_listings'],
                'merchant' => $isReady
                    ? ['create_product_listing', 'manage_inventory']
                    : ['complete_profile_for_inventory'],
                'agent' => ['view_client_roster', 'assisted_actions'],
                default => [],
            };
        }

        return $actions;
    }

    public function assertOperationalPrerequisite(
        string $userId,
        string $requiredCapability,
        string $action,
        string $correlationId,
        bool $requireProfileReady = true,
    ): void {
        if (! $this->hasActive($userId, $requiredCapability)) {
            throw new IdentityAccessError(
                'PREREQUISITE_FAILED',
                "Active '{$requiredCapability}' capability is required to {$action}.",
                $correlationId,
                status: 403,
            );
        }

        if ($requireProfileReady) {
            $readiness = $this->readinessState($userId);
            if (! $readiness['ready']) {
                throw new IdentityAccessError(
                    'PREREQUISITE_FAILED',
                    "Profile readiness must be complete before attempting to {$action}.",
                    $correlationId,
                    status: 403,
                    fieldErrors: ['readiness' => $readiness['blockers']],
                );
            }
        }
    }
}

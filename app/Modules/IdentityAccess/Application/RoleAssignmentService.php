<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RoleAssignmentService
{
    /**
     * Ensure an additive role is active for the user (idempotent upsert of active row).
     *
     * @param  array<string, mixed>  $scope
     */
    public function ensureActive(
        string $userId,
        string $roleCode,
        string $correlationId,
        array $scope = [],
        ?string $grantedByUserId = null,
    ): string {
        $existing = DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('role_code', $roleCode)
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

    public function hasActive(string $userId, string $roleCode): bool
    {
        return DB::table('role_assignments')
            ->where('user_id', $userId)
            ->where('role_code', $roleCode)
            ->where('status', 'active')
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
}

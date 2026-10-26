<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ConsentGrantService
{
    /**
     * @param  array<string, mixed>  $permissionScope
     */
    public function grant(
        string $grantorUserId,
        string $granteeUserId,
        string $resourceType,
        ?string $resourceId,
        array $permissionScope,
        string $correlationId,
        ?\DateTimeInterface $expiresAt = null,
    ): string {
        if ($grantorUserId === $granteeUserId) {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'Consent cannot be granted to yourself.',
                $correlationId,
                fieldErrors: ['grantee_user_id' => ['Choose a different agent account.']],
            );
        }

        if ($permissionScope === []) {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'Consent requires an explicit permission scope.',
                $correlationId,
                fieldErrors: ['permission_scope' => ['Add at least one permitted action.']],
            );
        }

        $id = (string) Str::uuid7();
        $now = now();

        DB::table('consent_grants')->insert([
            'id' => $id,
            'grantor_user_id' => $grantorUserId,
            'grantee_user_id' => $granteeUserId,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'permission_scope' => json_encode($permissionScope, JSON_THROW_ON_ERROR),
            'status' => 'active',
            'starts_at' => $now,
            'expires_at' => $expiresAt,
            'revoked_at' => null,
            'suspended_at' => null,
            'consent_evidence_file_id' => null,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }

    public function revoke(string $grantId, string $grantorUserId, string $correlationId): void
    {
        $updated = DB::table('consent_grants')
            ->where('id', $grantId)
            ->where('grantor_user_id', $grantorUserId)
            ->where('status', 'active')
            ->update([
                'status' => 'revoked',
                'revoked_at' => now(),
                'correlation_id' => $correlationId,
                'updated_at' => now(),
                'version' => DB::raw('version + 1'),
            ]);

        if ($updated === 0) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'You are not authorized to perform this action.',
                $correlationId,
                status: 403,
            );
        }
    }

    /**
     * Mutation-time recheck for Agent acting-for.
     *
     * @throws IdentityAccessError
     */
    public function assertActiveForActingFor(
        string $grantId,
        string $granteeUserId,
        string $grantorUserId,
        string $correlationId,
        string $resourceType,
        ?string $resourceId,
        string $requiredAction,
    ): void {
        if (DB::transactionLevel() < 1) {
            throw new \LogicException('Acting-for authorization must run inside the mutation transaction.');
        }

        $now = now();
        $grant = DB::table('consent_grants')
            ->where('id', $grantId)
            ->lockForUpdate()
            ->first();

        if ($grant === null
            || (string) $grant->grantee_user_id !== $granteeUserId
            || (string) $grant->grantor_user_id !== $grantorUserId
            || (string) $grant->status !== 'active'
            || $grant->revoked_at !== null
            || $grant->suspended_at !== null
            || (string) $grant->resource_type !== $resourceType
            || ($grant->resource_id === null ? null : (string) $grant->resource_id) !== $resourceId
            || Carbon::parse((string) $grant->starts_at)->greaterThan($now)
            || ($grant->expires_at !== null && ! $now->lt(Carbon::parse((string) $grant->expires_at)))
        ) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'You are not authorized to perform this action.',
                $correlationId,
                status: 403,
            );
        }

        /** @var array<string, mixed> $scope */
        $scope = is_string($grant->permission_scope)
            ? json_decode($grant->permission_scope, true) ?: []
            : (array) $grant->permission_scope;
        $actions = $scope['actions'] ?? $scope;

        if (! is_array($actions) || ! in_array($requiredAction, $actions, true)) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'You are not authorized to perform this action.',
                $correlationId,
                status: 403,
            );
        }
    }
}

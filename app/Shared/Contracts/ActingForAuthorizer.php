<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ActingForAuthorizer
{
    /**
     * Mutation-time recheck of exact resource type, nullable resource ID, and action in a write transaction.
     *
     * @throws \RuntimeException module/shared authorization errors mapped by callers
     */
    public function assertActive(
        string $grantId,
        string $granteeUserId,
        string $grantorUserId,
        string $correlationId,
        string $resourceType,
        ?string $resourceId,
        string $requiredAction,
    ): void;
}

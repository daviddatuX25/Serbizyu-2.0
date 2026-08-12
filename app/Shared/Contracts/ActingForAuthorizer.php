<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ActingForAuthorizer
{
    /**
     * Mutation-time recheck that grantee may act for grantor under an active consent.
     *
     * @throws \RuntimeException module/shared authorization errors mapped by callers
     */
    public function assertActive(
        string $grantId,
        string $granteeUserId,
        string $grantorUserId,
        string $correlationId,
        ?string $resourceType = null,
        ?string $requiredAction = null,
    ): void;
}

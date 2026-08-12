<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

/**
 * Fail-closed gate for live government-ID evidence collection (PRD-002 / E1-S3).
 */
final class IdentityVerificationGate
{
    public function liveCollectionEnabled(): bool
    {
        return (bool) config('serbizyu.identity.live_government_id_collection', false);
    }

    public function assertLiveCollectionAllowed(string $correlationId): void
    {
        if ($this->liveCollectionEnabled()) {
            return;
        }

        throw new IdentityAccessError(
            'CAPABILITY_DISABLED',
            'Live government-ID collection is not enabled in this environment.',
            $correlationId,
            status: 403,
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

final readonly class DeliveryResult
{
    public function __construct(
        public bool $accepted,
        public string $provider,
        public string $evidenceClass = 'TEAM_TRAINING',
        public ?string $providerReference = null,
        public ?string $failureReason = null,
    ) {}
}

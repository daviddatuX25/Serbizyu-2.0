<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

final readonly class OtpDelivery
{
    public function __construct(
        public string $phoneE164,
        public string $purpose,
        public string $code,
        public string $correlationId,
        public int $expiresInSeconds = 600,
    ) {}
}

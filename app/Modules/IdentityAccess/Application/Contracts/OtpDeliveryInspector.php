<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application\Contracts;

interface OtpDeliveryInspector
{
    /**
     * @return array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}|null
     */
    public function peekMirrored(string $phoneE164, string $purpose = 'login'): ?array;
}

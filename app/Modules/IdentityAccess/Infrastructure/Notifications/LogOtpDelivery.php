<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure\Notifications;

use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Application\DeliveryResult;
use App\Modules\IdentityAccess\Application\OtpDelivery;
use Illuminate\Support\Facades\Log;

/**
 * Local development adapter. Logs a redacted delivery event only — never a UI bypass.
 */
final class LogOtpDelivery implements OtpDeliveryChannel
{
    public function __construct(private readonly FakeOtpDelivery $fake) {}

    public function deliver(OtpDelivery $delivery): DeliveryResult
    {
        $result = $this->fake->deliver($delivery);

        Log::info('OTP delivery accepted (local fake channel)', [
            'phone_redacted' => $this->redactPhone($delivery->phoneE164),
            'purpose' => $delivery->purpose,
            'expires_in_seconds' => $delivery->expiresInSeconds,
            'correlation_id' => $delivery->correlationId,
            'provider' => $result->provider,
            'evidence_class' => $result->evidenceClass,
        ]);

        return new DeliveryResult(
            accepted: $result->accepted,
            provider: 'log+fake',
            evidenceClass: $result->evidenceClass,
            providerReference: $result->providerReference,
        );
    }

    private function redactPhone(string $phoneE164): string
    {
        if (strlen($phoneE164) < 6) {
            return '***';
        }

        return substr($phoneE164, 0, 4).str_repeat('*', max(0, strlen($phoneE164) - 7)).substr($phoneE164, -3);
    }
}

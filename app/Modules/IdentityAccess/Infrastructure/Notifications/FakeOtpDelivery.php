<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure\Notifications;

use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Application\DeliveryResult;
use App\Modules\IdentityAccess\Application\OtpDelivery;
use Illuminate\Support\Facades\Cache;

/**
 * Deterministic OTP delivery for local/test/capstone.
 * Exposes inspection only through this test seam / artisan peek — never via product UI.
 */
final class FakeOtpDelivery implements OtpDeliveryChannel
{
    /** @var list<array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}> */
    private array $deliveries = [];

    public function deliver(OtpDelivery $delivery): DeliveryResult
    {
        $record = [
            'phone_e164' => $delivery->phoneE164,
            'purpose' => $delivery->purpose,
            'code' => $delivery->code,
            'correlation_id' => $delivery->correlationId,
            'expires_in_seconds' => $delivery->expiresInSeconds,
            'delivered_at' => now()->toIso8601String(),
        ];

        $this->deliveries[] = $record;
        $this->mirrorForLocalInspection($record);

        return new DeliveryResult(
            accepted: true,
            provider: 'fake',
            evidenceClass: 'TEAM_TRAINING',
            providerReference: 'fake:'.count($this->deliveries),
        );
    }

    /** @return list<array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}> */
    public function deliveries(): array
    {
        return $this->deliveries;
    }

    /** @return array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}|null */
    public function lastDelivery(): ?array
    {
        if ($this->deliveries === []) {
            return null;
        }

        return $this->deliveries[array_key_last($this->deliveries)];
    }

    public function lastCodeFor(string $phoneE164, string $purpose = 'login'): ?string
    {
        foreach (array_reverse($this->deliveries) as $delivery) {
            if ($delivery['phone_e164'] === $phoneE164 && $delivery['purpose'] === $purpose) {
                return $delivery['code'];
            }
        }

        $mirrored = $this->peekMirrored($phoneE164, $purpose);
        if (! is_array($mirrored)) {
            return null;
        }

        return $mirrored['code'] !== '' ? $mirrored['code'] : null;
    }

    /**
     * Cross-process local/test inspection (Redis/cache). Forbidden outside disposable environments.
     *
     * @return array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}|null
     */
    public function peekMirrored(string $phoneE164, string $purpose = 'login'): ?array
    {
        if (! $this->allowsMirroredInspection()) {
            return null;
        }

        $value = Cache::get($this->cacheKey($phoneE164, $purpose));

        return is_array($value) ? $value : null;
    }

    public function flush(): void
    {
        $this->deliveries = [];
    }

    /**
     * @param  array{phone_e164: string, purpose: string, code: string, correlation_id: string, expires_in_seconds: int, delivered_at: string}  $record
     */
    private function mirrorForLocalInspection(array $record): void
    {
        if (! $this->allowsMirroredInspection()) {
            return;
        }

        Cache::put(
            $this->cacheKey($record['phone_e164'], $record['purpose']),
            $record,
            now()->addSeconds(max(60, (int) $record['expires_in_seconds'])),
        );
    }

    private function allowsMirroredInspection(): bool
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'production'));

        return in_array($environment, ['local', 'testing', 'test', 'capstone'], true);
    }

    private function cacheKey(string $phoneE164, string $purpose): string
    {
        return 'serbizyu:otp:fake:'.$purpose.':'.$phoneE164;
    }
}

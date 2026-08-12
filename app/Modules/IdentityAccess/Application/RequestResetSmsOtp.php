<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Requests and verifies a password-reset OTP for a phone-only account.
 *
 * Reset never auto-provisions: an unknown phone, a phone that never completed
 * signup, or a suspended account all produce the same generic confirmation and
 * no OTP is minted (non-enumerating recovery, ADR-R-030 decision 12).
 */
final class RequestResetSmsOtp
{
    private const TTL_SECONDS = 600;

    public const PURPOSE = 'reset';

    public function __construct(private readonly OtpDeliveryChannel $otpDelivery) {}

    /**
     * @return array{phone_e164: string, status: string, expires_in_seconds: int}
     */
    public function request(string $phone, string $correlationId): array
    {
        $phone = PhoneNumber::normalizePhilippineMobile($phone);
        $user = User::query()->where('phone_e164', $phone)->first();

        $recoverable = $user !== null
            && $user->phone_verified_at !== null
            && ! in_array((string) $user->status, ['suspended', 'closed', 'archived'], true);

        if (! $recoverable) {
            // Generic confirmation — no OTP minted, no delivery.
            return [
                'phone_e164' => $phone,
                'status' => 'code_pending',
                'expires_in_seconds' => self::TTL_SECONDS,
            ];
        }

        $code = (string) random_int(100000, 999999);

        DB::transaction(function () use ($phone, $code, $correlationId): void {
            DB::table('auth_otps')
                ->where('phone_e164', $phone)
                ->where('purpose', self::PURPOSE)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now(), 'updated_at' => now()]);

            DB::table('auth_otps')->insert([
                'id' => (string) Str::uuid7(),
                'phone_e164' => $phone,
                'purpose' => self::PURPOSE,
                'code_hash' => hash('sha256', $code),
                'attempts' => 0,
                'expires_at' => now()->addSeconds(self::TTL_SECONDS),
                'consumed_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $this->otpDelivery->deliver(new OtpDelivery(
            phoneE164: $phone,
            purpose: self::PURPOSE,
            code: $code,
            correlationId: $correlationId,
            expiresInSeconds: self::TTL_SECONDS,
        ));

        return [
            'phone_e164' => $phone,
            'status' => 'code_pending',
            'expires_in_seconds' => self::TTL_SECONDS,
        ];
    }
}

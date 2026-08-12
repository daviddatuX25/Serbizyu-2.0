<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Begins strict mobile signup: pending user + signup_verify OTP (Fake OTP until live SMS gate).
 */
final class StartSignup
{
    private const TTL_SECONDS = 600;

    public const PURPOSE = 'signup_verify';

    public function __construct(private readonly OtpDeliveryChannel $otpDelivery) {}

    /**
     * @return array{phone_e164: string, status: string, expires_in_seconds: int}
     */
    public function handle(string $phone, string $correlationId, ?string $displayName = null): array
    {
        $phone = PhoneNumber::normalizePhilippineMobile($phone);
        $user = User::query()->where('phone_e164', $phone)->first();

        if ($user !== null && $user->phone_verified_at !== null) {
            // Non-enumerating: do not reveal that the number is already registered.
            return [
                'phone_e164' => $phone,
                'status' => 'code_pending',
                'expires_in_seconds' => self::TTL_SECONDS,
            ];
        }

        if ($user !== null && in_array((string) $user->status, ['suspended', 'closed', 'archived'], true)) {
            return [
                'phone_e164' => $phone,
                'status' => 'code_pending',
                'expires_in_seconds' => self::TTL_SECONDS,
            ];
        }

        if ($user === null) {
            $user = DB::transaction(function () use ($phone, $correlationId, $displayName): User {
                $now = now();
                $userId = (string) Str::uuid7();
                DB::table('users')->insert([
                    'id' => $userId,
                    'phone_e164' => $phone,
                    'status' => 'pending',
                    'primary_access_tier' => 'L0',
                    'locale' => 'en',
                    'timezone' => 'Asia/Manila',
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('user_profiles')->insert([
                    'user_id' => $userId,
                    'display_name' => trim((string) $displayName),
                    'public_bio' => null,
                    'avatar_file_id' => null,
                    'service_area_display' => null,
                    'accessibility_preferences' => json_encode([], JSON_THROW_ON_ERROR),
                    'language_preferences' => json_encode(['primary' => 'en'], JSON_THROW_ON_ERROR),
                    'emergency_contact_policy' => null,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return User::query()->findOrFail($userId);
            });
        } elseif ($displayName !== null && trim($displayName) !== '') {
            DB::table('user_profiles')->where('user_id', $user->id)->update([
                'display_name' => trim($displayName),
                'updated_at' => now(),
            ]);
        }

        unset($user);

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

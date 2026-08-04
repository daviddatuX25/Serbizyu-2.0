<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PhoneOtpAuthService
{
    private const MAX_ATTEMPTS = 5;

    private const TTL_SECONDS = 600;

    public function __construct(private readonly OtpDeliveryChannel $otpDelivery) {}

    /** @return array{phone_e164: string, status: string, expires_in_seconds: int} */
    public function requestCode(string $phone, string $correlationId): array
    {
        $phone = $this->normalize($phone);
        $user = User::query()->where('phone_e164', $phone)->first();

        if ($user !== null && in_array((string) $user->status, ['suspended', 'closed', 'archived'], true)) {
            // Generic response — do not reveal account existence or suspension details.
            return [
                'phone_e164' => $phone,
                'status' => 'code_pending',
                'expires_in_seconds' => self::TTL_SECONDS,
            ];
        }

        if ($user === null) {
            $user = DB::transaction(function () use ($phone, $correlationId): User {
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
                    'display_name' => '',
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
        }

        $code = (string) random_int(100000, 999999);

        DB::transaction(function () use ($phone, $code, $correlationId): void {
            DB::table('auth_otps')
                ->where('phone_e164', $phone)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now(), 'updated_at' => now()]);

            DB::table('auth_otps')->insert([
                'id' => (string) Str::uuid7(),
                'phone_e164' => $phone,
                'purpose' => 'login',
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
            purpose: 'login',
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

    public function verifyCode(string $phone, string $code, Request $request, string $correlationId): User
    {
        $phone = $this->normalize($phone);
        $otp = DB::table('auth_otps')
            ->where('phone_e164', $phone)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if ($otp === null || now()->greaterThan($otp->expires_at) || (int) $otp->attempts >= self::MAX_ATTEMPTS) {
            throw new IdentityAccessError(
                'OTP_INVALID',
                'That verification code is invalid or expired.',
                $correlationId,
                status: 422,
            );
        }

        if (! hash_equals((string) $otp->code_hash, hash('sha256', trim($code)))) {
            DB::table('auth_otps')->where('id', $otp->id)->increment('attempts');

            throw new IdentityAccessError(
                'OTP_INVALID',
                'That verification code is invalid or expired.',
                $correlationId,
                status: 422,
            );
        }

        $user = User::query()->where('phone_e164', $phone)->first();
        if ($user === null || in_array((string) $user->status, ['suspended', 'closed', 'archived'], true)) {
            throw new IdentityAccessError(
                'ACCOUNT_UNAVAILABLE',
                'This account is not available.',
                $correlationId,
                status: 403,
            );
        }

        DB::transaction(function () use ($otp, $user, $correlationId): void {
            DB::table('auth_otps')->where('id', $otp->id)->update([
                'consumed_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('users')->where('id', $user->id)->update([
                'status' => 'active',
                'phone_verified_at' => now(),
                'last_login_at' => now(),
                'updated_at' => now(),
                'correlation_id' => $correlationId,
            ]);
        });

        Auth::login($user, remember: false);
        $request->session()->regenerate();

        return $user->fresh() ?? $user;
    }

    public function logout(Request $request): void
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    private function normalize(string $phone): string
    {
        $phone = preg_replace('/[\s().-]+/', '', trim($phone)) ?? '';

        if (preg_match('/^09\d{9}$/', $phone) === 1) {
            $phone = '+63'.substr($phone, 1);
        }

        if (preg_match('/^\+639\d{9}$/', $phone) !== 1) {
            throw new \RuntimeException('Use a valid Philippine mobile number.');
        }

        return $phone;
    }
}

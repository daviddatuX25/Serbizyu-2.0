<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * SMS OTP return sign-in (P1, ADR-R-030 decision 2).
 *
 * The `/auth/phone/*` routes are a return-login fallback for phone-verified
 * accounts only. Unknown, unverified, and suspended numbers all answer the
 * same generic shape and never mint an OTP (non-enumerating). Signup OTP
 * lives in StartSignup/CompleteSignupPhoneOtp via `/auth/register/*`.
 */
final class PhoneOtpAuthService
{
    private const MAX_ATTEMPTS = 5;

    private const TTL_SECONDS = 600;

    public const PURPOSE = 'login';

    public function __construct(private readonly OtpDeliveryChannel $otpDelivery) {}

    /** @return array{phone_e164: string, status: string, expires_in_seconds: int} */
    public function requestCode(string $phone, string $correlationId): array
    {
        $phone = $this->normalize($phone);
        $user = User::query()->where('phone_e164', $phone)->first();

        $mayLogin = $user !== null
            && $user->phone_verified_at !== null
            && ! in_array((string) $user->status, ['suspended', 'closed', 'archived'], true);

        if (! $mayLogin) {
            // Generic — no OTP minted, no delivery (login is return-only).
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

    public function verifyCode(string $phone, string $code, Request $request, string $correlationId): User
    {
        $phone = $this->normalize($phone);
        $otp = DB::table('auth_otps')
            ->where('phone_e164', $phone)
            ->where('purpose', self::PURPOSE)
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
        if ($user === null
            || $user->phone_verified_at === null
            || in_array((string) $user->status, ['suspended', 'closed', 'archived'], true)
        ) {
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
        return PhoneNumber::normalizePhilippineMobile($phone);
    }
}

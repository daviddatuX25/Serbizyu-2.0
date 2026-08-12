<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/** Completes strict mobile signup when signup_verify OTP succeeds. */
final class CompleteSignupPhoneOtp
{
    private const MAX_ATTEMPTS = 5;

    public function handle(string $phone, string $code, Request $request, string $correlationId): User
    {
        $phone = PhoneNumber::normalizePhilippineMobile($phone);
        $otp = DB::table('auth_otps')
            ->where('phone_e164', $phone)
            ->where('purpose', StartSignup::PURPOSE)
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
                'phone_verified_at' => $user->phone_verified_at ?? now(),
                'last_login_at' => now(),
                'updated_at' => now(),
                'correlation_id' => $correlationId,
            ]);
        });

        $user = $user->fresh() ?? $user;

        Auth::login($user, remember: false);
        $request->session()->regenerate();

        return $user;
    }
}

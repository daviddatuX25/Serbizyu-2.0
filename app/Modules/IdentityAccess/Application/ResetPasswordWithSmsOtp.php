<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Verifies a password-reset SMS OTP and sets a new password for a
 * phone-verified account (ADR-R-030 decision 12).
 *
 * The OTP is hashed at rest, single-use, attempt-limited, and expiry-bounded
 * (same semantics as signup/login OTPs). Verification never establishes a
 * session: after reset the user returns to sign-in.
 */
final class ResetPasswordWithSmsOtp
{
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly SetAccountPassword $setPassword) {}

    public function handle(string $phone, string $code, string $password, string $correlationId): User
    {
        $phone = PhoneNumber::normalizePhilippineMobile($phone);
        $otp = DB::table('auth_otps')
            ->where('phone_e164', $phone)
            ->where('purpose', RequestResetSmsOtp::PURPOSE)
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if ($otp === null || now()->greaterThan($otp->expires_at) || (int) $otp->attempts >= self::MAX_ATTEMPTS) {
            throw new IdentityAccessError(
                'RESET_INVALID',
                'That reset code is invalid or expired.',
                $correlationId,
                status: 422,
            );
        }

        if (! hash_equals((string) $otp->code_hash, hash('sha256', trim($code)))) {
            DB::table('auth_otps')->where('id', $otp->id)->increment('attempts');

            throw new IdentityAccessError(
                'RESET_INVALID',
                'That reset code is invalid or expired.',
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

        DB::transaction(function () use ($otp, $user, $password, $correlationId): void {
            DB::table('auth_otps')->where('id', $otp->id)->update([
                'consumed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->setPassword->handle($user, $password, $correlationId);
        });

        return $user->fresh() ?? $user;
    }
}

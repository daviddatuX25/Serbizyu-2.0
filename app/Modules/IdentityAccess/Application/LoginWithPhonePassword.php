<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Ordinary return sign-in via phone + password — no SMS. */
final class LoginWithPhonePassword
{
    public function handle(string $phone, string $password, Request $request, string $correlationId): User
    {
        $phone = PhoneNumber::normalizePhilippineMobile($phone);

        $ok = Auth::attempt([
            'phone_e164' => $phone,
            'password' => $password,
        ], remember: false);

        if (! $ok) {
            throw new IdentityAccessError(
                'AUTH_FAILED',
                'These credentials do not match our records.',
                $correlationId,
                status: 422,
                fieldErrors: ['phone' => ['These credentials do not match our records.']],
            );
        }

        /** @var User $user */
        $user = Auth::user();

        if ($user->phone_verified_at === null) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw new IdentityAccessError(
                'PHONE_VERIFICATION_REQUIRED',
                'Complete mobile signup before signing in.',
                $correlationId,
                status: 403,
            );
        }

        if (in_array((string) $user->status, ['suspended', 'closed', 'archived'], true)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw new IdentityAccessError(
                'ACCOUNT_UNAVAILABLE',
                'This account is not available.',
                $correlationId,
                status: 403,
            );
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $request->session()->regenerate();

        return $user->fresh() ?? $user;
    }
}

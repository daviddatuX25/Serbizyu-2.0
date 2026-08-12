<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Ordinary return sign-in via email/password — no SMS. */
final class LoginWithEmailPassword
{
    public function handle(string $email, string $password, Request $request, string $correlationId): User
    {
        $email = strtolower(trim($email));

        $credentials = [
            'email' => $email,
            'password' => $password,
        ];

        if (! Auth::attempt($credentials, remember: false)) {
            throw new IdentityAccessError(
                'AUTH_FAILED',
                'These credentials do not match our records.',
                $correlationId,
                status: 422,
                fieldErrors: ['email' => ['These credentials do not match our records.']],
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
                'Complete mobile signup before signing in with email.',
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

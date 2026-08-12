<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Support\Facades\Password;

/**
 * Resets a password via the emailed single-use token (ADR-R-030 decision 12).
 *
 * Uses the stock Laravel Password broker, so token expiry, throttling, and
 * single-use consumption come from config. The reset never logs the user in;
 * on success the user returns to sign-in.
 */
final class ResetPasswordWithToken
{
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly SetAccountPassword $setPassword) {}

    public function handle(string $email, string $token, string $password, string $correlationId): User
    {
        $email = strtolower(trim($email));
        if ($email === '') {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'Enter an email address.',
                $correlationId,
                status: 422,
                fieldErrors: ['email' => ['Enter an email address.']],
            );
        }

        $status = Password::reset(
            [
                'email' => $email,
                'token' => $token,
                'password' => $password,
                'password_confirmation' => $password,
            ],
            function (User $user, string $password) use ($correlationId): void {
                $this->setPassword->handle($user, $password, $correlationId);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw new IdentityAccessError(
                'RESET_INVALID',
                'That reset link is invalid or has expired.',
                $correlationId,
                status: 422,
            );
        }

        $user = User::query()->where('email', $email)->first();
        if ($user === null) {
            throw new IdentityAccessError(
                'ACCOUNT_UNAVAILABLE',
                'This account is not available.',
                $correlationId,
                status: 403,
            );
        }

        return $user->fresh() ?? $user;
    }
}

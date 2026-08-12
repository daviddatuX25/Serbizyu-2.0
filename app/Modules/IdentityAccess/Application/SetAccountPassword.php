<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;

/** Sets or replaces account-level password for a phone-verified user. */
final class SetAccountPassword
{
    public function handle(User $user, string $password, string $correlationId): User
    {
        if ($user->phone_verified_at === null) {
            throw new IdentityAccessError(
                'PHONE_VERIFICATION_REQUIRED',
                'Verify your mobile number before setting a password.',
                $correlationId,
                status: 422,
            );
        }

        $password = trim($password);
        if ($password === '') {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'Choose a password for return sign-in.',
                $correlationId,
                status: 422,
                fieldErrors: ['password' => ['Choose a password for return sign-in.']],
            );
        }

        $user->forceFill([
            'password' => $password,
            'correlation_id' => $correlationId,
        ])->save();

        return $user->fresh() ?? $user;
    }
}

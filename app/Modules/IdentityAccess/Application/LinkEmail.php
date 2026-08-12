<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Mail\Auth\EmailCredentialsSet;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/** Optionally links email to a phone-verified account. Does not invent a password. */
final class LinkEmail
{
    public function handle(User $user, string $email, string $correlationId): User
    {
        if ($user->phone_verified_at === null) {
            throw new IdentityAccessError(
                'PHONE_VERIFICATION_REQUIRED',
                'Verify your mobile number before adding email sign-in.',
                $correlationId,
                status: 422,
            );
        }

        if ($user->password === null || $user->password === '') {
            throw new IdentityAccessError(
                'PASSWORD_REQUIRED',
                'Set an account password before linking email.',
                $correlationId,
                status: 422,
                fieldErrors: ['password' => ['Set a password first.']],
            );
        }

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

        $taken = User::query()
            ->where('email', $email)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($taken) {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'That email cannot be used.',
                $correlationId,
                status: 422,
                fieldErrors: ['email' => ['That email cannot be used.']],
            );
        }

        $user->forceFill([
            'email' => $email,
            'email_verified_at' => now(),
            'correlation_id' => $correlationId,
        ])->save();

        $fresh = $user->fresh() ?? $user;

        Mail::to($email)->send(
            (new EmailCredentialsSet($fresh))->afterCommit()
        );

        return $fresh;
    }
}

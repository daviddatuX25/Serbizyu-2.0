<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Support\Facades\Password;

/**
 * Requests a password reset link for a linked email (ADR-R-030 decision 12).
 *
 * Uses the stock Laravel Password broker: single-use token, 60-minute expiry,
 * 60-second throttle. The response is always the same generic confirmation —
 * unknown email, unverified account, and suspended account are indistinguishable
 * (no account-existence leak).
 */
final class RequestPasswordReset
{
    /**
     * @return array{status: string}
     */
    public function handle(string $email, string $correlationId): array
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

        $status = Password::sendResetLink(['email' => $email]);

        // Only two outcomes surface; the "success" copy is what matters.
        if ($status !== Password::RESET_LINK_SENT) {
            return ['status' => 'reset_link_sent'];
        }

        return ['status' => 'reset_link_sent'];
    }
}

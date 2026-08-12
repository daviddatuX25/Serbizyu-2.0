<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure\Auth;

use App\Shared\Contracts\OAuthLoginPort;

/** Default Google OAuth adapter — disabled until live/mock gate packets. */
final class DisabledOAuthLoginPort implements OAuthLoginPort
{
    public function enabled(): bool
    {
        return false;
    }

    public function beginAuthorization(string $correlationId, string $returnTo): ?array
    {
        return null;
    }
}

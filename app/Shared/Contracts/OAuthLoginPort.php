<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Google (and later) OAuth login/link port. Live adapters stay gated.
 */
interface OAuthLoginPort
{
    public function enabled(): bool;

    /**
     * @return array{authorization_url: string}|null Null when disabled.
     */
    public function beginAuthorization(string $correlationId, string $returnTo): ?array;
}

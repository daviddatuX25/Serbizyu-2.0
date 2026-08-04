<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\AuthorizationContext;
use App\Shared\Contracts\CorrelationId;

final readonly class AuthorizationDecision
{
    public function __construct(
        public bool $allowed,
        public CorrelationId $correlationId,
        public AuthorizationContext $authorization,
        public ?ErrorEnvelope $error = null,
    ) {}

    public static function denied(AuthorizationContext $authorization, CorrelationId $correlationId): self
    {
        return new self(
            allowed: false,
            correlationId: $correlationId,
            authorization: $authorization,
            error: ErrorEnvelope::authorizationDenied($correlationId),
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

final readonly class AuthorizationContext
{
    public function __construct(
        public ?string $actorId,
        public ?string $actingForOwnerId = null,
        public ?string $grantReference = null,
        public bool $authenticated = false,
    ) {}

    public static function anonymous(): self
    {
        return new self(actorId: null);
    }

    public function toArray(): array
    {
        return [
            'actor_id' => $this->actorId,
            'acting_for_owner_id' => $this->actingForOwnerId,
            'grant_reference' => $this->grantReference,
            'authenticated' => $this->authenticated,
        ];
    }
}

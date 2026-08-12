<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\AuthorizationContext;

final readonly class ActorContext
{
    public function __construct(
        public ActorKind $kind,
        public ?string $actorUserId,
        public ?string $actingForUserId = null,
        public ?string $grantReference = null,
        public ?string $integrationClientId = null,
        public bool $authenticated = false,
    ) {}

    public static function human(string $userId, bool $authenticated = true): self
    {
        return new self(
            kind: ActorKind::Human,
            actorUserId: $userId,
            authenticated: $authenticated,
        );
    }

    public static function system(?string $jobName = null): self
    {
        return new self(
            kind: ActorKind::System,
            actorUserId: null,
            grantReference: $jobName,
            authenticated: true,
        );
    }

    public static function actingFor(string $actorUserId, string $ownerUserId, string $grantId): self
    {
        return new self(
            kind: ActorKind::Human,
            actorUserId: $actorUserId,
            actingForUserId: $ownerUserId,
            grantReference: $grantId,
            authenticated: true,
        );
    }

    public function authorizationContext(): AuthorizationContext
    {
        return new AuthorizationContext(
            actorId: $this->actorUserId,
            actingForOwnerId: $this->actingForUserId,
            grantReference: $this->grantReference,
            authenticated: $this->authenticated,
        );
    }
}

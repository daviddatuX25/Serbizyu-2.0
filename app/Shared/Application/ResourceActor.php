<?php

declare(strict_types=1);

namespace App\Shared\Application;

/** Who is performing a write and which resource owner it affects. */
final readonly class ResourceActor
{
    public function __construct(
        public string $resourceOwnerId,
        public string $actorUserId,
        public ?string $consentGrantId = null,
    ) {}

    public function isActingFor(): bool
    {
        return $this->consentGrantId !== null
            && $this->actorUserId !== $this->resourceOwnerId;
    }

    public function toActorContext(): ActorContext
    {
        if ($this->isActingFor() && $this->consentGrantId !== null) {
            return ActorContext::actingFor(
                $this->actorUserId,
                $this->resourceOwnerId,
                $this->consentGrantId,
            );
        }

        return ActorContext::human($this->actorUserId);
    }
}

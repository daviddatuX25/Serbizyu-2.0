<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Shared\Application\ResourceActor;

final class ResumeListing
{
    public function __construct(private readonly ListingCommandStore $store) {}

    /** @return array<string, mixed> */
    public function handle(
        string $listingId,
        ResourceActor $actor,
        int $expectedVersion,
        string $correlationId,
    ): array {
        return $this->store->resume($listingId, $actor, $expectedVersion, $correlationId);
    }
}

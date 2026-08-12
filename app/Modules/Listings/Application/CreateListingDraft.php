<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Shared\Application\ResourceActor;

final class CreateListingDraft
{
    public function __construct(private readonly ListingCommandStore $store) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function handle(ResourceActor $actor, array $input, string $correlationId): array
    {
        return $this->store->createDraft($actor, $input, $correlationId);
    }
}

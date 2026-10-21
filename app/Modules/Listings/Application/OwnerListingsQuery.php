<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Contracts\OwnerListingReader;

final class OwnerListingsQuery
{
    public function __construct(private readonly OwnerListingReader $reader) {}

    /** @return list<array<string, mixed>> */
    public function handle(string $ownerUserId, string $correlationId): array
    {
        return $this->reader->ownerListings($ownerUserId, $correlationId);
    }

    /** @return array<string, mixed>|null */
    public function find(string $listingId, string $ownerUserId, string $correlationId): ?array
    {
        return $this->reader->ownerListing($listingId, $ownerUserId, $correlationId);
    }
}

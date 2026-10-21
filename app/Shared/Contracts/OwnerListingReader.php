<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface OwnerListingReader
{
    /**
     * Private owner projection for My Listings (includes draft / pending_review / active).
     *
     * @return list<array<string, mixed>>
     */
    public function ownerListings(string $ownerUserId, string $correlationId): array;

    /**
     * Private owner projection for one listing.
     *
     * @return array<string, mixed>|null
     */
    public function ownerListing(string $listingId, string $ownerUserId, string $correlationId): ?array;
}

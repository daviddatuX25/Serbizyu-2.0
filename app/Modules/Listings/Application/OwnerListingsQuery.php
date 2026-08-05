<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\OwnerListingReader;

final class OwnerListingsQuery
{
    public function __construct(private readonly OwnerListingReader $reader) {}

    /** @return list<array<string, mixed>> */
    public function handle(string $ownerUserId, string $correlationId): array
    {
        return $this->reader->ownerListings($ownerUserId, $correlationId);
    }
}

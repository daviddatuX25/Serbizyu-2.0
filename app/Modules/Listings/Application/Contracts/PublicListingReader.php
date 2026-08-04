<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application\Contracts;

interface PublicListingReader
{
    /** @return list<array<string, mixed>> */
    public function publicListings(string $correlationId): array;

    /** @return array<string, mixed>|null */
    public function publicDetail(string $listingId, string $correlationId): ?array;
}

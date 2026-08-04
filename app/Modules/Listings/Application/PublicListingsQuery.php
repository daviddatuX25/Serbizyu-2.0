<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\PublicListingReader;

final class PublicListingsQuery
{
    public function __construct(private readonly PublicListingReader $reader) {}

    /** @return list<array<string, mixed>> */
    public function handle(string $correlationId): array
    {
        return $this->reader->publicListings($correlationId);
    }
}

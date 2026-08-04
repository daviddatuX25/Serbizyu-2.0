<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\PublicListingReader;

final class PublicListingDetailQuery
{
    public function __construct(private readonly PublicListingReader $reader) {}

    /** @return array<string, mixed>|null */
    public function handle(string $listingId, string $correlationId): ?array
    {
        return $this->reader->publicDetail($listingId, $correlationId);
    }
}

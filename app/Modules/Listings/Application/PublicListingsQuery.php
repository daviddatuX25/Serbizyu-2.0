<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\PublicListingReader;

final class PublicListingsQuery
{
    public function __construct(private readonly PublicListingReader $reader) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function handle(
        string $correlationId,
        string $areaCode = 'Tagudin',
        ?string $categoryCode = null,
        ?string $cursor = null,
        int $limit = 24,
    ): array {
        return $this->reader->discoverPublicListings(
            $correlationId,
            $areaCode,
            $categoryCode,
            $cursor,
            $limit,
        );
    }
}

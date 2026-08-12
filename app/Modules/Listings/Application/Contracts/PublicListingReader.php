<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application\Contracts;

interface PublicListingReader
{
    /** @return list<array<string, mixed>> */
    public function publicListings(string $correlationId): array;

    /**
     * Tagudin-scoped discovery with optional category filter and id cursor.
     *
     * @return list<array<string, mixed>>
     */
    public function discoverPublicListings(
        string $correlationId,
        string $areaCode = 'Tagudin',
        ?string $categoryCode = null,
        ?string $cursor = null,
        int $limit = 24,
    ): array;

    /** @return array<string, mixed>|null */
    public function publicDetail(string $listingId, string $correlationId): ?array;
}

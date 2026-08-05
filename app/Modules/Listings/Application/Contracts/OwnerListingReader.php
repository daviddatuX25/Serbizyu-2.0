<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application\Contracts;

interface OwnerListingReader
{
    /**
     * Private owner projection for My Listings (includes draft / pending_review / active).
     *
     * @return list<array<string, mixed>>
     */
    public function ownerListings(string $ownerUserId, string $correlationId): array;
}

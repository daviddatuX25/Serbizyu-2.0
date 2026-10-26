<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffListingsReaderPort extends StaffDomainReaderPort
{
    /** @return array<string, mixed>|null */
    public function stockFactsForListing(string $listingId): ?array;
}

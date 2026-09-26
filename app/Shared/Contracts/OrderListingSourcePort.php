<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Read-only listing source for ordinary Order formation (OrdersWork must not import Listings).
 *
 * @phpstan-type ListingOrderSource array{
 *     listing_id: string,
 *     owner_user_id: string,
 *     listing_version_id: string,
 *     listing_version_number: int,
 *     listing_row_version: int,
 *     listing_type: string,
 *     status: string,
 *     review_status: string,
 *     title: string,
 *     description: string,
 *     category_code: string,
 *     geography_area: string,
 *     price_amount_minor: int|null,
 *     currency: string|null,
 *     category_id: string|null,
 *     category_business_version: int|null,
 *     capability_profile_id: string,
 *     capability_profile_family_code: string|null,
 *     capability_profile_business_version: int|null,
 *     work_shape: string,
 *     work_specification?: array<string, mixed>|null,
 *     milestone_stages?: list<array<string, mixed>>
 * }
 */
interface OrderListingSourcePort
{
    /**
     * @return ListingOrderSource|null
     */
    public function findActiveApproved(string $listingId): ?array;

    /**
     * Returns the same source projection while holding the governed listing,
     * published listing version, and capability profile rows for update.
     *
     * @return ListingOrderSource|null
     */
    public function lockActiveApproved(string $listingId): ?array;
}

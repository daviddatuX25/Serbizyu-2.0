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
 *     capability_profile_business_version: int|null
 * }
 */
interface OrderListingSourcePort
{
    /**
     * @return ListingOrderSource|null
     */
    public function findActiveApproved(string $listingId): ?array;
}

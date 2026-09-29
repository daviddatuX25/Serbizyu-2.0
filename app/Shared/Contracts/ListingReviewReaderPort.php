<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ListingReviewReaderPort
{
    /**
     * Get aggregate review metrics and Bayesian dampening score for a listing.
     *
     * @return array{
     *     rating: float,
     *     bayesian_rating: float,
     *     reviews_count: int,
     *     verified_count: int,
     *     distribution: array{1: int, 2: int, 3: int, 4: int, 5: int},
     *     satisfaction_pct: int,
     * }
     */
    public function summaryForListing(string $listingId, ?string $categoryCode = null): array;

    /**
     * Get unblinded, approved reviews for a listing with pagination.
     *
     * @return list<array{
     *     id: string,
     *     author: string,
     *     barangay: string,
     *     time_ago: string,
     *     created_at: string,
     *     stars: int,
     *     package_tag: string,
     *     quote: string,
     *     attribute_chips: list<string>,
     *     has_photo: bool,
     *     photo_url: ?string,
     *     verified: bool,
     * }>
     */
    public function reviewsForListing(string $listingId, int $limit = 10, int $offset = 0): array;

    /**
     * Batch review summaries for listing cards.
     *
     * @param list<string> $listingIds
     * @return array<string, array{
     *     rating: float,
     *     reviews_count: int,
     *     rating_label: string,
     * }>
     */
    public function summariesForListings(array $listingIds): array;
}

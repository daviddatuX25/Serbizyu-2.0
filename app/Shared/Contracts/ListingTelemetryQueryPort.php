<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ListingTelemetryQueryPort
{
    /**
     * Get 30-day funnel metrics for a single listing.
     * If the listing is draft or has 0 traffic, category benchmark projections may be returned.
     *
     * @return array{
     *     impressions: int,
     *     views: int,
     *     inquiries: int,
     *     orders: int,
     *     gross_amount_minor: int,
     *     ctr_pct: string,
     *     cvr_pct: string,
     *     is_projected: bool,
     * }
     */
    public function forListing(
        string $listingId,
        string $status,
        string $categoryCode,
        int $days = 30,
    ): array;

    /**
     * Batch query telemetry metrics for a list of listings (used on /my-listings scan table).
     *
     * @param  list<string>  $listingIds
     * @return array<string, array{
     *     impressions: int,
     *     views: int,
     *     inquiries: int,
     *     orders: int,
     *     ctr_pct: string,
     *     cvr_pct: string,
     *     is_projected: bool,
     * }>
     */
    public function forListings(array $listingIds): array;

    /**
     * Record an observational beacon event (impression, view, inquiry_started).
     */
    public function recordEvent(
        string $eventType,
        string $listingId,
        ?string $actorUserId = null,
        ?string $sessionId = null,
        ?string $correlationId = null,
    ): void;
}

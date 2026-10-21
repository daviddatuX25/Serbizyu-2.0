<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\OwnerListingsQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Shared\Contracts\ListingReviewReaderPort;
use App\Shared\Contracts\ListingTelemetryQueryPort;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class MyListingsController
{
    public function __construct(
        private readonly SliceStateQuery $sliceState,
        private readonly OwnerListingsQuery $ownerListings,
        private readonly PublicListingsQuery $publicListings,
        private readonly EnvironmentValidator $environment,
        private readonly ListingReviewReaderPort $reviews,
        private readonly ListingTelemetryQueryPort $telemetry,
    ) {}

    public function __invoke(Request $request): InertiaResponse
    {
        $correlationId = (string) $request->attributes->get('correlation_id');
        $state = $this->sliceState->for($request);
        $publicListings = $this->publicListings->handle($correlationId);

        $myListings = (array) ($state['myListings'] ?? []);
        $listingIds = array_values(array_filter(array_column($myListings, 'id'), 'is_string'));
        $telemetryMap = $this->telemetry->forListings($listingIds);
        $reviewSummaries = $this->reviews->summariesForListings($listingIds);

        $enrichedMyListings = array_map(function (array $listing) use ($telemetryMap, $reviewSummaries): array {
            $id = (string) ($listing['id'] ?? '');

            return [
                ...$listing,
                'telemetry' => $telemetryMap[$id] ?? null,
                'review_summary' => $reviewSummaries[$id] ?? null,
            ];
        }, $myListings);

        $state['myListings'] = $enrichedMyListings;

        $slice = [
            ...$state,
            'myListings' => $enrichedMyListings,
            'publicListings' => $publicListings,
            'activeListingDetail' => null,
            'denial' => null,
        ];

        return Inertia::render('MyListings', [
            'app' => [
                'name' => (string) config('app.name', 'Serbizyu'),
                'environment' => (string) config('serbizyu.public_environment', 'local'),
                'stage' => 'foundation_slice',
            ],
            'experience' => 'foundation_v1',
            'pageMode' => 'listings',
            'runtime' => $this->environment->safeSummary(config('serbizyu', [])),
            'correlationId' => $correlationId,
            'scope' => [
                'productFeatures' => false,
                'externalProviders' => false,
                'schemaMigrations' => false,
            ],
            ...$slice,
            'slice' => $slice,
        ]);
    }

    public function show(Request $request, string $listing): InertiaResponse
    {
        $correlationId = (string) $request->attributes->get('correlation_id');
        $ownerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($ownerUserId === '', 401);

        $ownerListing = $this->ownerListings->find($listing, $ownerUserId, $correlationId);
        abort_if($ownerListing === null, 404);

        $status = (string) ($ownerListing['status'] ?? 'draft');
        $categoryCode = (string) ($ownerListing['category_code'] ?? 'default');

        $reviews = $this->reviews->reviewsForListing($listing, limit: 20);
        $reviewSummary = $this->reviews->summaryForListing($listing, $categoryCode);
        $telemetry = $this->telemetry->forListing($listing, $status, $categoryCode);

        $enrichedListing = [
            ...$ownerListing,
            'rating_summary' => $reviewSummary,
        ];

        return Inertia::render('Listings/OwnerPreview', [
            'listing' => $enrichedListing,
            'reviews' => $reviews,
            'reviewSummary' => $reviewSummary,
            'telemetry' => $telemetry,
            'notice' => $request->session()->get('notice'),
            'correlationId' => $correlationId,
        ]);
    }
}

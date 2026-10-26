<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\RoleCapabilityReaderPort;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * RequestDetailProjector:
 * Enforces relationship-scoped projections for open and sealed tenders (ADR-R-004, VP-REQ-001..012).
 *
 * Rules:
 * - Guests and Non-Bidders: See request terms and privacy-safe status. Zero competitor quote terms or amounts.
 * - Eligible Responders: See request terms and can bid. Zero competitor quote terms or amounts.
 * - Bidders (Providers who quoted): See request terms and ONLY their own submitted quote.
 * - Requester (Homeowner): Sees all submitted quotes with full comparison data.
 */
final class RequestDetailProjector
{
    public function __construct(
        private readonly RoleCapabilityReaderPort $roles,
        private readonly OrderCapacityPort $capacity,
        private readonly OrderListingSourcePort $listings,
    ) {}

    /**
     * @return array{
     *     request: array<string, mixed>,
     *     quotes: list<array<string, mixed>>,
     *     viewer_role: string,
     *     session: array<string, mixed>|null,
     *     actions: array<string, mixed>
     * }|null
     */
    public function project(Request $request, string $requestId, string $correlationId): ?array
    {
        $requestRecord = DB::table('requests')->where('id', $requestId)->first();
        if ($requestRecord === null) {
            return null;
        }

        $user = $request->user();
        $userId = $user !== null ? (string) $user->getAuthIdentifier() : null;
        $displayName = $userId === null
            ? ''
            : (string) (DB::table('user_profiles')->where('user_id', $userId)->value('display_name') ?: '');
        $sessionData = $userId === null ? null : [
            'authenticated' => true,
            'isAuthenticated' => true,
            'status' => 'authenticated',
            'user_id' => $userId,
            'userId' => $userId,
            'source' => 'phone_otp',
            'display_name' => $displayName,
            'displayName' => $displayName,
        ];

        $isRequester = $userId !== null && $userId === (string) $requestRecord->requester_user_id;
        $hasProviderRole = $userId !== null && $this->roles->hasActive($userId, 'provide');

        // Determine viewer relationship
        if ($isRequester) {
            $viewerRole = 'requester';
        } elseif ($userId === null) {
            $viewerRole = 'guest';
        } else {
            $hasOwnQuote = DB::table('quotes')
                ->where('request_id', $requestId)
                ->where('provider_user_id', $userId)
                ->exists();

            if ($hasOwnQuote) {
                $viewerRole = 'bidder';
            } elseif ($hasProviderRole) {
                $viewerRole = 'eligible_responder';
            } else {
                $viewerRole = 'member';
            }
        }

        // Project quotes based strictly on viewer relationship (ADR-R-004)
        $quotesQuery = DB::table('quotes')->where('request_id', $requestId);

        if ($isRequester) {
            // Requester sees all quotes for comparison
            $quotes = $quotesQuery->orderBy('created_at', 'asc')->get();
        } elseif ($viewerRole === 'bidder') {
            // Bidder sees ONLY their own quote
            $quotes = $quotesQuery->where('provider_user_id', $userId)->get();
        } else {
            // Guests, members, and non-bidding providers see ZERO quote terms or amounts
            $quotes = collect();
        }

        $providerIds = $quotes->pluck('provider_user_id')->unique()->all();
        $providerProfiles = DB::table('user_profiles')->whereIn('user_id', $providerIds)->get()->keyBy('user_id');

        $reviewsQuery = DB::table('reviews')
            ->whereIn('subject_user_id', $providerIds)
            ->where('moderation_status', 'approved')
            ->selectRaw('subject_user_id, AVG(rating) as avg_rating, COUNT(*) as review_count')
            ->groupBy('subject_user_id')
            ->get()
            ->keyBy('subject_user_id');

        $quotesData = $quotes->map(function ($q) use ($providerProfiles, $reviewsQuery, $userId, $isRequester, $requestRecord): array {
            $profile = $providerProfiles->get($q->provider_user_id);
            $reviewStats = $reviewsQuery->get($q->provider_user_id);
            $scope = is_string($q->scope) ? json_decode($q->scope, true) : (array) $q->scope;
            $scope = is_array($scope) ? $scope : [];
            $expired = $requestRecord->expires_at !== null && now()->greaterThanOrEqualTo($requestRecord->expires_at);
            $quoteExpired = $q->expires_at !== null && now()->greaterThanOrEqualTo($q->expires_at);
            $isProposer = ($scope['counter_by'] ?? 'provider') === 'requester' ? $isRequester : $userId === (string) $q->provider_user_id;
            $canRespond = $userId !== null && ! $isProposer && ! $expired && ! $quoteExpired
                && in_array($requestRecord->status, ['published', 'sourcing', 'quoted'], true)
                && $q->status === 'submitted';
            $workShape = strtoupper((string) $q->work_shape);
            $appointmentHold = $userId !== null && $workShape === 'A3' && $q->status === 'submitted'
                ? $this->capacity->currentQuoteAppointmentHold((string) $q->id, (int) $q->quote_version, (string) $requestRecord->requester_user_id)
                : null;
            $canChooseAppointment = $isRequester && $workShape === 'A3' && ! $expired && ! $quoteExpired
                && in_array($requestRecord->status, ['published', 'sourcing', 'quoted'], true)
                && $q->status === 'submitted';

            return [
                'id' => (string) $q->id,
                'request_id' => (string) $q->request_id,
                'provider_user_id' => (string) $q->provider_user_id,
                'provider_name' => $profile?->display_name ?? 'Service Provider',
                'rating' => $reviewStats !== null ? round((float) $reviewStats->avg_rating, 1) : null,
                'review_count' => $reviewStats !== null ? (int) $reviewStats->review_count : 0,
                'quote_version' => (int) $q->quote_version,
                'listing_id' => $q->listing_id === null ? null : (string) $q->listing_id,
                'listing_type' => is_string($scope['listing_type'] ?? null) ? $scope['listing_type'] : null,
                'listing_version_id' => is_string($scope['appointment_listing_version_id'] ?? null)
                    ? $scope['appointment_listing_version_id']
                    : (is_string($scope['source_listing_version_id'] ?? null) ? $scope['source_listing_version_id'] : null),
                'appointment_duration_minutes' => is_numeric($scope['appointment_duration_minutes'] ?? null)
                    ? (int) $scope['appointment_duration_minutes']
                    : null,
                'appointment_hold' => $appointmentHold,
                'can_choose_appointment' => $canChooseAppointment,
                'amount_minor' => (int) $q->amount_minor,
                'currency' => (string) $q->currency,
                'scope' => $scope,
                'work_shape' => (string) $q->work_shape,
                'status' => (string) $q->status,
                'can_accept' => $canRespond,
                'can_counter' => $canRespond,
                'created_at' => (string) $q->created_at,
            ];
        })->values()->all();

        $requesterProfile = DB::table('user_profiles')->where('user_id', $requestRecord->requester_user_id)->first();
        $category = DB::table('categories')
            ->where('id', $requestRecord->category_id)
            ->select(['id', 'code', 'name'])
            ->first();
        $itemList = is_string($requestRecord->item_list) ? json_decode($requestRecord->item_list, true) : (array) $requestRecord->item_list;
        $timing = is_string($requestRecord->timing) ? json_decode($requestRecord->timing, true) : (array) $requestRecord->timing;
        $location = is_string($requestRecord->location) ? json_decode($requestRecord->location, true) : (array) $requestRecord->location;

        $requestData = [
            'id' => (string) $requestRecord->id,
            'requester_user_id' => (string) $requestRecord->requester_user_id,
            'requester_name' => $requesterProfile?->display_name ?? 'Tagudin Citizen',
            'category_id' => (string) $requestRecord->category_id,
            'category_code' => $category?->code ?? null,
            'category_name' => $category?->name ?? 'Service Request',
            'title' => is_array($itemList) ? ($itemList['title'] ?? 'Service Request') : 'Service Request',
            'description' => (string) $requestRecord->description,
            'item_list' => is_array($itemList) ? $itemList : [],
            'budget_amount_minor' => $requestRecord->budget_amount_minor !== null ? (int) $requestRecord->budget_amount_minor : null,
            'budget_currency' => $requestRecord->budget_currency,
            'timing' => is_array($timing) ? $timing : [],
            'location' => is_array($location) ? $location : ['area_code' => 'Tagudin'],
            'privacy_preferences' => is_string($requestRecord->privacy_preferences) ? json_decode($requestRecord->privacy_preferences, true) : (array) $requestRecord->privacy_preferences,
            'status' => (string) $requestRecord->status,
            'expires_at' => (string) $requestRecord->expires_at,
            'created_at' => (string) $requestRecord->created_at,
            'quotes_count' => $isRequester ? DB::table('quotes')->where('request_id', $requestId)->count() : 0,
        ];
        $myListings = [];
        if ($userId !== null && ($hasProviderRole || $viewerRole === 'bidder')) {
            $myListings = DB::table('listings')
                ->where('owner_user_id', $userId)
                ->where('status', 'active')
                ->orderBy('id')
                ->get(['id'])
                ->map(function ($listing): ?array {
                    $source = $this->listings->findActiveApproved((string) $listing->id);
                    if ($source === null) {
                        return null;
                    }

                    $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
                    $variants = [];
                    foreach (is_array($terms['variants'] ?? null) ? $terms['variants'] : [] as $variant) {
                        if (! is_array($variant) || ! is_string($variant['id'] ?? null) || $variant['id'] === '') {
                            continue;
                        }
                        $label = is_string($variant['name'] ?? null) && trim($variant['name']) !== ''
                            ? trim($variant['name'])
                            : (is_string($variant['label'] ?? null) && trim($variant['label']) !== ''
                                ? trim($variant['label'])
                                : (string) $variant['id']);
                        $variants[] = array_filter([
                            'id' => (string) $variant['id'],
                            'name' => $label,
                            'label' => $label,
                            'price_amount_minor' => is_numeric($variant['price_amount_minor'] ?? null)
                                ? (int) $variant['price_amount_minor']
                                : null,
                            'price' => is_numeric($variant['price'] ?? null) ? (float) $variant['price'] : null,
                            'is_default' => (bool) ($variant['is_default'] ?? $variant['isDefault'] ?? false),
                            'currency' => is_string($variant['currency'] ?? null) ? strtoupper($variant['currency']) : ($source['currency'] ?? null),
                        ], static fn (mixed $value): bool => $value !== null);
                    }

                    return [
                        'id' => (string) $source['listing_id'],
                        'title' => (string) $source['title'],
                        'listing_type' => (string) $source['listing_type'],
                        'work_shape' => (string) $source['work_shape'],
                        'listing_version_id' => (string) $source['listing_version_id'],
                        'price_amount_minor' => $source['price_amount_minor'],
                        'variants' => $variants,
                    ];
                })
                ->filter(static fn (?array $listing): bool => $listing !== null)
                ->values()
                ->all();
        }

        return [
            'request' => $requestData,
            'quotes' => $quotesData,
            'my_listings' => $myListings,
            'viewer_role' => $viewerRole,
            'session' => is_array($sessionData) ? $sessionData : null,
            'actions' => [
                'can_quote' => in_array($viewerRole, ['eligible_responder', 'bidder'], true)
                    && in_array($requestRecord->status, ['published', 'sourcing', 'quoted'], true)
                    && ($requestRecord->expires_at === null || now()->lessThan($requestRecord->expires_at)),
                'can_accept' => collect($quotesData)->contains('can_accept', true),
                'is_owner' => $isRequester,
            ],
        ];
    }
}

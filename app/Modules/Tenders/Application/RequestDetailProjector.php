<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
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
        private readonly CurrentSession $session,
        private readonly RoleAssignmentService $roles,
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

        $sessionData = $this->session->read($request);
        $userId = is_array($sessionData) && ($sessionData['authenticated'] ?? false)
            ? (string) ($sessionData['user_id'] ?? '')
            : null;

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

        $quotesData = $quotes->map(function ($q) use ($providerProfiles, $reviewsQuery): array {
            $profile = $providerProfiles->get($q->provider_user_id);
            $reviewStats = $reviewsQuery->get($q->provider_user_id);
            $scope = is_string($q->scope) ? json_decode($q->scope, true) : (array) $q->scope;

            return [
                'id' => (string) $q->id,
                'request_id' => (string) $q->request_id,
                'provider_user_id' => (string) $q->provider_user_id,
                'provider_name' => $profile?->display_name ?? 'Service Provider',
                'rating' => $reviewStats !== null ? round((float) $reviewStats->avg_rating, 1) : null,
                'review_count' => $reviewStats !== null ? (int) $reviewStats->review_count : 0,
                'quote_version' => (int) $q->quote_version,
                'amount_minor' => (int) $q->amount_minor,
                'currency' => (string) $q->currency,
                'scope' => is_array($scope) ? $scope : ['details' => (string) $q->scope],
                'work_shape' => (string) $q->work_shape,
                'status' => (string) $q->status,
                'created_at' => (string) $q->created_at,
            ];
        })->values()->all();

        $requesterProfile = DB::table('user_profiles')->where('user_id', $requestRecord->requester_user_id)->first();
        $itemList = is_string($requestRecord->item_list) ? json_decode($requestRecord->item_list, true) : (array) $requestRecord->item_list;
        $timing = is_string($requestRecord->timing) ? json_decode($requestRecord->timing, true) : (array) $requestRecord->timing;
        $location = is_string($requestRecord->location) ? json_decode($requestRecord->location, true) : (array) $requestRecord->location;

        $requestData = [
            'id' => (string) $requestRecord->id,
            'requester_user_id' => (string) $requestRecord->requester_user_id,
            'requester_name' => $requesterProfile?->display_name ?? 'Tagudin Citizen',
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
                ->select(['id', 'listing_type'])
                ->get()
                ->map(function ($l): array {
                    $version = DB::table('listing_versions')
                        ->where('listing_id', $l->id)
                        ->orderByDesc('version_number')
                        ->first();
                    $terms = is_string($version?->terms) ? json_decode($version->terms, true) : (array) ($version?->terms ?? []);
                    $title = is_array($terms) && isset($terms['title']) ? (string) $terms['title'] : 'Service Listing';
                    $workShape = is_array($terms) && isset($terms['work_shape']) ? (string) $terms['work_shape'] : 'A1';
                    $priceMinor = $version !== null ? (int) $version->price_amount_minor : null;

                    return [
                        'id' => (string) $l->id,
                        'title' => $title,
                        'listing_type' => (string) $l->listing_type,
                        'work_shape' => $workShape,
                        'price_amount_minor' => $priceMinor,
                    ];
                })
                ->all();
        }

        return [
            'request' => $requestData,
            'quotes' => $quotesData,
            'my_listings' => $myListings,
            'viewer_role' => $viewerRole,
            'session' => is_array($sessionData) ? $sessionData : null,
            'actions' => [
                'can_quote' => in_array($viewerRole, ['eligible_responder', 'bidder'], true) && (string) $requestRecord->status === 'published',
                'can_accept' => $isRequester && (string) $requestRecord->status === 'published',
                'is_owner' => $isRequester,
            ],
        ];
    }
}

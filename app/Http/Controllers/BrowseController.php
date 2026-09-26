<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\IdentityAccess\Application\DemoFixtureService;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class BrowseController
{
    public function __construct(
        private readonly SliceStateQuery $sliceState,
        private readonly PublicListingsQuery $publicListings,
        private readonly DemoFixtureService $fixtures,
        private readonly EnvironmentValidator $environment,
        private readonly DealChainCatalog $dealChainCatalog,
    ) {}

    public function __invoke(Request $request): InertiaResponse
    {
        $this->fixtures->ensure();

        $correlationId = (string) $request->attributes->get('correlation_id');
        $state = $this->sliceState->for($request);
        $publicListings = $this->publicListings->handle($correlationId);

        $communityRequests = DB::table('requests')
            ->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'requests.requester_user_id')
            ->where('requests.status', 'published')
            ->orderByDesc('requests.created_at')
            ->select(
                'requests.id',
                'requests.requester_user_id',
                'requests.description',
                'requests.item_list',
                'requests.budget_amount_minor',
                'requests.budget_currency',
                'requests.timing',
                'requests.location',
                'requests.status',
                'requests.created_at',
                'user_profiles.display_name as requester_name'
            )
            ->get()
            ->map(function ($r) use ($state) {
                $itemList = is_string($r->item_list) ? json_decode($r->item_list, true) : (array) $r->item_list;
                $timing = is_string($r->timing) ? json_decode($r->timing, true) : (array) $r->timing;
                $location = is_string($r->location) ? json_decode($r->location, true) : (array) $r->location;

                // ADR-R-004 & VP-BRW-003: Bid counts are private to requester only
                $viewerId = $state['session']['userId'] ?? null;
                $isRequester = $viewerId !== null && (string) $viewerId === (string) $r->requester_user_id;
                $quotesCount = $isRequester ? DB::table('quotes')->where('request_id', $r->id)->count() : null;

                return [
                    'id' => (string) $r->id,
                    'title' => is_array($itemList) ? ($itemList['title'] ?? 'Community Request') : 'Community Request',
                    'description' => (string) $r->description,
                    'photo' => is_array($itemList) ? ($itemList['photo'] ?? null) : null,
                    'budget_amount_minor' => $r->budget_amount_minor !== null ? (int) $r->budget_amount_minor : null,
                    'currency' => (string) ($r->budget_currency ?? 'PHP'),
                    'urgency' => is_array($timing) ? ($timing['urgency'] ?? 'flexible') : 'flexible',
                    'area' => is_array($location) ? ($location['area_code'] ?? 'Tagudin') : 'Tagudin',
                    'requester_name' => (string) ($r->requester_name ?? 'Tagudin Citizen'),
                    'quotes_count' => $quotesCount,
                    'created_at' => (string) $r->created_at,
                ];
            })
            ->all();

        $slice = [
            ...$state,
            'publicListings' => $publicListings,
            'communityRequests' => $communityRequests,
            'activeListingDetail' => null,
            'denial' => null,
        ];

        return Inertia::render('Browse', [
            'app' => [
                'name' => (string) config('app.name', 'Serbizyu'),
                'environment' => (string) config('serbizyu.public_environment', 'local'),
                'stage' => 'connected_slice',
            ],
            'runtime' => $this->environment->safeSummary(config('serbizyu', [])),
            'correlationId' => $correlationId,
            ...$slice,
            'slice' => $slice,
            'dealChainCatalog' => $this->dealChainCatalog->frontend(),
            'experience' => 'foundation_v1',
            'pageMode' => 'browse',
        ]);
    }
}

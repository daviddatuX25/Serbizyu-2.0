<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class BrowseController
{
    public function __construct(
        private readonly SliceStateQuery $sliceState,
        private readonly PublicListingsQuery $publicListings,
        private readonly EnvironmentValidator $environment,
    ) {}

    public function __invoke(Request $request): InertiaResponse
    {
        $correlationId = (string) $request->attributes->get('correlation_id');
        $state = $this->sliceState->for($request);
        $publicListings = $this->publicListings->handle($correlationId);
        $slice = [
            ...$state,
            'publicListings' => $publicListings,
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
            'experience' => 'foundation_v1',
            'pageMode' => 'browse',
        ]);
    }
}

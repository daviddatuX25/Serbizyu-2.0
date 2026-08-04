<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\OnboardingRequest;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\OnboardingService;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class HomeController
{
    public function __construct(
        private readonly SliceStateQuery $sliceState,
        private readonly PublicListingsQuery $publicListings,
        private readonly OnboardingService $onboarding,
        private readonly EnvironmentValidator $environment,
    ) {}

    public function __invoke(Request $request): InertiaResponse
    {
        return $this->render($request, 'home');
    }

    public function listings(Request $request): InertiaResponse
    {
        return $this->render($request, 'listings');
    }

    private function render(Request $request, string $pageMode): InertiaResponse
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

        return Inertia::render('Home', [
            'app' => [
                'name' => (string) config('app.name', 'Serbizyu'),
                'environment' => (string) config('serbizyu.public_environment', 'local'),
                'stage' => 'foundation_slice',
            ],
            'experience' => 'foundation_v1',
            'pageMode' => $pageMode,
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

    public function onboarding(OnboardingRequest $request): mixed
    {
        $validated = $request->validated();
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $readiness = $this->onboarding->save($request, $validated, $correlationId);
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['data' => $readiness], 200, ['X-Correlation-Id' => $correlationId]);
            }

            return back();
        } catch (IdentityAccessError $error) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(
                    $error->envelope->toArray(),
                    $error->status,
                    ['X-Correlation-Id' => (string) $error->envelope->correlationId],
                );
            }

            $errors = $error->envelope->fieldErrors ?: ['form' => [$error->envelope->message]];
            $errors['correlation_id'] = [(string) $error->envelope->correlationId];

            return back()
                ->withInput()
                ->withErrors($errors)
                ->with('correlation_id', (string) $error->envelope->correlationId);
        }
    }
}

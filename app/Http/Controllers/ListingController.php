<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\CreateListingDraftRequest;
use App\Http\Requests\SubmitListingRequest;
use App\Http\Requests\UpdateListingDraftRequest;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\ResourceActorResolver;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\ProtectedEditAttempt;
use App\Modules\Listings\Application\PublicListingDetailQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ListingController
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly ResourceActorResolver $resourceActors,
        private readonly CreateListingDraft $createListing,
        private readonly UpdateListingDraft $updateListing,
        private readonly SubmitListing $submitListing,
        private readonly PublicListingsQuery $publicListings,
        private readonly PublicListingDetailQuery $publicListingDetail,
        private readonly ProtectedEditAttempt $protectedEditAttempt,
        private readonly SliceStateQuery $sliceState,
        private readonly EnvironmentValidator $environment,
    ) {}

    public function show(Request $request, string $listing): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);
        $publicListings = $this->publicListings->handle($correlationId);
        $activeListingDetail = $this->publicListingDetail->handle($listing, $correlationId);
        $booking = $this->bookingContext($request, $activeListingDetail);

        $slice = [
            ...$state,
            'publicListings' => $publicListings,
            'activeListingDetail' => $activeListingDetail,
            'denial' => null,
            'booking' => $booking,
        ];

        return Inertia::render('ListingDetail', [
            'app' => [
                'name' => (string) config('app.name', 'Serbizyu'),
                'environment' => (string) config('serbizyu.public_environment', 'local'),
                'stage' => 'connected_slice',
            ],
            'runtime' => $this->environment->safeSummary(config('serbizyu', [])),
            'correlationId' => $correlationId,
            ...$slice,
            'slice' => $slice,
            'booking' => $booking,
            'experience' => 'foundation_v1',
            'pageMode' => 'detail',
        ]);
    }

    public function store(CreateListingDraftRequest $request): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.create');
            $listing = $this->createListing->handle($actor, $validated, $correlationId);

            return $this->success($request, ['data' => $listing], $correlationId, 201);
        } catch (IdentityAccessError|ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    public function update(UpdateListingDraftRequest $request, string $listing): mixed
    {
        $validated = $request->validated();
        $expectedVersion = (int) $validated['expected_version'];
        unset($validated['expected_version']);
        $correlationId = $this->correlationId($request);

        try {
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.update');
            $saved = $this->updateListing->handle($listing, $actor, $expectedVersion, $validated, $correlationId);

            return $this->success($request, ['data' => $saved], $correlationId);
        } catch (IdentityAccessError|ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    public function submit(SubmitListingRequest $request, string $listing): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $idempotencyKey = trim((string) ($validated['idempotency_key'] ?? ''));
            if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
                throw new ListingError(
                    'INVALID_IDEMPOTENCY_KEY',
                    'Use a valid Idempotency-Key header for submission.',
                    $correlationId,
                    fieldErrors: ['idempotency_key' => ['The Idempotency-Key header is invalid or missing.']],
                );
            }
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.submit');
            $submitted = $this->submitListing->handle(
                $listing,
                $actor,
                (int) $validated['expected_version'],
                $idempotencyKey,
                $correlationId,
            );

            return $this->success($request, ['data' => $submitted], $correlationId);
        } catch (IdentityAccessError|ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    public function protectedEditAttempt(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);
        $session = $this->session->read($request);
        $actorId = is_array($session) && ($session['authenticated'] ?? false)
            ? (string) ($session['user_id'] ?? '')
            : null;

        try {
            $this->protectedEditAttempt->handle($listing, $actorId, $correlationId);
        } catch (ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    /**
     * Throwaway Direct Booking affordance for founder confirm — does not redesign Detail.
     *
     * @param  array<string, mixed>|null  $detail
     * @return array<string, mixed>
     */
    private function bookingContext(Request $request, ?array $detail): array
    {
        if ($detail === null || ! isset($detail['id'])) {
            return [
                'direct_booking_enabled' => false,
                'can_propose' => false,
                'requires_auth' => true,
                'is_owner' => false,
            ];
        }

        $listingId = (string) $detail['id'];
        $ownerId = (string) (DB::table('listings')->where('id', $listingId)->value('owner_user_id') ?? '');
        $userId = $request->user() !== null ? (string) $request->user()->getAuthIdentifier() : null;
        $expectedVersion = (int) ($detail['current_version'] ?? $detail['expected_version'] ?? 0);

        return [
            'direct_booking_enabled' => true,
            'can_propose' => $userId !== null && $userId !== '' && $userId !== $ownerId,
            'requires_auth' => $userId === null,
            'is_owner' => $userId !== null && $userId === $ownerId,
            'expected_listing_version' => $expectedVersion,
            'default_amount_minor' => isset($detail['price_amount_minor']) ? (int) $detail['price_amount_minor'] : null,
            'currency' => isset($detail['currency']) && is_string($detail['currency']) ? $detail['currency'] : 'PHP',
            'start_url' => route('orders.start', ['listing' => $listingId]),
        ];
    }

    private function correlationId(Request $request): string
    {
        return (string) $request->attributes->get('correlation_id');
    }

    /** @param array<string, mixed> $payload */
    private function success(Request $request, array $payload, string $correlationId, int $status = 200): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($payload, $status, ['X-Correlation-Id' => $correlationId]);
        }

        return back();
    }

    private function failure(Request $request, IdentityAccessError|ListingError $error): mixed
    {
        $correlationId = (string) $error->envelope->correlationId;
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(
                $error->envelope->toArray(),
                $error->status,
                ['X-Correlation-Id' => $correlationId],
            );
        }

        $errors = $error->envelope->fieldErrors ?: ['form' => [$error->envelope->message]];
        $errors['correlation_id'] = [$correlationId];

        return back()
            ->withInput()
            ->withErrors($errors)
            ->with('correlation_id', $correlationId);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\CreateListingDraftRequest;
use App\Http\Requests\SubmitListingRequest;
use App\Http\Requests\UpdateListingDraftRequest;
use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\Catalogs\Application\WorkCatalog;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\ResourceActorResolver;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Listings\Application\ArchiveListing;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\OwnerListingsQuery;
use App\Modules\Listings\Application\PauseListing;
use App\Modules\Listings\Application\ProtectedEditAttempt;
use App\Modules\Listings\Application\PublicListingDetailQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Modules\Listings\Application\ResumeListing;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Contracts\ListingReviewReaderPort;
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
        private readonly OwnerListingsQuery $ownerListings,
        private readonly ProtectedEditAttempt $protectedEditAttempt,
        private readonly SliceStateQuery $sliceState,
        private readonly EnvironmentValidator $environment,
        private readonly DealChainCatalog $dealChainCatalog,
        private readonly WorkCatalog $workCatalog,
        private readonly RoleAssignmentService $roles,
        private readonly PauseListing $pauseListing,
        private readonly ResumeListing $resumeListing,
        private readonly ArchiveListing $archiveListing,
        private readonly ListingReviewReaderPort $reviews,
    ) {}

    public function show(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);
        $activeListingDetail = $this->publicListingDetail->handle($listing, $correlationId);

        if ($activeListingDetail === null && $request->user() !== null) {
            $ownerListing = $this->ownerListings->find(
                $listing,
                (string) $request->user()->getAuthIdentifier(),
                $correlationId,
            );

            if ($ownerListing !== null) {
                return redirect()->route('listings.preview', ['listing' => $listing]);
            }
        }

        $state = $this->sliceState->for($request);
        $publicListings = $this->publicListings->handle($correlationId);
        $booking = $this->bookingContext($request, $activeListingDetail);

        $reviews = $this->reviews->reviewsForListing($listing, limit: 20);
        $reviewSummary = $this->reviews->summaryForListing($listing, $activeListingDetail['category_code'] ?? null);
        $reviewPhotos = $this->reviews->photosForListing($listing);

        if ($activeListingDetail !== null) {
            $activeListingDetail['reviews'] = $reviews;
            $activeListingDetail['rating_summary'] = $reviewSummary;
            $activeListingDetail['photos'] = $reviewPhotos;
        }
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
            'dealChainCatalog' => $this->dealChainCatalog->frontend(),
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

            $listingType = (string) ($validated['listing_type'] ?? 'service');
            $hasProvider = $this->roles->hasActive($actor->resourceOwnerId, 'provider');
            $hasMerchant = $this->roles->hasActive($actor->resourceOwnerId, 'merchant');

            if ($listingType === 'product') {
                if (! $hasMerchant && ! $hasProvider) {
                    throw new IdentityAccessError(
                        'PREREQUISITE_FAILED',
                        'Active merchant or provider capability is required to create a product listing.',
                        $correlationId,
                        status: 403,
                    );
                }
            } else {
                if (! $hasProvider) {
                    throw new IdentityAccessError(
                        'PREREQUISITE_FAILED',
                        'Active provider capability is required to create a service listing.',
                        $correlationId,
                        status: 403,
                    );
                }
            }

            $readiness = $this->roles->readinessState($actor->resourceOwnerId);
            if (! $readiness['ready']) {
                throw new IdentityAccessError(
                    'PREREQUISITE_FAILED',
                    'Profile readiness must be complete before creating a listing draft.',
                    $correlationId,
                    status: 403,
                    fieldErrors: ['readiness' => $readiness['blockers']],
                );
            }

            $listing = $this->createListing->handle($actor, $validated, $correlationId);

            if ($request->expectsJson() || $request->wantsJson()) {
                return $this->success($request, ['data' => $listing], $correlationId, 201);
            }

            return redirect()
                ->route('listings.preview', ['listing' => $listing['id']])
                ->with('notice', 'Private draft saved. Review it before submitting.');
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

    public function pause(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);
        $expectedVersion = (int) $request->input('expected_version', 1);

        try {
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.pause');
            $paused = $this->pauseListing->handle($listing, $actor, $expectedVersion, $correlationId);

            if ($request->wantsJson()) {
                return $this->success($request, ['data' => $paused], $correlationId);
            }

            return back()->with('notice', 'Listing paused. It is now hidden from public browse.');
        } catch (IdentityAccessError|ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    public function resume(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);
        $expectedVersion = (int) $request->input('expected_version', 1);

        try {
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.resume');
            $resumed = $this->resumeListing->handle($listing, $actor, $expectedVersion, $correlationId);

            if ($request->wantsJson()) {
                return $this->success($request, ['data' => $resumed], $correlationId);
            }

            return back()->with('notice', 'Listing resumed! It is now active on public browse.');
        } catch (IdentityAccessError|ListingError $error) {
            return $this->failure($request, $error);
        }
    }

    public function archive(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);
        $expectedVersion = (int) $request->input('expected_version', 1);

        try {
            $sessionUserId = $this->session->requireUser($request, $correlationId);
            $actor = $this->resourceActors->resolve($request, $sessionUserId, $correlationId, 'listing', 'listing.archive');
            $archived = $this->archiveListing->handle($listing, $actor, $expectedVersion, $correlationId);

            if ($request->wantsJson()) {
                return $this->success($request, ['data' => $archived], $correlationId);
            }

            return redirect()->route('listings.mine')->with('notice', 'Listing archived.');
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

    public function create(Request $request): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);

        return Inertia::render('Listings/CreatePicker', [
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'correlationId' => $correlationId,
        ]);
    }

    public function createService(Request $request): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);
        $editingDraft = $this->resolveEditableDraft($request, 'service', $correlationId);

        return Inertia::render('Listings/CreateService', [
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'correlationId' => $correlationId,
            'workCatalog' => $this->workCatalog->frontend(),
            'workOptions' => $this->workCatalog->optionsFor(null, 'service'),
            'dealChainCatalog' => $this->dealChainCatalog->frontend(),
            'dealChainOptions' => $this->dealChainCatalog->optionsFor(null, 'service'),
            'partnerListings' => $this->dealChainCatalog->partnerListings(),
            'editingDraft' => $editingDraft,
        ]);
    }

    public function createProduct(Request $request): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);
        $editingDraft = $this->resolveEditableDraft($request, 'product', $correlationId);

        return Inertia::render('Listings/CreateProduct', [
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'correlationId' => $correlationId,
            'workCatalog' => $this->workCatalog->frontend(),
            'workOptions' => $this->workCatalog->optionsFor(null, 'product'),
            'dealChainCatalog' => $this->dealChainCatalog->frontend(),
            'dealChainOptions' => $this->dealChainCatalog->optionsFor(null, 'product'),
            'partnerListings' => $this->dealChainCatalog->partnerListings(),
            'editingDraft' => $editingDraft,
        ]);
    }

    /** @return array<string, mixed>|null */
    private function resolveEditableDraft(Request $request, string $expectedType, string $correlationId): ?array
    {
        $editId = trim((string) $request->query('edit', ''));
        if ($editId === '') {
            return null;
        }

        $userId = $request->user() !== null ? (string) $request->user()->getAuthIdentifier() : '';
        if ($userId === '') {
            abort(401, 'Sign in to edit this listing draft.');
        }

        $draft = $this->ownerListings->find($editId, $userId, $correlationId);
        if ($draft === null) {
            abort(404, 'The requested listing draft was not found.');
        }

        if (($draft['listing_type'] ?? '') !== $expectedType) {
            abort(400, "The listing draft is not a {$expectedType} listing.");
        }

        return $draft;
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

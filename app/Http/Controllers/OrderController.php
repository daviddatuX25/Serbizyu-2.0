<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\FinalizeOrderRequest;
use App\Http\Requests\ProposeOrderRequest;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Thin throwaway Order HTTP surface for founder confirm of T3 Direct Booking.
 * Hi-fi Browse/Detail chrome stays; this only wires Book → propose → finalize.
 */
final class OrderController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly SubmitOrderProposal $propose,
        private readonly FinalizeOrderAgreement $finalize,
        private readonly OrderListingSourcePort $listingSource,
    ) {}

    /**
     * One-click Book entry from Listing Detail (auth-gated).
     * Reuses a stable idempotency key so refresh does not duplicate proposals.
     */
    public function start(Request $request, string $listing): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $buyerUserId = $this->session->requireUser($request, $correlationId);
            $source = $this->listingSource->findActiveApproved($listing);
            if ($source === null) {
                throw new OrderError('LISTING_NOT_AVAILABLE', 'That listing is not available to book.', $correlationId, status: 404);
            }

            $expectedVersion = (int) $source['listing_version_number'];
            $existing = DB::table('orders')
                ->where('buyer_user_id', $buyerUserId)
                ->where('listing_id', $listing)
                ->where('status', 'pending_acceptance')
                ->orderByDesc('created_at')
                ->first();

            if ($existing !== null) {
                return redirect()->route('orders.show', ['order' => $existing->id]);
            }

            $idempotencyKey = 'ui-book:'.$buyerUserId.':'.$listing.':v'.$expectedVersion;
            $proposed = $this->propose->handle(
                buyerUserId: $buyerUserId,
                listingId: $listing,
                expectedListingVersion: $expectedVersion,
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                input: [
                    'amount_minor' => (int) ($source['price_amount_minor'] ?? 0),
                    'currency' => (string) ($source['currency'] ?? 'PHP'),
                    'quantity' => 1,
                ],
            );

            return redirect()
                ->route('orders.show', ['order' => $proposed['order_id']])
                ->with('notice', 'Proposal created — review and finalize when ready.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function store(ProposeOrderRequest $request, string $listing): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $buyerUserId = $this->session->requireUser($request, $correlationId);
            $proposed = $this->propose->handle(
                buyerUserId: $buyerUserId,
                listingId: $listing,
                expectedListingVersion: (int) $validated['expected_listing_version'],
                idempotencyKey: (string) $validated['idempotency_key'],
                correlationId: $correlationId,
                input: [
                    'amount_minor' => (int) ($validated['amount_minor'] ?? 0),
                    'currency' => (string) ($validated['currency'] ?? 'PHP'),
                    'quantity' => (int) ($validated['quantity'] ?? 1),
                ],
            );

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['data' => $proposed], 201, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->route('orders.show', ['order' => $proposed['order_id']]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function show(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $row = DB::table('orders')->where('id', $order)->first();
            if ($row === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }

            $buyerId = (string) $row->buyer_user_id;
            $providerId = (string) $row->provider_user_id;
            if ($actorUserId !== $buyerId && $actorUserId !== $providerId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to view this order.', $correlationId, status: 403);
            }

            $terms = DB::table('order_terms_snapshots')->where('order_id', $order)->orderBy('snapshot_version')->first();
            $work = DB::table('work_instances')->where('order_id', $order)->first();
            $obligation = DB::table('payment_obligations')->where('order_id', $order)->first();
            $buyerParty = DB::table('order_parties')
                ->where('order_id', $order)
                ->where('party_type', 'buyer')
                ->where('status', 'active')
                ->first();
            $proposal = [];
            if ($buyerParty !== null) {
                $scope = json_decode((string) ($buyerParty->scope ?? '{}'), true);
                if (is_array($scope) && isset($scope['proposal']) && is_array($scope['proposal'])) {
                    $proposal = $scope['proposal'];
                }
            }

            return Inertia::render('Orders/Show', [
                'correlationId' => $correlationId,
                'notice' => $request->session()->get('notice'),
                'order' => [
                    'id' => (string) $row->id,
                    'status' => (string) $row->status,
                    'version' => (int) $row->version,
                    'listing_id' => (string) $row->listing_id,
                    'buyer_user_id' => $buyerId,
                    'provider_user_id' => $providerId,
                    'mechanism' => (string) $row->mechanism,
                    'origin' => (string) $row->origin,
                    'geography' => $row->geography,
                    'proposal' => $proposal,
                    'can_finalize' => (string) $row->status === 'pending_acceptance'
                        && ($actorUserId === $buyerId || $actorUserId === $providerId),
                    'actor_role' => $actorUserId === $buyerId ? 'buyer' : 'provider',
                ],
                'terms' => $terms === null ? null : [
                    'snapshot_version' => (int) $terms->snapshot_version,
                    'amount_minor' => (int) $terms->amount_minor,
                    'currency' => (string) $terms->currency,
                    'source_listing_version_id' => (string) $terms->source_listing_version_id,
                    'accepted_by_user_id' => (string) $terms->accepted_by_user_id,
                    'accepted_at' => (string) $terms->accepted_at,
                ],
                'work' => $work === null ? null : [
                    'id' => (string) $work->id,
                    'status' => (string) $work->status,
                    'work_shape' => (string) $work->work_shape,
                ],
                'obligation' => $obligation === null ? null : [
                    'id' => (string) $obligation->id,
                    'status' => (string) $obligation->status,
                    'lane' => (string) $obligation->lane,
                    'amount_minor' => (int) $obligation->amount_minor,
                    'currency' => (string) $obligation->currency,
                ],
            ]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function finalize(FinalizeOrderRequest $request, string $order): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $finalized = $this->finalize->handle(
                actorUserId: $actorUserId,
                orderId: $order,
                expectedOrderVersion: (int) $validated['expected_order_version'],
                idempotencyKey: (string) $validated['idempotency_key'],
                correlationId: $correlationId,
            );

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['data' => $finalized], 200, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()
                ->route('orders.show', ['order' => $order])
                ->with('notice', 'Order accepted — terms, work stub, and external-cash obligation are in place.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    private function correlationId(Request $request): string
    {
        $fromRequest = $request->attributes->get('correlation_id');
        if (is_string($fromRequest) && $fromRequest !== '') {
            return $fromRequest;
        }

        return (string) Str::uuid7();
    }

    private function failure(Request $request, IdentityAccessError|OrderError $error): mixed
    {
        $correlationId = (string) $error->envelope->correlationId;
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(
                $error->envelope->toArray(),
                $error->status,
                ['X-Correlation-Id' => $correlationId],
            );
        }

        $errors = $error->envelope->fieldErrors !== []
            ? $error->envelope->fieldErrors
            : ['form' => [$error->getMessage()]];
        $errors['correlation_id'] = [$correlationId];

        $fallback = $request->headers->get('referer')
            ?? (is_string($request->route('listing')) ? route('listings.show', $request->route('listing')) : route('browse'));

        return redirect()
            ->to($fallback)
            ->withInput()
            ->withErrors($errors)
            ->with('correlation_id', $correlationId)
            ->with('notice', $error->getMessage());
    }
}

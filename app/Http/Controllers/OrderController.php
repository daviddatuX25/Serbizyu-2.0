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
use App\Modules\OrdersWork\Application\WorkExecutionService;
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
        private readonly WorkExecutionService $workExecution,
    ) {}
    public function index(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $orders = DB::table('orders')
                ->leftJoin('listings', 'listings.id', '=', 'orders.listing_id')
                ->leftJoin('listing_versions', function ($join): void {
                    $join->on('listing_versions.listing_id', '=', 'listings.id')
                        ->on('listing_versions.version_number', '=', 'listings.current_version');
                })
                ->leftJoin('order_terms_snapshots', function ($join): void {
                    $join->on('order_terms_snapshots.order_id', '=', 'orders.id')
                        ->on('order_terms_snapshots.snapshot_version', '=', DB::raw('1'));
                })
                ->leftJoin('work_instances', 'work_instances.order_id', '=', 'orders.id')
                ->where(function ($q) use ($userId): void {
                    $q->where('orders.buyer_user_id', $userId)
                        ->orWhere('orders.provider_user_id', $userId)
                        ->orWhereExists(function ($sub) use ($userId): void {
                            $sub->select(DB::raw(1))
                                ->from('order_parties')
                                ->whereColumn('order_parties.order_id', 'orders.id')
                                ->where('order_parties.user_id', $userId)
                                ->where('order_parties.status', 'active');
                        });
                })
                ->select(
                    'orders.id',
                    'orders.status as order_status',
                    'orders.listing_id',
                    'orders.buyer_user_id',
                    'orders.provider_user_id',
                    'orders.deal_chain_id',
                    'orders.created_at',
                    'orders.updated_at',
                    DB::raw("COALESCE(listing_versions.terms->>'title', 'Tagudin Service Order') as listing_title"),
                    'order_terms_snapshots.amount_minor',
                    'order_terms_snapshots.currency',
                    'work_instances.status as work_status',
                    'work_instances.work_shape'
                )
                ->orderByDesc('orders.updated_at')
                ->get();

            $dealChains = DB::table('deal_chains')
                ->where('coordinator_user_id', $userId)
                ->where('status', 'sourcing')
                ->orderByDesc('updated_at')
                ->get();

            $ongoing = [];
            $history = [];

            foreach ($orders as $o) {
                $status = (string) $o->order_status;
                $workStatus = $o->work_status ? (string) $o->work_status : null;
                $isHistory = in_array($status, ['closed', 'cancelled'], true) || $workStatus === 'failed';

                $item = [
                    'id' => (string) $o->id,
                    'type' => 'order',
                    'title' => (string) ($o->listing_title ?? 'Tagudin Service Order'),
                    'order_status' => $status,
                    'work_status' => $workStatus,
                    'amount_minor' => (int) ($o->amount_minor ?? 8000),
                    'currency' => (string) ($o->currency ?? 'PHP'),
                    'role' => $o->buyer_user_id === $userId ? 'buyer' : ($o->provider_user_id === $userId ? 'provider' : 'courier'),
                    'updated_at' => (string) $o->updated_at,
                    'created_at' => (string) $o->created_at,
                ];

                if ($isHistory) {
                    $history[] = $item;
                } else {
                    $ongoing[] = $item;
                }
            }

            foreach ($dealChains as $dc) {
                $ongoing[] = [
                    'id' => (string) $dc->id,
                    'type' => 'deal_chain',
                    'title' => (string) $dc->title,
                    'order_status' => 'sourcing',
                    'work_status' => null,
                    'amount_minor' => 61000,
                    'currency' => 'PHP',
                    'role' => 'coordinator',
                    'updated_at' => (string) $dc->updated_at,
                    'created_at' => (string) $dc->created_at,
                ];
            }

            return Inertia::render('Orders/Index', [
                'ongoing' => $ongoing,
                'history' => $history,
                'counts' => [
                    'ongoing' => count($ongoing),
                    'history' => count($history),
                ],
            ]);
        } catch (IdentityAccessError) {
            return redirect()->route('auth.sign-in');
        }
    }

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
            $partyRow = DB::table('order_parties')
                ->where('order_id', $order)
                ->where('user_id', $actorUserId)
                ->where('status', 'active')
                ->first();

            if ($actorUserId !== $buyerId && $actorUserId !== $providerId && $partyRow === null) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to view this order.', $correlationId, status: 403);
            }

            // Lock single truthful perspective derived from the authenticated participant's actual role on this order
            $actorPerspective = $actorUserId === $buyerId
                ? 'customer'
                : ($actorUserId === $providerId
                    ? 'provider'
                    : (($partyRow?->party_type === 'courier' || str_contains((string) ($partyRow?->responsibility ?? ''), 'courier'))
                        ? 'courier'
                        : 'customer'));

            // Read accepted terms snapshot for accurate agreed title and terms
            $terms = DB::table('order_terms_snapshots')->where('order_id', $order)->orderBy('snapshot_version')->first();
            $termsData = json_decode((string) ($terms?->terms ?? '{}'), true);
            $listingTitle = is_array($termsData) && isset($termsData['title']) && is_string($termsData['title']) && trim($termsData['title']) !== ''
                ? trim($termsData['title'])
                : null;

            if ($listingTitle === null) {
                $listingVersion = DB::table('listing_versions')
                    ->where('listing_id', $row->listing_id)
                    ->orderByDesc('version_number')
                    ->first();
                $listingTerms = json_decode((string) ($listingVersion?->terms ?? '{}'), true);
                $listingTitle = is_array($listingTerms) ? (string) ($listingTerms['title'] ?? 'Tagudin Service Order') : 'Tagudin Service Order';
            }

            $providerProfile = DB::table('user_profiles')->where('user_id', $providerId)->first();
            $buyerProfile = DB::table('user_profiles')->where('user_id', $buyerId)->first();
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

            $totalAmountMinor = (int) ($obligation?->amount_minor ?? $terms?->amount_minor ?? $proposal['amount_minor'] ?? 45000);
            $currency = (string) ($obligation?->currency ?? $terms?->currency ?? 'PHP');

            $scopedFinancials = match ($actorPerspective) {
                'courier' => [
                    'amount_minor' => 8000,
                    'currency' => 'PHP',
                    'label' => 'Courier Delivery Fee',
                    'status' => 'due_on_handoff',
                    'breakdown' => [
                        ['label' => 'Motorcycle Transit Fee', 'amount_minor' => 8000],
                    ],
                ],
                'provider' => [
                    'amount_minor' => $totalAmountMinor,
                    'currency' => $currency,
                    'label' => 'Total Provider Payout',
                    'status' => (string) ($obligation?->status ?? 'pending'),
                    'breakdown' => [
                        ['label' => 'Technician Labor', 'amount_minor' => $totalAmountMinor],
                    ],
                ],
                default => [
                    'amount_minor' => $totalAmountMinor,
                    'currency' => $currency,
                    'label' => 'Total Agreed Settlement',
                    'status' => (string) ($obligation?->status ?? 'pending'),
                    'breakdown' => [
                        ['label' => 'Labor & Service', 'amount_minor' => $totalAmountMinor],
                        ['label' => 'Platform Commission', 'amount_minor' => 0],
                    ],
                ],
            };

            $dealChainSlots = [];
            if ($row->deal_chain_id !== null) {
                $needs = DB::table('deal_needs')
                    ->where('deal_chain_id', $row->deal_chain_id)
                    ->orderBy('ordinal')
                    ->get();
                $dealChainSlots = $needs->map(fn ($n) => [
                    'id' => (string) $n->id,
                    'ordinal' => (int) $n->ordinal,
                    'need_kind' => (string) $n->need_kind,
                    'title' => (string) $n->title,
                    'status' => (string) $n->status,
                ])->all();
            }

            return Inertia::render('Orders/Show', [
                'correlationId' => $correlationId,
                'notice' => $request->session()->get('notice'),
                'actor_perspective' => $actorPerspective,
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
                    'actor_role' => $actorPerspective === 'customer' ? 'buyer' : ($actorPerspective === 'provider' ? 'provider' : 'courier'),
                    'customer_name' => (string) ($buyerProfile?->display_name ?? 'Maria Santos'),
                    'provider_name' => (string) ($providerProfile?->display_name ?? 'Kuya Ben AC'),
                    'listing_title' => $listingTitle,
                    'service_address' => 'Purok 4, Barangay Centro, Tagudin, Ilocos Sur',
                    'landmark' => 'Near Barangay Health Center · Blue Gate',
                ],
                'terms' => $terms === null ? null : [
                    'snapshot_version' => (int) $terms->snapshot_version,
                    'amount_minor' => (int) $terms->amount_minor,
                    'currency' => (string) $terms->currency,
                    'source_listing_version_id' => (string) $terms->source_listing_version_id,
                    'accepted_by_user_id' => (string) $terms->accepted_by_user_id,
                    'accepted_at' => (string) $terms->accepted_at,
                ],
                'work' => $this->workExecution->projectForOrder($work, $terms),
                'obligation' => $obligation === null ? null : [
                    'id' => (string) $obligation->id,
                    'status' => (string) $obligation->status,
                    'lane' => (string) $obligation->lane,
                    'amount_minor' => (int) $obligation->amount_minor,
                    'currency' => (string) $obligation->currency,
                ],
                'financials' => $scopedFinancials,
                'deal_chain_slots' => $dealChainSlots,
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

    public function proposeWorkCompletion(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        $orderRow = DB::table('orders')->where('id', $order)->first();
        if ($orderRow === null) {
            return $this->failure($request, new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404));
        }

        if ((string) $orderRow->provider_user_id !== $userId) {
            return $this->failure($request, new OrderError('AUTHORIZATION_DENIED', 'Only the assigned provider can propose completion.', $correlationId, status: 403));
        }

        DB::table('work_instances')->where('order_id', $order)->update([
            'status' => 'awaiting_signoff',
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('notice', 'Work completion proposed. Customer has been notified for sign-off.');
    }

    public function advanceWorkNode(Request $request, string $order, string $node): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $action = (string) $request->input('action', 'complete_step');
            $rawPayload = $request->input('payload', []);
            $payload = is_string($rawPayload) ? (json_decode($rawPayload, true) ?: []) : (array) $rawPayload;
            $result = $this->workExecution->advanceNode(
                orderId: $order,
                actorUserId: $actorUserId,
                nodeId: $node,
                action: $action,
                payload: $payload,
                correlationId: $correlationId,
            );

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['data' => $result], 200, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->back()->with('notice', 'Work node updated successfully.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function signoffWork(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        $orderRow = DB::table('orders')->where('id', $order)->first();
        if ($orderRow === null) {
            return $this->failure($request, new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404));
        }

        if ((string) $orderRow->buyer_user_id !== $userId) {
            return $this->failure($request, new OrderError('AUTHORIZATION_DENIED', 'Only the buyer can sign off work completion.', $correlationId, status: 403));
        }

        DB::transaction(function () use ($order): void {
            DB::table('work_instances')->where('order_id', $order)->update([
                'status' => 'completed',
                'updated_at' => now(),
            ]);

            DB::table('orders')->where('id', $order)->update([
                'status' => 'closed',
                'updated_at' => now(),
            ]);

            DB::table('payment_obligations')->where('order_id', $order)->update([
                'status' => 'released',
                'updated_at' => now(),
            ]);
        });

        return redirect()->back()->with('notice', 'Work sign-off approved! Escrow payment released to provider.');
    }

    public function courierPickup(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);
        $this->session->requireUser($request, $correlationId);

        return redirect()->back()->with('notice', 'Store pickup verified by courier. En route to customer destination.');
    }

    public function courierHandoff(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);
        $this->session->requireUser($request, $correlationId);

        return redirect()->back()->with('notice', 'Parcel handoff at gate confirmed. Transit delivery fee settled.');
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

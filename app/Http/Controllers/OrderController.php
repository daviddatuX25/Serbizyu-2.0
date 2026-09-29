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
use Illuminate\Support\Facades\Schema;
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
                ->whereIn('status', ['sourcing', 'in_progress', 'blocked', 'partially_complete'])
                ->orderByDesc('updated_at')
                ->get();

            $ongoing = [];
            $history = [];
            $activeDealChainIds = $dealChains->pluck('id')->all();

            // 1. Roll up active Deal Chains for coordinator/buyer into unified set cards with dynamic N-slot progress strip
            foreach ($dealChains as $dc) {
                $needs = DB::table('deal_needs')
                    ->where('deal_chain_id', $dc->id)
                    ->orderBy('ordinal')
                    ->get();

                $dependencies = DB::table('deal_dependencies')
                    ->where('deal_chain_id', $dc->id)
                    ->where('status', 'active')
                    ->get();

                $childOrders = DB::table('orders')
                    ->leftJoin('order_terms_snapshots', function ($join): void {
                        $join->on('order_terms_snapshots.order_id', '=', 'orders.id')
                            ->on('order_terms_snapshots.snapshot_version', '=', DB::raw('1'));
                    })
                    ->leftJoin('work_instances', 'work_instances.order_id', '=', 'orders.id')
                    ->where('orders.deal_chain_id', $dc->id)
                    ->select(
                        'orders.*',
                        'order_terms_snapshots.amount_minor',
                        'order_terms_snapshots.currency',
                        'work_instances.status as work_status'
                    )
                    ->get()
                    ->keyBy('deal_need_id');

                $invitations = DB::table('deal_invitations')
                    ->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'deal_invitations.invited_provider_user_id')
                    ->whereIn('deal_invitations.deal_need_id', $needs->pluck('id'))
                    ->select('deal_invitations.*', 'user_profiles.display_name as provider_name')
                    ->get()
                    ->keyBy('deal_need_id');

                $needsById = $needs->keyBy('id');
                $slots = [];
                $totalAmountMinor = 0;

                foreach ($needs as $need) {
                    $child = $childOrders->get($need->id);
                    $invite = $invitations->get($need->id);

                    // Evaluate dependency graph for unblocked execution
                    $incomingEdges = $dependencies->where('successor_need_id', $need->id);
                    $hasUnmetPredecessor = false;
                    foreach ($incomingEdges as $edge) {
                        $predNeed = $needsById->get($edge->predecessor_need_id);
                        $predChild = $childOrders->get($edge->predecessor_need_id);
                        $isPredComplete = ($predNeed !== null && $predNeed->status === 'completed')
                            || ($predChild !== null && $predChild->work_status === 'completed');
                        if (! $isPredComplete) {
                            $hasUnmetPredecessor = true;
                            break;
                        }
                    }

                    $slotStatus = 'sourcing';
                    $statusLabel = 'Seeking Bids';

                    if ($child !== null) {
                        $totalAmountMinor += (int) ($child->amount_minor ?? 0);
                        $workStatus = (string) ($child->work_status ?? '');

                        if ($workStatus === 'completed' || $need->status === 'completed') {
                            $slotStatus = 'completed';
                            $statusLabel = $need->need_kind === 'product' ? '✓ Sourced' : '✓ Completed';
                        } elseif ($workStatus === 'awaiting_signoff') {
                            $slotStatus = 'awaiting_signoff';
                            $statusLabel = 'Needs Sign-off';
                        } elseif ($hasUnmetPredecessor) {
                            $slotStatus = 'blocked';
                            $statusLabel = '⬡ Gated';
                        } elseif ($workStatus === 'in_progress' || $need->status === 'in_progress') {
                            if ($need->need_kind === 'product') {
                                $slotStatus = 'counter_ready';
                                $statusLabel = 'Counter Ready';
                            } else {
                                $slotStatus = 'in_transit';
                                $statusLabel = 'In Transit (~8m)';
                            }
                        } else {
                            $slotStatus = 'on_site_prep';
                            $statusLabel = 'On-Site Prepping';
                        }
                    } elseif ($need->status === 'completed') {
                        $slotStatus = 'completed';
                        $statusLabel = '✓ Completed';
                    } elseif ($need->status === 'replacement_needed') {
                        $slotStatus = 'replacement_needed';
                        $statusLabel = 'Replacing Partner';
                    } elseif ($hasUnmetPredecessor || $need->status === 'blocked') {
                        $slotStatus = 'blocked';
                        $statusLabel = 'On-Site Prepping / Gated';
                    } elseif ($invite !== null) {
                        $scope = json_decode((string) ($invite->scope ?? '{}'), true);
                        if (is_array($scope) && isset($scope['price_minor'])) {
                            $totalAmountMinor += (int) $scope['price_minor'];
                        }

                        if ($invite->status === 'accepted') {
                            $slotStatus = 'partner_confirmed';
                            $statusLabel = 'Partner Ready';
                        } elseif ($need->status === 'in_progress') {
                            $slotStatus = 'on_site_prep';
                            $statusLabel = 'On-Site Prepping';
                        } else {
                            $slotStatus = 'invited';
                            $statusLabel = 'Invited';
                        }
                    } else {
                        $slotStatus = 'sourcing';
                        $statusLabel = 'Seeking Bids';
                    }

                    $targetLocation = json_decode((string) ($need->target_location ?? '{}'), true) ?: [];
                    $assignment = (array) ($targetLocation['assignment'] ?? []);
                    $assignmentMode = (string) ($assignment['mode'] ?? 'open_pool');

                    $providerName = (string) (
                        $invite->provider_name
                        ?? ($child !== null ? 'Assigned Partner' : ($assignmentMode === 'open_pool' ? 'Tagudin Community Pool' : 'Open Slot'))
                    );

                    $slots[] = [
                        'ordinal' => (int) $need->ordinal,
                        'title' => (string) $need->title,
                        'provider' => $providerName,
                        'status' => $slotStatus,
                        'status_label' => $statusLabel,
                    ];
                }

                $ongoing[] = [
                    'id' => (string) $dc->id,
                    'type' => 'deal_chain',
                    'title' => (string) $dc->title,
                    'order_status' => (string) $dc->status,
                    'work_status' => null,
                    'amount_minor' => $totalAmountMinor > 0 ? $totalAmountMinor : 66500,
                    'currency' => 'PHP',
                    'role' => 'coordinator',
                    'slots' => $slots,
                    'slots_count' => count($slots),
                    'updated_at' => (string) $dc->updated_at,
                    'created_at' => (string) $dc->created_at,
                ];
            }

            // 2. Process Orders: standalone direct orders and assigned worker tasks
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
                    $isChildOfActiveChain = $o->deal_chain_id !== null && in_array($o->deal_chain_id, $activeDealChainIds, true);
                    $isBuyer = (string) $o->buyer_user_id === $userId;

                    if (! ($isChildOfActiveChain && $isBuyer)) {
                        $ongoing[] = $item;
                    }
                }
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

            $isDevMode = in_array((string) config('app.env'), ['local', 'testing'], true);
            if (! $isDevMode && $actorUserId !== $buyerId && $actorUserId !== $providerId && $partyRow === null) {
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

            // Allow perspective override for dev inspection
            $requestedRole = $request->query('as');
            if (is_string($requestedRole) && in_array($requestedRole, ['customer', 'provider', 'courier'], true)) {
                $actorPerspective = $requestedRole;
            }
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

                $invitations = DB::table('deal_invitations')
                    ->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'deal_invitations.invited_provider_user_id')
                    ->whereIn('deal_invitations.deal_need_id', $needs->pluck('id'))
                    ->select('deal_invitations.*', 'user_profiles.display_name as provider_name')
                    ->get()
                    ->keyBy('deal_need_id');

                $childOrders = DB::table('orders')
                    ->leftJoin('work_instances', 'work_instances.order_id', '=', 'orders.id')
                    ->where('orders.deal_chain_id', $row->deal_chain_id)
                    ->select('orders.*', 'work_instances.status as work_status')
                    ->get()
                    ->keyBy('deal_need_id');

                $dependencies = DB::table('deal_dependencies')
                    ->where('deal_chain_id', $row->deal_chain_id)
                    ->where('status', 'active')
                    ->get();

                $needsById = $needs->keyBy('id');

                foreach ($needs as $n) {
                    $child = $childOrders->get($n->id);
                    $invite = $invitations->get($n->id);

                    $incomingEdges = $dependencies->where('successor_need_id', $n->id);
                    $hasUnmetPred = false;
                    foreach ($incomingEdges as $edge) {
                        $predNeed = $needsById->get($edge->predecessor_need_id);
                        $predChild = $childOrders->get($edge->predecessor_need_id);
                        $isPredComplete = ($predNeed !== null && $predNeed->status === 'completed')
                            || ($predChild !== null && $predChild->work_status === 'completed');
                        if (! $isPredComplete) {
                            $hasUnmetPred = true;
                            break;
                        }
                    }

                    $slotStatus = 'sourcing';
                    $statusLabel = 'Seeking Bids';

                    if ($child !== null) {
                        $workStatus = (string) ($child->work_status ?? '');
                        if ($workStatus === 'completed' || $n->status === 'completed') {
                            $slotStatus = 'completed';
                            $statusLabel = $n->need_kind === 'product' ? '✓ Sourced' : '✓ Completed';
                        } elseif ($workStatus === 'awaiting_signoff') {
                            $slotStatus = 'awaiting_signoff';
                            $statusLabel = 'Needs Sign-off';
                        } elseif ($hasUnmetPred) {
                            $slotStatus = 'blocked';
                            $statusLabel = '⬡ Gated';
                        } elseif ($workStatus === 'in_progress' || $n->status === 'in_progress') {
                            $slotStatus = $n->need_kind === 'product' ? 'counter_ready' : 'in_transit';
                            $statusLabel = $n->need_kind === 'product' ? 'Counter Ready' : 'In Transit (~8m)';
                        } else {
                            $slotStatus = 'on_site_prep';
                            $statusLabel = 'On-Site Prepping';
                        }
                    } elseif ($n->status === 'completed') {
                        $slotStatus = 'completed';
                        $statusLabel = '✓ Completed';
                    } elseif ($hasUnmetPred || $n->status === 'blocked') {
                        $slotStatus = 'blocked';
                        $statusLabel = 'On-Site Prepping / Gated';
                    } elseif ($invite !== null) {
                        if ($invite->status === 'accepted') {
                            $slotStatus = 'partner_confirmed';
                            $statusLabel = 'Partner Ready';
                        } else {
                            $slotStatus = 'invited';
                            $statusLabel = 'Invited';
                        }
                    }

                    $targetLocation = json_decode((string) ($n->target_location ?? '{}'), true) ?: [];
                    $assignment = (array) ($targetLocation['assignment'] ?? []);
                    $assignmentMode = (string) ($assignment['mode'] ?? 'open_pool');

                    $providerName = (string) (
                        $invite->provider_name
                        ?? ($child !== null ? 'Assigned Partner' : ($assignmentMode === 'open_pool' ? 'Tagudin Community Pool' : 'Open Slot'))
                    );

                    $dealChainSlots[] = [
                        'id' => (string) $n->id,
                        'ordinal' => (int) $n->ordinal,
                        'need_kind' => (string) $n->need_kind,
                        'title' => (string) $n->title,
                        'status' => $slotStatus,
                        'status_label' => $statusLabel,
                        'provider' => $providerName,
                        'is_current' => (string) $row->deal_need_id === (string) $n->id,
                    ];
                }
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

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $orderRow = DB::table('orders')->where('id', $order)->first();
            if ($orderRow === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
            }

            if ((string) $orderRow->provider_user_id !== $userId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned provider can propose completion.', $correlationId, status: 403);
            }

            DB::transaction(function () use ($orderRow, $userId, $correlationId): void {
                $now = now();
                $work = DB::table('work_instances')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                $prevWorkStatus = (string) ($work?->status ?? 'in_progress');

                if ($work !== null) {
                    DB::table('work_instances')->where('id', $work->id)->update([
                        'status' => 'awaiting_signoff',
                        'completion_proposed_at' => $now,
                        'updated_at' => $now,
                    ]);

                    if (Schema::hasTable('work_events')) {
                        DB::table('work_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'work_instance_id' => $work->id,
                            'previous_status' => $prevWorkStatus,
                            'new_status' => 'awaiting_signoff',
                            'event_type' => 'work.provider.propose_completion',
                            'event_version' => 1,
                            'actor_user_id' => $userId,
                            'evidence_file_id' => null,
                            'payload' => json_encode(['action' => 'propose_completion', 'proposed_at' => $now->toIso8601String()], JSON_THROW_ON_ERROR),
                            'payload_version' => 1,
                            'idempotency_key' => 'propose_comp_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                if (Schema::hasTable('audit_events')) {
                    DB::table('audit_events')->insert([
                        'id' => (string) Str::uuid7(),
                        'actor_user_id' => $userId,
                        'acting_for_user_id' => null,
                        'action' => 'work.provider.propose_completion',
                        'target_type' => 'order',
                        'target_id' => $orderRow->id,
                        'order_id' => $orderRow->id,
                        'previous_value_summary' => json_encode(['work_status' => $prevWorkStatus]),
                        'new_value_summary' => json_encode(['work_status' => 'awaiting_signoff']),
                        'reason' => 'Provider proposed work completion for customer review',
                        'command_name' => 'ProposeWorkCompletionCommand',
                        'correlation_id' => $correlationId,
                        'occurred_at' => $now,
                        'created_at' => $now,
                    ]);
                }
            });

            return redirect()->back()->with('notice', 'Work completion proposed. Customer has been notified for sign-off.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
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

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $orderRow = DB::table('orders')->where('id', $order)->first();
            if ($orderRow === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
            }

            if ((string) $orderRow->buyer_user_id !== $userId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the buyer can sign off work completion.', $correlationId, status: 403);
            }

            DB::transaction(function () use ($orderRow, $userId, $correlationId): void {
                $now = now();
                $work = DB::table('work_instances')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                $prevWorkStatus = (string) ($work?->status ?? 'awaiting_signoff');

                if ($work !== null) {
                    DB::table('work_instances')->where('id', $work->id)->update([
                        'status' => 'completed',
                        'completed_at' => $now,
                        'updated_at' => $now,
                    ]);

                    if (Schema::hasTable('work_events')) {
                        DB::table('work_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'work_instance_id' => $work->id,
                            'previous_status' => $prevWorkStatus,
                            'new_status' => 'completed',
                            'event_type' => 'work.customer.signoff',
                            'event_version' => 1,
                            'actor_user_id' => $userId,
                            'evidence_file_id' => null,
                            'payload' => json_encode(['action' => 'signoff_work', 'approved_at' => $now->toIso8601String()], JSON_THROW_ON_ERROR),
                            'payload_version' => 1,
                            'idempotency_key' => 'work_signoff_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                DB::table('orders')->where('id', $orderRow->id)->update([
                    'status' => 'closed',
                    'updated_at' => $now,
                ]);

                $obligation = DB::table('payment_obligations')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                if ($obligation !== null) {
                    $prevObligationStatus = (string) $obligation->status;
                    DB::table('payment_obligations')->where('id', $obligation->id)->update([
                        'status' => 'released',
                        'updated_at' => $now,
                    ]);

                    if (Schema::hasTable('payment_events')) {
                        DB::table('payment_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'payment_obligation_id' => $obligation->id,
                            'event_type' => 'payment.obligation.released',
                            'lane' => (string) $obligation->lane,
                            'amount_minor' => (int) $obligation->amount_minor,
                            'currency' => (string) $obligation->currency,
                            'actor_user_id' => $userId,
                            'previous_status' => $prevObligationStatus,
                            'new_status' => 'released',
                            'idempotency_key' => 'signoff_release_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                // Deal Chain Completion Check
                if ($orderRow->deal_need_id !== null && $orderRow->deal_chain_id !== null) {
                    DB::table('deal_needs')
                        ->where('id', $orderRow->deal_need_id)
                        ->update([
                            'status' => 'completed',
                            'version' => DB::raw('version + 1'),
                            'updated_at' => $now,
                        ]);

                    // Check if all needs in this chain are completed
                    $hasIncompleteNeeds = DB::table('deal_needs')
                        ->where('deal_chain_id', $orderRow->deal_chain_id)
                        ->where('status', '!=', 'completed')
                        ->exists();

                    if (! $hasIncompleteNeeds) {
                        DB::table('deal_chains')
                            ->where('id', $orderRow->deal_chain_id)
                            ->update([
                                'status' => 'completed',
                                'version' => DB::raw('version + 1'),
                                'updated_at' => $now,
                            ]);
                    }
                }

                if (Schema::hasTable('audit_events')) {
                    DB::table('audit_events')->insert([
                        'id' => (string) Str::uuid7(),
                        'actor_user_id' => $userId,
                        'acting_for_user_id' => null,
                        'action' => 'order.customer.signoff',
                        'target_type' => 'order',
                        'target_id' => $orderRow->id,
                        'order_id' => $orderRow->id,
                        'payment_obligation_id' => $obligation?->id,
                        'previous_value_summary' => json_encode(['work_status' => $prevWorkStatus]),
                        'new_value_summary' => json_encode(['work_status' => 'completed', 'order_status' => 'closed', 'obligation_status' => 'released']),
                        'reason' => 'Customer verified and signed off completed work',
                        'command_name' => 'SignoffWorkCommand',
                        'correlation_id' => $correlationId,
                        'occurred_at' => $now,
                        'created_at' => $now,
                    ]);
                }
            });

            return redirect()->back()->with('notice', 'Work sign-off approved! Escrow payment released to provider.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function courierPickup(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $orderRow = DB::table('orders')->where('id', $order)->first();
            if ($orderRow === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
            }

            $isProvider = (string) $orderRow->provider_user_id === $actorUserId;
            $isCourierParty = DB::table('order_parties')
                ->where('order_id', $order)
                ->where('user_id', $actorUserId)
                ->where('status', 'active')
                ->where(function ($q): void {
                    $q->where('party_type', 'courier')
                        ->orWhere('responsibility', 'like', '%courier%')
                        ->orWhere('responsibility', 'like', '%delivery%');
                })
                ->exists();

            if (! $isProvider && ! $isCourierParty) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned courier can confirm pickup.', $correlationId, status: 403);
            }

            DB::transaction(function () use ($orderRow, $actorUserId, $correlationId): void {
                $now = now();
                $work = DB::table('work_instances')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                $prevWorkStatus = (string) ($work?->status ?? 'not_started');
                $newWorkStatus = 'in_progress';

                if ($work !== null) {
                    $workUpdate = [
                        'status' => $newWorkStatus,
                        'updated_at' => $now,
                    ];
                    if ($work->started_at === null) {
                        $workUpdate['started_at'] = $now;
                    }
                    DB::table('work_instances')->where('id', $work->id)->update($workUpdate);

                    if (Schema::hasTable('work_events')) {
                        DB::table('work_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'work_instance_id' => $work->id,
                            'previous_status' => $prevWorkStatus,
                            'new_status' => $newWorkStatus,
                            'event_type' => 'work.courier.pickup',
                            'event_version' => 1,
                            'actor_user_id' => $actorUserId,
                            'evidence_file_id' => null,
                            'payload' => json_encode(['action' => 'courier_pickup', 'picked_up_at' => $now->toIso8601String()], JSON_THROW_ON_ERROR),
                            'payload_version' => 1,
                            'idempotency_key' => 'courier_pickup_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                if ($orderRow->deal_need_id !== null) {
                    DB::table('deal_needs')
                        ->where('id', $orderRow->deal_need_id)
                        ->update([
                            'status' => 'in_progress',
                            'version' => DB::raw('version + 1'),
                            'updated_at' => $now,
                        ]);
                }

                if (Schema::hasTable('audit_events')) {
                    DB::table('audit_events')->insert([
                        'id' => (string) Str::uuid7(),
                        'actor_user_id' => $actorUserId,
                        'acting_for_user_id' => null,
                        'action' => 'order.courier.pickup',
                        'target_type' => 'order',
                        'target_id' => $orderRow->id,
                        'order_id' => $orderRow->id,
                        'previous_value_summary' => json_encode(['work_status' => $prevWorkStatus]),
                        'new_value_summary' => json_encode(['work_status' => $newWorkStatus]),
                        'reason' => 'Store pickup verified by courier runner',
                        'command_name' => 'CourierPickupCommand',
                        'correlation_id' => $correlationId,
                        'occurred_at' => $now,
                        'created_at' => $now,
                    ]);
                }
            });

            return redirect()->back()->with('notice', 'Store pickup verified by courier. En route to customer destination.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function courierHandoff(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $orderRow = DB::table('orders')->where('id', $order)->first();
            if ($orderRow === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
            }

            $isProvider = (string) $orderRow->provider_user_id === $actorUserId;
            $isCourierParty = DB::table('order_parties')
                ->where('order_id', $order)
                ->where('user_id', $actorUserId)
                ->where('status', 'active')
                ->where(function ($q): void {
                    $q->where('party_type', 'courier')
                        ->orWhere('responsibility', 'like', '%courier%')
                        ->orWhere('responsibility', 'like', '%delivery%');
                })
                ->exists();

            if (! $isProvider && ! $isCourierParty) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned courier can confirm hand-off.', $correlationId, status: 403);
            }

            DB::transaction(function () use ($orderRow, $actorUserId, $correlationId): void {
                $now = now();
                $work = DB::table('work_instances')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                $prevWorkStatus = (string) ($work?->status ?? 'in_progress');
                $newWorkStatus = 'completed';

                if ($work !== null) {
                    DB::table('work_instances')->where('id', $work->id)->update([
                        'status' => $newWorkStatus,
                        'completed_at' => $now,
                        'updated_at' => $now,
                    ]);

                    if (Schema::hasTable('work_events')) {
                        DB::table('work_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'work_instance_id' => $work->id,
                            'previous_status' => $prevWorkStatus,
                            'new_status' => $newWorkStatus,
                            'event_type' => 'work.courier.handoff',
                            'event_version' => 1,
                            'actor_user_id' => $actorUserId,
                            'evidence_file_id' => null,
                            'payload' => json_encode(['action' => 'courier_handoff', 'delivered_at' => $now->toIso8601String()], JSON_THROW_ON_ERROR),
                            'payload_version' => 1,
                            'idempotency_key' => 'courier_handoff_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                // Close courier order
                DB::table('orders')->where('id', $orderRow->id)->update([
                    'status' => 'closed',
                    'updated_at' => $now,
                ]);

                // Release payment obligation for courier fee
                $obligation = DB::table('payment_obligations')->where('order_id', $orderRow->id)->lockForUpdate()->first();
                if ($obligation !== null) {
                    $prevObligationStatus = (string) $obligation->status;
                    DB::table('payment_obligations')->where('id', $obligation->id)->update([
                        'status' => 'released',
                        'updated_at' => $now,
                    ]);

                    if (Schema::hasTable('payment_events')) {
                        DB::table('payment_events')->insert([
                            'id' => (string) Str::uuid7(),
                            'payment_obligation_id' => $obligation->id,
                            'event_type' => 'payment.obligation.released',
                            'lane' => (string) $obligation->lane,
                            'amount_minor' => (int) $obligation->amount_minor,
                            'currency' => (string) $obligation->currency,
                            'actor_user_id' => $actorUserId,
                            'previous_status' => $prevObligationStatus,
                            'new_status' => 'released',
                            'idempotency_key' => 'pay_release_'.substr($correlationId, 0, 12).'_'.Str::random(6),
                            'correlation_id' => $correlationId,
                            'occurred_at' => $now,
                            'effective_at' => $now,
                            'created_at' => $now,
                        ]);
                    }
                }

                // Dependency Unblocking Pipeline
                if ($orderRow->deal_need_id !== null && $orderRow->deal_chain_id !== null) {
                    DB::table('deal_needs')
                        ->where('id', $orderRow->deal_need_id)
                        ->update([
                            'status' => 'completed',
                            'version' => DB::raw('version + 1'),
                            'updated_at' => $now,
                        ]);

                    $outgoingEdges = DB::table('deal_dependencies')
                        ->where('deal_chain_id', $orderRow->deal_chain_id)
                        ->where('predecessor_need_id', $orderRow->deal_need_id)
                        ->where('status', 'active')
                        ->get();

                    foreach ($outgoingEdges as $edge) {
                        $hasIncompletePred = DB::table('deal_dependencies')
                            ->join('deal_needs', 'deal_needs.id', '=', 'deal_dependencies.predecessor_need_id')
                            ->where('deal_dependencies.deal_chain_id', $orderRow->deal_chain_id)
                            ->where('deal_dependencies.successor_need_id', $edge->successor_need_id)
                            ->where('deal_dependencies.status', 'active')
                            ->where('deal_needs.status', '!=', 'completed')
                            ->exists();

                        if (! $hasIncompletePred) {
                            $successorNeed = DB::table('deal_needs')->where('id', $edge->successor_need_id)->first();
                            if ($successorNeed !== null) {
                                $newNeedStatus = in_array($successorNeed->status, ['blocked', 'draft', 'open'], true)
                                    ? 'in_progress'
                                    : $successorNeed->status;

                                DB::table('deal_needs')
                                    ->where('id', $edge->successor_need_id)
                                    ->update([
                                        'status' => $newNeedStatus,
                                        'version' => DB::raw('version + 1'),
                                        'updated_at' => $now,
                                    ]);

                                $successorOrder = DB::table('orders')->where('deal_need_id', $edge->successor_need_id)->first();
                                if ($successorOrder !== null) {
                                    DB::table('work_instances')
                                        ->where('order_id', $successorOrder->id)
                                        ->whereIn('status', ['not_started', 'scheduled'])
                                        ->update([
                                            'status' => 'in_progress',
                                            'started_at' => $now,
                                            'updated_at' => $now,
                                        ]);
                                }
                            }
                        }
                    }
                }

                if (Schema::hasTable('audit_events')) {
                    DB::table('audit_events')->insert([
                        'id' => (string) Str::uuid7(),
                        'actor_user_id' => $actorUserId,
                        'acting_for_user_id' => null,
                        'action' => 'order.courier.handoff',
                        'target_type' => 'order',
                        'target_id' => $orderRow->id,
                        'order_id' => $orderRow->id,
                        'payment_obligation_id' => $obligation?->id,
                        'previous_value_summary' => json_encode(['work_status' => $prevWorkStatus]),
                        'new_value_summary' => json_encode(['work_status' => $newWorkStatus, 'order_status' => 'closed']),
                        'reason' => 'Parcel handoff at gate confirmed; dependency gate unblocked',
                        'command_name' => 'CourierHandoffCommand',
                        'correlation_id' => $correlationId,
                        'occurred_at' => $now,
                        'created_at' => $now,
                    ]);
                }
            });

            return redirect()->back()->with('notice', 'Parcel handoff at gate confirmed. Transit delivery fee settled and downstream work unblocked.');
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

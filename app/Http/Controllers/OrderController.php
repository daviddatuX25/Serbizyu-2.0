<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProposeOrderRequest;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\OrdersWork\Application\A4HandoffService;
use App\Modules\OrdersWork\Application\A9DeliveryService;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\RespondToOrderProposal;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\OrdersWork\Application\WorkClearanceChallengeService;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Modules\OrdersWork\Application\WorkNodeEvidenceService;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

final class OrderController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly SubmitOrderProposal $propose,
        private readonly FinalizeOrderAgreement $finalize,
        private readonly RespondToOrderProposal $proposalResponses,
        private readonly OrderListingSourcePort $listingSource,
        private readonly WorkExecutionService $workExecution,
        private readonly WorkNodeEvidenceService $workEvidence,
        private readonly WorkClearanceChallengeService $workChallenges,
        private readonly OrderPaymentObligationPort $paymentObligations,
        private readonly A9DeliveryService $a9Deliveries,
        private readonly A4HandoffService $a4Handoff,
    ) {}

    public function index(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $orders = DB::table('orders')
                ->leftJoin('order_terms_snapshots', 'order_terms_snapshots.id', '=', 'orders.current_terms_snapshot_id')
                ->leftJoin('order_proposals', 'order_proposals.id', '=', 'orders.current_proposal_id')
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
                    'orders.public_reference',
                    'orders.status as order_status',
                    'orders.listing_id',
                    'orders.buyer_user_id',
                    'orders.provider_user_id',
                    'orders.deal_chain_id',
                    'orders.created_at',
                    'orders.updated_at',
                    DB::raw("CASE WHEN orders.current_terms_snapshot_id IS NOT NULL THEN order_terms_snapshots.scope->>'title' WHEN orders.status = 'proposed' THEN order_proposals.scope->>'title' ELSE NULL END as listing_title"),
                    DB::raw("CASE WHEN orders.current_terms_snapshot_id IS NOT NULL THEN order_terms_snapshots.amount_minor WHEN orders.status = 'proposed' THEN order_proposals.amount_minor ELSE NULL END as amount_minor"),
                    DB::raw("CASE WHEN orders.current_terms_snapshot_id IS NOT NULL THEN order_terms_snapshots.currency WHEN orders.status = 'proposed' THEN order_proposals.currency ELSE NULL END as currency"),
                    'order_proposals.status as current_proposal_status',
                    'order_proposals.proposed_by_user_id',
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

            $needsAction = [];
            $active = [];
            $done = [];
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
                    ->leftJoin('order_terms_snapshots', 'order_terms_snapshots.id', '=', 'orders.current_terms_snapshot_id')
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
                $totalCurrency = null;
                $hasAmounts = false;
                $mixedCurrencies = false;

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
                        if ($child->amount_minor !== null) {
                            $childCurrency = is_string($child->currency) ? (string) $child->currency : null;
                            if ($childCurrency === null || ($totalCurrency !== null && $childCurrency !== $totalCurrency)) {
                                $mixedCurrencies = true;
                            } else {
                                $totalCurrency = $childCurrency;
                                $totalAmountMinor += (int) $child->amount_minor;
                                $hasAmounts = true;
                            }
                        }
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
                                $statusLabel = 'In Transit';
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

                $active[] = [
                    'id' => (string) $dc->id,
                    'type' => 'deal_chain',
                    'title' => (string) $dc->title,
                    'order_status' => (string) $dc->status,
                    'work_status' => null,
                    'amount_minor' => $hasAmounts && ! $mixedCurrencies ? $totalAmountMinor : null,
                    'currency' => $hasAmounts && ! $mixedCurrencies ? $totalCurrency : null,
                    'role' => 'coordinator',
                    'public_reference' => (string) $dc->public_reference,
                    'slots' => $slots,
                    'slots_count' => count($slots),
                    'updated_at' => (string) $dc->updated_at,
                    'created_at' => (string) $dc->created_at,
                ];
            }

            foreach ($orders as $o) {
                $status = (string) $o->order_status;
                $workStatus = $o->work_status ? (string) $o->work_status : null;
                $isDone = in_array($status, ['completed', 'cancelled'], true);
                $item = [
                    'id' => (string) $o->id,
                    'type' => 'order',
                    'title' => is_string($o->listing_title) && trim($o->listing_title) !== '' ? trim($o->listing_title) : null,
                    'order_status' => $status,
                    'work_status' => $workStatus,
                    'amount_minor' => $o->amount_minor !== null ? (int) $o->amount_minor : null,
                    'currency' => is_string($o->currency) ? (string) $o->currency : null,
                    'role' => (string) $o->buyer_user_id === $userId ? 'buyer' : ((string) $o->provider_user_id === $userId ? 'provider' : 'courier'),
                    'public_reference' => is_string($o->public_reference) ? (string) $o->public_reference : null,
                    'updated_at' => (string) $o->updated_at,
                    'created_at' => (string) $o->created_at,
                ];
                $isChildOfActiveChain = $o->deal_chain_id !== null && in_array((string) $o->deal_chain_id, $activeDealChainIds, true);
                $isChainBuyer = $isChildOfActiveChain && (string) $o->buyer_user_id === $userId;
                if ($isChainBuyer) {
                    continue;
                }
                if ($isDone) {
                    $done[] = $item;
                } elseif (
                    $status === 'proposed'
                    && (string) $o->current_proposal_status === 'proposed'
                    && (string) $o->proposed_by_user_id !== $userId
                ) {
                    $needsAction[] = $item;
                } else {
                    $active[] = $item;
                }
            }

            return Inertia::render('Orders/Index', [
                'needsAction' => $needsAction,
                'active' => $active,
                'done' => $done,
                'counts' => [
                    'needsAction' => count($needsAction),
                    'active' => count($active),
                    'done' => count($done),
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
            $requestedVersionId = $request->query('listing_version_id');
            if (is_string($requestedVersionId) && $requestedVersionId !== '' && $requestedVersionId !== (string) $source['listing_version_id']) {
                throw new OrderError('VERSION_CONFLICT', 'This listing changed. Refresh and review before booking.', $correlationId, status: 409, retryable: true);
            }
            $quantity = filter_var($request->query('quantity', '1'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 999]]);
            if ($quantity === false) {
                throw new OrderError('VALIDATION_FAILED', 'Choose a valid quantity.', $correlationId, status: 422);
            }
            $variantId = $request->query('variant_id');
            $packageId = $request->query('package_id');
            $combinationId = $request->query('deal_chain_combination_id');
            $rawAddonIds = $request->query('addon_ids', []);
            if (! is_array($rawAddonIds) || collect($rawAddonIds)->contains(static fn (mixed $id): bool => ! is_string($id))) {
                throw new OrderError('VALIDATION_FAILED', 'Choose valid seller add-ons.', $correlationId, status: 422);
            }
            $addonIds = array_values(array_unique($rawAddonIds));
            if ($variantId !== null && $packageId !== null) {
                throw new OrderError('VALIDATION_FAILED', 'Choose either a variant or a package, not both.', $correlationId, status: 422);
            }
            $lane = (string) $request->query('lane', 'external_cash');
            $note = $request->query('note');
            $slot = $request->query('slot');
            if ($slot !== null && ! is_array($slot)) {
                throw new OrderError('VALIDATION_FAILED', 'Choose a valid booking slot.', $correlationId, status: 422);
            }
            $selection = [
                'variant_id' => is_string($variantId) && $variantId !== '' ? $variantId : null,
                'package_id' => is_string($packageId) && $packageId !== '' ? $packageId : null,
                'listing_version_id' => (string) $source['listing_version_id'],
                'deal_chain_combination_id' => is_string($combinationId) && $combinationId !== '' ? $combinationId : null,
                'addon_ids' => $addonIds,
                'lane' => $lane,
                'note' => is_string($note) ? $note : null,
                'slot' => $slot,
            ];
            $appointmentReservationId = $request->query('appointment_reservation_id');
            if (strtoupper((string) ($source['work_shape'] ?? '')) === 'A3' && (! is_string($appointmentReservationId) || $appointmentReservationId === '')) {
                $request->session()->put('appointment_booking_draft', [
                    'listing_id' => $listing,
                    'expected_listing_version' => $expectedVersion,
                    'listing_version_id' => (string) $source['listing_version_id'],
                    'variant_id' => $selection['variant_id'],
                    'package_id' => $selection['package_id'],
                    'deal_chain_combination_id' => $selection['deal_chain_combination_id'],
                    'addon_ids' => $addonIds,
                    'lane' => $lane,
                    'note' => $selection['note'],
                    'quantity' => $quantity,
                ]);

                return redirect()->route('listings.appointment-booking', ['listing' => $listing]);
            }
            $selection['appointment_reservation_id'] = is_string($appointmentReservationId) ? $appointmentReservationId : null;
            $selectionHash = substr(hash('sha256', json_encode([$selection, $quantity], JSON_THROW_ON_ERROR)), 0, 32);
            $idempotencyKey = 'order.start:'.$buyerUserId.':'.$listing.':'.$selectionHash;
            $proposed = $this->propose->handle(
                buyerUserId: $buyerUserId,
                listingId: $listing,
                expectedListingVersion: $expectedVersion,
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                input: [
                    'quantity' => $quantity,
                    ...$selection,
                ],
            );

            return redirect()
                ->route('orders.show', ['order' => $proposed['order_id']])
                ->with('notice', 'Proposal sent for counterparty response.');
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
            $appointmentReservationId = $validated['appointment_reservation_id'] ?? null;
            $source = $this->listingSource->findActiveApproved($listing);
            if (
                strtoupper((string) ($source['work_shape'] ?? '')) === 'A3'
                && (! is_string($appointmentReservationId) || $appointmentReservationId === '')
            ) {
                if ($request->expectsJson() || $request->wantsJson()) {
                    throw new OrderError('APPOINTMENT_HOLD_REQUIRED', 'Choose and hold an appointment before proposing this A3 order.', $correlationId, status: 409);
                }
                $request->session()->put('appointment_booking_draft', [
                    'listing_id' => $listing,
                    'expected_listing_version' => (int) $validated['expected_listing_version'],
                    'listing_version_id' => (string) ($validated['listing_version_id'] ?? $source['listing_version_id'] ?? ''),
                    'variant_id' => $validated['variant_id'] ?? null,
                    'package_id' => $validated['package_id'] ?? null,
                    'deal_chain_combination_id' => $validated['deal_chain_combination_id'] ?? null,
                    'addon_ids' => $validated['addon_ids'] ?? [],
                    'lane' => $validated['lane'] ?? 'external_cash',
                    'note' => $validated['note'] ?? null,
                    'quantity' => (int) ($validated['quantity'] ?? 1),
                ]);

                return redirect()->route('listings.appointment-booking', ['listing' => $listing]);
            }
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
                    'variant_id' => $validated['variant_id'] ?? null,
                    'package_id' => $validated['package_id'] ?? null,
                    'listing_version_id' => $validated['listing_version_id'] ?? null,
                    'deal_chain_combination_id' => $validated['deal_chain_combination_id'] ?? null,
                    'lane' => $validated['lane'] ?? 'external_cash',
                    'note' => $validated['note'] ?? null,
                    'slot' => $validated['slot'] ?? null,
                    'addon_ids' => $validated['addon_ids'] ?? [],
                    'appointment_reservation_id' => $appointmentReservationId,
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
            $work = DB::table('work_instances')->where('order_id', $order)->first();

            $isChainCoordinator = false;
            $chainRecord = null;
            if ($row->deal_chain_id !== null) {
                $chainRecord = DB::table('deal_chains')->where('id', $row->deal_chain_id)->first();
                if ($chainRecord !== null && (string) $chainRecord->coordinator_user_id === $actorUserId) {
                    $isChainCoordinator = true;
                }
            }
            $isDealChainProductOrder = $row->deal_chain_id !== null
                && $row->deal_need_id !== null
                && (string) ($work->work_shape ?? '') === 'A4'
                && DB::table('deal_needs')
                    ->where('id', $row->deal_need_id)
                    ->where('deal_chain_id', $row->deal_chain_id)
                    ->where('need_kind', 'product')
                    ->exists();
            $partyResponsibility = (string) ($partyRow?->responsibility ?? '');
            $isOperationalHandoffParty = $partyRow !== null && (
                in_array((string) $partyRow->party_type, ['courier', 'recipient'], true)
                || in_array($partyResponsibility, ['courier', 'delivery', 'final_recipient'], true)
            );
            $hasCommercialPartyScope = $partyRow !== null
                && in_array((string) $partyRow->party_type, ['buyer', 'agent'], true)
                && in_array($partyResponsibility, ['primary', 'ordering_and_payment'], true);
            if (
                ($isDealChainProductOrder
                    && $isOperationalHandoffParty
                    && ! $hasCommercialPartyScope
                    && ! $isChainCoordinator
                    && $actorUserId !== $buyerId
                    && $actorUserId !== $providerId)
                || (! $isChainCoordinator && $actorUserId !== $buyerId && $actorUserId !== $providerId && $partyRow === null)
            ) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to view this order.', $correlationId, status: 403);
            }

            // Lock single truthful perspective derived strictly from the authenticated participant's actual role on this order
            $actorPerspective = ($actorUserId === $buyerId || $isChainCoordinator)
                ? 'customer'
                : ($actorUserId === $providerId
                    ? 'provider'
                    : (($partyRow?->party_type === 'courier' || str_contains((string) ($partyRow?->responsibility ?? ''), 'courier'))
                        ? 'courier'
                        : 'customer'));
            $terms = $row->current_terms_snapshot_id !== null
                ? DB::table('order_terms_snapshots')->where('id', $row->current_terms_snapshot_id)->first()
                : null;
            $termsData = is_array($terms?->scope)
                ? $terms->scope
                : json_decode((string) ($terms?->scope ?? '{}'), true);
            $termsData = is_array($termsData) ? $termsData : [];
            $currentProposalRow = $row->current_proposal_id !== null
                ? DB::table('order_proposals')->where('id', $row->current_proposal_id)->first()
                : null;
            $proposalScope = is_array($currentProposalRow?->scope)
                ? $currentProposalRow->scope
                : json_decode((string) ($currentProposalRow?->scope ?? '{}'), true);
            $proposalScope = is_array($proposalScope) ? $proposalScope : [];
            $listingTitle = isset($termsData['title']) && is_string($termsData['title']) && trim($termsData['title']) !== ''
                ? trim($termsData['title'])
                : ((string) $row->status === 'proposed'
                    && isset($proposalScope['title'])
                    && is_string($proposalScope['title'])
                    && trim($proposalScope['title']) !== ''
                    ? trim($proposalScope['title'])
                    : null);

            $providerProfile = DB::table('user_profiles')->where('user_id', $providerId)->first();
            $providerUser = DB::table('users')->where('id', $providerId)->first();
            $buyerProfile = DB::table('user_profiles')->where('user_id', $buyerId)->first();
            $buyerUser = DB::table('users')->where('id', $buyerId)->first();

            $counterpartyProfile = null;
            $counterpartyUser = null;
            if ($actorUserId === $buyerId) {
                $counterpartyProfile = $providerProfile;
                $counterpartyUser = $providerUser;
            } elseif ($actorUserId === $providerId || $partyRow !== null) {
                $counterpartyProfile = $buyerProfile;
                $counterpartyUser = $buyerUser;
            }
            $counterpartyName = $counterpartyProfile?->display_name;
            $counterpartyPhone = $counterpartyUser?->phone_e164;

            $obligationProjection = $this->paymentObligations->projectForOrder(
                (string) $row->id,
                $actorUserId,
                $terms?->source_listing_version_id !== null ? (string) $terms->source_listing_version_id : null,
            );
            $obligation = $obligationProjection === null ? null : (object) $obligationProjection;

            $workProjection = $this->workExecution->projectForOrder($work, $terms);
            $canViewWorkEvidence = $actorUserId === $buyerId || $actorUserId === $providerId;
            if ($workProjection !== null && is_array($workProjection['nodes'] ?? null)) {
                $workProjection['nodes'] = $this->workEvidence->projectNodes(
                    orderId: (string) $row->id,
                    workInstanceId: (string) $work->id,
                    actorUserId: $actorUserId,
                    nodes: $workProjection['nodes'],
                    canViewSubmittedEvidence: $canViewWorkEvidence,
                    canManageEvidence: $actorUserId === $providerId,
                );
                $workProjection['nodes'] = array_map(
                    fn (array $node): array => $this->workChallenges->projectNode(
                        orderId: (string) $row->id,
                        actorUserId: $actorUserId,
                        workVersion: (int) $workProjection['version'],
                        workSignature: (string) ($workProjection['signature_hash'] ?? ''),
                        node: $node,
                    ),
                    $workProjection['nodes'],
                );
            }
            $a9DeliveryProjection = $this->a9Deliveries->projectForOrder((string) $row->id, $actorUserId);
            $isOrderBuyer = $actorUserId === $buyerId;
            $canSignoff = false;
            if (
                $isOrderBuyer
                && ! in_array((string) ($work->work_shape ?? ''), ['A4', 'A9'], true)
                && ($workProjection['status'] ?? null) === 'awaiting_signoff'
                && is_array($workProjection['nodes'] ?? null)
            ) {
                foreach ($workProjection['nodes'] as $workNode) {
                    if (! is_array($workNode) || ($workNode['node_kind'] ?? null) !== 'final_signoff') {
                        continue;
                    }
                    $requiredProofs = (array) ($workNode['required_proofs'] ?? []);
                    $nodeEvidence = is_array($workNode['evidence'] ?? null) ? $workNode['evidence'] : [];
                    $photoProofReady = ! in_array('photo_proof', $requiredProofs, true)
                        || (
                            count((array) ($nodeEvidence['photos'] ?? [])) > 0
                            && (int) ($nodeEvidence['pending_photo_count'] ?? 0) === 0
                        );
                    $canSignoff = ($workNode['status'] ?? null) === 'awaiting_customer_confirmation'
                        && ($workNode['approval_method'] ?? 'app_confirm') === 'app_confirm'
                        && $photoProofReady;
                    break;
                }
            }
            $isParty = $actorUserId === $buyerId || $actorUserId === $providerId;
            $hasPendingProposal = $currentProposalRow !== null && (string) $currentProposalRow->status === 'proposed';
            $canRespond = $hasPendingProposal && (string) $currentProposalRow->proposed_by_user_id !== $actorUserId;
            $canAmend = $isParty
                && in_array((string) $row->status, ['accepted', 'in_progress'], true)
                && ! $hasPendingProposal;
            $proposal = $currentProposalRow === null ? null : [
                'id' => (string) $currentProposalRow->id,
                'version' => (int) $currentProposalRow->proposal_version,
                'kind' => (string) $currentProposalRow->kind,
                'status' => (string) $currentProposalRow->status,
                'proposed_by_user_id' => (string) $currentProposalRow->proposed_by_user_id,
                'amount_minor' => (int) $currentProposalRow->amount_minor,
                'currency' => (string) $currentProposalRow->currency,
                'note' => is_string($currentProposalRow->note) ? $currentProposalRow->note : null,
                'can_accept' => $canRespond,
                'can_decline' => $canRespond && (string) $row->status === 'proposed',
                'can_counter' => $canRespond && (string) $row->status === 'proposed',
                'can_amend' => $canAmend,
                'expected_order_version' => (int) $row->version,
            ];

            $totalAmountMinor = $obligation?->amount_minor !== null
                ? (int) $obligation->amount_minor
                : ($terms?->amount_minor !== null
                    ? (int) $terms->amount_minor
                    : ($hasPendingProposal ? (int) $currentProposalRow->amount_minor : null));
            $currency = is_string($obligation?->currency ?? null)
                ? (string) $obligation->currency
                : (is_string($terms?->currency ?? null)
                    ? (string) $terms->currency
                    : ($hasPendingProposal ? (string) $currentProposalRow->currency : null));
            $financialStatus = is_string($obligation?->status ?? null) ? (string) $obligation->status : null;
            $breakdown = $totalAmountMinor === null
                ? []
                : [['label' => 'Order amount', 'amount_minor' => $totalAmountMinor]];
            $scopedFinancials = [
                'amount_minor' => $totalAmountMinor,
                'currency' => $currency,
                'label' => $obligation === null ? 'Order terms' : 'Payment obligation',
                'status' => $financialStatus,
                'breakdown' => $breakdown,
            ];

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
                            $statusLabel = 'In Transit';
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

            $biddingLineage = null;
            if ($row->origin === 'request' || $row->request_id !== null) {
                $originRequest = $row->request_id !== null ? DB::table('requests')->where('id', $row->request_id)->first() : null;
                if ($originRequest !== null) {
                    $reqItemList = json_decode((string) ($originRequest->item_list ?? '{}'), true);
                    $reqTitle = is_array($reqItemList) && isset($reqItemList['title']) ? (string) $reqItemList['title'] : 'Citizen Request';
                    $tenderMode = is_array($reqItemList) && isset($reqItemList['tender_mode']) ? (string) $reqItemList['tender_mode'] : 'open_tender';
                    $winningQuote = $row->quote_id !== null ? DB::table('quotes')->where('id', $row->quote_id)->first() : null;
                    $competingCount = DB::table('quotes')->where('request_id', $originRequest->id)->count();

                    $biddingLineage = [
                        'request_id' => (string) $originRequest->id,
                        'request_ref' => '#REQ-'.substr((string) $originRequest->id, 0, 8),
                        'request_title' => $reqTitle,
                        'tender_mode' => $tenderMode,
                        'quote_id' => $winningQuote !== null ? (string) $winningQuote->id : null,
                        'quote_ref' => $winningQuote !== null ? '#QTE-'.substr((string) $winningQuote->id, 0, 8) : null,
                        'quote_version' => $winningQuote !== null ? (int) $winningQuote->quote_version : 1,
                        'winning_amount_minor' => $winningQuote !== null ? (int) $winningQuote->amount_minor : null,
                        'total_quotes_received' => $competingCount,
                        'is_sealed' => $tenderMode === 'sealed_tender',
                    ];
                }
            }

            return Inertia::render('Orders/Show', [
                'correlationId' => $correlationId,
                'notice' => $request->session()->get('notice'),
                'actor_perspective' => $actorPerspective,
                'proposal' => $proposal,
                'active_support_case_id' => DB::table('support_cases')
                    ->where('order_id', $row->id)
                    ->whereNotIn('status', ['resolved', 'closed', 'archived'])
                    ->orderByDesc('opened_at')->orderByDesc('id')->value('id'),
                'order' => [
                    'id' => (string) $row->id,
                    'request_id' => $row->request_id ? (string) $row->request_id : null,
                    'quote_id' => $row->quote_id ? (string) $row->quote_id : null,
                    'bidding_lineage' => $biddingLineage,
                    'status' => (string) $row->status,
                    'version' => (int) $row->version,
                    'listing_id' => (string) $row->listing_id,
                    'deal_chain_id' => $row->deal_chain_id ? (string) $row->deal_chain_id : null,
                    'deal_chain_title' => $chainRecord?->title ?? null,
                    'deal_chain_ref' => $chainRecord?->public_reference ?? null,
                    'buyer_user_id' => $buyerId,
                    'provider_user_id' => $providerId,
                    'mechanism' => (string) $row->mechanism,
                    'origin' => (string) $row->origin,
                    'geography' => $row->geography,
                    'public_reference' => is_string($row->public_reference) ? (string) $row->public_reference : null,
                    'is_order_buyer' => $isOrderBuyer,
                    'can_signoff' => $canSignoff,
                    'can_view_work_evidence' => $canViewWorkEvidence,
                    'can_accept' => (bool) ($proposal['can_accept'] ?? false),
                    'can_decline' => (bool) ($proposal['can_decline'] ?? false),
                    'can_counter' => (bool) ($proposal['can_counter'] ?? false),
                    'can_amend' => (bool) ($proposal['can_amend'] ?? false),
                    'actor_role' => $actorPerspective === 'customer' ? 'buyer' : ($actorPerspective === 'provider' ? 'provider' : 'courier'),
                    'customer_name' => is_string($buyerProfile?->display_name) ? (string) $buyerProfile->display_name : null,
                    'provider_name' => is_string($providerProfile?->display_name) ? (string) $providerProfile->display_name : null,
                    'counterparty_name' => is_string($counterpartyName) ? $counterpartyName : null,
                    'counterparty_phone' => is_string($counterpartyPhone) ? $counterpartyPhone : null,
                    'can_contact' => is_string($counterpartyName) && is_string($counterpartyPhone) && $counterpartyPhone !== '',
                    'listing_title' => $listingTitle,
                    'service_address' => is_string($termsData['service_address'] ?? null) ? $termsData['service_address'] : null,
                    'landmark' => is_string($termsData['landmark'] ?? null) ? $termsData['landmark'] : null,
                ],
                'terms' => $terms === null ? null : [
                    'snapshot_version' => (int) $terms->snapshot_version,
                    'amount_minor' => (int) $terms->amount_minor,
                    'currency' => (string) $terms->currency,
                    'source_listing_version_id' => (string) $terms->source_listing_version_id,
                    'accepted_by_user_id' => (string) $terms->accepted_by_user_id,
                    'accepted_at' => (string) $terms->accepted_at,
                ],
                'work' => $workProjection,
                'a9Delivery' => $a9DeliveryProjection,
                'a4Handoff' => $this->a4Handoff->projectForOrder((string) $row->id, $actorUserId, $correlationId),
                'obligation' => $obligationProjection,
                'financials' => $scopedFinancials,
                'deal_chain_slots' => $dealChainSlots,
                'appointment' => $this->appointmentProjection((string) $row->id, $actorUserId, $buyerId, $providerId, (string) $row->status, (string) ($work->work_shape ?? '')),
            ]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function handoffShow(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $row = DB::table('orders')->where('id', $order)->first([
                'id',
                'public_reference',
                'buyer_user_id',
                'provider_user_id',
                'current_terms_snapshot_id',
            ]);
            if ($row === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }
            if (! DB::table('work_instances')->where('order_id', $order)->where('work_shape', 'A4')->exists()) {
                throw new OrderError('INVALID_ORDER_SHAPE', 'This handoff view is only available for A4 orders.', $correlationId, status: 409);
            }

            if (! $this->a4Handoff->canViewAsCurrentPhaseActor((string) $row->id, $actorUserId, $correlationId)) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to view this order handoff.', $correlationId, status: 403);
            }

            $terms = $row->current_terms_snapshot_id === null
                ? null
                : DB::table('order_terms_snapshots')->where('id', $row->current_terms_snapshot_id)->first(['scope']);
            $scope = is_array($terms?->scope)
                ? $terms->scope
                : json_decode((string) ($terms?->scope ?? '{}'), true);
            $title = is_array($scope) && is_string($scope['title'] ?? null) && trim($scope['title']) !== ''
                ? trim($scope['title'])
                : 'Order handoff';

            return Inertia::render('Orders/Handoff', [
                'correlationId' => $correlationId,
                'order' => [
                    'id' => (string) $row->id,
                    'public_reference' => is_string($row->public_reference) ? (string) $row->public_reference : null,
                    'title' => $title,
                    'version' => (int) DB::table('orders')->where('id', $order)->value('version'),
                ],
                'a4Handoff' => $this->a4Handoff->projectForOrder((string) $row->id, $actorUserId, $correlationId),
            ]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function accept(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $validated = $this->proposalCommand($request);
            $current = DB::table('orders')->where('id', $order)->value('current_proposal_id');
            $proposal = is_string($current) ? DB::table('order_proposals')->where('id', $current)->first() : null;
            if ($proposal !== null && (string) $proposal->kind === 'amendment') {
                $result = $this->proposalResponses->acceptAmendment(
                    actorUserId: $actorUserId,
                    orderId: $order,
                    proposalId: (string) $proposal->id,
                    expectedOrderVersion: (int) $validated['expected_order_version'],
                    idempotencyKey: (string) $validated['idempotency_key'],
                    correlationId: $correlationId,
                );
            } else {
                $result = $this->finalize->handle(
                    actorUserId: $actorUserId,
                    orderId: $order,
                    expectedOrderVersion: (int) $validated['expected_order_version'],
                    idempotencyKey: (string) $validated['idempotency_key'],
                    correlationId: $correlationId,
                );
            }

            return $this->proposalResponse($request, $order, $result, 'Order proposal accepted.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function acceptProposal(Request $request, string $order, string $proposal): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $validated = $this->proposalCommand($request);
            $result = $this->proposalResponses->acceptAmendment(
                actorUserId: $actorUserId,
                orderId: $order,
                proposalId: $proposal,
                expectedOrderVersion: (int) $validated['expected_order_version'],
                idempotencyKey: (string) $validated['idempotency_key'],
                correlationId: $correlationId,
            );

            return $this->proposalResponse($request, $order, $result, 'Order amendment accepted.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function decline(Request $request, string $order): mixed
    {
        return $this->respondToProposal($request, $order, 'decline');
    }

    public function counter(Request $request, string $order): mixed
    {
        return $this->respondToProposal($request, $order, 'counter');
    }

    public function amend(Request $request, string $order): mixed
    {
        return $this->respondToProposal($request, $order, 'amend');
    }

    private function respondToProposal(Request $request, string $order, string $action): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $validated = $this->proposalCommand($request, $action !== 'decline');
            $result = $this->proposalResponses->handle(
                actorUserId: $actorUserId,
                orderId: $order,
                action: $action,
                expectedOrderVersion: (int) $validated['expected_order_version'],
                idempotencyKey: (string) $validated['idempotency_key'],
                correlationId: $correlationId,
                input: array_intersect_key($validated, array_flip(['amount_minor', 'currency', 'scope', 'note'])),
            );

            return $this->proposalResponse($request, $order, $result, match ($action) {
                'decline' => 'Order proposal declined.',
                'counter' => 'Counter-proposal sent.',
                default => 'Amendment proposed.',
            });
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    /** @return array<string, mixed> */
    private function proposalCommand(Request $request, bool $amountRequired = false): array
    {
        $header = $request->header('Idempotency-Key');
        if (is_string($header) && $header !== '' && ! $request->filled('idempotency_key')) {
            $request->merge(['idempotency_key' => trim($header)]);
        }

        return $request->validate([
            'expected_order_version' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9._:-]{8,128}$/'],
            'amount_minor' => [$amountRequired ? 'required' : 'sometimes', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'scope' => ['sometimes', 'array'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
    }

    /** @param array<string, mixed> $result */
    private function proposalResponse(Request $request, string $order, array $result, string $notice): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['data' => $result], 200, ['X-Correlation-Id' => $this->correlationId($request)]);
        }

        return redirect()->route('orders.show', ['order' => $order])->with('notice', $notice);
    }

    public function proposeWorkCompletion(Request $request, string $order): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $orderRow = DB::table('orders')->where('id', $order)->first();
            if ($orderRow === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }
            if ((string) $orderRow->provider_user_id !== $actorUserId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned provider can propose completion.', $correlationId, status: 403);
            }

            $work = DB::table('work_instances')->where('order_id', $order)->first();
            $structure = $work === null ? null : json_decode((string) $work->structure, true);
            $finalNode = null;
            foreach ((array) ($structure['nodes'] ?? []) as $candidate) {
                if (is_array($candidate) && ($candidate['node_kind'] ?? null) === 'final_signoff') {
                    $finalNode = $candidate;
                    break;
                }
            }
            if (! is_array($finalNode) || ! is_string($finalNode['id'] ?? null)) {
                throw new OrderError('WORK_NOT_FOUND', 'No active final sign-off node exists for this Work.', $correlationId, status: 409);
            }

            $payload = $request->input('payload', []);
            if (! is_array($payload)) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'Work evidence must be submitted as a structured payload.', $correlationId, status: 422);
            }
            if ($payload === [] && $request->has('notes')) {
                $payload['notes'] = $request->input('notes');
            }

            $this->workExecution->advanceNode(
                orderId: $order,
                actorUserId: $actorUserId,
                nodeId: $finalNode['id'],
                action: 'propose_completion',
                payload: $payload,
                correlationId: $correlationId,
            );

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
            if ($action === 'signoff_completion') {
                throw new OrderError('INVALID_ACTION', 'Use the Order sign-off action so payment and Work history remain atomic.', $correlationId, status: 409);
            }

            $rawPayload = $request->input('payload', []);
            $payload = is_string($rawPayload) ? json_decode($rawPayload, true) : $rawPayload;
            if (! is_array($payload)) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'Work evidence must be submitted as a structured payload.', $correlationId, status: 422);
            }

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
            if (DB::table('work_instances')->where('order_id', $order)->where('work_shape', 'A4')->exists()) {
                throw new OrderError('HANDOFF_PROTOCOL_REQUIRED', 'A4 product or courier-service completion requires the governed recipient receipt action.', $correlationId, status: 409);
            }

            DB::transaction(function () use ($orderRow, $userId, $correlationId): void {
                $lockedOrder = DB::table('orders')->where('id', $orderRow->id)->lockForUpdate()->first();
                if ($lockedOrder === null || (string) $lockedOrder->buyer_user_id !== $userId) {
                    throw new OrderError('AUTHORIZATION_DENIED', 'Only the buyer can sign off work completion.', $correlationId, status: 403);
                }

                $work = DB::table('work_instances')->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
                if ($work === null || (string) $work->status !== 'awaiting_signoff') {
                    throw new OrderError('INVALID_STATE', 'Work is not awaiting customer sign-off.', $correlationId, status: 409);
                }
                $structure = is_array($work->structure) ? $work->structure : json_decode((string) $work->structure, true);
                $finalNode = null;
                foreach ((array) ($structure['nodes'] ?? []) as $candidate) {
                    if (is_array($candidate) && ($candidate['node_kind'] ?? null) === 'final_signoff') {
                        $finalNode = $candidate;
                        break;
                    }
                }
                if (! is_array($finalNode) || ($finalNode['status'] ?? null) !== 'awaiting_customer_confirmation') {
                    throw new OrderError('INVALID_STATE', 'The final Work node is not awaiting customer sign-off.', $correlationId, status: 409);
                }

                $previousWorkStatus = (string) $work->status;
                $this->workExecution->advanceNode(
                    orderId: (string) $lockedOrder->id,
                    actorUserId: $userId,
                    nodeId: (string) $finalNode['id'],
                    action: 'signoff_completion',
                    correlationId: $correlationId,
                );
                $completedAt = now();
                $obligation = DB::table('payment_obligations')->where('order_id', $lockedOrder->id)->first();

                if ($lockedOrder->deal_need_id !== null && $lockedOrder->deal_chain_id !== null) {
                    DB::table('deal_needs')->where('id', $lockedOrder->deal_need_id)->update([
                        'status' => 'completed',
                        'version' => DB::raw('version + 1'),
                        'updated_at' => $completedAt,
                    ]);

                    if (! DB::table('deal_needs')->where('deal_chain_id', $lockedOrder->deal_chain_id)->where('status', '!=', 'completed')->exists()) {
                        DB::table('deal_chains')->where('id', $lockedOrder->deal_chain_id)->update([
                            'status' => 'completed',
                            'version' => DB::raw('version + 1'),
                            'updated_at' => $completedAt,
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
                        'target_id' => $lockedOrder->id,
                        'order_id' => $lockedOrder->id,
                        'payment_obligation_id' => $obligation?->id,
                        'previous_value_summary' => json_encode(['work_status' => $previousWorkStatus]),
                        'new_value_summary' => json_encode(['work_status' => 'completed', 'order_status' => 'completed', 'payment_status' => $obligation?->status]),
                        'reason' => 'Customer verified and signed off completed work',
                        'command_name' => 'SignoffWorkCommand',
                        'correlation_id' => $correlationId,
                        'occurred_at' => $completedAt,
                        'created_at' => $completedAt,
                    ]);
                }
            });

            return redirect()->back()->with('notice', 'Work sign-off approved. Payment settlement still requires separate confirmation.');
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    public function markPrepared(Request $request, string $order): mixed
    {
        return $this->runHandoffAction($request, $order, 'Order prepared for handoff.', function (string $actorId, string $correlationId) use ($request, $order): array {
            $this->assertAllowedHandoffFields($request, [
                'evidence_file_id',
                'idempotency_key',
                'expected_order_version',
                'node_id',
                'work_version',
                'checklist_responses',
                'metric_readings',
                'location',
                'notes',
            ], $correlationId);
            $data = $request->validate([
                'evidence_file_id' => ['required', 'uuid'],
                'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
                'expected_order_version' => ['required', 'integer', 'min:1'],
                'node_id' => ['sometimes', 'string', 'max:120'],
                'work_version' => ['sometimes', 'integer', 'min:1'],
                'checklist_responses' => ['sometimes', 'array', 'list'],
                'metric_readings' => ['sometimes', 'array', 'list'],
                'location' => ['sometimes', 'array'],
                'notes' => ['sometimes', 'string', 'max:2000'],
            ]);
            $proofPayload = array_intersect_key($data, array_flip(['checklist_responses', 'metric_readings', 'location', 'notes']));

            return $this->a4Handoff->markPrepared(
                $order,
                $actorId,
                $data['evidence_file_id'],
                $data['idempotency_key'],
                (int) $data['expected_order_version'],
                $correlationId,
                $data['node_id'] ?? null,
                isset($data['work_version']) ? (int) $data['work_version'] : null,
                $proofPayload,
            );
        });
    }

    public function offerCustody(Request $request, string $order): mixed
    {
        return $this->runHandoffAction($request, $order, 'Custody offer sent.', function (string $actorId, string $correlationId) use ($request, $order): array {
            $this->assertAllowedHandoffFields($request, [
                'transfer_mode',
                'courier_user_id',
                'idempotency_key',
                'expected_transfer_version',
            ], $correlationId);
            $data = $request->validate([
                'transfer_mode' => ['required', 'string', 'in:counter_pickup,courier_delivery'],
                'courier_user_id' => ['nullable', 'uuid'],
                'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
                'expected_transfer_version' => ['required', 'integer', 'min:1'],
            ]);

            return $this->a4Handoff->offerCustody($order, $actorId, $data['transfer_mode'], $data['courier_user_id'] ?? null, $data['idempotency_key'], (int) $data['expected_transfer_version'], $correlationId);
        });
    }

    public function acceptCustody(Request $request, string $order, string $transfer): mixed
    {
        return $this->runHandoffAction($request, $order, 'Custody accepted. Stock fulfillment was recorded once.', function (string $actorId, string $correlationId) use ($request, $order, $transfer): array {
            $this->assertAllowedHandoffFields($request, [
                'evidence_file_id',
                'idempotency_key',
                'expected_transfer_version',
                'node_id',
                'work_version',
                'checklist_responses',
                'metric_readings',
                'location',
                'notes',
            ], $correlationId);
            $data = $request->validate([
                'evidence_file_id' => ['required', 'uuid'],
                'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
                'expected_transfer_version' => ['required', 'integer', 'min:1'],
                'node_id' => ['sometimes', 'string', 'max:120'],
                'work_version' => ['sometimes', 'integer', 'min:1'],
                'checklist_responses' => ['sometimes', 'array', 'list'],
                'metric_readings' => ['sometimes', 'array', 'list'],
                'location' => ['sometimes', 'array'],
                'notes' => ['sometimes', 'string', 'max:2000'],
            ]);
            $proofPayload = array_intersect_key($data, array_flip(['checklist_responses', 'metric_readings', 'location', 'notes']));

            return $this->a4Handoff->acceptCustody(
                $order,
                $transfer,
                $actorId,
                $data['evidence_file_id'],
                $data['idempotency_key'],
                (int) $data['expected_transfer_version'],
                $correlationId,
                $data['node_id'] ?? null,
                isset($data['work_version']) ? (int) $data['work_version'] : null,
                $proofPayload,
            );
        });
    }

    public function recordReceipt(Request $request, string $order): mixed
    {
        return $this->runHandoffAction($request, $order, 'Final receipt recorded. Payment remains independently unsettled.', function (string $actorId, string $correlationId) use ($request, $order): array {
            $this->assertAllowedHandoffFields($request, [
                'evidence_file_id',
                'idempotency_key',
                'expected_transfer_version',
                'node_id',
                'work_version',
                'checklist_responses',
                'metric_readings',
                'location',
                'notes',
                'challenge_id',
                'code',
            ], $correlationId);
            $data = $request->validate([
                'evidence_file_id' => ['required', 'uuid'],
                'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
                'expected_transfer_version' => ['required', 'integer', 'min:1'],
                'node_id' => ['sometimes', 'string', 'max:120'],
                'work_version' => ['sometimes', 'integer', 'min:1'],
                'checklist_responses' => ['sometimes', 'array', 'list'],
                'metric_readings' => ['sometimes', 'array', 'list'],
                'location' => ['sometimes', 'array'],
                'notes' => ['sometimes', 'string', 'max:2000'],
                'challenge_id' => ['sometimes', 'nullable', 'uuid'],
                'code' => ['sometimes', 'nullable', 'string', 'regex:/\A[0-9]{6}\z/'],
            ]);
            $proofPayload = array_intersect_key($data, array_flip(['checklist_responses', 'metric_readings', 'location', 'notes']));

            return $this->a4Handoff->recordReceipt(
                $order,
                $actorId,
                $data['evidence_file_id'],
                $data['idempotency_key'],
                (int) $data['expected_transfer_version'],
                $correlationId,
                isset($data['work_version']) ? (int) $data['work_version'] : null,
                $data['node_id'] ?? null,
                $proofPayload,
                $data['challenge_id'] ?? null,
                $data['code'] ?? null,
            );
        });
    }

    /** @param Closure(string, string): array<string, mixed> $action */
    private function runHandoffAction(Request $request, string $order, string $notice, Closure $action): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorId = $this->session->requireUser($request, $correlationId);
            $result = $action($actorId, $correlationId);

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['data' => $result], 200, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->back()->with('notice', $notice);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($request, $error);
        }
    }

    /**
     * @param  list<string>  $allowed
     */
    private function assertAllowedHandoffFields(Request $request, array $allowed, string $correlationId): void
    {
        if (array_diff(array_keys($request->all()), $allowed) !== []) {
            throw new OrderError('INVALID_HANDOFF_REQUEST', 'The handoff request contains unsupported fields.', $correlationId, status: 422);
        }
    }

    /** @return array<string, mixed>|null */
    private function appointmentProjection(string $orderId, string $actorId, string $buyerId, string $providerId, string $orderStatus, string $workShape): ?array
    {
        if ($workShape !== 'A3') {
            return null;
        }

        $reservation = DB::table('appointment_reservations')
            ->where('order_id', $orderId)
            ->where('status', 'committed')
            ->orderByDesc('starts_at')
            ->first();
        $requests = DB::table('work_schedule_change_requests')
            ->leftJoin('appointment_reservations as proposed_reservation', 'proposed_reservation.id', '=', 'work_schedule_change_requests.proposed_reservation_id')
            ->where('work_schedule_change_requests.order_id', $orderId)
            ->orderBy('work_schedule_change_requests.created_at')
            ->select('work_schedule_change_requests.id', 'work_schedule_change_requests.proposed_by_user_id', 'work_schedule_change_requests.status', 'work_schedule_change_requests.created_at', 'proposed_reservation.starts_at', 'proposed_reservation.ends_at')
            ->get();
        $projectedRequests = $requests->map(static fn (object $request): array => [
            'id' => (string) $request->id,
            'proposedStart' => $request->starts_at === null ? '' : (string) $request->starts_at,
            'proposedEnd' => $request->ends_at === null ? '' : (string) $request->ends_at,
            'proposerUserId' => (string) $request->proposed_by_user_id,
            'status' => (string) $request->status === 'proposed' ? 'pending' : (string) $request->status,
            'createdAt' => (string) $request->created_at,
        ])->all();
        $isParticipant = $actorId === $buyerId || $actorId === $providerId;
        $hasPending = collect($projectedRequests)->contains(static fn (array $request): bool => $request['status'] === 'pending');

        return [
            'scheduledAt' => $reservation === null ? null : (string) $reservation->starts_at,
            'scheduleChangeRequests' => $projectedRequests,
            'canPropose' => $isParticipant && in_array($orderStatus, ['accepted', 'in_progress'], true) && $reservation !== null && ! $hasPending,
            'viewerUserId' => $actorId,
        ];
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

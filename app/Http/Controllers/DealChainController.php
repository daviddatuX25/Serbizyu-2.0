<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\DealCoordinationError;
use App\Modules\DealCoordination\Application\DealNeedConfirmationProjection;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\DealCoordination\Application\ChooseDealReplacement;
use App\Modules\DealCoordination\Application\WithdrawDealPartner;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use App\Shared\Contracts\DealChainConversationParticipantsPort;
use App\Shared\Application\KernelException;
use App\Shared\Application\DealChainCandidateRoleClassifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

final class DealChainController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly DealChainCatalog $catalog,
        private readonly StageDealChain $stageDealChain,
        private readonly RespondToDealInvitation $respondToInvitation,
        private readonly ConfirmDealNeedAgreement $confirmDealNeedAgreement,
        private readonly DealNeedConfirmationProjection $confirmationProjection,
        private readonly OrderHandoffCourierAuthorityPort $courierAuthority,
        private readonly WithdrawDealPartner $withdrawPartner,
        private readonly ChooseDealReplacement $chooseReplacement,
        private readonly DealChainConversationParticipantsPort $relayParticipants,
    ) {}

    public function authorize(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $recipeCatalog = $this->recipeCatalog();
            $validated = $request->validate([
                'items' => ['required', 'array', 'min:1', 'max:20'],
                'items.*' => ['required', 'array:id,listing_version_id,variant_id,package_id,addon_ids,deal_chain_combination_id,quantity,deal_chain,slot_overrides'],
                'items.*.id' => ['required', 'uuid'],
                'items.*.listing_version_id' => ['nullable', 'uuid'],
                'items.*.variant_id' => ['nullable', 'string', 'max:191'],
                'items.*.package_id' => ['nullable', 'string', 'max:191'],
                'items.*.addon_ids' => ['sometimes', 'array'],
                'items.*.addon_ids.*' => ['required', 'string', 'max:191'],
                'items.*.deal_chain_combination_id' => ['nullable', 'string', 'max:191'],
                'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
                'items.*.deal_chain' => ['nullable', 'string', Rule::in(array_keys($recipeCatalog))],
                'items.*.slot_overrides' => ['nullable', 'array'],
                'items.*.slot_overrides.*' => ['required', 'array:listing_id'],
                'items.*.slot_overrides.*.listing_id' => ['required', 'uuid'],
                'payment_method' => ['prohibited'],
                'total_amount' => ['prohibited'],
            ]);
            $idempotencyKey = (string) ($request->header('X-Idempotency-Key') ?: Str::uuid7());
            $result = $this->stageDealChain->handle(
                coordinatorUserId: $userId,
                items: $validated['items'],
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
            );

            return redirect()
                ->route('deal-chains.show', ['dealChain' => $result['deal_chain_id']])
                ->with(
                    'notice',
                    'Deal Chain plan staged. No Order, Work record, or payment obligation was created.',
                );
        } catch (IdentityAccessError) {
            return redirect()->route('auth.sign-in');
        } catch (DealCoordinationError $error) {
            throw ValidationException::withMessages(
                $error->envelope->fieldErrors !== [] ? $error->envelope->fieldErrors : ['items' => [$error->getMessage()]],
            );
        }
    }

    public function respondToInvitation(Request $request, string $invitation): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $idempotencyKey = (string) ($request->header('X-Idempotency-Key') ?: Str::uuid7());

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'decision' => ['required', 'string', Rule::in(['accept', 'decline'])],
                'expected_version' => ['required', 'integer', 'min:1'],
                'response_note' => ['nullable', 'string', 'max:500'],
            ]);

            $result = $this->respondToInvitation->handle(
                actorUserId: $userId,
                invitationId: $invitation,
                decision: $validated['decision'],
                expectedInvitationVersion: (int) $validated['expected_version'],
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                responseNote: $validated['response_note'] ?? null,
            );

            return response()->json(['data' => $result]);
        } catch (IdentityAccessError) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        } catch (DealCoordinationError $error) {
            return response()->json([
                'error' => [
                    'code' => $error->envelope->code,
                    'message' => $error->getMessage(),
                    'field_errors' => $error->envelope->fieldErrors,
                ],
            ], $error->status);
        }
    }

    public function confirmAgreement(Request $request, string $dealChain, string $need): mixed
    {
        $correlationId = $this->correlationId($request);
        $idempotencyKey = (string) ($request->header('X-Idempotency-Key') ?: Str::uuid7());

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'invitation_id' => ['required', 'uuid'],
                'expected_need_version' => ['required', 'integer', 'min:1'],
                'terms_hash' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
                'capacity_hash' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
                'amount_minor' => ['prohibited'],
                'price_minor' => ['prohibited'],
                'payment_method' => ['prohibited'],
                'appointment_reservation_id' => ['nullable', 'uuid'],
            ]);
            $result = $this->confirmDealNeedAgreement->handle(
                actorUserId: $userId,
                dealChainId: $dealChain,
                dealNeedId: $need,
                invitationId: (string) $validated['invitation_id'],
                expectedNeedVersion: (int) $validated['expected_need_version'],
                termsHash: (string) $validated['terms_hash'],
                capacityHash: (string) $validated['capacity_hash'],
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                appointmentReservationId: isset($validated['appointment_reservation_id']) ? (string) $validated['appointment_reservation_id'] : null,
            );

            if ($request->expectsJson()) {
                return response()->json(['data' => $result]);
            }

            return redirect()
                ->route('deal-chains.show', ['dealChain' => $dealChain])
                ->with('notice', 'Provider terms confirmed and an independent child Order was formed.');
        } catch (IdentityAccessError) {
            return $request->expectsJson()
                ? response()->json(['error' => 'Unauthenticated.'], 401)
                : redirect()->route('auth.sign-in');
        } catch (DealCoordinationError $error) {
            if (! $request->expectsJson()) {
                throw ValidationException::withMessages(
                    $error->envelope->fieldErrors !== []
                        ? $error->envelope->fieldErrors
                        : ['agreement' => [$error->getMessage()]],
                );
            }

            return response()->json([
                'error' => [
                    'code' => $error->envelope->code,
                    'message' => $error->getMessage(),
                    'field_errors' => $error->envelope->fieldErrors,
                ],
            ], $error->status);
        }
    }

    public function withdrawPartner(Request $request, string $dealChain, string $need): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $validated = $request->validate(['expected_need_version' => ['required', 'integer', 'min:1']]);
            $result = $this->withdrawPartner->handle(
                actorUserId: $userId,
                dealChainId: $dealChain,
                dealNeedId: $need,
                expectedNeedVersion: (int) $validated['expected_need_version'],
                idempotencyKey: (string) ($request->header('X-Idempotency-Key') ?: Str::uuid7()),
                correlationId: $correlationId,
            );
            return response()->json(['data' => $result]);
        } catch (IdentityAccessError) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        } catch (DealCoordinationError|KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage(), 'field_errors' => $error->envelope->fieldErrors]], $error->status);
        }
    }

    public function chooseReplacement(Request $request, string $dealChain, string $need): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'expected_need_version' => ['required', 'integer', 'min:1'],
                'listing_id' => ['required', 'uuid'],
                'variant_id' => ['nullable', 'string', 'max:191'],
                'amount_minor' => ['prohibited'],
                'price_minor' => ['prohibited'],
            ]);
            $result = $this->chooseReplacement->handle(
                actorUserId: $userId,
                dealChainId: $dealChain,
                dealNeedId: $need,
                expectedNeedVersion: (int) $validated['expected_need_version'],
                listingId: (string) $validated['listing_id'],
                variantId: isset($validated['variant_id']) ? (string) $validated['variant_id'] : null,
                idempotencyKey: (string) ($request->header('X-Idempotency-Key') ?: Str::uuid7()),
                correlationId: $correlationId,
            );
            return response()->json(['data' => $result]);
        } catch (IdentityAccessError) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        } catch (DealCoordinationError|KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage(), 'field_errors' => $error->envelope->fieldErrors]], $error->status);
        }
    }

    public function show(Request $request, string $dealChain): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
        } catch (IdentityAccessError) {
            return redirect()->route('auth.sign-in');
        }

        $chain = DB::table('deal_chains')->where('id', $dealChain)->first();
        if ($chain === null) {
            abort(404, 'Deal Chain not found');
        }

        $isCoordinator = (string) $chain->coordinator_user_id === $actorUserId;
        $participantOrders = DB::table('orders')
            ->where('deal_chain_id', $dealChain)
            ->where(function ($query) use ($actorUserId): void {
                $query
                    ->where('buyer_user_id', $actorUserId)
                    ->orWhere('provider_user_id', $actorUserId);
            })
            ->get();
        $isParticipant = $participantOrders->isNotEmpty();

        if (! $isCoordinator && ! $isParticipant) {
            abort(404, 'Deal Chain not found');
        }

        $ownedOrderIds = $participantOrders
            ->pluck('id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();
        $needs = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChain)
            ->orderBy('ordinal')
            ->get();
        $confirmationByNeed = $isCoordinator
            ? $this->confirmationProjection->forCoordinator(
                $needs->where('status', 'awaiting_customer_confirmation')
                    ->pluck('id')
                    ->map(static fn (mixed $id): string => (string) $id)
                    ->all(),
            )
            : [];
        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $dealChain)
            ->where('status', 'active')
            ->orderBy('created_at')
            ->get();

        $orders = DB::table('orders')
            ->where('deal_chain_id', $dealChain)
            ->get()
            ->keyBy('deal_need_id');
        $orderIds = $orders->pluck('id')->map(static fn (mixed $id): string => (string) $id)->all();
        $privateOrderIds = $isCoordinator ? $orderIds : $ownedOrderIds;
        $termsByOrder = collect();
        $obligationsByOrder = collect();
        $workByOrder = collect();

        if ($privateOrderIds !== []) {
            $termsByOrder = DB::table('order_terms_snapshots')
                ->whereIn('order_id', $privateOrderIds)
                ->orderByDesc('snapshot_version')
                ->get()
                ->groupBy('order_id')
                ->map(static fn ($rows) => $rows->first());
            $obligationsByOrder = DB::table('payment_obligations')
                ->whereIn('order_id', $privateOrderIds)
                ->get()
                ->keyBy('order_id');
        }
        if ($orderIds !== []) {
            $workByOrder = DB::table('work_instances')
                ->whereIn('order_id', $orderIds)
                ->get()
                ->keyBy('order_id');
        }

        $needsById = $needs->keyBy('id');
        $handoffUrlByNeed = [];
        foreach ($dependencies as $dependency) {
            if ($dependency->status !== 'active') {
                continue;
            }
            $productNeed = $needsById->get($dependency->predecessor_need_id);
            $courierNeed = $needsById->get($dependency->successor_need_id);
            if ($productNeed === null
                || $courierNeed === null
                || (string) $productNeed->node_role !== 'store'
                || (string) $productNeed->need_kind !== 'product'
                || (string) $productNeed->status !== 'in_progress'
                || (string) $courierNeed->node_role !== 'courier'
                || (string) $courierNeed->status !== 'in_progress') {
                continue;
            }

            $productOrder = $orders->get($productNeed->id);
            $courierOrder = $orders->get($courierNeed->id);
            if ($productOrder === null || $courierOrder === null) {
                continue;
            }

            foreach ($this->courierAuthority->activeCourierCandidatesForProductNeed(
                (string) $dealChain,
                (string) $productNeed->id,
            ) as $candidate) {
                if ($candidate['user_id'] === $actorUserId
                    && $candidate['order_id'] === (string) $courierOrder->id) {
                    $handoffUrlByNeed[(string) $courierNeed->id] = '/orders/'.(string) $productOrder->id.'/handoff';
                    break;
                }
            }
        }

        $totalAmountMinor = 0;
        $hasFinancialRecords = false;
        $currency = null;

        $providerOrderIds = $isCoordinator ? $orderIds : $ownedOrderIds;
        $providerUserIds = $orders->filter(
            static fn ($order): bool => in_array((string) $order->id, $providerOrderIds, true),
        )->pluck('provider_user_id')->filter()->unique()->values()->all();
        $providerProfiles = $providerUserIds !== []
            ? DB::table('user_profiles')->whereIn('user_id', $providerUserIds)->get()->keyBy('user_id')
            : collect();
        $providerUsers = $providerUserIds !== []
            ? DB::table('users')->whereIn('id', $providerUserIds)->get()->keyBy('id')
            : collect();

        $slots = $needs->map(function ($need) use (
            $orders,
            $termsByOrder,
            $obligationsByOrder,
            $workByOrder,
            $providerProfiles,
            $providerUsers,
            $actorUserId,
            $isCoordinator,
            $confirmationByNeed,
            &$totalAmountMinor,
            &$hasFinancialRecords,
            &$currency,
            $handoffUrlByNeed,
        ): array {
            $order = $orders->get($need->id);
            $canViewOrder = $order !== null && (
                $isCoordinator ||
                $actorUserId === (string) $order->buyer_user_id ||
                $actorUserId === (string) $order->provider_user_id
            );
            $terms = $canViewOrder ? $termsByOrder->get($order->id) : null;
            $obligation = $canViewOrder ? $obligationsByOrder->get($order->id) : null;
            $work = $order === null ? null : $workByOrder->get($order->id);
            $amountMinor = $obligation?->amount_minor ?? $terms?->amount_minor;
            $amountCurrency = $obligation?->currency ?? $terms?->currency;
            $amountSource = $obligation !== null
                ? 'payment obligation'
                : ($terms !== null ? 'order terms' : null);

            if ($isCoordinator && $amountMinor !== null) {
                $totalAmountMinor += (int) $amountMinor;
                $hasFinancialRecords = true;
                $currency ??= (string) $amountCurrency;
            }

            $providerId = $order?->provider_user_id ? (string) $order->provider_user_id : null;
            $providerProfile = $providerId ? $providerProfiles->get($providerId) : null;
            $providerUser = $providerId ? $providerUsers->get($providerId) : null;
            $providerName = $providerProfile?->display_name;

            $termsData = is_array($terms?->scope)
                ? $terms->scope
                : json_decode((string) ($terms?->scope ?? '{}'), true);
            $listingTitle = $canViewOrder && is_array($termsData) && isset($termsData['title']) && is_string($termsData['title']) && trim($termsData['title']) !== ''
                ? trim($termsData['title'])
                : (string) $need->title;

            $slot = [
                'id' => (string) $need->id,
                'deal_chain_id' => (string) $need->deal_chain_id,
                'ordinal' => (int) $need->ordinal,
                'need_kind' => (string) $need->need_kind,
                'title' => (string) $need->title,
                'listing_title' => $listingTitle,
                'status' => (string) $need->status,
                'expected_need_version' => (int) $need->version,
                'node_role' => (string) $need->node_role,
                'can_withdraw' => ($isCoordinator || $providerId === $actorUserId)
                    && ! in_array((string) $need->status, ['completed', 'cancelled', 'superseded', 'failed', 'replacement_needed'], true),
                'can_replace' => $isCoordinator && (string) $need->status === 'replacement_needed',
                'child_order_id' => $order?->id === null ? null : (string) $order->id,
                'order_reference' => $order?->public_reference === null ? null : (string) $order->public_reference,
                'replaces_deal_need_id' => $need->replaces_deal_need_id === null ? null : (string) $need->replaces_deal_need_id,
                'work_status' => $work?->status === null ? null : (string) $work->status,
                'provider_name' => $canViewOrder ? $providerName : null,
                'handoff_url' => $handoffUrlByNeed[(string) $need->id] ?? null,
                'confirmation' => $isCoordinator ? ($confirmationByNeed[(string) $need->id] ?? null) : null,
                'can_view_order' => $canViewOrder,
            ];
            if ($isCoordinator || $canViewOrder) {
                $slot['requested_at'] = (string) $need->requested_at;
                $slot['description'] = (string) $need->description;
            }

            if ($isCoordinator || $canViewOrder) {
                $slot['child_order_status'] = $order?->status === null ? null : (string) $order->status;
                $slot['payment_obligation_status'] = $obligation?->status === null ? null : (string) $obligation->status;
                $slot['amount_minor'] = $amountMinor === null ? null : (int) $amountMinor;
                $slot['currency'] = $amountCurrency === null ? null : (string) $amountCurrency;
                $slot['amount_source'] = $amountSource;
            }
            if ($isCoordinator) {
                $slot['provider_phone'] = $providerUser?->phone_e164;
            }

            return $slot;
        })->values()->all();

        $chainPayload = (array) $chain;
        if ($isCoordinator) {
            $chainPayload['total_budget_amount'] = $hasFinancialRecords
                ? $totalAmountMinor / 100
                : null;
            $chainPayload['currency_code'] = $currency;
            $chainPayload['financial_state'] = $hasFinancialRecords
                ? 'child_amounts_projected'
                : 'pending_child_agreements';
            $chainPayload['child_order_count'] = count($orderIds);
        }
        $relayParticipants = $this->relayParticipants->currentRelayParticipants($dealChain);

        return Inertia::render('Orders/DealChainDetail', [
            'chain' => $chainPayload,
            'slots' => $slots,
            'can_open_relay' => $relayParticipants !== null
                && ($isCoordinator || in_array($actorUserId, $relayParticipants['provider_user_ids'], true)),
            'dependencies' => $dependencies->map(static fn ($dependency): array => [
                'id' => (string) $dependency->id,
                'deal_chain_id' => (string) $dependency->deal_chain_id,
                'predecessor_need_id' => (string) $dependency->predecessor_need_id,
                'successor_need_id' => (string) $dependency->successor_need_id,
                'dependency_type' => (string) $dependency->dependency_type,
                'status' => (string) $dependency->status,
                'condition_code' => (string) $dependency->condition_code,
            ])->values()->all(),
            'notice' => session('notice'),
            'view' => $isCoordinator ? 'project' : 'worker',
        ]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function recipeCatalog(): array
    {
        return $this->catalog->published();
    }

    public function slotCandidates(Request $request): JsonResponse
    {
        $rawRole = strtoupper(trim((string) $request->query('role', 'STORE')));
        $role = match ($rawRole) {
            'RIDER', 'DELIVERY', 'COURIER' => 'COURIER',
            'PART', 'PRODUCT', 'STORE', 'HABERDASHERY', 'BAKERY', 'PRODUCE' => 'STORE',
            'TECHNICIAN', 'INSTALL', 'INSTALLATION', 'LABOR', 'TAILOR', 'ARTIST', 'RUNNER' => 'LABOR',
            'AUDIT', 'SAFETY' => 'AUDIT',
            'RECYCLE', 'HAULING', 'SCRAP' => 'RECYCLE',
            default => 'STORE',
        };
        $filterCategory = strtolower(trim((string) $request->query('category', '')));
        $filterBarangay = trim((string) $request->query('barangay', ''));

        $query = DB::table('listings')
            ->join('listing_versions', function ($j): void {
                $j->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->leftJoin('user_profiles', 'listings.owner_user_id', '=', 'user_profiles.user_id')
            ->where('listings.status', 'active')
            ->where('listings.review_status', 'approved')
            ->where(function ($q): void {
                $q->whereNull('listings.geography')
                    ->orWhereRaw("listings.geography->>'municipality_name' ILIKE 'Tagudin'")
                    ->orWhereRaw("listings.geography->>'municipality_code' = '012925000'");
            });

        if ($filterBarangay !== '') {
            $query->where(function ($q) use ($filterBarangay): void {
                $q->whereNull('listings.geography')
                    ->orWhereRaw("listings.geography->>'barangay_name' ILIKE ?", ["%{$filterBarangay}%"])
                    ->orWhereRaw("listings.geography->>'barangay_code' = ?", [$filterBarangay]);
            });
        }

        $realListings = $query->select([
            'listings.id',
            'listings.owner_user_id',
            'listings.listing_type',
            'listings.geography',
            'listing_versions.terms',
            'listing_versions.price_amount_minor',
            'listing_versions.description',
            'user_profiles.display_name as profile_display_name',
        ])->get();

        $candidates = [];

        foreach ($realListings as $listing) {
            $terms = json_decode((string) $listing->terms, true) ?: [];
            $geography = json_decode((string) $listing->geography, true) ?: [];
            $category = strtolower((string) ($terms['category_code'] ?? ''));
            $title = (string) ($terms['title'] ?? 'Verified Listing');
            $priceMinor = (int) ($listing->price_amount_minor ?? $terms['price_amount_minor'] ?? 0);
            $fixtureKey = (string) ($terms['fixture_key'] ?? '');

            // Dynamic provider display name (never leaking phone or private credentials)
            $providerName = (string) (
                $terms['stall_location']
                ?? $listing->profile_display_name
                ?? $terms['provider_name']
                ?? data_get($terms, 'owner.display_name')
                ?? (str_contains(strtolower($title), 'hardware') ? 'Tagudin Hardware Depot' : (str_contains(strtolower($title), 'bakery') ? 'Tagudin Morning Bakery' : 'Verified Merchant'))
            );

            // Dynamic area resolution
            $barangayName = (string) ($geography['barangay_name'] ?? '');
            $area = $barangayName !== '' ? "{$barangayName}, Tagudin" : 'Centro, Tagudin';

            // Photo resolution
            $photoUrl = (string) (
                data_get($terms, 'media.cover_thumbnail_url')
                ?? data_get($terms, 'media.items.0.url')
                ?? ($category === 'local-food' ? '/photos/bibingka.jpg' : ($listing->listing_type === 'product' ? '/photos/ac-capacitor.jpg' : '/photos/courier.jpg'))
            );

            $matchedRole = DealChainCandidateRoleClassifier::classify(
                (string) $listing->listing_type,
                $category,
                $title,
                $fixtureKey,
            );

            if ($matchedRole !== $role) {
                continue;
            }

            if ($filterCategory !== '' && $category !== '' && $category !== $filterCategory) {
                continue;
            }

            $candidates[] = [
                'id' => (string) $listing->id,
                'title' => $title,
                'provider_name' => $providerName,
                'provider_user_id' => (string) $listing->owner_user_id,
                'area' => $area,
                'price_minor' => $priceMinor,
                'sla_text' => match ($role) {
                    'COURIER' => 'On-demand ~20 mins transit',
                    'STORE' => 'Counter Ready in 15 mins',
                    'LABOR' => 'Same-day scheduled labor',
                    'AUDIT' => 'Municipal inspection certificate',
                    'RECYCLE' => 'Same-day material recycling',
                    default => 'Available in Tagudin',
                },
                'rating' => 4.9,
                'role' => $role,
                'photo_url' => $photoUrl,
            ];
        }

        return response()->json([
            'data' => array_values($candidates),
            'meta' => [
                'role' => $role,
                'count' => count($candidates),
                'locality' => 'Tagudin',
                'open_pool_supported' => true,
            ],
        ]);
    }

    private function correlationId(Request $request): string
    {
        return (string) ($request->attributes->get('correlation_id') ?: Str::uuid7());
    }
}

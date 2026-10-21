<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Catalogs\Application\WorkCatalog;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Tenders\Application\RequestDetailProjector;
use App\Modules\Tenders\Application\TenderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class RequestController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly SliceStateQuery $sliceState,
        private readonly RoleAssignmentService $roles,
        private readonly RequestDetailProjector $projector,
        private readonly TenderService $tenderService,
        private readonly WorkCatalog $workCatalog,
    ) {}

    public function create(Request $request): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);

        $categories = DB::table('categories')
            ->select(['id', 'code', 'name'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        return Inertia::render('Requests/CreateRequest', [
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'correlationId' => $correlationId,
            'categories' => $categories,
            'workCatalog' => $this->workCatalog->frontend(),
            'workOptions' => $this->workCatalog->optionsFor(null, 'service'),
        ]);
    }

    public function store(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);
        if (! $this->roles->hasActive($userId, 'buyer')) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'PREREQUISITE_FAILED',
                    'message' => 'Active buyer capability is required to create a request.',
                    'correlation_id' => $correlationId,
                ], 403, ['X-Correlation-Id' => $correlationId]);
            }

            abort(403, 'Active buyer capability is required to create a request.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:4000'],
            'category_code' => ['required', 'string'],
            'budget_amount' => ['nullable', 'numeric', 'min:0'],
            'budget_mode' => ['nullable', 'string', 'in:estimate,exact,undisclosed'],
            'urgency' => ['nullable', 'string', 'in:today,this_week,flexible,specific'],
            'scheduled_date' => ['nullable', 'string'],
            'time_window' => ['nullable', 'string'],
            'preferred_fulfillment' => ['nullable', 'string'],
            'tender_mode' => ['nullable', 'string', 'in:open_tender,sealed_tender,direct_invite'],
            'payment_lane' => ['nullable', 'string', 'in:external_cash,bilateral_escrow'],
            'area' => ['nullable', 'string', 'max:120'],
            'hide_exact_address' => ['nullable', 'boolean'],
            'requirements' => ['nullable', 'array'],
            'requirements.*' => ['string', 'max:500'],
            'attach_pipeline' => ['nullable', 'boolean'],
            'pipeline' => ['nullable', 'array'],
        ]);

        $category = DB::table('categories')->where('code', $validated['category_code'])->first()
            ?? DB::table('categories')->first();

        $isUndisclosed = ($validated['budget_mode'] ?? null) === 'undisclosed';
        $budgetMinor = ! $isUndisclosed && isset($validated['budget_amount']) && is_numeric($validated['budget_amount']) && ((float) $validated['budget_amount']) > 0
            ? (int) round(((float) $validated['budget_amount']) * 100)
            : null;

        $requestId = (string) Str::uuid7();
        $now = now();

        DB::table('requests')->insert([
            'id' => $requestId,
            'requester_user_id' => $userId,
            'listing_id' => null,
            'category_id' => $category?->id ?? (string) Str::uuid7(),
            'capability_profile_id' => null,
            'description' => trim($validated['description']),
            'item_list' => json_encode([
                'title' => trim($validated['title']),
                'preferred_fulfillment' => $validated['preferred_fulfillment'] ?? 'direct',
                'tender_mode' => $validated['tender_mode'] ?? 'open_tender',
                'budget_mode' => $validated['budget_mode'] ?? 'exact',
                'payment_lane' => $validated['payment_lane'] ?? 'external_cash',
                'requirements' => $validated['requirements'] ?? [],
                'attach_pipeline' => (bool) ($validated['attach_pipeline'] ?? false),
                'pipeline' => $validated['pipeline'] ?? null,
            ], JSON_THROW_ON_ERROR),
            'budget_amount_minor' => $budgetMinor,
            'budget_currency' => $budgetMinor !== null ? 'PHP' : null,
            'timing' => json_encode([
                'urgency' => $validated['urgency'] ?? 'flexible',
                'scheduled_for' => $validated['scheduled_date'] ?? null,
                'time_window' => $validated['time_window'] ?? null,
            ], JSON_THROW_ON_ERROR),
            'location' => json_encode([
                'area_code' => 'Tagudin',
                'barangay' => $validated['area'] ?? 'Tagudin Centro',
                'hide_exact_address' => (bool) ($validated['hide_exact_address'] ?? true),
            ], JSON_THROW_ON_ERROR),
            'status' => 'published',
            'expires_at' => now()->addDays(7),
            'privacy_preferences' => json_encode([
                'hide_exact_address' => (bool) ($validated['hide_exact_address'] ?? true),
                'tender_mode' => $validated['tender_mode'] ?? 'open_tender',
            ], JSON_THROW_ON_ERROR),
            'safety_preferences' => json_encode(['verified_providers_only' => true], JSON_THROW_ON_ERROR),
            'deal_chain_id' => null,
            'deal_need_id' => null,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'data' => [
                    'id' => $requestId,
                    'status' => 'published',
                    'title' => $validated['title'],
                ],
            ], 201);
        }

        return redirect()->route('browse')->with('notice', 'Your service request has been posted to Tagudin marketplace!');
    }

    public function show(Request $request, string $id): mixed
    {
        $correlationId = $this->correlationId($request);
        $projection = $this->projector->project($request, $id, $correlationId);

        if ($projection === null) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'REQUEST_NOT_FOUND',
                    'message' => 'The requested tender could not be found.',
                    'correlation_id' => $correlationId,
                ], 404, ['X-Correlation-Id' => $correlationId]);
            }

            abort(404, 'Request not found.');
        }

        if (($request->wantsJson() || $request->expectsJson()) && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => $projection,
            ], 200, ['X-Correlation-Id' => $correlationId]);
        }

        return Inertia::render('Requests/Show', [
            'request' => $projection['request'],
            'quotes' => $projection['quotes'],
            'viewer_role' => $projection['viewer_role'],
            'actions' => $projection['actions'],
            'session' => $projection['session'],
            'correlationId' => $correlationId,
        ]);
    }

    public function storeQuote(Request $request, string $id): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $validated = $request->validate([
                'amount_minor' => ['required_without:amount', 'nullable', 'integer', 'min:0'],
                'amount' => ['required_without:amount_minor', 'nullable', 'numeric', 'min:0'],
                'currency' => ['nullable', 'string', 'size:3'],
                'message' => ['required_without:proposal', 'nullable', 'string', 'max:2000'],
                'proposal' => ['required_without:message', 'nullable', 'string', 'max:2000'],
                'estimated_duration' => ['nullable', 'string', 'max:100'],
                'work_shape' => ['nullable', 'string', 'in:A1,A3,A4,A9'],
                'listing_id' => ['nullable', 'string', 'uuid'],
                'idempotency_key' => ['nullable', 'string', 'max:128'],
            ]);

            $amountMinor = isset($validated['amount_minor'])
                ? (int) $validated['amount_minor']
                : (int) round(((float) $validated['amount']) * 100);

            $quote = $this->tenderService->submitQuote(
                $userId,
                $id,
                [
                    'amount_minor' => $amountMinor,
                    'currency' => $validated['currency'] ?? 'PHP',
                    'message' => (string) ($validated['message'] ?? $validated['proposal'] ?? ''),
                    'estimated_duration' => $validated['estimated_duration'] ?? null,
                    'work_shape' => $validated['work_shape'] ?? 'A1',
                    'listing_id' => $validated['listing_id'] ?? null,
                    'idempotency_key' => $validated['idempotency_key'] ?? null,
                ],
                $correlationId
            );

            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'data' => $quote,
                ], 201, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->route('requests.show', $id)->with('notice', 'Your quote has been submitted!');
        } catch (IdentityAccessError $error) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => (string) $error->envelope->code,
                    'message' => $error->envelope->message,
                    'correlation_id' => $correlationId,
                ], $error->status, ['X-Correlation-Id' => $correlationId]);
            }

            abort($error->status, $error->envelope->message);
        }
    }

    public function acceptQuote(Request $request, string $id, string $quote): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $result = $this->tenderService->acceptQuote($userId, $id, $quote, $correlationId);

            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'data' => $result,
                ], 200, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->route('orders.show', $result['order_id'])->with('notice', 'Quote accepted and order created!');
        } catch (IdentityAccessError $error) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => (string) $error->envelope->code,
                    'message' => $error->envelope->message,
                    'correlation_id' => $correlationId,
                ], $error->status, ['X-Correlation-Id' => $correlationId]);
            }

            abort($error->status, $error->envelope->message);
        }
    }

    public function counterQuote(Request $request, string $id, string $quote): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $validated = $request->validate([
                'amount_minor' => ['required', 'integer', 'min:100'],
                'note' => ['nullable', 'string', 'max:1000'],
                'include_hardware' => ['nullable', 'boolean'],
            ]);

            $newQuote = $this->tenderService->counterQuote(
                $userId,
                $id,
                $quote,
                [
                    'amount_minor' => (int) $validated['amount_minor'],
                    'note' => $validated['note'] ?? null,
                    'include_hardware' => (bool) ($validated['include_hardware'] ?? false),
                ],
                $correlationId
            );

            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'data' => $newQuote,
                ], 201, ['X-Correlation-Id' => $correlationId]);
            }

            return redirect()->route('requests.show', $id)->with('notice', 'Counter-offer submitted!');
        } catch (IdentityAccessError $error) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => (string) $error->envelope->code,
                    'message' => $error->envelope->message,
                    'correlation_id' => $correlationId,
                ], $error->status, ['X-Correlation-Id' => $correlationId]);
            }

            abort($error->status, $error->envelope->message);
        }
    }

    private function correlationId(Request $request): string
    {
        $candidate = $request->header('X-Correlation-Id') ?? $request->attributes->get('correlation_id');
        if (is_string($candidate) && $candidate !== '') {
            return $candidate;
        }

        return (string) Str::uuid7();
    }
}

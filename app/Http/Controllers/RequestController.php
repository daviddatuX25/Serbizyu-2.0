<?php

declare(strict_types=1);

namespace App\Http\Controllers;

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
    ) {}

    public function create(Request $request): InertiaResponse
    {
        $correlationId = $this->correlationId($request);
        $state = $this->sliceState->for($request);

        return Inertia::render('Requests/CreateRequest', [
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'correlationId' => $correlationId,
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
            'urgency' => ['nullable', 'string', 'in:today,this_week,flexible'],
            'preferred_fulfillment' => ['nullable', 'string'],
        ]);

        $category = DB::table('categories')->where('code', $validated['category_code'])->first()
            ?? DB::table('categories')->first();

        $budgetMinor = isset($validated['budget_amount']) && is_numeric($validated['budget_amount']) && ((float) $validated['budget_amount']) > 0
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
            ], JSON_THROW_ON_ERROR),
            'budget_amount_minor' => $budgetMinor,
            'budget_currency' => $budgetMinor !== null ? 'PHP' : null,
            'timing' => json_encode([
                'urgency' => $validated['urgency'] ?? 'flexible',
                'scheduled_for' => null,
            ], JSON_THROW_ON_ERROR),
            'location' => json_encode(['area_code' => 'Tagudin'], JSON_THROW_ON_ERROR),
            'status' => 'published',
            'expires_at' => now()->addDays(7),
            'privacy_preferences' => json_encode(['hide_exact_address' => true], JSON_THROW_ON_ERROR),
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

    private function correlationId(Request $request): string
    {
        $candidate = $request->header('X-Correlation-Id') ?? $request->attributes->get('correlation_id');
        if (is_string($candidate) && $candidate !== '') {
            return $candidate;
        }

        return (string) Str::uuid7();
    }
}

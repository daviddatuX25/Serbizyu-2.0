<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\IdentityAccess\Application\SliceStateQuery;
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

    private function correlationId(Request $request): string
    {
        $candidate = $request->header('X-Correlation-Id') ?? $request->attributes->get('correlation_id');
        if (is_string($candidate) && $candidate !== '') {
            return $candidate;
        }

        return (string) Str::uuid7();
    }
}

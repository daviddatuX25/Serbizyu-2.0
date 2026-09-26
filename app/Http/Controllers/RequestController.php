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

    public function show(Request $request, string $id): mixed
    {
        $correlationId = $this->correlationId($request);

        $requestRecord = DB::table('requests')->where('id', $id)->first();
        if ($requestRecord === null) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'REQUEST_NOT_FOUND',
                    'message' => 'The requested tender could not be found.',
                    'correlation_id' => $correlationId,
                ], 404, ['X-Correlation-Id' => $correlationId]);
            }

            abort(404, 'Request not found.');
        }

        $requesterProfile = DB::table('user_profiles')->where('user_id', $requestRecord->requester_user_id)->first();

        $quotes = DB::table('quotes')
            ->where('request_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $providerIds = $quotes->pluck('provider_user_id')->unique()->all();
        $providerProfiles = DB::table('user_profiles')->whereIn('user_id', $providerIds)->get()->keyBy('user_id');

        $quotesData = $quotes->map(function ($q) use ($providerProfiles) {
            $profile = $providerProfiles->get($q->provider_user_id);
            $scope = is_string($q->scope) ? json_decode($q->scope, true) : (array) $q->scope;

            return [
                'id' => $q->id,
                'request_id' => $q->request_id,
                'provider_user_id' => $q->provider_user_id,
                'provider_name' => $profile?->display_name ?? 'Service Provider',
                'quote_version' => (int) $q->quote_version,
                'amount_minor' => (int) $q->amount_minor,
                'currency' => (string) $q->currency,
                'scope' => $scope,
                'work_shape' => (string) $q->work_shape,
                'status' => (string) $q->status,
                'created_at' => (string) $q->created_at,
            ];
        })->all();

        $itemList = is_string($requestRecord->item_list)
            ? json_decode($requestRecord->item_list, true)
            : (array) $requestRecord->item_list;
        $timing = is_string($requestRecord->timing)
            ? json_decode($requestRecord->timing, true)
            : (array) $requestRecord->timing;
        $location = is_string($requestRecord->location)
            ? json_decode($requestRecord->location, true)
            : (array) $requestRecord->location;

        $requestData = [
            'id' => $requestRecord->id,
            'requester_user_id' => $requestRecord->requester_user_id,
            'requester_name' => $requesterProfile?->display_name ?? 'Buyer',
            'title' => is_array($itemList) ? ($itemList['title'] ?? 'Service Request') : 'Service Request',
            'description' => $requestRecord->description,
            'item_list' => $itemList,
            'budget_amount_minor' => $requestRecord->budget_amount_minor !== null ? (int) $requestRecord->budget_amount_minor : null,
            'budget_currency' => $requestRecord->budget_currency,
            'timing' => $timing,
            'location' => $location,
            'status' => $requestRecord->status,
            'expires_at' => (string) $requestRecord->expires_at,
            'created_at' => (string) $requestRecord->created_at,
            'quotes_count' => count($quotesData),
        ];

        if (($request->wantsJson() || $request->expectsJson()) && ! $request->header('X-Inertia')) {
            return response()->json([
                'data' => [
                    'request' => $requestData,
                    'quotes' => $quotesData,
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        }

        return Inertia::render('Requests/Show', [
            'request' => $requestData,
            'quotes' => $quotesData,
            'correlationId' => $correlationId,
        ]);
    }

    public function storeQuote(Request $request, string $id): mixed
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        if (! $this->roles->hasActive($userId, 'provider')) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'PREREQUISITE_FAILED',
                    'message' => 'Active provider capability is required to submit a quote.',
                    'correlation_id' => $correlationId,
                ], 403, ['X-Correlation-Id' => $correlationId]);
            }

            abort(403, 'Active provider capability is required to submit a quote.');
        }

        $requestRecord = DB::table('requests')->where('id', $id)->first();
        if ($requestRecord === null) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'REQUEST_NOT_FOUND',
                    'message' => 'The requested tender could not be found.',
                    'correlation_id' => $correlationId,
                ], 404, ['X-Correlation-Id' => $correlationId]);
            }

            abort(404, 'Request not found.');
        }

        if ($requestRecord->requester_user_id === $userId) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'SELF_QUOTE_FORBIDDEN',
                    'message' => 'You cannot submit a quote on your own request.',
                    'correlation_id' => $correlationId,
                ], 403, ['X-Correlation-Id' => $correlationId]);
            }

            abort(403, 'You cannot submit a quote on your own request.');
        }

        if (! in_array($requestRecord->status, ['published', 'sourcing', 'quoted'], true)) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'REQUEST_NOT_OPEN',
                    'message' => 'This request is no longer accepting quotes.',
                    'correlation_id' => $correlationId,
                ], 422, ['X-Correlation-Id' => $correlationId]);
            }

            abort(422, 'This request is no longer accepting quotes.');
        }

        $validated = $request->validate([
            'amount_minor' => ['required_without:amount', 'nullable', 'integer', 'min:0'],
            'amount' => ['required_without:amount_minor', 'nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'message' => ['required_without:proposal', 'nullable', 'string', 'max:2000'],
            'proposal' => ['required_without:message', 'nullable', 'string', 'max:2000'],
            'estimated_duration' => ['nullable', 'string', 'max:100'],
            'work_shape' => ['nullable', 'string', 'in:A1,A3,A4,A9'],
            'listing_id' => ['nullable', 'string', 'uuid'],
        ]);

        $amountMinor = isset($validated['amount_minor'])
            ? (int) $validated['amount_minor']
            : (int) round(((float) $validated['amount']) * 100);

        $currency = strtoupper($validated['currency'] ?? 'PHP');
        $message = trim((string) ($validated['message'] ?? $validated['proposal'] ?? ''));

        $scope = [
            'message' => $message,
            'proposal' => $message,
            'estimated_duration' => $validated['estimated_duration'] ?? null,
        ];

        $nextVersion = ((int) DB::table('quotes')->where('request_id', $id)->max('quote_version')) + 1;
        $quoteId = (string) Str::uuid7();
        $now = now();

        DB::table('quotes')->insert([
            'id' => $quoteId,
            'request_id' => $id,
            'listing_id' => $validated['listing_id'] ?? null,
            'provider_user_id' => $userId,
            'quote_version' => $nextVersion,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'amount_components' => json_encode(['base' => $amountMinor], JSON_THROW_ON_ERROR),
            'scope' => json_encode($scope, JSON_THROW_ON_ERROR),
            'inclusions' => null,
            'exclusions' => null,
            'expires_at' => now()->addDays(7),
            'work_shape' => $validated['work_shape'] ?? 'A1',
            'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'status' => 'submitted',
            'deal_chain_id' => null,
            'deal_need_id' => null,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'data' => [
                    'id' => $quoteId,
                    'request_id' => $id,
                    'provider_user_id' => $userId,
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'status' => 'submitted',
                    'quote_version' => $nextVersion,
                ],
            ], 201, ['X-Correlation-Id' => $correlationId]);
        }

        return redirect()->route('requests.show', $id)->with('notice', 'Your quote has been submitted!');
    }

    public function acceptQuote(Request $request, string $id, string $quote): mixed
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);
        $quoteId = $quote;

        $requestRecord = DB::table('requests')->where('id', $id)->first();
        if ($requestRecord === null) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'REQUEST_NOT_FOUND',
                    'message' => 'The requested tender could not be found.',
                    'correlation_id' => $correlationId,
                ], 404, ['X-Correlation-Id' => $correlationId]);
            }

            abort(404, 'Request not found.');
        }

        if ($requestRecord->requester_user_id !== $userId) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'AUTHORIZATION_DENIED',
                    'message' => 'Only the requester can accept a quote.',
                    'correlation_id' => $correlationId,
                ], 403, ['X-Correlation-Id' => $correlationId]);
            }

            abort(403, 'Only the requester can accept a quote.');
        }

        $quoteRecord = DB::table('quotes')
            ->where('id', $quoteId)
            ->where('request_id', $id)
            ->first();

        if ($quoteRecord === null) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'QUOTE_NOT_FOUND',
                    'message' => 'The quote could not be found for this request.',
                    'correlation_id' => $correlationId,
                ], 404, ['X-Correlation-Id' => $correlationId]);
            }

            abort(404, 'Quote not found.');
        }

        if ($quoteRecord->status !== 'submitted') {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'code' => 'INVALID_STATE',
                    'message' => 'Quote cannot be accepted because it is not submitted.',
                    'correlation_id' => $correlationId,
                ], 422, ['X-Correlation-Id' => $correlationId]);
            }

            abort(422, 'Quote cannot be accepted.');
        }

        $orderId = (string) Str::uuid7();
        $now = now();

        DB::transaction(function () use ($id, $quoteId, $quoteRecord, $requestRecord, $userId, $orderId, $correlationId, $now): void {
            // 1. Mark accepted quote as accepted
            DB::table('quotes')
                ->where('id', $quoteId)
                ->update([
                    'status' => 'accepted',
                    'version' => ((int) $quoteRecord->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            // 2. Mark competing quotes for this request as not_selected
            DB::table('quotes')
                ->where('request_id', $id)
                ->where('id', '!=', $quoteId)
                ->whereIn('status', ['submitted', 'draft'])
                ->update([
                    'status' => 'not_selected',
                    'version' => DB::raw('version + 1'),
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            // 3. Mark request as awarded
            DB::table('requests')
                ->where('id', $id)
                ->update([
                    'status' => 'awarded',
                    'version' => ((int) $requestRecord->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            // 4. Create Order in orders (status accepted)
            DB::table('orders')->insert([
                'id' => $orderId,
                'origin' => 'request',
                'mechanism' => 'quote_tender',
                'listing_id' => $quoteRecord->listing_id,
                'request_id' => $id,
                'quote_id' => $quoteId,
                'buyer_user_id' => $userId,
                'provider_user_id' => $quoteRecord->provider_user_id,
                'status' => 'accepted',
                'geography' => is_string($requestRecord->location) ? $requestRecord->location : json_encode($requestRecord->location),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 5. Provision order_parties
            DB::table('order_parties')->insert([
                [
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'user_id' => $userId,
                    'party_type' => 'buyer',
                    'responsibility' => 'ordering_and_payment',
                    'scope' => json_encode(['role' => 'buyer'], JSON_THROW_ON_ERROR),
                    'consent_grant_id' => null,
                    'status' => 'active',
                    'effective_at' => $now,
                    'ended_at' => null,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'user_id' => $quoteRecord->provider_user_id,
                    'party_type' => 'provider',
                    'responsibility' => 'fulfillment_and_service',
                    'scope' => json_encode(['role' => 'provider'], JSON_THROW_ON_ERROR),
                    'consent_grant_id' => null,
                    'status' => 'active',
                    'effective_at' => $now,
                    'ended_at' => null,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);

            // 6. Provision order_terms_snapshots
            $scopeData = is_string($quoteRecord->scope) ? json_decode($quoteRecord->scope, true) : (array) $quoteRecord->scope;
            if (! is_array($scopeData)) {
                $scopeData = ['details' => (string) $quoteRecord->scope];
            }
            if (! isset($scopeData['title'])) {
                $items = is_string($requestRecord->item_list) ? json_decode($requestRecord->item_list, true) : (array) $requestRecord->item_list;
                $scopeData['title'] = is_array($items) && isset($items['title']) ? $items['title'] : 'Tagudin Service Order';
            }

            DB::table('order_terms_snapshots')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => null,
                'source_quote_id' => $quoteId,
                'scope' => json_encode($scopeData, JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => $quoteRecord->amount_minor,
                'currency' => $quoteRecord->currency,
                'payment_lane_options' => is_string($quoteRecord->payment_lane_options)
                    ? $quoteRecord->payment_lane_options
                    : json_encode($quoteRecord->payment_lane_options, JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['eligible_after' => 'work_completed'], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $userId,
                'accepted_at' => $now,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);

            // 7. Provision work_instances (status not_started, work_shape A1)
            $workId = (string) Str::uuid7();
            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $requestRecord->capability_profile_id,
                'work_shape' => $quoteRecord->work_shape ?: 'A1',
                'status' => 'not_started',
                'scheduled_at' => null,
                'started_at' => null,
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => null,
                'structure_payload_version' => null,
                'completion_evidence_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'shape_contract_version' => 1,
                'payload_schema_version' => 1,
                'row_version' => 1,
                'revisions_allowed' => 0,
                'revisions_used' => 0,
                'awaiting_signoff_at' => null,
                'cancelled_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 8. Provision payment_obligations
            DB::table('payment_obligations')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'work_instance_id' => $workId,
                'purpose' => 'primary_consideration',
                'amount_minor' => $quoteRecord->amount_minor,
                'currency' => $quoteRecord->currency,
                'lane' => 'external_cash',
                'status' => 'created',
                'due_condition' => 'on_acceptance',
                'policy_version_id' => null,
                'platform_fee_amount_minor' => 0,
                'processor_cost_amount_minor' => 0,
                'payer_user_id' => $userId,
                'recipient_user_id' => $quoteRecord->provider_user_id,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        if ($request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'data' => [
                    'order_id' => $orderId,
                    'quote_id' => $quoteId,
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        }

        return redirect()->route('orders.show', $orderId)->with('notice', 'Quote accepted and order created!');
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

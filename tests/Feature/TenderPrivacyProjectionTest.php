<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    $this->bootPhoneOtpAuth();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function createPrivacyTestUser(string $phone, string $role = 'buy'): User
{
    $user = User::factory()->create(['phone_e164' => $phone]);
    $now = now();

    DB::table('role_assignments')->updateOrInsert(
        ['user_id' => $user->id, 'role_code' => $role, 'status' => 'active'],
        [
            'id' => (string) Str::uuid7(),
            'granted_by_user_id' => $user->id,
            'effective_at' => $now,
            'scope' => '{}',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return $user;
}

it('enforces ADR-R-004 tender bid privacy: guests cannot see competitor quotes or amounts', function (): void {
    $buyer = createPrivacyTestUser('+639170010001', 'buy');
    $provider = createPrivacyTestUser('+639170010002', 'provide');

    // 1. Buyer creates request
    $this->actingAs($buyer);
    $req = $this->postJson('/requests', [
        'title' => 'Privacy Test Request',
        'description' => 'Home repair request testing that quotes remain confidential from public.',
        'category_code' => 'home-help',
        'budget_amount' => 1000,
    ])->assertStatus(201);
    $requestId = $req->json('data.id');

    // 2. Provider submits quote with sensitive commercial terms
    $this->actingAs($provider);
    $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 85000,
        'currency' => 'PHP',
        'message' => 'Confidential provider rate and proprietary breakdown.',
        'estimated_duration' => '1 day',
    ])->assertStatus(201);

    // 3. Unauthenticated guest visits request detail (GET /requests/{id})
    // Flush session/auth state to act as genuine guest
    auth()->logout();
    session()->flush();
    $guestResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $guestData = $guestResponse->json('data');

    expect($guestData['request']['id'])->toBe($requestId);
    expect($guestData['quotes'])->toBeEmpty(); // Guest must NOT see quotes
    expect($guestData['viewer_role'])->toBe('guest');

    // 4. Competing provider visits request detail
    // MUST NOT see competitor's quote terms or amounts
    $competitor = createPrivacyTestUser('+639170010003', 'provide');
    $this->actingAs($competitor);
    $competitorResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $compData = $competitorResponse->json('data');

    expect($compData['quotes'])->toBeEmpty(); // Competitor sees 0 of other provider's quotes
    expect($compData['viewer_role'])->toBe('eligible_responder');

    // 5. Original quoting provider visits request detail
    // MUST see ONLY their own submitted quote
    $this->actingAs($provider);
    $ownResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $ownData = $ownResponse->json('data');

    expect($ownData['quotes'])->toHaveCount(1);
    expect($ownData['quotes'][0]['provider_user_id'])->toBe($provider->id);
    expect($ownData['quotes'][0]['amount_minor'])->toBe(85000);
    expect($ownData['viewer_role'])->toBe('bidder');

    // 6. Requester (Buyer) visits request detail
    // MUST see all submitted quotes with full comparison capabilities
    $this->actingAs($buyer);
    $requesterResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $reqData = $requesterResponse->json('data');

    expect($reqData['quotes'])->toHaveCount(1);
    expect($reqData['quotes'][0]['amount_minor'])->toBe(85000);
    expect($reqData['viewer_role'])->toBe('requester');
});

it('omits public bid count from Browse request cards for guests and competitors', function (): void {
    $buyer = createPrivacyTestUser('+639170010010', 'buy');
    $provider = createPrivacyTestUser('+639170010011', 'provide');

    $this->actingAs($buyer);
    $req = $this->postJson('/requests', [
        'title' => 'Browse Privacy Request',
        'description' => 'Testing that public browse cards do not disclose bid counts.',
        'category_code' => 'home-help',
    ])->assertStatus(201);
    $requestId = $req->json('data.id');

    $this->actingAs($provider);
    $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'message' => 'Quote for browse check',
    ])->assertStatus(201);

    // Guest browsing /browse MUST NOT see quotes_count on communityRequests
    $browseResponse = $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])->get('/browse')->assertOk();

    $requests = collect($browseResponse->json('props.communityRequests'));
    $target = $requests->firstWhere('id', $requestId);
    expect($target)->not->toBeNull();
    // For non-requester, quotes_count must be null or omitted
    expect($target['quotes_count'] ?? null)->toBeNull();
});

it('projects category metadata, pipeline, and preserves milestone stages into quote submission and accepted order terms', function (): void {
    $buyer = createPrivacyTestUser('+639170010020', 'buy');
    $provider = createPrivacyTestUser('+639170010021', 'provide');

    $this->actingAs($buyer);
    $req = $this->postJson('/requests', [
        'title' => 'I need someone to buy me a milk tea from Big Brew',
        'description' => 'Citizen courier request for milk tea delivery in Magsaysay.',
        'category_code' => 'courier',
        'budget_amount' => 100,
        'preferred_fulfillment' => 'direct',
        'payment_lane' => 'external_cash',
        'attach_pipeline' => true,
        'pipeline' => [
            'template' => 'Local Errand & Pickup',
            'stages' => [
                ['id' => 'st-1', 'num' => '01', 'title' => 'Meetup', 'desc' => 'Kunin sakin yung pera', 'evidenceType' => 'dual_sign'],
                ['id' => 'st-2', 'num' => '02', 'title' => 'Buy', 'desc' => 'Magbili', 'dur' => '30m', 'evidenceType' => 'photo_required'],
                ['id' => 'st-3', 'num' => '03', 'title' => 'Deliver', 'desc' => 'I bag yung gamit', 'dur' => '15m', 'evidenceType' => 'dual_sign'],
            ],
        ],
    ])->assertStatus(201);
    $requestId = $req->json('data.id');

    // Detail projection includes category_code, category_name, and pipeline
    $this->actingAs($provider);
    $detailResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $requestData = $detailResponse->json('data.request');

    expect($requestData['category_code'])->toBe('courier');
    expect($requestData['category_name'])->toBe('Courier');
    expect($requestData['item_list']['pipeline']['stages'])->toHaveCount(3);
    expect($requestData['item_list']['pipeline']['stages'][0]['title'])->toBe('Meetup');

    // Provider submits quote with milestone_stages
    $quoteResponse = $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 10000,
        'currency' => 'PHP',
        'message' => 'Ready to pick up and deliver your order promptly with receipt proof. [Work Plan: 01. Meetup; 02. Buy; 03. Deliver]',
        'estimated_duration' => '45m',
        'milestone_stages' => [
            ['id' => 'st-1', 'num' => '01', 'title' => 'Meetup', 'desc' => 'Kunin sakin yung pera', 'evidenceType' => 'none', 'requiredProofs' => []],
            ['id' => 'st-2', 'num' => '02', 'title' => 'Buy', 'desc' => 'Magbili', 'evidenceType' => 'meter_log', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => ['metric_reading'], 'handoffParty' => 'recipient_confirm', 'metricRequirements' => [['id' => 'purchase-volume', 'name' => 'Purchase volume', 'unit' => 'litre', 'required' => true]]],
            ['id' => 'st-3', 'num' => '03', 'title' => 'Deliver', 'desc' => 'I bag yung gamit'],
            ['id' => 'st-custom', 'num' => '04', 'title' => 'Inspect receipt & verify seal', 'desc' => 'Custom step'],
        ],
    ])->assertStatus(201);
    $quoteId = $quoteResponse->json('data.id');

    // Verify quote in database has milestone_stages in scope
    $savedQuote = DB::table('quotes')->where('id', $quoteId)->first();
    expect($savedQuote)->not->toBeNull();
    $savedScope = json_decode($savedQuote->scope, true);
    expect($savedScope['milestone_stages'])->toHaveCount(4);
    expect($savedScope['milestone_stages'][3]['title'])->toBe('Inspect receipt & verify seal');
    $this->actingAs($buyer)
        ->postJson("/requests/{$requestId}/quotes/{$quoteId}/counter", [
            'amount_minor' => 12000,
            'note' => 'Preserve the authored reading requirement in the counter.',
        ])
        ->assertCreated();
    $quoteId = DB::table('quotes')->where('request_id', $requestId)->orderByDesc('quote_version')->value('id');
    $counterScope = json_decode((string) DB::table('quotes')->where('id', $quoteId)->value('scope'), true);
    expect($counterScope['milestone_stages'][1]['metric_requirements'])
        ->toBe([['id' => 'purchase-volume', 'name' => 'Purchase volume', 'unit' => 'litre', 'required' => true]]);

    // The provider accepts the customer's counter-offer.
    $this->actingAs($provider);
    $acceptResponse = $this->postJson("/requests/{$requestId}/quotes/{$quoteId}/accept")->assertOk();
    $orderId = $acceptResponse->json('data.order_id');
    expect($orderId)->not->toBeNull();
    $workInstance = DB::table('work_instances')->where('order_id', $orderId)->first();
    expect($workInstance)->not->toBeNull();
    $workStructure = json_decode($workInstance->structure, true);
    expect($workStructure['nodes'][1])
        ->toMatchArray([
            'id' => 'st-2',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'app_confirm',
            'handoff_party' => 'recipient_confirm',
            'required_proofs' => ['metric_reading'],
            'metric_requirements' => [['id' => 'purchase-volume', 'name' => 'Purchase volume', 'unit' => 'litre', 'required' => true]],
        ]);
    $this->actingAs($provider)
        ->postJson("/orders/{$orderId}/work-nodes/st-1", ['action' => 'complete_step'])
        ->assertOk();
    $this->postJson("/orders/{$orderId}/work-nodes/st-2", ['action' => 'complete_step'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'INVALID_ACTION');
    $this->postJson("/orders/{$orderId}/work-nodes/st-2", [
        'action' => 'request_confirmation',
        'payload' => ['metric_readings' => [['id' => 'purchase-volume', 'value' => 1.5, 'unit' => 'litre']]],
    ])->assertOk();
    expect(json_decode(DB::table('work_instances')->where('order_id', $orderId)->value('structure'), true)['nodes'][1]['status'])
        ->toBe('awaiting_customer_confirmation');

    // Order snapshot has preserved the milestone_stages
    $termsSnapshot = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
    expect($termsSnapshot)->not->toBeNull();
    $snapshotScope = json_decode($termsSnapshot->scope, true);
    expect($snapshotScope['milestone_stages'])->toHaveCount(4);
    expect($snapshotScope['milestone_stages'][0]['title'])->toBe('Meetup');
    expect($snapshotScope['milestone_stages'][3]['title'])->toBe('Inspect receipt & verify seal');
});
it('rejects malformed request pipeline stage structures with a validation response', function (): void {
    $buyer = createPrivacyTestUser('+639170010099', 'buy');
    $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Validated pipeline request',
        'description' => 'Pipeline validation must reject scalar stages before persistence.',
        'category_code' => 'courier',
        'pipeline' => [
            'stages' => [
                ['id' => 'duplicate', 'title' => 'Pickup', 'clearanceMode' => 'imaginary_mode'],
                ['id' => 'duplicate', 'title' => 'Dropoff'],
            ],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['pipeline.stages.0.clearanceMode', 'pipeline.stages.1.id']);
});
it('rejects malformed quote milestone mechanics before quote persistence', function (): void {
    $buyer = createPrivacyTestUser('+639170010098', 'buy');
    $provider = createPrivacyTestUser('+639170010097', 'provide');
    $this->actingAs($buyer);
    $requestId = $this->postJson('/requests', [
        'title' => 'Quote stage validation',
        'description' => 'Quote milestone stages require canonical mechanics.',
        'category_code' => 'courier',
    ])->assertCreated()->json('data.id');

    $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 10000,
        'message' => 'A quote with invalid milestone attributes.',
        'milestone_stages' => [
            ['id' => 'same', 'title' => 'Approval', 'approvalMethod' => 'invented'],
            ['id' => 'same', 'title' => 'Handoff'],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['milestone_stages.0.approvalMethod', 'milestone_stages.1.id']);
});
it('rejects scalar and null request and quote stage shapes with 422', function (): void {
    $buyer = createPrivacyTestUser('+639170010096', 'buy');
    $provider = createPrivacyTestUser('+639170010095', 'provide');
    $this->actingAs($buyer);

    foreach ([
        ['pipeline' => ['stages' => 'not-an-array'], 'field' => 'pipeline.stages'],
        ['pipeline' => ['stages' => [null]], 'field' => 'pipeline.stages.0'],
    ] as $invalidRequest) {
        $this->postJson('/requests', [
            'title' => 'Stage shape validation',
            'description' => 'Request pipeline stages must be structured arrays.',
            'category_code' => 'courier',
            'pipeline' => $invalidRequest['pipeline'],
        ])->assertUnprocessable()->assertJsonValidationErrors([$invalidRequest['field']]);
    }

    $requestId = $this->postJson('/requests', [
        'title' => 'Quote stage shape validation',
        'description' => 'Quote milestones must be structured arrays.',
        'category_code' => 'courier',
    ])->assertCreated()->json('data.id');

    $this->actingAs($provider)
        ->postJson("/requests/{$requestId}/quotes", [
            'amount_minor' => 10000,
            'message' => 'A quote with malformed milestone data.',
            'milestone_stages' => 'not-an-array',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['milestone_stages']);

    $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 10000,
        'message' => 'A quote with a null milestone.',
        'milestone_stages' => [null],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['milestone_stages.0']);
});

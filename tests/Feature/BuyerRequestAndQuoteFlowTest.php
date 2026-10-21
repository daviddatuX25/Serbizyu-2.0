<?php

declare(strict_types=1);

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

function createTestProvider(string $phone = '+639178888001'): User
{
    $user = User::factory()->create(['phone_e164' => $phone]);

    $now = now();
    DB::table('role_assignments')->updateOrInsert(
        ['user_id' => $user->id, 'role_code' => 'provide', 'status' => 'active'],
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

function createTestBuyer(string $phone = '+639179999001'): User
{
    $user = User::factory()->create(['phone_e164' => $phone]);

    $now = now();
    DB::table('role_assignments')->updateOrInsert(
        ['user_id' => $user->id, 'role_code' => 'buy', 'status' => 'active'],
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

it('executes full buyer request tender, provider quoting, and acceptance flow', function (): void {
    $buyer = createTestBuyer('+639179999010');
    $provider1 = createTestProvider('+639178888011');
    $provider2 = createTestProvider('+639178888012');
    $nonProvider = User::factory()->create(['phone_e164' => '+639177777013']);

    // 1. Buyer creates request (POST /requests)
    $this->actingAs($buyer);
    $createRequestResponse = $this->postJson('/requests', [
        'title' => 'Emergency Plumbing Repair',
        'description' => 'Pipe leak in the kitchen needing immediate repair and pipe replacement.',
        'category_code' => 'home-help',
        'budget_amount' => 1500,
        'urgency' => 'today',
        'preferred_fulfillment' => 'direct',
    ])->assertStatus(201);

    $requestId = $createRequestResponse->json('data.id');
    expect($requestId)->not->toBeEmpty();
    expect($createRequestResponse->json('data.status'))->toBe('published');

    // 2. Non-provider cannot submit quote (403)
    $this->actingAs($nonProvider);
    $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 120000,
        'currency' => 'PHP',
        'message' => 'I can do this job without provider credentials.',
        'estimated_duration' => '2 hours',
    ])->assertStatus(403);

    // 3. Provider 1 submits quote (POST /requests/{id}/quotes)
    $this->actingAs($provider1);
    $quote1Response = $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 120000,
        'currency' => 'PHP',
        'message' => 'Certified plumber ready to inspect and replace pipes with warranty.',
        'estimated_duration' => '2 hours',
        'work_shape' => 'A1',
    ])->assertStatus(201);

    $quote1Id = $quote1Response->json('data.id');
    expect($quote1Id)->not->toBeEmpty();
    expect($quote1Response->json('data.status'))->toBe('submitted');
    expect($quote1Response->json('data.amount_minor'))->toBe(120000);

    // 4. Provider 2 submits competing quote (POST /requests/{id}/quotes)
    $this->actingAs($provider2);
    $quote2Response = $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 140000,
        'currency' => 'PHP',
        'message' => 'Experienced technician with same-day tools and heavy duty copper pipe.',
        'estimated_duration' => '1.5 hours',
        'work_shape' => 'A1',
    ])->assertStatus(201);

    $quote2Id = $quote2Response->json('data.id');
    expect($quote2Id)->not->toBeEmpty();
    expect($quote2Response->json('data.status'))->toBe('submitted');

    // 5. Buyer views quotes list (GET /requests/{id})
    $this->actingAs($buyer);
    $showResponse = $this->getJson("/requests/{$requestId}")->assertOk();
    $showResponse->assertJsonPath('data.request.id', $requestId);
    $showResponse->assertJsonPath('data.request.status', 'published');
    $showResponse->assertJsonCount(2, 'data.quotes');

    $quotes = collect($showResponse->json('data.quotes'));
    expect($quotes->pluck('id')->all())->toContain($quote1Id, $quote2Id);

    // 6. Non-requester (e.g. Provider 1) cannot accept quote (403)
    $this->actingAs($provider1);
    $this->postJson("/requests/{$requestId}/quotes/{$quote1Id}/accept")->assertStatus(403);

    // 7. Buyer accepts Quote 1 (POST /requests/{id}/quotes/{quote}/accept) -> generates Order in orders
    $this->actingAs($buyer);
    $acceptResponse = $this->postJson("/requests/{$requestId}/quotes/{$quote1Id}/accept")->assertOk();
    $orderId = $acceptResponse->json('data.order_id');
    expect($orderId)->not->toBeEmpty();
    expect($acceptResponse->json('data.quote_id'))->toBe($quote1Id);

    // 8. Verify Order in orders
    $order = DB::table('orders')->where('id', $orderId)->first();
    expect($order)->not->toBeNull();
    expect($order->status)->toBe('accepted');
    expect($order->buyer_user_id)->toBe($buyer->id);
    expect($order->provider_user_id)->toBe($provider1->id);
    expect($order->request_id)->toBe($requestId);
    expect($order->quote_id)->toBe($quote1Id);

    // 9. Verify accepted quote is marked 'accepted'
    $quote1 = DB::table('quotes')->where('id', $quote1Id)->first();
    expect($quote1->status)->toBe('accepted');

    // 10. Verify competing quote is marked 'not_selected'
    $quote2 = DB::table('quotes')->where('id', $quote2Id)->first();
    expect($quote2->status)->toBe('not_selected');

    // 11. Verify request is marked 'awarded'
    $requestRecord = DB::table('requests')->where('id', $requestId)->first();
    expect($requestRecord->status)->toBe('awarded');

    // 12. Verify order_terms_snapshots provisioned
    $terms = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
    expect($terms)->not->toBeNull();
    expect($terms->snapshot_version)->toBe(1);
    expect((int) $terms->amount_minor)->toBe(120000);
    expect($terms->currency)->toBe('PHP');
    expect($terms->source_quote_id)->toBe($quote1Id);

    // 13. Verify work_instances provisioned (status not_started, work_shape A1)
    $work = DB::table('work_instances')->where('order_id', $orderId)->first();
    expect($work)->not->toBeNull();
    expect($work->status)->toBe('not_started');
    expect($work->work_shape)->toBe('A1');

    // 14. Verify order_parties provisioned for both buyer and provider
    expect(DB::table('order_parties')->where('order_id', $orderId)->where('party_type', 'buyer')->count())->toBe(1);
    expect(DB::table('order_parties')->where('order_id', $orderId)->where('party_type', 'provider')->count())->toBe(1);
});

it('redirects to order show page on web quote acceptance', function (): void {
    $buyer = createTestBuyer('+639179999020');
    $provider = createTestProvider('+639178888021');

    $this->actingAs($buyer);
    $createResponse = $this->postJson('/requests', [
        'title' => 'Electrical Socket Installation',
        'description' => 'Install two weather-proof GFCI sockets on the patio.',
        'category_code' => 'home-help',
        'budget_amount' => 800,
    ])->assertStatus(201);

    $requestId = $createResponse->json('data.id');

    $this->actingAs($provider);
    $quoteResponse = $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 80000,
        'currency' => 'PHP',
        'message' => 'Licensed electrician with branded GFCI sockets ready.',
    ])->assertStatus(201);

    $quoteId = $quoteResponse->json('data.id');

    $this->actingAs($buyer);
    $acceptResponse = $this->post("/requests/{$requestId}/quotes/{$quoteId}/accept");
    $acceptResponse->assertRedirect();

    $orderId = DB::table('orders')->where('request_id', $requestId)->where('quote_id', $quoteId)->value('id');
    expect($orderId)->not->toBeNull();
    $acceptResponse->assertRedirect(route('orders.show', $orderId));
});

it('blocks self-quoting, re-acceptance, and quoting on awarded requests', function (): void {
    $buyer = createTestBuyer('+639179999030');
    $provider = createTestProvider('+639178888031');

    // Also give provider buyer role so they can create a request
    DB::table('role_assignments')->insert([
        'id' => (string) Str::uuid7(),
        'user_id' => $provider->id,
        'role_code' => 'buy',
        'status' => 'active',
        'granted_by_user_id' => $provider->id,
        'effective_at' => now(),
        'scope' => '{}',
        'version' => 1,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($provider);
    $createResponse = $this->postJson('/requests', [
        'title' => 'Self-Quote Prevention Request',
        'description' => 'Testing that users cannot quote on their own tenders.',
        'category_code' => 'home-help',
        'budget_amount' => 500,
    ])->assertStatus(201);

    $requestId = $createResponse->json('data.id');

    // Self-quote must be rejected with 403
    $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'currency' => 'PHP',
        'message' => 'Quoting myself',
    ])->assertStatus(403);

    // Switch to different buyer and create request for acceptance tests
    $this->actingAs($buyer);
    $buyerReq = $this->postJson('/requests', [
        'title' => 'Another Service Request',
        'description' => 'Testing transition safeguards on accepted/awarded requests.',
        'category_code' => 'home-help',
    ])->assertStatus(201);
    $buyerReqId = $buyerReq->json('data.id');

    // Provider quotes
    $this->actingAs($provider);
    $q = $this->postJson("/requests/{$buyerReqId}/quotes", [
        'amount_minor' => 60000,
        'message' => 'Legit quote',
    ])->assertStatus(201);
    $qId = $q->json('data.id');

    // Buyer accepts
    $this->actingAs($buyer);
    $this->postJson("/requests/{$buyerReqId}/quotes/{$qId}/accept")->assertOk();

    // Re-acceptance must fail (422)
    $this->postJson("/requests/{$buyerReqId}/quotes/{$qId}/accept")->assertStatus(422);

    // Provider submitting quote on already awarded request must fail (422)
    $this->actingAs($provider);
    $this->postJson("/requests/{$buyerReqId}/quotes", [
        'amount_minor' => 70000,
        'message' => 'Late quote',
    ])->assertStatus(422);
});

it('creates request with tender mode, budget semantics, governed pipeline, and protected location', function (): void {
    $buyer = createTestBuyer('+639179999088');
    $this->actingAs($buyer);

    $response = $this->postJson('/requests', [
        'title' => 'Repair gate valve and pressure test water line',
        'description' => 'Water line is leaking under the kitchen sink. Need brass gate valve replacement.',
        'category_code' => 'home-help',
        'budget_amount' => 850,
        'budget_mode' => 'exact',
        'urgency' => 'specific',
        'scheduled_date' => '2026-10-05',
        'time_window' => 'Morning (8am - 12pm)',
        'tender_mode' => 'sealed_tender',
        'payment_lane' => 'bilateral_escrow',
        'area' => 'Tagudin Centro',
        'hide_exact_address' => true,
        'preferred_fulfillment' => 'direct',
        'requirements' => [
            'Inspect water pipe joint',
            'Replace brass valve',
            'Pressure test',
        ],
        'attach_pipeline' => true,
        'pipeline' => [
            'template' => 'A1-Linear-3-Stage',
            'total_sla_minutes' => 45,
        ],
    ])->assertStatus(201);

    $requestId = $response->json('data.id');
    expect($requestId)->toBeString();

    $row = DB::table('requests')->where('id', $requestId)->first();
    expect($row)->not->toBeNull();
    expect($row->budget_amount_minor)->toBe(85000);

    $itemList = json_decode($row->item_list, true);
    expect($itemList['title'])->toBe('Repair gate valve and pressure test water line');
    expect($itemList['tender_mode'])->toBe('sealed_tender');
    expect($itemList['budget_mode'])->toBe('exact');
    expect($itemList['payment_lane'])->toBe('bilateral_escrow');
    expect($itemList['requirements'])->toHaveCount(3);
    expect($itemList['attach_pipeline'])->toBeTrue();
    expect($itemList['pipeline']['template'])->toBe('A1-Linear-3-Stage');

    $timing = json_decode($row->timing, true);
    expect($timing['urgency'])->toBe('specific');
    expect($timing['scheduled_for'])->toBe('2026-10-05');
    expect($timing['time_window'])->toBe('Morning (8am - 12pm)');

    $location = json_decode($row->location, true);
    expect($location['barangay'])->toBe('Tagudin Centro');
    expect($location['hide_exact_address'])->toBeTrue();

    $privacy = json_decode($row->privacy_preferences, true);
    expect($privacy['tender_mode'])->toBe('sealed_tender');
    expect($privacy['hide_exact_address'])->toBeTrue();
});

it('allows requester to counter-offer on a submitted quote and creates immutable superseded revision', function (): void {
    $buyer = createTestBuyer('+639179999099');
    $provider = createTestProvider('+639178888099');

    // 1. Buyer creates request
    $this->actingAs($buyer);
    $requestRes = $this->postJson('/requests', [
        'title' => 'Electrical circuit breaker diagnosis',
        'description' => 'Breaker keeps tripping when heavy load air conditioner turns on.',
        'category_code' => 'home-help',
        'budget_amount' => 600,
    ])->assertStatus(201);

    $requestId = $requestRes->json('data.id');

    // 2. Provider submits initial quote v1
    $this->actingAs($provider);
    $quoteRes = $this->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'currency' => 'PHP',
        'message' => 'Complete breaker diagnostic and replacement.',
        'estimated_duration' => '2 hours',
    ])->assertStatus(201);

    $quoteId = $quoteRes->json('data.id');

    // 3. Buyer submits a counter-offer
    $this->actingAs($buyer);
    $counterRes = $this->postJson("/requests/{$requestId}/quotes/{$quoteId}/counter", [
        'amount_minor' => 40000,
        'note' => 'I already bought the 20A breaker from Tagudin Hardware. Labor only.',
        'include_hardware' => false,
    ])->assertStatus(201);

    $newQuoteId = $counterRes->json('data.id');
    expect($newQuoteId)->toBeString();
    expect($newQuoteId)->not->toBe($quoteId);
    expect($counterRes->json('data.quote_version'))->toBe(2);
    expect($counterRes->json('data.amount_minor'))->toBe(40000);

    // 4. Verify in database: original quote is superseded, new quote is submitted v2
    $oldQuote = DB::table('quotes')->where('id', $quoteId)->first();
    expect($oldQuote->status)->toBe('superseded');

    $newQuote = DB::table('quotes')->where('id', $newQuoteId)->first();
    expect($newQuote->status)->toBe('submitted');
    expect($newQuote->quote_version)->toBe(2);
    expect($newQuote->amount_minor)->toBe(40000);

    $newScope = json_decode($newQuote->scope, true);
    expect($newScope['counter_by'])->toBe('requester');
    expect($newScope['supersedes_quote_id'])->toBe($quoteId);
    expect($newScope['counter_note'])->toContain('already bought');

    // 5. Unauthorized user cannot counter
    $stranger = User::factory()->create(['phone_e164' => '+639170000099']);
    $this->actingAs($stranger);
    $this->postJson("/requests/{$requestId}/quotes/{$newQuoteId}/counter", [
        'amount_minor' => 35000,
    ])->assertStatus(403);
});

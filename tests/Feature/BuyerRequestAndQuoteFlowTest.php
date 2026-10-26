<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\AppointmentSchedulingService;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\AppointmentRescheduleService;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderCapacityPort;
use Database\Seeders\WorkCatalogSeeder;
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

/**
 * @return array{buyer: User, provider: User, listing_id: string, listing_version_id: string, request_id: string, capacity_bucket_id: string, correlation_id: string}
 */
function a4LinkedProductQuoteFixture(string $suffix, int $stock): array
{
    $buyer = createTestBuyer('+639179'.substr($suffix, -6));
    $provider = createTestProvider('+639178'.substr($suffix, -6));
    $correlationId = (string) Str::uuid7();
    app(WorkCatalogSeeder::class)->run();
    $listing = app(CreateListingDraft::class)->handle(new ResourceActor($provider->id, $provider->id), [
        'title' => 'Linked A4 quote product '.$suffix,
        'description' => 'A product selected by exact listing version and variant for A4 quote award coverage.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
        'work_catalog_code' => 'set-product-market-handoff',
        'work_set_version' => 1,
        'variants' => [['id' => 'large-box', 'name' => 'Large box', 'price_amount_minor' => 25000, 'currency' => 'PHP', 'stock' => $stock, 'is_default' => true]],
    ], $correlationId);
    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
    ]);
    $listingVersionId = (string) DB::table('listing_versions')->where('listing_id', $listing['id'])->where('version_number', $listing['current_version'])->value('id');
    $version = DB::table('listing_versions')->where('id', $listingVersionId)->first();
    $versionTerms = json_decode((string) $version->terms, true) ?: [];
    $versionTerms['variants'] = [[
        'id' => 'large-box',
        'resource_key' => 'large-box',
        'name' => 'Large box',
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $listingVersionId)->update([
        'terms' => json_encode($versionTerms, JSON_THROW_ON_ERROR),
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'published_at' => now(),
        'updated_at' => now(),
    ]);
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $listing['id'],
        listingVersionId: $listingVersionId,
        capacityType: 'quantity',
        quantity: $stock,
        correlationId: $correlationId,
        resourceKey: 'large-box',
    );
    $requestId = test()->actingAs($buyer)->postJson('/requests', [
        'title' => 'Source three large boxes',
        'description' => 'Award the linked product quote for three large boxes.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');

    return [
        'buyer' => $buyer,
        'provider' => $provider,
        'listing_id' => (string) $listing['id'],
        'listing_version_id' => $listingVersionId,
        'request_id' => (string) $requestId,
        'capacity_bucket_id' => $bucket['id'],
        'correlation_id' => $correlationId,
    ];
}

function insertCleanQuoteWorkEvidence(string $workId, string $ownerUserId, string $evidenceId, string $correlationId): void
{
    DB::table('evidence_files')->insert([
        'id' => $evidenceId,
        'owner_user_id' => $ownerUserId,
        'storage_key' => 'evidence/work/'.$workId.'/quote-a4-proof.jpg',
        'media_type' => 'image/jpeg',
        'size_bytes' => 64,
        'content_hash' => hash('sha256', 'quote A4 clean Work evidence'),
        'evidence_type' => 'work_node_photo_proof',
        'data_class' => 'WORK_EXECUTION',
        'scan_status' => 'clean',
        'visibility' => 'order_parties',
        'retention_policy' => 'order_dispute_window',
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('work_events')->insert([
        'id' => (string) Str::uuid7(),
        'work_instance_id' => $workId,
        'previous_status' => 'not_started',
        'new_status' => 'not_started',
        'event_type' => 'work.evidence.uploaded',
        'event_version' => 1,
        'actor_user_id' => $ownerUserId,
        'evidence_file_id' => $evidenceId,
        'payload' => json_encode(['node_id' => 'a4-prepare', 'tool_key' => 'photo_proof'], JSON_THROW_ON_ERROR),
        'payload_version' => 1,
        'idempotency_key' => 'quote-a4-evidence-'.$workId,
        'correlation_id' => $correlationId,
        'occurred_at' => now(),
        'effective_at' => now(),
        'created_at' => now(),
    ]);
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
    expect(DB::table('notifications')->count())->toBe(0);


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
    $quoteIntent = DB::table('notifications')
        ->where('recipient_user_id', $buyer->id)
        ->where('event_source_type', 'quote')
        ->where('event_source_id', $quote1Id)
        ->where('event_type', 'tender.quote_submitted')
        ->first();
    expect($quoteIntent)->not->toBeNull()
        ->and($quoteIntent?->priority)->toBe('needs_action')
        ->and(DB::table('notifications')->where('event_source_id', $quote1Id)->count())->toBe(1);
    $quotePayload = json_decode((string) $quoteIntent?->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($quotePayload['attention'])->toBe('needs_action')
        ->and($quotePayload['title'])->toBeString()
        ->and($quotePayload['body'])->toBeString()
        ->and($quotePayload['action_url'])->toBe(route('requests.show', ['id' => $requestId], false));
    expect(array_keys($quotePayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);


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
    $acceptanceIntent = DB::table('notifications')
        ->where('recipient_user_id', $provider1->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $orderId)
        ->where('event_type', 'order.accepted')
        ->first();
    expect($acceptanceIntent)->not->toBeNull();
    $acceptancePayload = json_decode((string) $acceptanceIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($acceptanceIntent->priority)->toBe('updates')
        ->and($acceptancePayload['attention'])->toBe('updates')
        ->and($acceptancePayload['title'])->toBeString()
        ->and($acceptancePayload['body'])->toBeString()
        ->and($acceptancePayload['action_url'])->toBe(route('orders.show', ['order' => $orderId], false))
        ->and(array_keys($acceptancePayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);
    $notSelectedIntent = DB::table('notifications')
        ->where('recipient_user_id', $provider2->id)
        ->where('event_source_type', 'quote')
        ->where('event_source_id', $quote2Id)
        ->where('event_type', 'tender.quote_not_selected')
        ->first();
    expect($notSelectedIntent)->not->toBeNull()
        ->and($notSelectedIntent?->priority)->toBe('updates');
    $notSelectedPayload = json_decode((string) $notSelectedIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($notSelectedPayload['attention'])->toBe('updates')
        ->and($notSelectedPayload['action_url'])->toBe(route('quotes.mine', [], false))
        ->and(DB::table('notifications')->where('event_source_id', $quote2Id)->where('event_type', 'tender.quote_not_selected')->count())->toBe(1)
        ->and(array_keys($notSelectedPayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);



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
    $counterIntent = DB::table('notifications')
        ->where('recipient_user_id', $provider->id)
        ->where('event_source_type', 'quote')
        ->where('event_source_id', $newQuoteId)
        ->where('event_type', 'tender.quote_countered')
        ->first();
    expect($counterIntent)->not->toBeNull();
    $counterPayload = json_decode((string) $counterIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($counterIntent->priority)->toBe('needs_action')
        ->and($counterPayload['attention'])->toBe('needs_action')
        ->and($counterPayload['title'])->toBeString()
        ->and($counterPayload['body'])->toBeString()
        ->and($counterPayload['action_url'])->toBe(route('requests.show', ['id' => $requestId], false));


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

    $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$newQuoteId}/counter", [
        'amount_minor' => 39000,
    ])->assertForbidden()->assertJsonPath('code', 'NEGOTIATION_TURN_REQUIRED');
    $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$newQuoteId}/accept")
        ->assertForbidden()->assertJsonPath('code', 'SELF_ACCEPTANCE_FORBIDDEN');
    $this->assertDatabaseMissing('orders', ['request_id' => $requestId]);
    expect(DB::table('notifications')->where('event_source_id', $newQuoteId)->where('event_type', 'tender.quote_countered')->count())->toBe(1);



    $award = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes/{$newQuoteId}/accept")
        ->assertOk();
    $acceptedOrderId = (string) $award->json('data.order_id');
    $counterAcceptanceIntent = DB::table('notifications')
        ->where('recipient_user_id', $buyer->id)
        ->where('event_source_type', 'order')
        ->where('event_source_id', $acceptedOrderId)
        ->where('event_type', 'order.accepted')
        ->first();
    expect($counterAcceptanceIntent)->not->toBeNull()
        ->and($counterAcceptanceIntent?->priority)->toBe('updates')
        ->and(DB::table('notifications')->where('event_source_id', $acceptedOrderId)->where('event_type', 'order.accepted')->count())->toBe(1);
    $this->assertDatabaseHas('orders', [
        'id' => $award->json('data.order_id'),
        'buyer_user_id' => $buyer->id,
        'provider_user_id' => $provider->id,
        'quote_id' => $newQuoteId,
    ]);
    $this->assertDatabaseHas('work_instances', ['order_id' => $award->json('data.order_id'), 'status' => 'not_started']);
    $this->assertDatabaseHas('payment_obligations', ['order_id' => $award->json('data.order_id'), 'status' => 'not_due']);
});

it('allocates a counteroffer version after all providers quotes without overwriting either offer', function (): void {
    $buyer = createTestBuyer('+639179999101');
    $provider = createTestProvider('+639178888101');
    $competitor = createTestProvider('+639178888102');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Repair the water line',
        'description' => 'Replace the leaking kitchen water line and pressure test the joint.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');
    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'message' => 'Replace the joint and pressure test.',
    ])->assertCreated()->json('data.id');
    $competingQuoteId = $this->actingAs($competitor)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 55000,
        'message' => 'Replace the pipe and pressure test.',
    ])->assertCreated()->json('data.id');

    $counter = $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/counter", [
        'amount_minor' => 45000,
        'note' => 'Labor only; the replacement joint is already available.',
    ])->assertCreated();

    $counter->assertJsonPath('data.quote_version', 3);
    $this->assertDatabaseHas('quotes', ['id' => $quoteId, 'amount_minor' => 50000, 'status' => 'superseded']);
    $this->assertDatabaseHas('quotes', ['id' => $competingQuoteId, 'amount_minor' => 55000, 'status' => 'submitted']);
    $this->assertDatabaseHas('quotes', [
        'id' => $counter->json('data.id'),
        'amount_minor' => 45000,
        'quote_version' => 3,
        'status' => 'submitted',
    ]);
});

it('keeps submitted quote terms immutable when a provider revises after a competing bid', function (): void {
    $buyer = createTestBuyer('+639179999111');
    $provider = createTestProvider('+639178888111');
    $competitor = createTestProvider('+639178888112');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Repair the water line',
        'description' => 'Replace the leaking kitchen water line and pressure test the joint.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');
    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'message' => 'Replace the joint and pressure test.',
    ])->assertCreated()->json('data.id');
    $this->actingAs($competitor)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 55000,
        'message' => 'Replace the pipe and pressure test.',
    ])->assertCreated();

    $revision = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 48000,
        'message' => 'Revised labor price including the same pressure test.',
    ])->assertCreated();

    $revision->assertJsonPath('data.quote_version', 3);
    expect($revision->json('data.id'))->not->toBe($quoteId);
    $this->assertDatabaseHas('quotes', ['id' => $quoteId, 'amount_minor' => 50000, 'status' => 'superseded']);
    $scope = json_decode(DB::table('quotes')->where('id', $revision->json('data.id'))->value('scope'), true);
    expect($scope['supersedes_quote_id'])->toBe($quoteId);
});

it('keeps expired requests in the owners workspace but excludes them from public browse', function (): void {
    $this->freezeTime();
    $buyer = createTestBuyer('+639179999121');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Repair the expired water line request',
        'description' => 'Replace the leaking kitchen water line and pressure test the joint.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');
    DB::table('requests')->where('id', $requestId)->update(['expires_at' => now()->subDay()]);
    $otherBuyer = createTestBuyer('+639179999122');
    $this->actingAs($otherBuyer)->postJson('/requests', [
        'title' => 'Private owner workspace record',
        'description' => 'Only this other requester should see this record in their own workspace.',
        'category_code' => 'home-help',
    ])->assertCreated();

    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ];
    $this->actingAs($buyer)->withHeaders($headers)->get('/my-requests')->assertOk()
        ->assertJsonPath('component', 'Requests/MyRequests')
        ->assertJsonCount(1, 'props.records')
        ->assertJsonPath('props.records.0.request_id', $requestId)
        ->assertJsonPath('props.records.0.expired', true);
    $browse = $this->get('/browse')->assertOk();
    expect(collect($browse->json('props.communityRequests'))->contains('id', $requestId))->toBeFalse();
});

it('shows only the providers quotes with counterparty turns and awarded order links', function (): void {
    $buyer = createTestBuyer('+639179999131');
    $provider = createTestProvider('+639178888131');
    $competitor = createTestProvider('+639178888132');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Repair the water line',
        'description' => 'Replace the leaking kitchen water line and pressure test the joint.',
        'category_code' => 'home-help',
        'tender_mode' => 'sealed_tender',
    ])->assertCreated()->json('data.id');
    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'message' => 'Replace the joint and pressure test.',
    ])->assertCreated()->json('data.id');
    $this->actingAs($competitor)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 55000,
        'message' => 'Competitor private proposal.',
    ])->assertCreated();
    $counterId = $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/counter", [
        'amount_minor' => 45000,
    ])->assertCreated()->json('data.id');
    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ];

    $this->actingAs($provider)->withHeaders($headers)->get('/my-quotes')->assertOk()
        ->assertJsonPath('component', 'Quotes/MyQuotes')
        ->assertJsonCount(2, 'props.records')
        ->assertJsonPath('props.records.0.quote_id', $counterId)
        ->assertJsonPath('props.records.0.pending_turn', 'you')
        ->assertDontSee('Competitor private proposal.');
    $this->flushHeaders();
    $orderId = $this->postJson("/requests/{$requestId}/quotes/{$counterId}/accept")->assertOk()->json('data.order_id');
    $this->withHeaders($headers)->get('/my-quotes')->assertOk()
        ->assertJsonPath('props.records.0.order_id', $orderId)
        ->assertJsonPath('props.records.0.pending_turn', null);
});

it('forms digital quote awards with the governed revision allowance', function (): void {
    $buyer = createTestBuyer('+639179999141');
    $provider = createTestProvider('+639178888141');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Prepare a digital greeting card',
        'description' => 'Deliver a printable digital greeting card with one review revision.',
        'category_code' => 'print-assist',
    ])->assertCreated()->json('data.id');
    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 30000,
        'message' => 'Deliver a printable PDF greeting card.',
        'work_shape' => 'A9',
    ])->assertCreated()->json('data.id');

    $orderId = $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/accept")
        ->assertOk()->json('data.order_id');

    $this->assertDatabaseHas('work_instances', [
        'order_id' => $orderId,
        'work_shape' => 'A9',
        'status' => 'not_started',
        'revisions_allowed' => 1,
        'revisions_used' => 0,
    ]);
});
it('requires the requester to hold the exact A3 counteroffer slot before the provider accepts it', function (): void {
    $buyer = createTestBuyer('+639179999150');
    $provider = createTestProvider('+639178888150');
    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Schedule a service visit',
        'description' => 'Book an appointment for an electrical service visit.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');

    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 50000,
        'message' => 'I can complete the visit in the stated time.',
        'work_shape' => 'A3',
        'appointment_duration_minutes' => 75,
        'milestone_stages' => [
            ['id' => 'visit', 'title' => 'Perform the service visit', 'control_mode' => 'provider_advance', 'required_proofs' => []],
            ['id' => 'approval', 'title' => 'Customer approves the visit', 'node_kind' => 'final_signoff', 'control_mode' => 'customer_confirm', 'approval_method' => 'app_confirm', 'required_proofs' => []],
        ],
    ])->assertCreated()->json('data.id');
    $initialQuote = collect($this->actingAs($buyer)->getJson("/requests/{$requestId}")->assertOk()->json('data.quotes'))
        ->firstWhere('id', $quoteId);
    expect($initialQuote['can_accept'])->toBeTrue()
        ->and($initialQuote['can_choose_appointment'])->toBeTrue()
        ->and($initialQuote['appointment_hold'])->toBeNull();

    $counterId = $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/counter", [
        'amount_minor' => 45000,
        'note' => 'Please confirm the revised amount.',
    ])->assertCreated()->json('data.id');

    $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes/{$counterId}/accept")
        ->assertStatus(409)->assertJsonPath('code', 'APPOINTMENT_HOLD_REQUIRED');
    $this->assertDatabaseMissing('orders', ['request_id' => $requestId]);
    $requesterQuote = collect($this->actingAs($buyer)->getJson("/requests/{$requestId}")->assertOk()->json('data.quotes'))
        ->firstWhere('id', $counterId);
    expect($requesterQuote['can_choose_appointment'])->toBeTrue()
        ->and($requesterQuote['appointment_hold'])->toBeNull()
        ->and($requesterQuote['can_accept'])->toBeFalse();

    $start = now()->addDays(3)->setTime(10, 0)->setSecond(0)->toIso8601String();
    $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$counterId}/appointment-holds", [
        'quote_version' => 1,
        'starts_at' => $start,
        'idempotency_key' => 'a3-stale-quote-version-150',
    ])->assertStatus(409)->assertJsonPath('error.code', 'QUOTE_VERSION_CHANGED');
    $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes/{$counterId}/appointment-holds", [
        'quote_version' => 2,
        'starts_at' => $start,
        'idempotency_key' => 'a3-provider-cannot-hold-150',
    ])->assertNotFound()->assertJsonPath('error.code', 'QUOTE_NOT_FOUND');

    $hold = $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$counterId}/appointment-holds", [
        'quote_version' => 2,
        'starts_at' => $start,
        'idempotency_key' => 'a3-quote-counter-150',
    ])->assertCreated()->json('data');
    expect($hold['duration_minutes'])->toBe(75)
        ->and(DB::table('audit_events')->where('action', 'appointment.quote_hold_created')->where('target_id', $hold['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'appointment.quote_hold_created')->whereJsonContains('payload', ['appointment_reservation_id' => $hold['id']])->exists())->toBeTrue();
    $requesterQuote = collect($this->actingAs($buyer)->getJson("/requests/{$requestId}")->assertOk()->json('data.quotes'))
        ->firstWhere('id', $counterId);
    expect($requesterQuote['appointment_hold']['id'])->toBe($hold['id'])
        ->and($requesterQuote['can_choose_appointment'])->toBeTrue()
        ->and($requesterQuote['can_accept'])->toBeFalse();
    $providerQuote = collect($this->actingAs($provider)->getJson("/requests/{$requestId}")->assertOk()->json('data.quotes'))
        ->firstWhere('id', $counterId);
    expect($providerQuote['appointment_hold']['id'])->toBe($hold['id'])
        ->and($providerQuote['can_accept'])->toBeTrue();

    $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$counterId}/accept", [
        'appointment_reservation_id' => $hold['id'],
        'quote_version' => 2,
    ])->assertForbidden()->assertJsonPath('code', 'SELF_ACCEPTANCE_FORBIDDEN');

    $award = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes/{$counterId}/accept", [
        'appointment_reservation_id' => $hold['id'],
        'quote_version' => 2,
    ])->assertOk();
    $orderId = $award->json('data.order_id');
    $appointment = DB::table('appointment_reservations')->where('id', $hold['id'])->first();
    $work = DB::table('work_instances')->where('order_id', $orderId)->first();
    $proposal = DB::table('order_proposals')->where('order_id', $orderId)->first();

    expect($appointment->status)->toBe('committed')
        ->and($appointment->source_quote_id)->toBe($counterId)
        ->and((int) $appointment->source_quote_version)->toBe(2)
        ->and($appointment->created_by_user_id)->toBe($buyer->id)
        ->and($appointment->order_id)->toBe($orderId)
        ->and($work->status)->toBe('scheduled')
        ->and((string) $work->scheduled_at)->toBe((string) $appointment->starts_at)
        ->and(DB::table('appointment_reservations')->where('order_id', $orderId)->where('status', 'committed')->count())->toBe(1)
        ->and($proposal->appointment_reservation_id)->toBe($hold['id']);
    $reschedules = app(AppointmentRescheduleService::class);
    $change = $reschedules->propose(
        $orderId,
        $buyer->id,
        now()->addDays(4)->setTime(12, 0)->setSecond(0)->toIso8601String(),
        (string) Str::uuid7(),
    );
    $replacementId = (string) DB::table('work_schedule_change_requests')->where('id', $change['id'])->value('proposed_reservation_id');
    $replacement = DB::table('appointment_reservations')->where('id', $replacementId)->first();
    $reschedules->respond($orderId, $change['id'], $provider->id, 'accept', (string) Str::uuid7());
    expect($replacement->source_quote_id)->toBe($counterId)
        ->and((int) $replacement->source_quote_version)->toBe(2)
        ->and(DB::table('appointment_reservations')->where('id', $hold['id'])->value('status'))->toBe('released')
        ->and(DB::table('appointment_reservations')->where('id', $replacement->id)->value('status'))->toBe('committed')
        ->and(DB::table('work_schedule_history')->where('schedule_change_request_id', $change['id'])->count())->toBe(1);

    $expiredChange = $reschedules->propose(
        $orderId,
        $buyer->id,
        now()->addDays(5)->setTime(12, 0)->setSecond(0)->toIso8601String(),
        (string) Str::uuid7(),
    );
    $scheduledAt = (string) DB::table('work_instances')->where('order_id', $orderId)->value('scheduled_at');
    $this->travelTo(now()->addMinutes(max(1, (int) config('serbizyu.scheduling.slot_hold_minutes', 10)) + 1));
    $reschedules->propose(
        $orderId,
        $buyer->id,
        now()->addDays(6)->setTime(12, 0)->setSecond(0)->toIso8601String(),
        (string) Str::uuid7(),
    );
    expect((string) DB::table('work_schedule_change_requests')->where('id', $expiredChange['id'])->value('status'))->toBe('expired')
        ->and((string) DB::table('work_instances')->where('order_id', $orderId)->value('scheduled_at'))->toBe($scheduledAt);
    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ];
    $show = $this->actingAs($buyer)->withHeaders($headers)->get(route('orders.show', $orderId))->assertOk();
    $expiredProjection = collect($show->json('props.appointment.scheduleChangeRequests'))->firstWhere('id', $expiredChange['id']);
    expect($expiredProjection['status'])->toBe('expired')
        ->and((string) $show->json('props.appointment.scheduledAt'))->toBe($scheduledAt);
});
it('shares provider capacity between listing and quote appointment holds', function (): void {
    $buyer = createTestBuyer('+639179999160');
    $provider = createTestProvider('+639178888160');
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(new ResourceActor($provider->id, $provider->id), [
        'title' => 'A3 Electrical Visit',
        'description' => 'A provider appointment listing for shared-capacity coverage.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A3',
        'work_catalog_code' => 'set-repairs-electrical-turnkey',
        'work_set_version' => 2,
        'work_specification' => ['target_duration_label' => '90m'],
    ], $correlationId);
    DB::table('listings')->where('id', $listing['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    $listingVersionId = (string) DB::table('listing_versions')->where('listing_id', $listing['id'])->where('version_number', 1)->value('id');
    $appointments = app(AppointmentSchedulingService::class);
    $duration = $appointments->details((string) $listing['id'])['duration_minutes'];
    $start = now()->addDays(5)->setTime(10, 0)->setSecond(0)->toIso8601String();
    app(OrderCapacityPort::class)->holdAppointment(
        listingId: (string) $listing['id'],
        listingVersionId: $listingVersionId,
        providerUserId: $provider->id,
        customerUserId: $buyer->id,
        startsAt: $start,
        durationMinutes: $duration,
        ttlMinutes: 10,
        idempotencyKey: 'shared-a3-listing-hold-160',
        correlationId: $correlationId,
    );

    $requestId = $this->actingAs($buyer)->postJson('/requests', [
        'title' => 'Arrange electrical appointment',
        'description' => 'Schedule an electrical service appointment.',
        'category_code' => 'home-help',
    ])->assertCreated()->json('data.id');
    $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
        'amount_minor' => 60000,
        'message' => 'A3 quote for the requested service.',
        'work_shape' => 'A3',
        'appointment_duration_minutes' => 60,
        'milestone_stages' => [
            ['id' => 'visit', 'title' => 'Perform the service visit', 'control_mode' => 'provider_advance', 'required_proofs' => []],
            ['id' => 'approval', 'title' => 'Customer approves the visit', 'node_kind' => 'final_signoff', 'control_mode' => 'customer_confirm', 'approval_method' => 'app_confirm', 'required_proofs' => []],
        ],
    ])->assertCreated()->json('data.id');

    $from = now()->addDays(5)->setTime(9, 30)->setSecond(0)->toIso8601String();
    $to = now()->addDays(5)->setTime(12, 0)->setSecond(0)->toIso8601String();
    $slots = $this->actingAs($buyer)->getJson("/requests/{$requestId}/quotes/{$quoteId}/appointment-slots?quote_version=1&from=".urlencode($from).'&to='.urlencode($to))
        ->assertOk()->json('data.slots');
    expect(collect($slots)->pluck('starts_at'))->not->toContain($start);

    $this->actingAs($buyer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/appointment-holds", [
        'quote_version' => 1,
        'starts_at' => $start,
        'idempotency_key' => 'shared-a3-quote-hold-160',
    ])->assertStatus(409)->assertJsonPath('error.code', 'APPOINTMENT_UNAVAILABLE');
});
it('awards a linked A4 product quote with version-pinned stock and fulfills once at custody departure', function (): void {
    $fx = a4LinkedProductQuoteFixture('999171', 5);
    $projectedListing = collect($this->actingAs($fx['provider'])->getJson("/requests/{$fx['request_id']}")->assertOk()->json('data.my_listings'))
        ->firstWhere('id', $fx['listing_id']);
    expect($projectedListing['listing_version_id'])->toBe($fx['listing_version_id'])
        ->and($projectedListing['variants'][0]['id'])->toBe('large-box')
        ->and($projectedListing['variants'][0]['price_amount_minor'])->toBe(25000);
    $quote = $this->actingAs($fx['provider'])->postJson("/requests/{$fx['request_id']}/quotes", [
        'amount_minor' => 75000,
        'currency' => 'PHP',
        'message' => 'Three large boxes at the agreed quote total.',
        'work_shape' => 'A4',
        'listing_id' => $fx['listing_id'],
        'listing_version_id' => $fx['listing_version_id'],
        'variant_id' => 'large-box',
        'quantity' => 3,
    ])->assertCreated()->json('data.id');

    $quoteScope = json_decode((string) DB::table('quotes')->where('id', $quote)->value('scope'), true);
    expect($quoteScope['source_listing_version_id'])->toBe($fx['listing_version_id'])
        ->and($quoteScope['listing_type'])->toBe('product')
        ->and($quoteScope['variant_id'])->toBe('large-box')
        ->and($quoteScope['resource_key'])->toBe('large-box')
        ->and($quoteScope['quantity'])->toBe(3)
        ->and($quoteScope['source_unit_amount_minor'])->toBe(25000);

    $award = $this->actingAs($fx['buyer'])->postJson("/requests/{$fx['request_id']}/quotes/{$quote}/accept", [
        'quote_version' => 1,
    ])->assertOk();
    $orderId = (string) $award->json('data.order_id');
    $proposal = DB::table('order_proposals')->where('order_id', $orderId)->where('status', 'accepted')->first();
    $proposalScope = json_decode((string) $proposal->scope, true);
    $reservation = DB::table('listing_capacity_reservations')->where('id', $proposal->capacity_reservation_id)->first();
    $commitMovement = DB::table('stock_movements')->where('reservation_id', $reservation->id)->where('movement_type', 'commit')->first();

    expect($reservation->status)->toBe('committed')
        ->and((int) $reservation->quantity)->toBe(3)
        ->and((int) $commitMovement->delta_on_hand)->toBe(0)
        ->and((int) $commitMovement->delta_committed)->toBe(3)
        ->and((int) DB::table('listing_capacity')->where('id', $fx['capacity_bucket_id'])->value('quantity'))->toBe(5)
        ->and((int) DB::table('listing_capacity')->where('id', $fx['capacity_bucket_id'])->value('remaining_quantity'))->toBe(2)
        ->and($proposalScope['listing_type'])->toBe('product')
        ->and($proposalScope['variant_id'])->toBe('large-box')
        ->and($proposalScope['quantity'])->toBe(3)
        ->and($proposalScope['capacity_reservation_id'])->toBe((string) $reservation->id);

    $workId = (string) DB::table('work_instances')->where('order_id', $orderId)->value('id');
    $proofId = (string) Str::uuid7();
    insertCleanQuoteWorkEvidence($workId, (string) $fx['provider']->id, $proofId, $fx['correlation_id']);
    $this->actingAs($fx['provider'])->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => $proofId,
        'expected_order_version' => 1,
        'idempotency_key' => 'quote-a4-prepared-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'prepared');
    $transferId = (string) DB::table('order_handoff_transfers')->where('order_id', $orderId)->value('id');
    $this->actingAs($fx['provider'])->postJson(route('orders.handoff.custody', $orderId), [
        'transfer_mode' => 'counter_pickup',
        'expected_transfer_version' => 1,
        'idempotency_key' => 'quote-a4-offer-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'offered');
    $this->actingAs($fx['buyer'])->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
        'evidence_file_id' => $proofId,
        'expected_transfer_version' => 2,
        'idempotency_key' => 'quote-a4-depart-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'departed');
    expect((int) DB::table('listing_capacity')->where('id', $fx['capacity_bucket_id'])->value('quantity'))->toBe(2)
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1);

    $this->actingAs($fx['buyer'])->postJson(route('orders.handoff.receipt', $orderId), [
        'evidence_file_id' => $proofId,
        'expected_transfer_version' => 3,
        'idempotency_key' => 'quote-a4-receipt-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'received');
    expect((int) DB::table('listing_capacity')->where('id', $fx['capacity_bucket_id'])->value('quantity'))->toBe(2)
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1);
});

it('rejects linked A4 product quote selections that omit a valid variant', function (): void {
    $fx = a4LinkedProductQuoteFixture('999172', 5);
    $this->actingAs($fx['provider'])->postJson("/requests/{$fx['request_id']}/quotes", [
        'amount_minor' => 75000,
        'currency' => 'PHP',
        'message' => 'Product A4 quote without a selected variant.',
        'work_shape' => 'A4',
        'listing_id' => $fx['listing_id'],
        'listing_version_id' => $fx['listing_version_id'],
        'quantity' => 3,
    ])->assertUnprocessable()->assertJsonPath('code', 'PRODUCT_VARIANT_REQUIRED');

    expect(DB::table('quotes')->where('request_id', $fx['request_id'])->count())->toBe(0)
        ->and(DB::table('orders')->where('request_id', $fx['request_id'])->count())->toBe(0);
});

it('rolls back a linked product quote award when stock is short or its listing version is stale', function (): void {
    $short = a4LinkedProductQuoteFixture('999173', 2);
    $shortQuote = $this->actingAs($short['provider'])->postJson("/requests/{$short['request_id']}/quotes", [
        'amount_minor' => 75000,
        'currency' => 'PHP',
        'message' => 'Three large boxes exceed current stock.',
        'work_shape' => 'A4',
        'listing_id' => $short['listing_id'],
        'listing_version_id' => $short['listing_version_id'],
        'variant_id' => 'large-box',
        'quantity' => 3,
    ])->assertCreated()->json('data.id');
    $this->actingAs($short['buyer'])->postJson("/requests/{$short['request_id']}/quotes/{$shortQuote}/accept", [
        'quote_version' => 1,
    ])->assertConflict()->assertJsonPath('code', 'CAPACITY_OVERSELL');
    expect((string) DB::table('quotes')->where('id', $shortQuote)->value('status'))->toBe('submitted')
        ->and((string) DB::table('requests')->where('id', $short['request_id'])->value('status'))->toBe('published')
        ->and(DB::table('orders')->where('request_id', $short['request_id'])->count())->toBe(0)
        ->and(DB::table('listing_capacity_reservations')->where('listing_capacity_id', $short['capacity_bucket_id'])->count())->toBe(0);

    $stale = a4LinkedProductQuoteFixture('999174', 5);
    $staleQuote = $this->actingAs($stale['provider'])->postJson("/requests/{$stale['request_id']}/quotes", [
        'amount_minor' => 75000,
        'currency' => 'PHP',
        'message' => 'Quote pinned to the first listing version.',
        'work_shape' => 'A4',
        'listing_id' => $stale['listing_id'],
        'listing_version_id' => $stale['listing_version_id'],
        'variant_id' => 'large-box',
        'quantity' => 3,
    ])->assertCreated()->json('data.id');
    $oldVersion = (array) DB::table('listing_versions')->where('id', $stale['listing_version_id'])->first();
    $newVersionId = (string) Str::uuid7();
    $oldVersion['id'] = $newVersionId;
    $oldVersion['version_number'] = 2;
    $oldVersion['version'] = ((int) ($oldVersion['version'] ?? 1)) + 1;
    $oldVersion['row_version'] = 1;
    $oldVersion['effective_from'] = now();
    $oldVersion['effective_to'] = null;
    $oldVersion['published_at'] = now();
    $oldVersion['created_at'] = now();
    $oldVersion['updated_at'] = now();
    DB::table('listing_versions')->insert($oldVersion);
    DB::table('listings')->where('id', $stale['listing_id'])->update([
        'current_version' => 2,
        'version' => DB::raw('version + 1'),
        'updated_at' => now(),
    ]);
    $this->actingAs($stale['buyer'])->postJson("/requests/{$stale['request_id']}/quotes/{$staleQuote}/accept", [
        'quote_version' => 1,
    ])->assertConflict()->assertJsonPath('code', 'LISTING_VERSION_CHANGED');
    expect((string) DB::table('quotes')->where('id', $staleQuote)->value('status'))->toBe('submitted')
        ->and((string) DB::table('requests')->where('id', $stale['request_id'])->value('status'))->toBe('published')
        ->and(DB::table('orders')->where('request_id', $stale['request_id'])->count())->toBe(0);
});

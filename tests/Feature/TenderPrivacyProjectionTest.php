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

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL baseline required.');
    }

    $this->bootPhoneOtpAuth();
    app(FixtureRepository::class)->ensure();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function createTestUser(string $phone = '+639171234888'): string
{
    $id = (string) Str::uuid7();
    DB::table('users')->insert([
        'id' => $id,
        'phone_e164' => $phone,
        'status' => 'active',
        'primary_access_tier' => 'L1',
        'locale' => 'en',
        'timezone' => 'Asia/Manila',
        'version' => 1,
        'correlation_id' => $id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $id;
}

function createDealNeed(string $dealChainId, int $ordinal, string $kind, string $title): string
{
    $id = (string) Str::uuid7();
    DB::table('deal_needs')->insert([
        'id' => $id,
        'deal_chain_id' => $dealChainId,
        'ordinal' => $ordinal,
        'need_kind' => $kind,
        'title' => $title,
        'description' => "Scope for {$title}",
        'status' => 'completed',
        'requested_at' => now(),
        'version' => 1,
        'correlation_id' => $id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $id;
}
it('submits unified deal chain reviews in cascade mode across all child orders', function (): void {
    $buyerId = $this->authenticateProvider();
    $provider1 = createTestUser('+639170000001');
    $provider2 = createTestUser('+639170000002');
    $dealChainId = (string) Str::uuid7();
    DB::table('deal_chains')->insert([
        'id' => $dealChainId,
        'coordinator_user_id' => $buyerId,
        'status' => 'completed',
        'title' => 'Tagudin All-In AC Clean and Courier',
        'goal' => 'Clean 2 AC units and deliver filter',
        'version' => 1,
        'correlation_id' => $dealChainId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $order1 = (string) Str::uuid7();
    $order2 = (string) Str::uuid7();
    $need1 = createDealNeed($dealChainId, 1, 'service', 'Clean 2 AC units');
    $need2 = createDealNeed($dealChainId, 2, 'service', 'Deliver filter');

    DB::table('orders')->insert([
        [
            'id' => $order1,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $need1,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $provider1,
            'status' => 'closed',
            'correlation_id' => $order1,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $order2,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $need2,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $provider2,
            'status' => 'closed',
            'correlation_id' => $order2,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $submissionId = (string) Str::uuid7();

    // Buyer submits unified review with cascade
    $response = $this->postJson("/deal-chains/{$dealChainId}/reviews", [
        'submission_id' => $submissionId,
        'mode' => 'cascade',
        'unified_review' => [
            'rating' => 5,
            'content' => 'Outstanding team coordination!',
            'attribute_chips' => ['on_time', 'clean_workspace'],
        ],
    ]);

    $response->assertCreated();
    $data = $response->json('data');

    expect($data['mode'])->toBe('cascade')
        ->and($data['submitted_count'])->toBe(2);

    $reviews = DB::table('reviews')->where('deal_chain_id', $dealChainId)->get();
    expect($reviews)->toHaveCount(2);

    foreach ($reviews as $rev) {
        expect((int) $rev->rating)->toBe(5)
            ->and($rev->submission_mode)->toBe('cascade')
            ->and($rev->moderation_status)->toBe('sealed')
            ->and($rev->unblinded_at)->toBeNull()
            ->and($rev->sealed_until)->not->toBeNull();
    }
});

it('submits granular per-node reviews with independent star ratings', function (): void {
    $buyerId = $this->authenticateProvider();
    $techProvider = createTestUser('+639170000011');
    $courierProvider = createTestUser('+639170000012');
    $dealChainId = (string) Str::uuid7();
    DB::table('deal_chains')->insert([
        'id' => $dealChainId,
        'coordinator_user_id' => $buyerId,
        'status' => 'completed',
        'title' => 'Electrical Repair + Delivery',
        'goal' => 'Circuit fix and breaker run',
        'version' => 1,
        'correlation_id' => $dealChainId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $techOrder = (string) Str::uuid7();
    $courierOrder = (string) Str::uuid7();
    $techNeed = createDealNeed($dealChainId, 1, 'service', 'Circuit fix');
    $courierNeed = createDealNeed($dealChainId, 2, 'service', 'Breaker run');

    DB::table('orders')->insert([
        [
            'id' => $techOrder,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $techNeed,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $techProvider,
            'status' => 'closed',
            'correlation_id' => $techOrder,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $courierOrder,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $courierNeed,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $courierProvider,
            'status' => 'closed',
            'correlation_id' => $courierOrder,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    // Buyer unchecks cascade and gives granular overrides: 5 stars to tech, 4 stars to courier
    $response = $this->postJson("/deal-chains/{$dealChainId}/reviews", [
        'mode' => 'granular',
        'granular_reviews' => [
            [
                'order_id' => $techOrder,
                'rating' => 5,
                'content' => 'Master technician, solved tripping breaker in 30 mins.',
                'attribute_chips' => ['expert_fix', 'clean_workspace'],
            ],
            [
                'order_id' => $courierOrder,
                'rating' => 4,
                'content' => 'Safe transit, slightly delayed by rain.',
                'attribute_chips' => ['fair_pricing'],
            ],
        ],
    ]);

    $response->assertCreated();

    $techReview = DB::table('reviews')->where('order_id', $techOrder)->first();
    $courierReview = DB::table('reviews')->where('order_id', $courierOrder)->first();

    expect((int) $techReview->rating)->toBe(5)
        ->and($techReview->submission_mode)->toBe('granular')
        ->and($techReview->content)->toContain('Master technician');

    expect((int) $courierReview->rating)->toBe(4)
        ->and($courierReview->submission_mode)->toBe('granular')
        ->and($courierReview->content)->toContain('Safe transit');
});

it('unblinds child orders pairwise independently without unblinding siblings', function (): void {
    $buyerId = $this->authenticateProvider();
    $laborProvider = createTestUser('+639170000021');
    $courierProvider = createTestUser('+639170000022');
    $dealChainId = (string) Str::uuid7();
    DB::table('deal_chains')->insert([
        'id' => $dealChainId,
        'coordinator_user_id' => $buyerId,
        'status' => 'completed',
        'title' => 'Tagudin Two-Node Project',
        'goal' => 'Dual node chain',
        'version' => 1,
        'correlation_id' => $dealChainId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $laborOrder = (string) Str::uuid7();
    $courierOrder = (string) Str::uuid7();
    $laborNeed = createDealNeed($dealChainId, 1, 'service', 'Dual node labor');
    $courierNeed2 = createDealNeed($dealChainId, 2, 'service', 'Dual node transit');

    DB::table('orders')->insert([
        [
            'id' => $laborOrder,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $laborNeed,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $laborProvider,
            'status' => 'closed',
            'correlation_id' => $laborOrder,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $courierOrder,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $courierNeed2,
            'origin' => 'deal_chain',
            'mechanism' => 'fixed',
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $courierProvider,
            'status' => 'closed',
            'correlation_id' => $courierOrder,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    // 1. Buyer submits reviews for both in cascade mode (both become sealed)
    $this->postJson("/deal-chains/{$dealChainId}/reviews", [
        'mode' => 'cascade',
        'unified_review' => [
            'rating' => 5,
            'content' => 'Great work team!',
            'attribute_chips' => ['on_time'],
        ],
    ])->assertCreated();

    // Both sealed initially
    expect(DB::table('reviews')->where('deal_chain_id', $dealChainId)->where('moderation_status', 'sealed')->count())->toBe(2);

    // 2. Courier provider reviews the buyer with non-numeric Citizen Reliability
    $this->actingAs(User::find($courierProvider));

    $this->postJson("/orders/{$courierOrder}/reviews", [
        'attribute_chips' => ['cash_ready_on_site', 'respectful_communication'],
        'content' => 'Easy delivery drop-off.',
        'rating' => 5, // provider rating constraint
    ])->assertCreated();

    // 3. Courier order pair unblinds immediately!
    $courierBuyerReview = DB::table('reviews')->where('order_id', $courierOrder)->where('author_role', 'buyer')->first();
    $courierProviderReview = DB::table('reviews')->where('order_id', $courierOrder)->where('author_role', 'provider')->first();

    expect($courierBuyerReview->moderation_status)->toBe('approved')
        ->and($courierBuyerReview->unblinded_at)->not->toBeNull();

    expect($courierProviderReview->moderation_status)->toBe('approved')
        ->and($courierProviderReview->rating)->toBeNull(); // NULL rating for provider!

    // 4. Labor order pair REMAINS sealed! (Pairwise independence)
    $laborBuyerReview = DB::table('reviews')->where('order_id', $laborOrder)->where('author_role', 'buyer')->first();
    expect($laborBuyerReview->moderation_status)->toBe('sealed')
        ->and($laborBuyerReview->unblinded_at)->toBeNull();
});

it('unblinds sealed reviews past 72-hour window via artisan command', function (): void {
    $buyerId = createTestUser('+639170000031');
    $providerId = createTestUser('+639170000032');
    $orderId = (string) Str::uuid7();

    DB::table('orders')->insert([
        'id' => $orderId,
        'origin' => 'direct',
        'mechanism' => 'fixed',
        'buyer_user_id' => $buyerId,
        'provider_user_id' => $providerId,
        'status' => 'closed',
        'correlation_id' => $orderId,
        'version' => 1,
        'created_at' => now()->subDays(4),
        'updated_at' => now()->subDays(4),
    ]);

    $reviewId = (string) Str::uuid7();
    DB::table('reviews')->insert([
        'id' => $reviewId,
        'order_id' => $orderId,
        'author_user_id' => $buyerId,
        'subject_user_id' => $providerId,
        'author_role' => 'buyer',
        'rating' => 5,
        'content' => 'Great fix.',
        'moderation_status' => 'sealed',
        'sealed_until' => CarbonImmutable::now()->subMinutes(10), // expired!
        'unblinded_at' => null,
        'correlation_id' => $orderId,
        'version' => 1,
        'created_at' => now()->subDays(4),
        'updated_at' => now()->subDays(4),
    ]);

    // Run unblind command
    $this->artisan('reviews:unblind-expired')->assertSuccessful();
    $unblindedReview = DB::table('reviews')->where('id', $reviewId)->first();
    expect($unblindedReview->moderation_status)->toBe('approved')
        ->and($unblindedReview->sealed_until)->toBeNull()
        ->and($unblindedReview->unblinded_at)->not->toBeNull();
});

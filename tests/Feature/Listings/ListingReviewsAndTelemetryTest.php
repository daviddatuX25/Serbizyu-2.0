<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\TrustSupport\Application\ListingReviewService;
use Database\Seeders\ListingReviewsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class, CreatesSettledDealChainReview::class);
beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL baseline required.');
    }

    $this->bootPhoneOtpAuth();
    app(FixtureRepository::class)->ensure();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function inertiaGetPreview(string $uri)
{
    return test()->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])->get($uri);
}

it('ingests client telemetry beacons via POST /api/telemetry/events', function (): void {
    $this->authenticateProvider();

    // Create a draft listing first
    $listing = $this->postJson('/listings', [
        'title' => 'Fresh Tagudin Bibingka',
        'description' => 'Traditional rice cakes freshly baked in Tagudin market.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
    ])->assertCreated()->json('data');

    $listingId = $listing['id'];

    // Ingest impression and view
    $response = $this->postJson('/api/telemetry/events', [
        'events' => [
            ['type' => 'listing.impression', 'listing_id' => $listingId],
            ['type' => 'listing.view', 'listing_id' => $listingId],
        ],
    ]);

    $response->assertStatus(202);

    $metricRow = DB::table('listing_daily_metrics')
        ->where('listing_id', $listingId)
        ->first();

    expect($metricRow)->not->toBeNull()
        ->and((int) $metricRow->impressions)->toBe(1)
        ->and((int) $metricRow->views)->toBe(1);
});

it('provides category benchmark projections on new draft preview', function (): void {
    $this->authenticateProvider();

    $listing = $this->postJson('/listings', [
        'title' => 'Fresh Tagudin Empanada',
        'description' => 'Crispy empanada with local longganisa and egg.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
    ])->assertCreated()->json('data');

    $page = inertiaGetPreview('/my-listings/'.$listing['id'])->assertOk();

    expect($page->json('component'))->toBe('Listings/OwnerPreview');

    $telemetry = $page->json('props.telemetry');
    expect($telemetry)->not->toBeNull()
        ->and($telemetry['is_projected'])->toBeTrue()
        ->and($telemetry['impressions'])->toBeGreaterThan(0)
        ->and($telemetry['views'])->toBeGreaterThan(0);

    $reviews = $page->json('props.reviews');
    expect($reviews)->toBeArray();
});

it('supports pause and resume lifecycle transitions for active listings', function (): void {
    $this->authenticateProvider();

    $listing = $this->postJson('/listings', [
        'title' => 'Tagudin Plumbing Service',
        'description' => 'Fast pipe leak and valve repair in Centro.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ])->assertCreated()->json('data');

    $listingId = $listing['id'];

    // Make listing active
    DB::table('listings')->where('id', $listingId)->update([
        'status' => 'active',
        'review_status' => 'approved',
    ]);

    // Pause listing
    $this->postJson("/listings/{$listingId}/pause", [
        'expected_version' => 1,
    ])->assertOk();

    $statusAfterPause = DB::table('listings')->where('id', $listingId)->value('status');
    expect($statusAfterPause)->toBe('paused');

    // Resume listing
    $this->postJson("/listings/{$listingId}/resume", [
        'expected_version' => 2,
    ])->assertOk();

    $statusAfterResume = DB::table('listings')->where('id', $listingId)->value('status');
    expect($statusAfterResume)->toBe('active');
});

it('submits double-blind reviews and unblinds when both parties submit', function (): void {
    $fixture = $this->createSettledReviewableStandaloneOrder();
    $orderId = $fixture['order_id'];

    $this->actingAs($fixture['provider']);
    $providerReview = $this->postJson("/orders/{$orderId}/reviews", [
        'rating' => 5,
        'attribute_chips' => ['cash_ready_on_site', 'respectful_communication'],
        'content' => 'Prompt buyer, smooth transaction.',
    ])->assertCreated()->json('data');

    expect($providerReview['status'])->toBe('sealed')
        ->and($providerReview['unblinded'])->toBeFalse();

    $this->actingAs($fixture['buyer']);
    $buyerReview = $this->postJson("/orders/{$orderId}/reviews", [
        'rating' => 5,
        'attribute_chips' => ['on_time', 'clean_workspace'],
        'content' => 'Excellent work, very professional.',
    ])->assertCreated()->json('data');

    expect($buyerReview['status'])->toBe('approved')
        ->and($buyerReview['unblinded'])->toBeTrue()
        ->and(DB::table('reviews')
            ->where('order_id', $orderId)
            ->where('moderation_status', 'approved')
            ->whereNotNull('unblinded_at')
            ->count())->toBe(2);
});

it('does not resurrect snapshotless demo Orders or publish unverified seeded reviews', function (): void {
    $this->seed(ListingReviewsSeeder::class);
    $this->seed(ListingReviewsSeeder::class);

    $orderIds = collect(range(1, 4))
        ->map(fn (int $sequence): string => '0198a3b1-7c40-7abc-8def-0f01000000'.sprintf('%02d', $sequence))
        ->all();
    $listingId = FixtureRepository::ACTIVE_LISTING_ID;
    $service = app(ListingReviewService::class);
    $summary = $service->summaryForListing($listingId);
    $photos = $service->photosForListing($listingId);

    expect($summary['reviews_count'])->toBe(0)
        ->and($summary['photos_count'])->toBe(0)
        ->and($photos)->toBe([])
        ->and(DB::table('orders')->whereIn('id', $orderIds)->whereNull('current_terms_snapshot_id')->whereNotIn('status', ['cancelled'])->count())->toBe(0)
        ->and(DB::table('reviews')->whereIn('order_id', $orderIds)->count())->toBe(0);
});

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\TrustSupport\Application\ListingReviewService;
use Database\Seeders\ListingReviewsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
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
    $provider = $this->authenticateProvider();

    // Create completed order
    $orderId = (string) Str::uuid7();
    $buyerId = (string) Str::uuid7();

    DB::table('users')->insert([
        'id' => $buyerId,
        'phone_e164' => '+639171234599',
        'status' => 'active',
        'primary_access_tier' => 'L1',
        'locale' => 'en',
        'timezone' => 'Asia/Manila',
        'version' => 1,
        'correlation_id' => $orderId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('orders')->insert([
        'id' => $orderId,
        'origin' => 'direct',
        'mechanism' => 'fixed',
        'buyer_user_id' => $buyerId,
        'provider_user_id' => $provider,
        'status' => 'closed',
        'correlation_id' => $orderId,
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Provider submits review first
    $providerReview = $this->postJson("/orders/{$orderId}/reviews", [
        'rating' => 5,
        'attribute_chips' => ['cash_ready_on_site', 'respectful_communication'],
        'content' => 'Prompt buyer, smooth transaction.',
    ])->assertCreated()->json('data');

    expect($providerReview['status'])->toBe('sealed')
        ->and($providerReview['unblinded'])->toBeFalse();

    // Now authenticate as buyer
    $this->actingAs(User::find($buyerId));

    // Buyer submits review -> should unblind both!
    $buyerReview = $this->postJson("/orders/{$orderId}/reviews", [
        'rating' => 5,
        'attribute_chips' => ['on_time', 'clean_workspace'],
        'content' => 'Excellent work, very professional.',
    ])->assertCreated()->json('data');

    expect($buyerReview['status'])->toBe('approved')
        ->and($buyerReview['unblinded'])->toBeTrue();

    // Both reviews in DB are now approved and unblinded
    $unblindedCount = DB::table('reviews')
        ->where('order_id', $orderId)
        ->where('moderation_status', 'approved')
        ->whereNotNull('unblinded_at')
        ->count();

    expect($unblindedCount)->toBe(2);
});

it('returns public photos from unblinded verified listing reviews', function (): void {
    $this->seed(ListingReviewsSeeder::class);

    $listingId = FixtureRepository::ACTIVE_LISTING_ID;
    $service = app(ListingReviewService::class);
    $summary = $service->summaryForListing($listingId);
    $photos = $service->photosForListing($listingId);

    expect($summary['reviews_count'])->toBe(4)
        ->and($summary['photos_count'])->toBe(4)
        ->and($summary['distribution'])->toBe([1 => 0, 2 => 0, 3 => 0, 4 => 1, 5 => 3])
        ->and($photos)->toHaveCount(4)
        ->and($photos[0]['author'])->toBe('Joel Reyes')
        ->and($photos[0]['url'])->toBe('/photos/req-cement.jpg')
        ->and($photos[0]['thumbnail_url'])->toBe('/photos/req-cement.jpg');
});

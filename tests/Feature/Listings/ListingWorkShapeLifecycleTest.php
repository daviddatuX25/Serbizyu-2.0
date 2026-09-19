<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\GovernedCatalogService;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function listingLifecyclePgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('Listing work shape lifecycle proofs require PostgreSQL.');
    }
}

it('persists A3 service selection through create, update, version terms, and submit lifecycle', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    // 1. Create draft with explicit A3 work shape
    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin appointment service',
        'description' => 'Household consultation and scheduled appointment.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A3',
    ], $correlationId);

    expect($created['id'])->not->toBeEmpty()
        ->and($created['work_shape'] ?? null)->toBe('A3');

    $v1 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 1)
        ->first();
    expect($v1)->not->toBeNull();

    $termsV1 = json_decode((string) $v1->terms, true);
    expect($termsV1['work_shape'] ?? null)->toBe('A3');

    $profileV1 = DB::table('capability_profiles')
        ->where('profile_family_code', $v1->capability_profile_family_code)
        ->where('business_version', (int) $v1->capability_profile_business_version)
        ->first();
    expect($profileV1)->not->toBeNull()
        ->and($profileV1->work_shape)->toBe('A3');

    // 2. Update draft (e.g. changing title, omitting work_shape in update payload)
    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        [
            'title' => 'Tagudin appointment consultation updated',
        ],
        $correlationId,
    );

    expect($updated['version'])->toBe(2)
        ->and($updated['work_shape'] ?? null)->toBe('A3');

    $v2 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 2)
        ->first();
    expect($v2)->not->toBeNull();

    $termsV2 = json_decode((string) $v2->terms, true);
    expect($termsV2['work_shape'] ?? null)->toBe('A3');

    $profileV2 = DB::table('capability_profiles')
        ->where('profile_family_code', $v2->capability_profile_family_code)
        ->where('business_version', (int) $v2->capability_profile_business_version)
        ->first();
    expect($profileV2)->not->toBeNull()
        ->and($profileV2->work_shape)->toBe('A3');

    // 3. Submit draft for review
    $submitted = app(SubmitListing::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $updated['expected_version'],
        'submit-a3-lifecycle-test-'.(string) Str::uuid7(),
        $correlationId,
    );

    expect($submitted['status'])->toBe('pending_review')
        ->and($submitted['review_status'])->toBe('pending')
        ->and($submitted['version'])->toBe(3)
        ->and($submitted['work_shape'] ?? null)->toBe('A3');

    $v3 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 3)
        ->first();
    expect($v3)->not->toBeNull();

    $termsV3 = json_decode((string) $v3->terms, true);
    expect($termsV3['work_shape'] ?? null)->toBe('A3');

    $profileV3 = DB::table('capability_profiles')
        ->where('profile_family_code', $v3->capability_profile_family_code)
        ->where('business_version', (int) $v3->capability_profile_business_version)
        ->first();
    expect($profileV3)->not->toBeNull()
        ->and($profileV3->work_shape)->toBe('A3');
});

it('persists A9 service selection through full lifecycle', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin custom digital service',
        'description' => 'Custom layout and digital asset service.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A9',
    ], $correlationId);

    expect($created['work_shape'] ?? null)->toBe('A9');

    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        ['title' => 'Tagudin custom digital service v2'],
        $correlationId,
    );

    $submitted = app(SubmitListing::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $updated['expected_version'],
        'submit-a9-lifecycle-test-'.(string) Str::uuid7(),
        $correlationId,
    );

    expect($submitted['status'])->toBe('pending_review')
        ->and($submitted['work_shape'] ?? null)->toBe('A9');

    $v3 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 3)
        ->first();

    $termsV3 = json_decode((string) $v3->terms, true);
    expect($termsV3['work_shape'] ?? null)->toBe('A9');
});

it('persists A4 product selection through full lifecycle', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin fresh baked goods',
        'description' => 'Fresh baked local product ready for pickup.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
    ], $correlationId);

    expect($created['work_shape'] ?? null)->toBe('A4');

    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        ['title' => 'Tagudin fresh baked goods v2'],
        $correlationId,
    );

    $submitted = app(SubmitListing::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $updated['expected_version'],
        'submit-a4-product-test-'.(string) Str::uuid7(),
        $correlationId,
    );

    expect($submitted['status'])->toBe('pending_review')
        ->and($submitted['work_shape'] ?? null)->toBe('A4');

    $v3 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 3)
        ->first();

    $termsV3 = json_decode((string) $v3->terms, true);
    expect($termsV3['work_shape'] ?? null)->toBe('A4');
});

it('persists A9 product selection through full lifecycle', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin downloadable digital guide',
        'description' => 'Digital printable map and guide for Tagudin visitors.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A9',
    ], $correlationId);

    expect($created['work_shape'] ?? null)->toBe('A9');

    $submitted = app(SubmitListing::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        'submit-a9-product-test-'.(string) Str::uuid7(),
        $correlationId,
    );

    expect($submitted['status'])->toBe('pending_review')
        ->and($submitted['work_shape'] ?? null)->toBe('A9');

    $v2 = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 2)
        ->first();

    $termsV2 = json_decode((string) $v2->terms, true);
    expect($termsV2['work_shape'] ?? null)->toBe('A9');
});

it('rejects incompatible work shape vs listing type during draft creation', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    // 1. Service with A4 shape should fail
    try {
        app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Invalid service shape',
            'description' => 'Service listing with unsupported A4 product shape.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A4',
        ], $correlationId);
        test()->fail('Expected ListingError for incompatible work shape');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VALIDATION_FAILED')
            ->and($error->envelope->fieldErrors)->toHaveKey('work_shape');
    }

    // 2. Product with A1 shape should fail
    try {
        app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Invalid product shape',
            'description' => 'Product listing with unsupported A1 service shape.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A1',
        ], $correlationId);
        test()->fail('Expected ListingError for incompatible work shape');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VALIDATION_FAILED')
            ->and($error->envelope->fieldErrors)->toHaveKey('work_shape');
    }

    // 3. Unknown canonical shape should fail
    try {
        app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Invalid unknown shape',
            'description' => 'Listing with unknown shape code.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A7',
        ], $correlationId);
        test()->fail('Expected ListingError for unknown work shape');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VALIDATION_FAILED')
            ->and($error->envelope->fieldErrors)->toHaveKey('work_shape');
    }
});
it('rejects draft creation when work shape is missing instead of inferring from listing type', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $actor = new ResourceActor($user->id, $user->id);

    try {
        app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Missing shape listing',
            'description' => 'A listing without an explicit canonical work shape.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ], (string) Str::uuid7());
        test()->fail('Expected ListingError for missing work shape');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VALIDATION_FAILED')
            ->and($error->envelope->fieldErrors)->toHaveKey('work_shape');
    }
});

it('serializes capability profile family version creation without racing version numbers', function (): void {
    listingLifecyclePgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();

    // Call ensurePublished with different shapes sequentially to simulate capability evolution
    $pin1 = $catalog->ensurePublished('home-help', 'service', 'A1', $correlationId);
    expect($pin1['capability_profile_family_code'])->toBe('service_listing')
        ->and($pin1['capability_profile_business_version'])->toBeGreaterThanOrEqual(1);

    $pin2 = $catalog->ensurePublished('home-help', 'service', 'A3', $correlationId);
    expect($pin2['capability_profile_family_code'])->toBe('service_listing')
        ->and($pin2['capability_profile_business_version'])->toBe($pin1['capability_profile_business_version'] + 1);

    $pin3 = $catalog->ensurePublished('home-help', 'service', 'A9', $correlationId);
    expect($pin3['capability_profile_family_code'])->toBe('service_listing')
        ->and($pin3['capability_profile_business_version'])->toBe($pin2['capability_profile_business_version'] + 1);

    // Call ensurePublished again with A9 (should reuse existing active A9 without bumping version)
    $pin4 = $catalog->ensurePublished('home-help', 'service', 'A9', $correlationId);
    expect($pin4['capability_profile_business_version'])->toBe($pin3['capability_profile_business_version'])
        ->and($pin4['capability_profile_id'])->toBe($pin3['capability_profile_id']);
});

it('ensures fixture listing_versions pins immutable category and capability profile family and business versions', function (): void {
    listingLifecyclePgsqlOrSkip();

    app(FixtureRepository::class)->ensure();

    $version = DB::table('listing_versions')
        ->where('id', FixtureRepository::ACTIVE_VERSION_ID)
        ->first();

    expect($version)->not->toBeNull()
        ->and($version->category_id)->toBe(FixtureRepository::CATEGORY_ID)
        ->and((int) $version->category_business_version)->toBe(1)
        ->and($version->capability_profile_family_code)->toBe('service_listing')
        ->and((int) $version->capability_profile_business_version)->toBe(1)
        ->and((int) $version->row_version)->toBe(1);

    $terms = json_decode((string) $version->terms, true);
    expect($terms['work_shape'] ?? null)->toBe('A1');
});
it('preserves a newer active fixture profile and immutable v1 pins', function (): void {
    listingLifecyclePgsqlOrSkip();

    $fixtures = app(FixtureRepository::class);
    $fixtures->ensure();

    $newer = app(GovernedCatalogService::class)->ensurePublished(
        'home-help',
        'service',
        'A3',
        (string) Str::uuid7(),
    );
    $historicalBefore = DB::table('capability_profiles')
        ->where('profile_family_code', 'service_listing')
        ->where('business_version', 1)
        ->first();

    $fixtures->ensure();

    $activeProfiles = DB::table('capability_profiles')
        ->where('profile_family_code', 'service_listing')
        ->where('status', 'active')
        ->get();
    $historicalAfter = DB::table('capability_profiles')
        ->where('profile_family_code', 'service_listing')
        ->where('business_version', 1)
        ->first();
    $listing = DB::table('listings')->where('id', FixtureRepository::ACTIVE_LISTING_ID)->first();

    expect($activeProfiles)->toHaveCount(1)
        ->and($activeProfiles->first()->id)->toBe($newer['capability_profile_id'])
        ->and($historicalAfter->id)->toBe($historicalBefore->id)
        ->and($historicalAfter->status)->toBe($historicalBefore->status)
        ->and($historicalAfter->work_shape)->toBe($historicalBefore->work_shape)
        ->and($listing->capability_profile_id)->toBe($newer['capability_profile_id']);
});

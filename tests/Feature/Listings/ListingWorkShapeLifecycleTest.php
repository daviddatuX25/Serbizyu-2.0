<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Catalogs\Application\WorkCatalog;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\GovernedCatalogService;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ResourceActor;
use Database\Seeders\WorkCatalogSeeder;
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

it('keeps supported service capability profile shapes active concurrently', function (): void {
    listingLifecyclePgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();
    $pins = [];

    foreach (['A1', 'A3', 'A9'] as $shape) {
        $pins[$shape] = $catalog->ensurePublished('home-help', 'service', $shape, $correlationId);
    }

    expect($pins['A1']['capability_profile_family_code'])->toBe('service_listing')
        ->and($pins['A3']['capability_profile_family_code'])->toBe('service_listing_a3')
        ->and($pins['A9']['capability_profile_family_code'])->toBe('service_listing_a9')
        ->and($catalog->activeWorkShapesFor('home-help', 'service'))->toBe(['A1', 'A3', 'A9']);

    foreach ($pins as $shape => $pin) {
        expect(DB::table('capability_profiles')
            ->where('id', $pin['capability_profile_id'])
            ->where('status', 'active')
            ->where('work_shape', $shape)
            ->exists())->toBeTrue();
    }

    $beforeResolve = DB::table('capability_profiles')
        ->whereIn('id', array_column($pins, 'capability_profile_id'))
        ->orderBy('id')
        ->get(['id', 'status', 'business_version'])
        ->toArray();
    $resolved = $catalog->resolvePublished('home-help', 'service', $correlationId, 'A3');
    $afterResolve = DB::table('capability_profiles')
        ->whereIn('id', array_column($pins, 'capability_profile_id'))
        ->orderBy('id')
        ->get(['id', 'status', 'business_version'])
        ->toArray();

    expect($resolved['capability_profile_id'])->toBe($pins['A3']['capability_profile_id'])
        ->and($beforeResolve)->toEqual($afterResolve);
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
it('preserves fixture v1 pins while different active shapes remain readable', function (): void {
    listingLifecyclePgsqlOrSkip();

    $fixtures = app(FixtureRepository::class);
    $fixtures->ensure();
    $historicalBefore = DB::table('capability_profiles')
        ->where('profile_family_code', 'service_listing')
        ->where('business_version', 1)
        ->first();
    $versionBefore = DB::table('listing_versions')
        ->where('id', FixtureRepository::ACTIVE_VERSION_ID)
        ->first();
    $catalog = app(GovernedCatalogService::class);
    $a3 = $catalog->ensurePublished('home-help', 'service', 'A3', (string) Str::uuid7());
    $a9 = $catalog->ensurePublished('home-help', 'service', 'A9', (string) Str::uuid7());
    $fixtures->ensure();

    $historicalAfter = DB::table('capability_profiles')
        ->where('profile_family_code', 'service_listing')
        ->where('business_version', 1)
        ->first();
    $versionAfter = DB::table('listing_versions')
        ->where('id', FixtureRepository::ACTIVE_VERSION_ID)
        ->first();
    $activeShapes = DB::table('capability_profiles')
        ->whereIn('profile_family_code', ['service_listing', 'service_listing_a3', 'service_listing_a9'])
        ->where('status', 'active')
        ->orderBy('work_shape')
        ->pluck('work_shape')
        ->all();

    expect($activeShapes)->toBe(['A1', 'A3', 'A9'])
        ->and($historicalAfter->id)->toBe($historicalBefore->id)
        ->and($historicalAfter->status)->toBe($historicalBefore->status)
        ->and($historicalAfter->work_shape)->toBe($historicalBefore->work_shape)
        ->and($versionAfter->id)->toBe(FixtureRepository::ACTIVE_VERSION_ID)
        ->and($versionAfter->capability_profile_family_code)->toBe('service_listing')
        ->and($versionAfter->terms)->toBe($versionBefore->terms)
        ->and((json_decode((string) $versionAfter->terms, true)['work_shape'] ?? null))->toBe('A1')
        ->and($catalog->resolvePublished('home-help', 'service', (string) Str::uuid7(), 'A3')['capability_profile_id'])->toBe($a3['capability_profile_id'])
        ->and($catalog->resolvePublished('home-help', 'service', (string) Str::uuid7(), 'A9')['capability_profile_id'])->toBe($a9['capability_profile_id']);
});
it('preserves selected Work Set terms on title-only updates and rejects a mismatched version', function (): void {
    listingLifecyclePgsqlOrSkip();
    app(WorkCatalogSeeder::class)->run();

    $catalog = app(WorkCatalog::class);
    $set = $catalog->publishedWorkSet('set-repairs-plumbing-leak', 1);
    expect($set)->not->toBeNull();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);
    $input = [
        'title' => 'Tagudin plumbing leak repair',
        'description' => 'Diagnose and repair a household water leak safely.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
        'work_catalog_code' => 'set-repairs-plumbing-leak',
        'work_set_version' => 1,
        'milestone_stages' => $set['steps'],
    ];

    $created = app(CreateListingDraft::class)->handle($actor, $input, $correlationId);
    $versionOne = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 1)
        ->first();
    $termsV1 = json_decode((string) $versionOne->terms, true);

    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        ['title' => 'Updated plumbing repair title'],
        $correlationId,
    );
    $versionTwo = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 2)
        ->first();
    $termsV2 = json_decode((string) $versionTwo->terms, true);

    expect($termsV2['work_catalog_code'])->toBe($termsV1['work_catalog_code'])
        ->and($termsV2['work_set_version'])->toBe($termsV1['work_set_version'])
        ->and($termsV2['milestone_stages'])->toBe($termsV1['milestone_stages'])
        ->and($termsV2['work_specification'])->toBe($termsV1['work_specification'])
        ->and($updated['version'])->toBe(2);

    expect(fn () => app(CreateListingDraft::class)->handle(
        $actor,
        [...$input, 'work_set_version' => 2],
        (string) Str::uuid7(),
    ))->toThrow(ListingError::class);
});

it('persists listing media and deal chain specifications and preserves them across partial updates', function (): void {
    listingLifecyclePgsqlOrSkip();
    app(WorkCatalogSeeder::class)->run();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $mediaPayload = [
        'cover_thumbnail_url' => '/photos/ac-clean.jpg',
        'has_video' => true,
        'items' => [
            [
                'id' => 'photo-cover-1',
                'kind' => 'photo',
                'url' => '/photos/ac-clean.jpg',
                'thumbnail_url' => '/photos/ac-clean.jpg',
                'caption' => 'Indoor split coil foam wash',
                'mime_type' => 'image/webp',
                'is_cover' => true,
            ],
            [
                'id' => 'video-showcase-1',
                'kind' => 'video',
                'url' => '/videos/ac-clean-demo.mp4',
                'thumbnail_url' => '/photos/ac-clean.jpg',
                'caption' => '15-second pressure wash clip',
                'mime_type' => 'video/mp4',
                'is_cover' => false,
            ],
        ],
    ];

    $dealChainCombinations = [
        [
            'id' => 'combo-custom-1',
            'title' => 'Custom Parts + Courier + Labor',
            'recipeId' => 'turnkey_parts',
            'catalogVersion' => 1,
            'isCustom' => true,
            'isDefault' => true,
            'nodes' => [
                ['role' => 'STORE', 'title' => '35uF Cap', 'sub' => '₱180', 'type' => 'store', 'listingId' => 's-1'],
                ['role' => 'COURIER', 'title' => 'Danny Exp', 'sub' => '₱35', 'type' => 'delivery', 'listingId' => 'c-1'],
                ['role' => 'LABOR', 'title' => 'Your Service', 'sub' => '₱450', 'type' => 'labor'],
            ],
        ],
    ];

    $dealChainSpecification = [
        'based_on_recipe_code' => 'turnkey_parts',
        'based_on_catalog_version' => 1,
        'is_custom_variation' => true,
        'combination_count' => 1,
    ];

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Inverter AC Deep Clean with Video & Deal Chain',
        'description' => 'Complete indoor and outdoor unit cleaning with photo and video proof.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
        'work_catalog_code' => 'set-repairs-inverter-clean',
        'work_set_version' => 1,
        'media' => $mediaPayload,
        'deal_chain_combinations' => $dealChainCombinations,
        'deal_chain_specification' => $dealChainSpecification,
    ], $correlationId);

    expect($created['cover_thumbnail_url'])->toBe('/photos/ac-clean.jpg')
        ->and($created['has_video'])->toBeTrue()
        ->and($created['media']['items'])->toHaveCount(2)
        ->and($created['deal_chain_combinations'])->toHaveCount(1)
        ->and($created['deal_chain_specification']['based_on_recipe_code'])->toBe('turnkey_parts')
        ->and($created['deal_chain_specification']['is_custom_variation'])->toBeTrue();

    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        ['title' => 'Inverter AC Deep Clean Updated Title'],
        $correlationId,
    );

    expect($updated['cover_thumbnail_url'])->toBe('/photos/ac-clean.jpg')
        ->and($updated['has_video'])->toBeTrue()
        ->and($updated['media']['items'])->toHaveCount(2)
        ->and($updated['deal_chain_combinations'])->toEqual($dealChainCombinations)
        ->and($updated['deal_chain_specification'])->toEqual($dealChainSpecification);
});

it('persists stall_location and structured geography on product draft create and update', function (): void {
    listingLifecyclePgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin Bibingka Fresh Batch',
        'description' => 'Freshly baked native rice cake delicacy with salted egg.',
        'category_code' => 'local-food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
        'stall_location' => 'Tagudin Public Market Stall #14, Poblacion',
        'geography' => [
            'area_code' => 'Tagudin',
            'barangay_code' => '0102933037',
            'barangay_name' => 'Rizal',
            'street_address' => 'Tagudin Public Market Stall #14',
            'coordinates' => [
                'lat' => 16.9388,
                'lng' => 120.4439,
                'accuracy_m' => 8,
                'source' => 'gps',
                'captured_at' => '2026-09-28T12:00:00Z',
            ],
        ],
    ], $correlationId);

    expect($created['stall_location'])->toBe('Tagudin Public Market Stall #14, Poblacion')
        ->and($created['geography']['barangay_code'])->toBe('0102933037')
        ->and($created['geography']['coordinates']['lat'])->toBe(16.9388)
        ->and($created['geography']['coordinates']['source'])->toBe('gps')
        ->and($created['geography']['coordinates']['accuracy_m'])->toBe(8);

    $row = DB::table('listings')->where('id', $created['id'])->first();
    $geo = json_decode((string) $row->geography, true);
    expect($geo['stall_location'])->toBe('Tagudin Public Market Stall #14, Poblacion')
        ->and($geo['coordinates']['lat'])->toBe(16.9388)
        ->and($geo['coordinates']['source'])->toBe('gps')
        ->and($geo['region_code'])->toBe('0100000000')
        ->and($geo['province_code'])->toBe('0102900000')
        ->and($geo['municipality_code'])->toBe('0102933000');

    $updated = app(UpdateListingDraft::class)->handle(
        (string) $created['id'],
        $actor,
        (int) $created['expected_version'],
        [
            'stall_location' => 'Tagudin Commercial Center Stall #22, Rizal',
            'geography' => [
                'barangay_code' => '0102933037',
                'barangay_name' => 'Rizal',
                'coordinates' => [
                    'lat' => 16.9412,
                    'lng' => 120.4485,
                    'accuracy_m' => 5,
                    'source' => 'manual',
                    'captured_at' => '2026-09-28T12:05:00Z',
                ],
            ],
        ],
        $correlationId,
    );

    expect($updated['stall_location'])->toBe('Tagudin Commercial Center Stall #22, Rizal')
        ->and($updated['geography']['barangay_code'])->toBe('0102933037')
        ->and($updated['geography']['coordinates']['lat'])->toBe(16.9412)
        ->and($updated['geography']['coordinates']['source'])->toBe('manual')
        ->and($updated['geography']['coordinates']['accuracy_m'])->toBe(5);
});

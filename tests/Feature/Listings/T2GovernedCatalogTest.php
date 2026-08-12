<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\GovernedCatalogService;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t2PgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T2 governed catalog proofs require PostgreSQL.');
    }
}

it('ensures a published category version for listing pins', function (): void {
    t2PgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();

    $pins = $catalog->ensurePublished('home-help', 'service', $correlationId);

    expect($pins['category_id'])->not->toBeEmpty()
        ->and($pins['category_business_version'])->toBeGreaterThan(0)
        ->and($pins['capability_profile_family_code'])->not->toBeEmpty()
        ->and($pins['capability_profile_business_version'])->toBeGreaterThan(0);

    $published = DB::table('category_versions')
        ->where('category_id', $pins['category_id'])
        ->where('status', 'published')
        ->first();

    expect($published)->not->toBeNull()
        ->and((int) $published->business_version)->toBe($pins['category_business_version']);
});

it('rejects resolve when category has no published version', function (): void {
    t2PgsqlOrSkip();

    $correlationId = (string) Str::uuid7();
    $categoryId = (string) Str::uuid7();
    $now = now();

    DB::table('categories')->insert([
        'id' => $categoryId,
        'parent_id' => null,
        'code' => 'unpublished-only-'.substr($categoryId, 0, 8),
        'name' => 'Unpublished Only',
        'safety_class' => 'standard',
        'data_class' => 'public',
        'status' => 'active',
        'pilot_status' => 'approved',
        'metadata' => json_encode(['evidence_class' => 'TEAM'], JSON_THROW_ON_ERROR),
        'metadata_version' => 1,
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $catalog = app(GovernedCatalogService::class);

    try {
        $catalog->resolvePublished('unpublished-only-'.substr($categoryId, 0, 8), 'service', $correlationId);
        expect(false)->toBeTrue('Expected CATEGORY_NOT_PUBLISHED');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('CATEGORY_NOT_PUBLISHED');
    }
});

it('pins category and capability business versions on listing draft create', function (): void {
    t2PgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin laundry help',
        'description' => 'Wash and fold for Tagudin households.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $version = DB::table('listing_versions')
        ->where('listing_id', $created['id'])
        ->where('version_number', 1)
        ->first();

    expect($version)->not->toBeNull();

    if (Schema::hasColumn('listing_versions', 'category_id')) {
        expect($version->category_id)->not->toBeNull()
            ->and((int) $version->category_business_version)->toBeGreaterThan(0)
            ->and($version->capability_profile_family_code)->not->toBeNull()
            ->and((int) $version->capability_profile_business_version)->toBeGreaterThan(0);
    }
});

it('rejects capacity oversell and replays identical hold keys', function (): void {
    t2PgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Fresh lumpia packs',
        'description' => 'Limited daily packs from Tagudin market.',
        'category_code' => 'food',
        'listing_type' => 'product',
    ], $correlationId);

    $version = DB::table('listing_versions')->where('listing_id', $created['id'])->first();
    $capacity = app(CapacityReservationService::class);

    $bucket = $capacity->ensureBucket(
        listingId: $created['id'],
        listingVersionId: (string) $version->id,
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $correlationId,
    );

    $first = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.test.hold',
        idempotencyKey: 'hold-key-0001',
        correlationId: $correlationId,
    );

    expect($first['replay'])->toBeFalse()
        ->and($first['remaining_quantity'])->toBe(0);

    $replay = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.test.hold',
        idempotencyKey: 'hold-key-0001',
        correlationId: $correlationId,
    );

    expect($replay['replay'])->toBeTrue()
        ->and($replay['reservation_id'])->toBe($first['reservation_id'])
        ->and($replay['remaining_quantity'])->toBe(0);

    try {
        $capacity->hold(
            listingCapacityId: $bucket['id'],
            quantity: 1,
            commandScope: 't2.test.hold',
            idempotencyKey: 'hold-key-0002',
            correlationId: $correlationId,
        );
        expect(false)->toBeTrue('Expected CAPACITY_OVERSELL');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('CAPACITY_OVERSELL')
            ->and($error->status)->toBe(409);
    }
});

it('discovers only Tagudin approved active listings and omits owner ids', function (): void {
    t2PgsqlOrSkip();

    $owner = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($owner->id, $owner->id);

    $draft = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Draft only',
        'description' => 'Should not appear in public discovery.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $active = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Active Tagudin help',
        'description' => 'Should appear in public discovery.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    DB::table('listings')->where('id', $active['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);

    $results = app(PublicListingsQuery::class)->handle(
        $correlationId,
        areaCode: 'Tagudin',
        categoryCode: 'home-help',
    );

    $ids = collect($results)->pluck('id')->all();

    expect($ids)->toContain($active['id'])
        ->and($ids)->not->toContain($draft['id']);

    foreach ($results as $row) {
        expect($row)->not->toHaveKey('owner_user_id')
            ->and($row['area'] ?? null)->toBe('Tagudin');
    }
});

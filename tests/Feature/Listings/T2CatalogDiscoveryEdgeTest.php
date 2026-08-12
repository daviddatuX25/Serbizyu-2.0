<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\GovernedCatalogService;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t2CatalogPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T2 catalog/discovery proofs require PostgreSQL.');
    }
}

function t2CatalogExpectError(callable $callback, string $code): ListingError
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected ListingError '.$code);
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe($code);

        return $error;
    }

    throw new RuntimeException('unreachable');
}

it('is idempotent when ensuring the same published category twice', function (): void {
    t2CatalogPgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();

    $first = $catalog->ensurePublished('home-help', 'service', $correlationId);
    $second = $catalog->ensurePublished('home-help', 'service', $correlationId);

    expect($second)->toBe($first)
        ->and(DB::table('category_versions')->where('category_id', $first['category_id'])->where('status', 'published')->count())->toBe(1);
});

it('resolves published pins after ensure and rejects unknown category codes', function (): void {
    t2CatalogPgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();

    $ensured = $catalog->ensurePublished('home-help', 'service', $correlationId);
    $resolved = $catalog->resolvePublished('home-help', 'service', $correlationId);

    expect($resolved['category_id'])->toBe($ensured['category_id'])
        ->and($resolved['category_business_version'])->toBe($ensured['category_business_version']);

    t2CatalogExpectError(
        fn () => $catalog->resolvePublished('no-such-category-code', 'service', $correlationId),
        'CATEGORY_NOT_PUBLISHED',
    );
});

it('rejects resolve when the only category version is paused', function (): void {
    t2CatalogPgsqlOrSkip();

    $catalog = app(GovernedCatalogService::class);
    $correlationId = (string) Str::uuid7();
    $pins = $catalog->ensurePublished('paused-cat-'.substr((string) Str::uuid7(), 0, 8), 'service', $correlationId);

    DB::table('category_versions')
        ->where('category_id', $pins['category_id'])
        ->where('status', 'published')
        ->update([
            'status' => 'paused',
            'paused_at' => now(),
            'updated_at' => now(),
        ]);

    $code = (string) DB::table('categories')->where('id', $pins['category_id'])->value('code');

    t2CatalogExpectError(
        fn () => $catalog->resolvePublished($code, 'service', $correlationId),
        'CATEGORY_NOT_PUBLISHED',
    );
});

it('re-pins category and capability versions when a draft is updated', function (): void {
    t2CatalogPgsqlOrSkip();

    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Pin draft',
        'description' => 'Initial draft for pin edge coverage.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $updated = app(UpdateListingDraft::class)->handle(
        $created['id'],
        $actor,
        (int) $created['expected_version'],
        [
            'title' => 'Pin draft updated',
            'description' => 'Updated draft should create a new pinned version.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ],
        $correlationId,
    );

    $latest = DB::table('listing_versions')
        ->where('listing_id', $updated['id'])
        ->orderByDesc('version_number')
        ->first();

    expect((int) $latest->version_number)->toBeGreaterThan(1);

    if (Schema::hasColumn('listing_versions', 'category_id')) {
        expect($latest->category_id)->not->toBeNull()
            ->and((int) $latest->category_business_version)->toBeGreaterThan(0)
            ->and($latest->capability_profile_family_code)->not->toBeNull();

        $fkOk = DB::table('category_versions')
            ->where('category_id', $latest->category_id)
            ->where('business_version', $latest->category_business_version)
            ->exists();
        expect($fkOk)->toBeTrue();
    }
});

it('excludes non-Tagudin geography and pending review from discovery', function (): void {
    t2CatalogPgsqlOrSkip();

    $owner = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($owner->id, $owner->id);

    $tagudin = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin active',
        'description' => 'Should be discoverable.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $pending = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Pending review',
        'description' => 'Should stay private.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $elsewhere = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Elsewhere active',
        'description' => 'Wrong geography.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    DB::table('listings')->where('id', $tagudin['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);
    DB::table('listings')->where('id', $pending['id'])->update([
        'status' => 'pending_review',
        'review_status' => 'pending',
        'updated_at' => now(),
    ]);
    DB::table('listings')->where('id', $elsewhere['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'geography' => json_encode(['area_code' => 'Vigan'], JSON_THROW_ON_ERROR),
        'updated_at' => now(),
    ]);

    $results = app(PublicListingsQuery::class)->handle($correlationId, areaCode: 'Tagudin', categoryCode: 'home-help');
    $ids = collect($results)->pluck('id')->all();

    expect($ids)->toContain($tagudin['id'])
        ->and($ids)->not->toContain($pending['id'])
        ->and($ids)->not->toContain($elsewhere['id']);
});

it('filters discovery by category and supports cursor pagination', function (): void {
    t2CatalogPgsqlOrSkip();

    $owner = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($owner->id, $owner->id);

    $homeA = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Home A',
        'description' => 'Home help listing A for cursor tests.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);
    $homeB = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Home B',
        'description' => 'Home help listing B for cursor tests.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);
    $food = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Food C',
        'description' => 'Food listing should be filtered out.',
        'category_code' => 'food',
        'listing_type' => 'product',
    ], $correlationId);

    foreach ([$homeA['id'], $homeB['id'], $food['id']] as $id) {
        DB::table('listings')->where('id', $id)->update([
            'status' => 'active',
            'review_status' => 'approved',
            'updated_at' => now(),
        ]);
    }

    $homeOnly = app(PublicListingsQuery::class)->handle($correlationId, categoryCode: 'home-help');
    $homeIds = collect($homeOnly)->pluck('id')->all();
    expect($homeIds)->toContain($homeA['id'], $homeB['id'])
        ->and($homeIds)->not->toContain($food['id']);

    $ordered = collect($homeOnly)->sortBy('id')->values();
    $firstId = (string) $ordered[0]['id'];

    $page = app(PublicListingsQuery::class)->handle(
        $correlationId,
        categoryCode: 'home-help',
        cursor: $firstId,
        limit: 1,
    );

    expect($page)->toHaveCount(1)
        ->and($page[0]['id'])->not->toBe($firstId)
        ->and(collect($page)->pluck('id')->all())->not->toContain($food['id']);

    foreach ($page as $row) {
        expect($row)->not->toHaveKey('owner_user_id');
    }
});

it('clamps discovery limit and returns empty safely for unknown category', function (): void {
    t2CatalogPgsqlOrSkip();

    $correlationId = (string) Str::uuid7();
    $empty = app(PublicListingsQuery::class)->handle($correlationId, categoryCode: 'definitely-missing-category');
    expect($empty)->toBe([]);

    $owner = User::factory()->create();
    $actor = new ResourceActor($owner->id, $owner->id);
    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Limit clamp',
        'description' => 'Used to verify discovery limit clamping.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);
    DB::table('listings')->where('id', $created['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);

    $clamped = app(PublicListingsQuery::class)->handle($correlationId, limit: 0);
    expect(count($clamped))->toBeGreaterThan(0);
});

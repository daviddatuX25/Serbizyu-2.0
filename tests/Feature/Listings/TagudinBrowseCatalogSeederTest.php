<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Application\DemoFixtures;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\Listings\Application\PublicListingDetailQuery;
use App\Modules\Listings\Application\PublicListingsQuery;
use App\Modules\Listings\Application\SeedTagudinBrowseCatalog;
use App\Modules\Listings\Infrastructure\Demo\TagudinBrowseCatalog;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('The first connected slice uses the PostgreSQL 16/PostGIS baseline.');
    }

    app(FixtureRepository::class)->ensure();
});

it('seeds a scalable Tagudin browse catalog without losing the contract fixture', function (): void {
    $result = app(SeedTagudinBrowseCatalog::class)->handle();

    expect($result['seeded'])->toBe(count(TagudinBrowseCatalog::listings()))
        ->and($result['fixture_keys'])->toBe(TagudinBrowseCatalog::fixtureKeys());

    $listings = app(PublicListingsQuery::class)->handle((string) Str::uuid7());

    expect($listings)->toBeArray()
        ->and(count($listings))->toBeGreaterThanOrEqual(1 + count(TagudinBrowseCatalog::listings()));

    $keys = collect($listings)->pluck('fixture_key')->filter()->values()->all();

    expect($keys)->toContain(DemoFixtures::ACTIVE_LISTING_FIXTURE);

    foreach (TagudinBrowseCatalog::fixtureKeys() as $key) {
        expect($keys)->toContain($key);
    }

    $priced = collect($listings)->first(
        fn (array $row): bool => ($row['fixture_key'] ?? null) === 'active-tagudin-greeting-card-01',
    );

    expect($priced)->not->toBeNull()
        ->and($priced['price_amount_minor'])->toBe(8000)
        ->and($priced['currency'])->toBe('PHP')
        ->and($priced['area'])->toBe('Tagudin');

    $acDetail = app(PublicListingDetailQuery::class)->handle(
        '0198a3b1-7c40-7abc-8def-5234567890b8',
        (string) Str::uuid7()
    );

    expect($acDetail)->not->toBeNull()
        ->and($acDetail['package_tiers'])->toBeArray()
        ->and(count($acDetail['package_tiers']))->toBe(3)
        ->and($acDetail['package_tiers'][0]['title'])->toBe('1 Unit Standard')
        ->and($acDetail['milestone_stages'])->toBeArray()
        ->and(count($acDetail['milestone_stages']))->toBe(4);
});
it('projects stable public product variant ids and ledger-derived availability on detail', function (): void {
    app(SeedTagudinBrowseCatalog::class)->handle();

    $detail = app(PublicListingDetailQuery::class)->handle(
        '0198a3b1-7c40-7abc-8def-5234567890ba',
        (string) Str::uuid7(),
    );

    expect($detail)->not->toBeNull()
        ->and($detail['listing_version_id'])->toBe('0198a3b1-7c40-7abc-8def-6234567890ba')
        ->and($detail['variants'][0])->toMatchArray([
            'id' => 'var-ac-capacitor-35uf',
            'resource_key' => 'var-ac-capacitor-35uf',
            'availability' => [
                'on_hand' => 20,
                'held' => 0,
                'committed_unfulfilled' => 0,
                'available' => 20,
                'availability_status' => 'open',
            ],
        ]);
});

it('keeps contract-only supply when the browse catalog is not seeded', function (): void {
    $listings = app(PublicListingsQuery::class)->handle((string) Str::uuid7());

    expect(collect($listings)->pluck('fixture_key')->all())
        ->toContain(DemoFixtures::ACTIVE_LISTING_FIXTURE);
});

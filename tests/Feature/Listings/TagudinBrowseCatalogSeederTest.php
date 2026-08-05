<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Application\DemoFixtures;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
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
});

it('keeps contract-only supply when the browse catalog is not seeded', function (): void {
    $listings = app(PublicListingsQuery::class)->handle((string) Str::uuid7());

    expect(collect($listings)->pluck('fixture_key')->all())
        ->toContain(DemoFixtures::ACTIVE_LISTING_FIXTURE);
});

<?php

declare(strict_types=1);

use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\Listings\Application\PublicListingDetailQuery;
use App\Modules\Listings\Application\SeedTagudinBrowseCatalog;
use App\Modules\Listings\Infrastructure\Demo\TagudinBrowseCatalog;
use App\Shared\Infrastructure\Demo\TagudinDealChainCatalog;
use App\Shared\Infrastructure\Demo\TagudinWorkCatalog;
use Database\Seeders\DealChainCatalogSeeder;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('The catalog seed contract uses the PostgreSQL baseline.');
    }

    app(FixtureRepository::class)->ensure();
});

it('seeds idempotent work and deal-chain catalogs with compatible browse supply', function (): void {
    app(WorkCatalogSeeder::class)->run();
    app(DealChainCatalogSeeder::class)->run();
    app(SeedTagudinBrowseCatalog::class)->handle();

    app(WorkCatalogSeeder::class)->run();
    app(DealChainCatalogSeeder::class)->run();

    expect(DB::table('work_catalog_versions')->where('status', 'published')->count())
        ->toBe(count(TagudinWorkCatalog::definitions()))
        ->and(DB::table('deal_chain_catalog_versions')->where('status', 'published')->count())
        ->toBe(count(TagudinDealChainCatalog::definitions()));

    $workSets = collect(TagudinWorkCatalog::definitions())
        ->flatMap(fn (array $definition): array => $definition['definition']['work_sets'] ?? [])
        ->keyBy('set_code');

    expect($workSets->keys()->all())->toContain(
        'set-repairs-inverter-clean',
        'set-repairs-plumbing-leak',
        'set-repairs-electrical-turnkey',
        'set-cleaning-residential',
        'set-cleaning-scheduled-turnover',
        'set-local-services-errand',
        'set-print-proof-assist',
        'set-crafts-custom-card',
    )
        ->and($workSets->get('set-repairs-inverter-clean')['status'])->toBe('published')
        ->and($workSets->get('set-repairs-inverter-clean')['set_version'])->toBe(2)
        ->and($workSets->get('set-repairs-electrical-turnkey')['set_version'])->toBe(2)
        ->and($workSets->get('set-repairs-inverter-clean')['steps'][0]['dur'])->toBe('10m')
        ->and($workSets->get('set-repairs-plumbing-leak')['steps'][0])->not->toHaveKey('dur');

    $workCatalogCodes = collect(TagudinWorkCatalog::definitions())
        ->pluck('catalog_code')
        ->all();

    $detailQuery = app(PublicListingDetailQuery::class);

    foreach (TagudinBrowseCatalog::listings() as $listing) {
        $detail = $detailQuery->handle($listing['listing_id'], (string) Str::uuid7());

        expect($detail)->not->toBeNull()
            ->and($detail['work_catalog']['code'])->toBe($listing['work_catalog_code'])
            ->and($workCatalogCodes)->toContain($detail['work_catalog']['code'])
            ->and($detail['package_tiers'])->toBeArray()->not->toBeEmpty()
            ->and($detail['milestone_stages'])->toBeArray()->not->toBeEmpty()
            ->and($detail['addons'])->toBeArray()->not->toBeEmpty()
            ->and($detail['partner_candidates'])->toBeArray()->not->toBeEmpty();
    }
    $activeDetail = $detailQuery->handle(FixtureRepository::ACTIVE_LISTING_ID, (string) Str::uuid7());

    expect($activeDetail)->not->toBeNull()
        ->and($activeDetail['work_catalog']['code'])->toBe('tagudin-local-service-a1')
        ->and($activeDetail['addons'])->toBeArray()->not->toBeEmpty()
        ->and($activeDetail['partner_candidates'])->toBeArray()->not->toBeEmpty();

    $recipes = app(DealChainCatalog::class)->published();

    foreach (TagudinBrowseCatalog::listings() as $listing) {
        $compatible = collect($recipes)->filter(function (array $recipe) use ($listing): bool {
            return in_array($listing['category_code'], $recipe['category_codes'], true)
                && in_array($listing['listing_type'], $recipe['listing_types'], true)
                && in_array($listing['work_shape'], $recipe['work_shapes'], true);
        });

        expect($compatible->isNotEmpty())->toBeTrue();
    }
});

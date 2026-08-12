<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure\Demo;

use App\Shared\Contracts\FixtureConstants;

/**
 * Declarative Tagudin browse supply for local/capstone demos.
 *
 * Contract row (fixture_key = DemoFixtures::ACTIVE_LISTING_FIXTURE) stays owned by
 * FixtureRepository for deterministic first-slice tests. This catalog seeds the
 * additional active public listings used by Browse PLP demos.
 *
 * @phpstan-type CatalogListing array{
 *     fixture_key: string,
 *     listing_id: string,
 *     version_id: string,
 *     category_code: string,
 *     listing_type: 'service'|'product',
 *     title: string,
 *     description: string,
 *     scope: string,
 *     price_amount_minor: int|null,
 *     currency: string|null,
 *     capacity_summary: string
 * }
 */
final class TagudinBrowseCatalog
{
    /**
     * Extra active public listings (excludes the contract ACTIVE listing).
     *
     * @return list<CatalogListing>
     */
    public static function listings(): array
    {
        return [
            [
                'fixture_key' => 'active-tagudin-greeting-card-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b1',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b1',
                'category_code' => 'greeting-cards',
                'listing_type' => 'service',
                'title' => 'Hand-drawn greeting card layout',
                'description' => 'A5 layout with one revision. Printing and delivery are separate.',
                'scope' => 'Fictional Tagudin craft service fixture',
                'price_amount_minor' => 8000,
                'currency' => 'PHP',
                'capacity_summary' => 'Capacity available this week',
            ],
            [
                'fixture_key' => 'active-tagudin-hem-fix-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b2',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b2',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'title' => 'Simple hem and button fix',
                'description' => 'Walk-in same-day hem and button repair in Tagudin Centro.',
                'scope' => 'Fictional Tagudin repair fixture',
                'price_amount_minor' => 12000,
                'currency' => 'PHP',
                'capacity_summary' => 'Same-day walk-in when open',
            ],
            [
                'fixture_key' => 'active-tagudin-market-errand-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b3',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b3',
                'category_code' => 'local-services',
                'listing_type' => 'service',
                'title' => 'Market errand run',
                'description' => 'List-and-pickup errand help at a public meeting point. External Cash between parties.',
                'scope' => 'Fictional Tagudin errand fixture',
                'price_amount_minor' => 15000,
                'currency' => 'PHP',
                'capacity_summary' => 'Pickup windows by agreement',
            ],
            [
                'fixture_key' => 'active-tagudin-flyer-print-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b4',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b4',
                'category_code' => 'print-assist',
                'listing_type' => 'service',
                'title' => 'Small-batch flyer print assist',
                'description' => 'Soft proof first, then small-batch flyer print assist in Tagudin.',
                'scope' => 'Fictional Tagudin print fixture',
                'price_amount_minor' => 20000,
                'currency' => 'PHP',
                'capacity_summary' => 'Soft proof before print',
            ],
            [
                'fixture_key' => 'active-tagudin-bibingka-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b5',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b5',
                'category_code' => 'local-food',
                'listing_type' => 'product',
                'title' => 'Weekend bibingka tray',
                'description' => 'Ready Saturday morning. Pickup only. Fictional local product fixture.',
                'scope' => 'Fictional Tagudin product fixture',
                'price_amount_minor' => 18000,
                'currency' => 'PHP',
                'capacity_summary' => 'Ready Saturday morning · pickup only',
            ],
            [
                'fixture_key' => 'active-tagudin-document-scan-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b6',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b6',
                'category_code' => 'print-assist',
                'listing_type' => 'service',
                'title' => 'Document scan soft-copy',
                'description' => 'Clear soft-copy scan of short document sets. External Cash handoff.',
                'scope' => 'Fictional Tagudin scan fixture',
                'price_amount_minor' => 5000,
                'currency' => 'PHP',
                'capacity_summary' => 'Short sets same day when open',
            ],
            [
                'fixture_key' => 'active-tagudin-greens-bag-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b7',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b7',
                'category_code' => 'local-food',
                'listing_type' => 'product',
                'title' => 'Small greens bag',
                'description' => 'Market-morning greens bag. Pickup at agreed public point.',
                'scope' => 'Fictional Tagudin greens fixture',
                'price_amount_minor' => 9000,
                'currency' => 'PHP',
                'capacity_summary' => 'Market mornings when listed',
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public static function fixtureKeys(): array
    {
        return array_map(
            static fn (array $row): string => $row['fixture_key'],
            self::listings(),
        );
    }

    public static function contractListingId(): string
    {
        return FixtureConstants::ACTIVE_LISTING_ID;
    }

    public static function contractFixtureKey(): string
    {
        return FixtureConstants::ACTIVE_LISTING_FIXTURE;
    }
}

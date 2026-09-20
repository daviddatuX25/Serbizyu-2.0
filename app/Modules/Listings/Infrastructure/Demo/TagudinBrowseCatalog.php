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
 *     work_shape: 'A1'|'A2'|'A3'|'A4'|'A9',
 *     title: string,
 *     description: string,
 *     scope: string,
 *     price_amount_minor: int|null,
 *     currency: string|null,
 *     capacity_summary: string,
 *     package_tiers?: list<array{id: string, title: string, price: int, orig_price?: int, sub: string, inclusions: list<string>}>,
 *     milestone_stages?: list<array{title: string, description: string}>
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
                'work_shape' => 'A1',
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
                'work_shape' => 'A1',
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
                'work_shape' => 'A1',
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
                'work_shape' => 'A1',
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
                'work_shape' => 'A4',
                'title' => 'Weekend bibingka tray',
                'description' => 'Ready Saturday morning. Pickup only. Fictional local product fixture.',
                'scope' => 'Fictional Tagudin product fixture',
                'price_amount_minor' => 18000,
                'currency' => 'PHP',
                'capacity_summary' => 'Ready Saturday morning · pickup only',
                'package_tiers' => [
                    ['id' => 'pkg-food-1', 'title' => 'Solo Snack Box', 'price' => 80, 'orig_price' => 95, 'sub' => '2 pcs warm bibingka', 'inclusions' => ['Fresh morning batch steaming in clay oven', 'Wrapped in organic wilted banana leaves', 'Includes signature coconut latik dip cup']],
                    ['id' => 'pkg-food-2', 'title' => 'Family Fiesta Tray', 'price' => 180, 'orig_price' => 220, 'sub' => '6 pcs sharing tray', 'inclusions' => ['Six freshly baked banana-leaf bibingka cakes', 'Generous toasted coconut shreds & salted egg toppings', 'Insulated thermal box keeping warm for 2 hours']],
                    ['id' => 'pkg-food-3', 'title' => 'Party Jumbo Crate', 'price' => 350, 'orig_price' => 420, 'sub' => '12 pcs party set', 'inclusions' => ['Twelve specialty bibingka cakes', 'Custom greeting ribbon & festive tag', 'Bulk condiment jars & biodegradable serving ware']],
                ],
                'milestone_stages' => [
                    ['title' => 'Morning batch baking & clay oven steaming', 'description' => 'Stage 1 · Kitchen batch preparation gate'],
                    ['title' => 'Fresh packaging in wilted banana leaves', 'description' => 'Stage 2 · Fresh seal packaging gate'],
                    ['title' => 'Warm insulated tray handoff at Tagudin Market', 'description' => 'Stage 3 · Stall pickup or courier dispatch'],
                ],
            ],
            [
                'fixture_key' => 'active-tagudin-document-scan-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b6',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b6',
                'category_code' => 'print-assist',
                'listing_type' => 'service',
                'work_shape' => 'A1',
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
                'work_shape' => 'A4',
                'title' => 'Small greens bag',
                'description' => 'Market-morning greens bag. Pickup at agreed public point.',
                'scope' => 'Fictional Tagudin greens fixture',
                'price_amount_minor' => 9000,
                'currency' => 'PHP',
                'capacity_summary' => 'Market mornings when listed',
            ],
            [
                'fixture_key' => 'active-tagudin-ac-clean-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A3',
                'title' => 'Inverter Split AC Deep Clean & Checkup',
                'description' => 'Complete chemical wash of indoor evaporator coil, blower fan wheel removal, drain line unblocking, and operating freon pressure checkup.',
                'scope' => 'Tagudin licensed technician repair fixture',
                'price_amount_minor' => 45000,
                'currency' => 'PHP',
                'capacity_summary' => 'Fixed rate SLA · Appointment',
                'package_tiers' => [
                    ['id' => 'pkg-1', 'title' => '1 Unit Standard', 'price' => 450, 'orig_price' => 550, 'sub' => 'Deep coil & drain clean', 'inclusions' => ['On-site breaker isolation & diagnostic status check', 'Evaporator coil alkaline chemical foam disinfection', 'Blower fan wheel disassembly and grease flush', 'Dual-probe delta temperature test (ΔT ≥ 12°C)']],
                    ['id' => 'pkg-2', 'title' => '2 Units Dual Split', 'price' => 850, 'orig_price' => 1100, 'sub' => 'Save ₱50 bundle', 'inclusions' => ['Complete service on two indoor units', 'Outdoor condensing unit pressure flush & fin inspection', 'Freon operating pressure calibration test', 'Full photographic milestone sign-off']],
                    ['id' => 'pkg-3', 'title' => '3 Units Full Home', 'price' => 1200, 'orig_price' => 1650, 'sub' => 'Save ₱150 package', 'inclusions' => ['Complete service on three indoor units + outdoor units', 'Anti-bacterial ozone air duct sanitization', 'Priority same-day completion guarantee', 'Customer OTP handover & digital service warranty']],
                ],
                'milestone_stages' => [
                    ['title' => 'Breaker isolation & coil status triage', 'description' => 'Stage 1 · Breaker lockout photo gate'],
                    ['title' => 'Chemical foam wash & pressure rinse', 'description' => 'Stage 2 · Foam coverage photo gate'],
                    ['title' => 'Cold compressor run & amp verification', 'description' => 'Stage 3 · Amperage reading photo gate'],
                    ['title' => 'Delta temperature drop test (ΔT ≥ 12°C)', 'description' => 'Stage 4 · Probe delta photo + Citizen OTP sign-off'],
                ],
            ],
            [
                'fixture_key' => 'active-tagudin-courier-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b9',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b9',
                'category_code' => 'courier',
                'listing_type' => 'service',
                'work_shape' => 'A2',
                'title' => 'Tagudin Express Motorcycle Delivery',
                'description' => 'Fast doorstep pickup & delivery across Tagudin. Courier coordinates with local hardware stores, bakeries, and technician appointments.',
                'scope' => 'Tagudin transport fixture',
                'price_amount_minor' => 8000,
                'currency' => 'PHP',
                'capacity_summary' => '15-25m route windows in Centro',
            ],
            [
                'fixture_key' => 'active-tagudin-ac-capacitor-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890ba',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890ba',
                'category_code' => 'repairs',
                'listing_type' => 'product',
                'work_shape' => 'A4',
                'title' => 'AC Run Capacitor (35uF 450V)',
                'description' => 'Replacement motor capacitor for residential 1.0HP to 1.5HP split and window air conditioners. Bench-tested at Tagudin Hardware.',
                'scope' => 'Tagudin hardware store fixture',
                'price_amount_minor' => 18000,
                'currency' => 'PHP',
                'capacity_summary' => 'In stock at counter',
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

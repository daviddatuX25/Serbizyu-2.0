<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure\Demo;

use App\Shared\Contracts\FixtureConstants;
use App\Shared\Infrastructure\Demo\TagudinPartnerCatalog;

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
 *     package_tiers?: list<array{id: string, title: string, price: int, orig_price?: int, sub: string, inclusions: list<string>}>,
 *     milestone_stages?: list<array<string, mixed>>,
 *     work_catalog_code?: string,
 *     addons?: list<array<string, mixed>>,
 *     partner_candidates?: list<array<string, mixed>>,
 *     catalog_source?: string,
 *     barangay_name?: string,
 *     barangay_code?: string,
 *     stall_location?: string,
 *     coordinates?: array{lat: float, lng: float}
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
        $rows = [
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
                'barangay_name' => 'Bio',
                'barangay_code' => '0102933008',
                'stall_location' => 'Bio Beach Craft Studio',
                'coordinates' => ['lat' => 16.9482, 'lng' => 120.4325],
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
                'barangay_name' => 'Rizal',
                'barangay_code' => '0102933037',
                'stall_location' => 'Stall 8, Tagudin Public Market',
                'coordinates' => ['lat' => 16.9382, 'lng' => 120.4435],
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
                'barangay_name' => 'Del Pilar',
                'barangay_code' => '0102933018',
                'stall_location' => 'Del Pilar Heritage Plaza',
                'coordinates' => ['lat' => 16.9375, 'lng' => 120.4452],
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
                'barangay_name' => 'Quirino',
                'barangay_code' => '0102933035',
                'stall_location' => 'St. Augustine Commercial Hub',
                'coordinates' => ['lat' => 16.9365, 'lng' => 120.4468],
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
                'barangay_name' => 'Rizal',
                'barangay_code' => '0102933037',
                'stall_location' => 'Stall 14, Tagudin Public Market',
                'coordinates' => ['lat' => 16.9380, 'lng' => 120.4438],
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
                'barangay_name' => 'Poblacion',
                'barangay_code' => '0102933037',
                'stall_location' => 'Municipal Center Arcade',
                'coordinates' => ['lat' => 16.9388, 'lng' => 120.4440],
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
                'barangay_name' => 'Ambalayat',
                'barangay_code' => '0102933002',
                'stall_location' => 'Ambalayat Farm Stand',
                'coordinates' => ['lat' => 16.9255, 'lng' => 120.4552],
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
                    ['id' => 'compressor-current', 'title' => 'Cold compressor run & amp verification', 'description' => 'Stage 3 · Amperage reading photo gate', 'required_proofs' => ['metric_reading'], 'metric_requirements' => [['id' => 'compressor-current', 'name' => 'Compressor current', 'unit' => 'A', 'required' => true]]],
                    ['id' => 'temperature-delta', 'title' => 'Delta temperature drop test (ΔT ≥ 12°C)', 'description' => 'Stage 4 · Probe delta photo + Citizen OTP sign-off', 'required_proofs' => ['photo_proof', 'metric_reading'], 'metric_requirements' => [['id' => 'temperature-delta', 'name' => 'Temperature delta', 'unit' => '°C', 'required' => true, 'min' => 12]], 'approval_method' => 'presence_otp'],
                ],
                'barangay_name' => 'Poblacion',
                'barangay_code' => '0102933037',
                'stall_location' => 'Master Tech Workshop, Centro',
                'coordinates' => ['lat' => 16.9392, 'lng' => 120.4430],
            ],
            [
                'fixture_key' => 'active-tagudin-courier-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b9',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890b9',
                'category_code' => 'courier',
                'listing_type' => 'service',
                'work_shape' => 'A1',
                'title' => 'Tagudin Express Motorcycle Delivery',
                'description' => 'Fast doorstep pickup & delivery across Tagudin. Courier coordinates with local hardware stores, bakeries, and technician appointments.',
                'scope' => 'Tagudin transport fixture',
                'price_amount_minor' => 8000,
                'currency' => 'PHP',
                'capacity_summary' => '15-25m route windows in Centro',
                'barangay_name' => 'Bitalag',
                'barangay_code' => '0102933009',
                'stall_location' => 'Bitalag McArthur Highway Station',
                'coordinates' => ['lat' => 16.9280, 'lng' => 120.4485],
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
                'barangay_name' => 'Rizal',
                'barangay_code' => '0102933037',
                'stall_location' => 'Tagudin Central Hardware, Rizal',
                'variants' => [
                    ['id' => 'var-ac-capacitor-35uf', 'name' => '35µF · 450V', 'price' => 180, 'stock' => 20, 'is_default' => true],
                ],
            ],
            [
                'fixture_key' => 'active-tagudin-ac-install-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890bb',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890bb',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A3',
                'title' => 'Split AC Capacitor Installation',
                'description' => 'Separate installation labor for a compatible AC run capacitor, including safe isolation and load verification.',
                'scope' => 'Tagudin technician installation fixture',
                'price_amount_minor' => 25000,
                'currency' => 'PHP',
                'capacity_summary' => 'Appointment windows by agreement',
                'barangay_name' => 'Libtong',
                'barangay_code' => '0102933026',
                'stall_location' => 'Libtong Service Depot',
                'coordinates' => ['lat' => 16.9602, 'lng' => 120.4312],
            ],
            [
                'fixture_key' => 'active-tagudin-safety-audit-01',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890bc',
                'version_id' => '0198a3b1-7c40-7abc-8def-6234567890bc',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A3',
                'title' => 'Home Appliance Safety Audit',
                'description' => 'Independent thermal-load and electrical safety review after repair work reaches its readiness gate.',
                'scope' => 'Tagudin safety audit fixture',
                'price_amount_minor' => 15000,
                'currency' => 'PHP',
                'capacity_summary' => 'Scheduled audit windows',
                'barangay_name' => 'Farola',
                'barangay_code' => '0102933019',
                'stall_location' => 'Farola Sundial Point',
                'coordinates' => ['lat' => 16.9340, 'lng' => 120.4380],
            ],
        ];

        return array_map(
            static function (array $row): array {
                $row['work_catalog_code'] ??= self::workCatalogCode((string) $row['work_shape']);
                $row['package_tiers'] ??= self::defaultPackageTiers($row);
                $row['milestone_stages'] ??= self::defaultMilestones((string) $row['work_shape']);
                $row['addons'] ??= TagudinPartnerCatalog::addonsFor([
                    'category_code' => (string) $row['category_code'],
                    'listing_type' => $row['listing_type'],
                    'fixture_key' => (string) ($row['fixture_key'] ?? ''),
                    'title' => (string) ($row['title'] ?? ''),
                ]);
                $row['partner_candidates'] = TagudinPartnerCatalog::candidates();
                $row['media'] ??= self::defaultMedia($row);
                $row['catalog_source'] = 'tagudin_seed';

                return $row;
            },
            $rows,
        );
    }

    /** @return list<array{id: string, title: string, price: int, orig_price?: int, sub: string, inclusions: list<string>}> */
    private static function defaultPackageTiers(array $row): array
    {
        $basePrice = max(1, (int) round(((int) ($row['price_amount_minor'] ?? 0)) / 100));
        $fixture = preg_replace('/[^a-z0-9]+/i', '-', (string) $row['fixture_key']) ?: 'listing';
        $kind = $row['listing_type'] === 'product' ? 'Product' : 'Service';

        return [
            [
                'id' => 'pkg-'.$fixture.'-standard',
                'title' => $kind.' Standard Scope',
                'price' => $basePrice,
                'orig_price' => (int) round($basePrice * 1.15),
                'sub' => 'Base verified scope',
                'inclusions' => [
                    'Scope confirmation and handoff details',
                    'Standard Tagudin execution or preparation',
                    'Required evidence and completion acknowledgement',
                ],
            ],
            [
                'id' => 'pkg-'.$fixture.'-extended',
                'title' => $kind.' Extended Scope',
                'price' => (int) round($basePrice * 1.75),
                'orig_price' => (int) round($basePrice * 2.05),
                'sub' => 'Expanded capacity or priority handling',
                'inclusions' => [
                    'Expanded quantity or service capacity',
                    'Additional quality review before handoff',
                    'Priority coordination window when available',
                ],
            ],
        ];
    }

    /** @return list<array{title: string, description: string}> */
    private static function defaultMilestones(string $workShape): array
    {
        return match ($workShape) {
            'A2' => [
                ['title' => 'Pickup check-in and package count', 'description' => 'Stage 1 · Source handoff and item count gate'],
                ['title' => 'Transit route and delivery proof', 'description' => 'Stage 2 · Route and recipient handoff gate'],
            ],
            'A3' => [
                ['title' => 'Arrival check-in and safety triage', 'description' => 'Stage 1 · Location and safety gate'],
                ['title' => 'On-site service execution', 'description' => 'Stage 2 · Before and after evidence gate'],
                ['title' => 'Measurement and quality check', 'description' => 'Stage 3 · Instrument or checklist gate'],
                ['title' => 'Customer sign-off', 'description' => 'Stage 4 · Completion acknowledgement gate'],
            ],
            'A4' => [
                ['title' => 'Sourcing and package preparation', 'description' => 'Stage 1 · Receipt or dispatch gate'],
                ['title' => 'Handoff and recipient confirmation', 'description' => 'Stage 2 · Count and recipient gate'],
                ['title' => 'Condition close-out', 'description' => 'Stage 3 · Final package evidence gate'],
            ],
            'A9' => [
                ['title' => 'Draft artifact upload and scan', 'description' => 'Stage 1 · Checksum and scan gate'],
                ['title' => 'Client review and final acceptance', 'description' => 'Stage 2 · Signed acceptance gate'],
            ],
            default => [
                ['title' => 'Scope confirmation and intake', 'description' => 'Stage 1 · Scope and safety gate'],
                ['title' => 'Execution evidence', 'description' => 'Stage 2 · Required work proof gate'],
                ['title' => 'Handoff and sign-off', 'description' => 'Stage 3 · Completion acknowledgement gate'],
            ],
        };
    }

    private static function workCatalogCode(string $workShape): string
    {
        return match ($workShape) {
            'A1' => 'tagudin-local-service-a1',
            'A3' => 'tagudin-onsite-service-a3',
            'A4' => 'tagudin-product-handoff-a4',
            'A9' => 'tagudin-digital-delivery-a9',
            default => 'tagudin-local-service-a1',
        };
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{cover_thumbnail_url: string, has_video: bool, items: list<array<string, mixed>>}
     */
    private static function defaultMedia(array $row): array
    {
        $fixtureKey = (string) ($row['fixture_key'] ?? '');
        $categoryCode = (string) ($row['category_code'] ?? '');
        $photoUrl = match (true) {
            str_contains($fixtureKey, 'capacitor') => '/photos/ac-capacitor.jpg',
            str_contains($fixtureKey, 'ac-') => '/photos/ac-clean.jpg',
            str_contains($fixtureKey, 'safety-audit') => '/photos/req-electrician.jpg',
            $categoryCode === 'courier' => '/photos/courier.jpg',
            $categoryCode === 'local-food' => '/photos/bibingka.jpg',
            in_array($categoryCode, ['print-assist', 'greeting-cards'], true) => '/photos/greeting.jpg',
            default => '/photos/ac-clean.jpg',
        };

        return [
            'cover_thumbnail_url' => $photoUrl,
            'has_video' => false,
            'items' => [
                [
                    'id' => 'media-'.$fixtureKey.'-cover',
                    'kind' => 'photo',
                    'url' => $photoUrl,
                    'thumbnail_url' => $photoUrl,
                    'caption' => (string) ($row['title'] ?? 'Tagudin listing photo'),
                    'mime_type' => 'image/jpeg',
                    'is_cover' => true,
                ],
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

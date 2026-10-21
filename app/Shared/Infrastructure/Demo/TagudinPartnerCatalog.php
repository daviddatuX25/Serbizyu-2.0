<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Demo;

/**
 * Partner candidates and listing add-ons used by the seeded Tagudin supply.
 *
 * Candidate fees are PHP pesos in the UI contract; listing terms persist them
 * as integer centavos to keep money values explicit at the boundary.
 */
final class TagudinPartnerCatalog
{
    /**
     * @return list<array{
     *     id: string,
     *     role: 'courier'|'technician'|'store'|'auditor',
     *     name: string,
     *     sub: string,
     *     fee_amount_minor: int,
     *     category: string,
     *     icon: 'truck'|'labor'|'store'|'audit',
     *     listing_fixture_key: string|null
     * }>
     */
    public static function candidates(): array
    {
        return [
            [
                'id' => 'c-1',
                'role' => 'courier',
                'name' => 'Danny Express Motorcycle Pool',
                'sub' => 'Fast 15–25m · Insulated box · Centro & all barangays',
                'fee_amount_minor' => 3500,
                'category' => 'motorcycle',
                'icon' => 'truck',
                'listing_fixture_key' => 'active-tagudin-courier-01',
            ],
            [
                'id' => 'c-2',
                'role' => 'courier',
                'name' => 'Kuya Danny Tricycle Cargo',
                'sub' => 'Heavy / bulky cargo sidecar · All Tagudin',
                'fee_amount_minor' => 6000,
                'category' => 'tricycle',
                'icon' => 'truck',
                'listing_fixture_key' => null,
            ],
            [
                'id' => 'c-3',
                'role' => 'courier',
                'name' => 'Barangay Centro Bicycle Runner',
                'sub' => 'Local Poblacion Centro eco delivery',
                'fee_amount_minor' => 2500,
                'category' => 'bicycle',
                'icon' => 'truck',
                'listing_fixture_key' => null,
            ],
            [
                'id' => 't-1',
                'role' => 'technician',
                'name' => 'Kuya Ben Aircon Services',
                'sub' => 'Certified AC & refrigeration technician',
                'fee_amount_minor' => 25000,
                'category' => 'hvac',
                'icon' => 'labor',
                'listing_fixture_key' => 'active-tagudin-ac-install-01',
            ],
            [
                'id' => 't-2',
                'role' => 'technician',
                'name' => 'Mark Electrical & HVAC Services',
                'sub' => 'Licensed master electrician · Power isolation',
                'fee_amount_minor' => 28000,
                'category' => 'electrician',
                'icon' => 'labor',
                'listing_fixture_key' => null,
            ],
            [
                'id' => 't-3',
                'role' => 'technician',
                'name' => 'Tagudin Trade Repair Guild',
                'sub' => 'Multi-trade contractor team',
                'fee_amount_minor' => 22000,
                'category' => 'guild',
                'icon' => 'labor',
                'listing_fixture_key' => null,
            ],
            [
                'id' => 's-1',
                'role' => 'store',
                'name' => 'Tagudin Hardware & Supply Depot',
                'sub' => 'Direct counter lane · Genuine parts guarantee',
                'fee_amount_minor' => 18000,
                'category' => 'depot',
                'icon' => 'store',
                'listing_fixture_key' => 'active-tagudin-ac-capacitor-01',
            ],
            [
                'id' => 's-2',
                'role' => 'store',
                'name' => 'Centro Electrical & Aircon Depot',
                'sub' => 'Original OEM capacitors and chemical foam',
                'fee_amount_minor' => 19500,
                'category' => 'oem',
                'icon' => 'store',
                'listing_fixture_key' => null,
            ],
            [
                'id' => 'a-1',
                'role' => 'auditor',
                'name' => 'Safety Check (Master Electrician)',
                'sub' => 'Safety certificate & thermal load inspection',
                'fee_amount_minor' => 15000,
                'category' => 'electrician',
                'icon' => 'audit',
                'listing_fixture_key' => 'active-tagudin-safety-audit-01',
            ],
            [
                'id' => 'a-2',
                'role' => 'auditor',
                'name' => 'Tagudin Safety & Electrical Audit Guild',
                'sub' => 'Complete municipal electrical audit certificate',
                'fee_amount_minor' => 16000,
                'category' => 'guild',
                'icon' => 'audit',
                'listing_fixture_key' => null,
            ],
        ];
    }

    /**
     * @param  array{category_code: string, listing_type: 'service'|'product', fixture_key?: string|null, title?: string|null}  $listing
     * @return list<array<string, mixed>>
     */
    public static function addonsFor(array $listing): array
    {
        $category = (string) ($listing['category_code'] ?? 'local-services');
        $listingType = (string) ($listing['listing_type'] ?? 'service');
        $fixtureKey = (string) ($listing['fixture_key'] ?? '');
        $title = strtolower((string) ($listing['title'] ?? ''));

        // 1. Greeting Cards & Crafts
        if ($category === 'greeting-cards' || str_contains($title, 'card')) {
            return [
                [
                    'id' => 'addon-calligraphy-ribbon',
                    'code' => 'calligraphy_ribbon',
                    'title' => 'Calligraphy dedication ribbon',
                    'description' => 'Personalized handwritten names and decorative ribbon dedication.',
                    'price_amount_minor' => 3000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-parchment-upgrade',
                    'code' => 'parchment_upgrade',
                    'title' => 'Premium textured cotton parchment',
                    'description' => 'Heavyweight cotton watercolor paper upgrade with deckled edge.',
                    'price_amount_minor' => 4500,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-wax-seal',
                    'code' => 'wax_seal',
                    'title' => 'Hand-stamped custom wax seal',
                    'description' => 'Hand-poured beeswax seal with vintage kraft envelope.',
                    'price_amount_minor' => 2500,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-courier-delivery',
                    'code' => 'courier_delivery',
                    'title' => 'Doorstep courier transit',
                    'description' => 'Direct courier agreement for recipient delivery in Tagudin.',
                    'price_amount_minor' => 3500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 2. Garment / Alteration Repair
        if ($fixtureKey === 'active-tagudin-hem-fix-01' || str_contains($title, 'hem') || str_contains($title, 'button')) {
            return [
                [
                    'id' => 'addon-alteration-rush',
                    'code' => 'alteration_rush',
                    'title' => 'Express 1-hour walk-in rush',
                    'description' => 'Priority alteration queue for immediate walk-in completion.',
                    'price_amount_minor' => 4000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-denim-stitch',
                    'code' => 'denim_stitch',
                    'title' => 'Heavy denim & leather reinforcement stitch',
                    'description' => 'Reinforced heavy-duty nylon stitch for thick workwear fabrics.',
                    'price_amount_minor' => 5000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-button-set',
                    'code' => 'button_set',
                    'title' => 'Matching brass or horn replacement button set',
                    'description' => 'Complete matching set of durable replacement buttons.',
                    'price_amount_minor' => 3000,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-courier-delivery',
                    'code' => 'courier_delivery',
                    'title' => 'Doorstep pickup & return courier',
                    'description' => 'Rider picks up garment and returns when altered.',
                    'price_amount_minor' => 4500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 3. Print & Soft-copy Assist
        if ($category === 'print-assist') {
            return [
                [
                    'id' => 'addon-color-duplex',
                    'code' => 'color_duplex',
                    'title' => 'Double-sided full color upgrade',
                    'description' => 'Full color duplex print on 100gsm glossy bond paper.',
                    'price_amount_minor' => 6000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-lamination',
                    'code' => 'lamination',
                    'title' => 'Thermal lamination & precision trimming',
                    'description' => 'Hot thermal plastic lamination and precision corner rounding.',
                    'price_amount_minor' => 5000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-ocr-scan',
                    'code' => 'ocr_scan',
                    'title' => 'High-resolution OCR text extraction & PDF',
                    'description' => 'Searchable PDF and editable text transcription.',
                    'price_amount_minor' => 3000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-courier-delivery',
                    'code' => 'courier_delivery',
                    'title' => 'Direct courier delivery',
                    'description' => 'Direct delivery of bundled prints to store or office in Tagudin.',
                    'price_amount_minor' => 3500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 4. Local Food & Produce
        if ($category === 'local-food') {
            return [
                [
                    'id' => 'addon-extra-toppings',
                    'code' => 'extra_toppings',
                    'title' => 'Extra native salted egg & melted cheese',
                    'description' => 'Double layer of grated Eden cheese and native salted duck egg.',
                    'price_amount_minor' => 3500,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-latik-drizzle',
                    'code' => 'latik_drizzle',
                    'title' => 'Pure carabao butter latik drizzle',
                    'description' => 'Traditional slow-reduced coconut curd with carabao butter.',
                    'price_amount_minor' => 4000,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-thermal-delivery',
                    'code' => 'thermal_delivery',
                    'title' => 'Insulated thermal courier delivery',
                    'description' => 'Motorcycle rider with insulated thermal bag keeping food warm.',
                    'price_amount_minor' => 4500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 5. Courier & Padala Service
        if ($category === 'courier') {
            return [
                [
                    'id' => 'addon-insulated-box',
                    'code' => 'insulated_box',
                    'title' => 'Insulated thermal hot/cold box',
                    'description' => 'Thermal insulation for food, bakery, or temperature-sensitive parcels.',
                    'price_amount_minor' => 2000,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-heavy-parcel',
                    'code' => 'heavy_parcel',
                    'title' => 'Heavy parcel handling (10kg-30kg)',
                    'description' => 'Secure handling and transport for bulky or heavy items.',
                    'price_amount_minor' => 4000,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-rush-dispatch',
                    'code' => 'rush_dispatch',
                    'title' => 'Priority point-to-point dispatch',
                    'description' => 'Immediate direct departure without route batching.',
                    'price_amount_minor' => 3000,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 6. Local Services / Errand Runs
        if ($category === 'local-services' && str_contains($title, 'errand')) {
            return [
                [
                    'id' => 'addon-cargo-assist',
                    'code' => 'cargo_assist',
                    'title' => 'Heavy wet market crate assist (up to 25kg)',
                    'description' => 'Hauling and loading bulky produce bags and fish crates.',
                    'price_amount_minor' => 5000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-multistop',
                    'code' => 'multistop',
                    'title' => 'Multi-stop errand route',
                    'description' => 'Additional stop at pharmacy or hardware along national highway.',
                    'price_amount_minor' => 4000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-morning-rush',
                    'code' => 'morning_rush',
                    'title' => 'Early 6:00 AM fresh market rush',
                    'description' => 'Early morning market run before peak crowds.',
                    'price_amount_minor' => 3000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => [],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-courier-delivery',
                    'code' => 'courier_delivery',
                    'title' => 'Doorstep delivery to home gate',
                    'description' => 'Direct courier transit from market to recipient address.',
                    'price_amount_minor' => 3500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 7. Repairs / Technical Services (AC, Electrical, Hardware)
        if ($listingType === 'service' && in_array($category, ['repairs', 'local-services'], true)) {
            return [
                [
                    'id' => 'addon-turnkey-parts',
                    'code' => 'turnkey_parts',
                    'title' => 'Parts, courier, and labor relay',
                    'description' => 'Part sourcing and courier nodes are planned separately from the primary labor agreement.',
                    'price_amount_minor' => 21500,
                    'currency' => 'PHP',
                    'partner_role' => 'store',
                    'partner_fixture_keys' => ['active-tagudin-ac-capacitor-01', 'active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-safety-audit',
                    'code' => 'safety_audit',
                    'title' => 'Safety and quality certification',
                    'description' => 'Independent safety review after the primary service reaches its readiness gate.',
                    'price_amount_minor' => 6500,
                    'currency' => 'PHP',
                    'partner_role' => 'auditor',
                    'partner_fixture_keys' => ['active-tagudin-safety-audit-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-rush-priority',
                    'code' => 'rush_priority',
                    'title' => 'Rush priority scheduling',
                    'description' => 'Priority scheduling request for the independent provider agreement.',
                    'price_amount_minor' => 10000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => ['active-tagudin-ac-install-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-chemical-flush',
                    'code' => 'chemical_flush',
                    'title' => 'Anti-bacterial chemical flush',
                    'description' => 'Additional diagnostic and cleaning scope proposed for provider acceptance.',
                    'price_amount_minor' => 15000,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => ['active-tagudin-ac-install-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // 8. Product listings (Hardware / General)
        if ($listingType === 'product') {
            return [
                [
                    'id' => 'addon-courier-delivery',
                    'code' => 'courier_delivery',
                    'title' => 'Doorstep courier transit',
                    'description' => 'Independent courier agreement for source pickup and recipient handoff.',
                    'price_amount_minor' => 3500,
                    'currency' => 'PHP',
                    'partner_role' => 'courier',
                    'partner_fixture_keys' => ['active-tagudin-courier-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
                [
                    'id' => 'addon-product-install',
                    'code' => 'product_install',
                    'title' => 'Delivery plus installation',
                    'description' => 'Courier handoff followed by a separate installation provider agreement.',
                    'price_amount_minor' => 28500,
                    'currency' => 'PHP',
                    'partner_role' => 'technician',
                    'partner_fixture_keys' => ['active-tagudin-courier-01', 'active-tagudin-ac-install-01'],
                    'status' => 'available',
                    'settlement_mode' => 'independent_provider_agreement',
                ],
            ];
        }

        // Default fallback
        return [
            [
                'id' => 'addon-courier-delivery',
                'code' => 'courier_delivery',
                'title' => 'Doorstep courier transit',
                'description' => 'Independent courier agreement for source pickup and recipient handoff.',
                'price_amount_minor' => 3500,
                'currency' => 'PHP',
                'partner_role' => 'courier',
                'partner_fixture_keys' => ['active-tagudin-courier-01'],
                'status' => 'available',
                'settlement_mode' => 'independent_provider_agreement',
            ],
        ];
    }
}

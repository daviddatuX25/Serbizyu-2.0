<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Infrastructure\Demo\TagudinBrowseCatalog;
use App\Shared\Application\CapabilityCatalog;
use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\FixtureConstants;
use App\Shared\Contracts\FixtureManager;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use JsonException;

/**
 * Idempotent upsert of declarative Tagudin browse catalog rows into the real schema.
 */
final class SeedTagudinBrowseCatalog
{
    public function __construct(
        private readonly FixtureManager $fixtures,
        private readonly CapabilityCatalog $capabilities,
        private readonly StockLedgerService $stock,
    ) {}

    /**
     * @return array{seeded:int,fixture_keys:list<string>}
     *
     * @throws JsonException
     */
    public function handle(?string $correlationId = null): array
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return ['seeded' => 0, 'fixture_keys' => []];
        }

        $this->fixtures->ensure();

        if (! Schema::hasTable('listings') || ! Schema::hasTable('listing_versions')) {
            return ['seeded' => 0, 'fixture_keys' => []];
        }

        $now = now();
        $this->ensureDistinctPrincipals($now);

        $correlation = new CorrelationId($correlationId ?? (string) Str::uuid7());
        $seeded = 0;
        $keys = [];
        foreach (TagudinBrowseCatalog::listings() as $row) {
            $workShape = (string) $row['work_shape'];
            $capability = $this->capabilities->ensure(
                $row['category_code'],
                $row['listing_type'],
                $workShape,
                $correlation,
            );

            $geography = [
                'area_code' => 'Tagudin',
                'region_code' => '0100000000',
                'region_name' => 'Region I (Ilocos Region)',
                'province_code' => '0102900000',
                'province_name' => 'Ilocos Sur',
                'municipality_code' => '0102933000',
                'municipality_name' => 'Tagudin',
                'postal_code' => '2714',
                'barangay_code' => $row['barangay_code'] ?? '0102933037',
                'barangay_name' => $row['barangay_name'] ?? 'Poblacion',
                'stall_location' => $row['stall_location'] ?? null,
                'address_line_1' => $row['stall_location'] ?? ($row['barangay_name'] ?? 'Tagudin Centro'),
                'coordinates' => $row['coordinates'] ?? [
                    'lat' => 16.9388,
                    'lng' => 120.4439,
                    'source' => 'manual',
                ],
                'has_pinned_coordinates' => true,
                'service_radius_km' => 5.0,
            ];

            DB::table('listings')->upsert([[
                'id' => $row['listing_id'],
                'owner_user_id' => $row['owner_user_id'] ?? FixtureConstants::ACTIVE_OWNER_ID,
                'capability_profile_id' => $capability['capability_profile_id'],
                'category_id' => $capability['category_id'],
                'listing_type' => $row['listing_type'],
                'status' => 'active',
                'geography' => json_encode($geography, JSON_THROW_ON_ERROR),
                'current_version' => 1,
                'review_status' => 'approved',
                'version' => 1,
                'correlation_id' => $row['listing_id'],
                'archived_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], [
                'owner_user_id',
                'capability_profile_id',
                'category_id',
                'listing_type',
                'status',
                'geography',
                'current_version',
                'review_status',
                'updated_at',
            ]);

            $profile = DB::table('capability_profiles')->where('id', $capability['capability_profile_id'])->first();
            $versionRow = [
                'id' => $row['version_id'],
                'listing_id' => $row['listing_id'],
                'version_number' => 1,
                'description' => $row['description'],
                'terms' => json_encode([
                    'title' => $row['title'],
                    'category_code' => $row['category_code'],
                    'work_shape' => $row['work_shape'],
                    'work_catalog' => [
                        'code' => $row['work_catalog_code'],
                        'shape_contract_version' => 1,
                        'payload_schema_version' => 1,
                        'catalog_version' => 1,
                    ],
                    'scope' => $row['scope'],
                    'fixture_key' => $row['fixture_key'],
                    'evidence_class' => 'CAPSTONE',
                    'catalog_source' => $row['catalog_source'],
                    'package_tiers' => $row['package_tiers'],
                    'milestone_stages' => $row['milestone_stages'],
                    'addons' => $row['addons'],
                    'partner_candidates' => $row['partner_candidates'],
                    'media' => $row['media'] ?? null,
                    'geography' => $geography,
                    'stall_location' => $row['stall_location'] ?? null,
                    'variants' => $row['variants'] ?? [],
                ], JSON_THROW_ON_ERROR),
                'price_amount_minor' => $row['price_amount_minor'],
                'currency' => $row['currency'],
                'payment_lane_availability' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'availability_capacity_summary' => json_encode([
                    'summary' => $row['capacity_summary'],
                ], JSON_THROW_ON_ERROR),
                'safety_copy' => 'Agree scope and handoff details directly; Serbizyu holds no funds. Capstone fictional supply.',
                'effective_from' => $now,
                'effective_to' => null,
                'authored_by_user_id' => $row['owner_user_id'] ?? FixtureConstants::ACTIVE_OWNER_ID,
                'payload_version' => 1,
                'version' => 1,
                'correlation_id' => $row['listing_id'],
                'published_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $updateCols = [
                'authored_by_user_id',
                'description',
                'terms',
                'price_amount_minor',
                'currency',
                'payment_lane_availability',
                'availability_capacity_summary',
                'safety_copy',
                'published_at',
                'updated_at',
            ];
            if (Schema::hasColumn('listing_versions', 'category_id') && $profile !== null) {
                $versionRow['category_id'] = $capability['category_id'];
                $versionRow['category_business_version'] = 1;
                $versionRow['capability_profile_family_code'] = (string) $profile->profile_family_code;
                $versionRow['capability_profile_business_version'] = (int) $profile->business_version;
                $versionRow['row_version'] = 1;
                $updateCols = [
                    ...$updateCols,
                    'category_id',
                    'category_business_version',
                    'capability_profile_family_code',
                    'capability_profile_business_version',
                    'row_version',
                ];
            }

            DB::table('listing_versions')->upsert([$versionRow], ['id'], $updateCols);
            if ($row['listing_type'] === 'product' && is_array($row['variants'] ?? null)) {
                $this->stock->provisionVariants(
                    listingId: (string) $row['listing_id'],
                    listingVersionId: (string) $row['version_id'],
                    ownerUserId: $row['owner_user_id'] ?? FixtureConstants::ACTIVE_OWNER_ID,
                    variants: $row['variants'],
                    correlationId: (string) $row['listing_id'],
                );
            }

            $seeded++;
            $keys[] = $row['fixture_key'];
        }

        return ['seeded' => $seeded, 'fixture_keys' => $keys];
    }

    private function ensureDistinctPrincipals(\Carbon\CarbonInterface $now): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $principals = [
            [
                'id' => Fix::STORE_USER_ID,
                'phone_e164' => Fix::STORE_PHONE,
                'name' => 'Tagudin Hardware Supply',
                'bio' => 'Certified local hardware and replacement parts merchant.',
                'roles' => ['provide', 'merchant'],
            ],
            [
                'id' => Fix::COURIER_USER_ID,
                'phone_e164' => Fix::COURIER_PHONE,
                'name' => 'Danny Express Motorcycle Pool',
                'bio' => 'Verified on-demand motorcycle delivery runner pool.',
                'roles' => ['provide'],
            ],
            [
                'id' => Fix::TECH_USER_ID,
                'phone_e164' => Fix::TECH_PHONE,
                'name' => 'Kuya Ben Aircon Services',
                'bio' => 'Licensed master trade technician and AC refrigeration specialist.',
                'roles' => ['provide'],
            ],
            [
                'id' => Fix::LOLA_USER_ID,
                'phone_e164' => Fix::LOLA_PHONE,
                'name' => "Lola's Bibingka",
                'bio' => 'Authentic Tagudin rice cakes and traditional delicacies.',
                'roles' => ['provide', 'merchant'],
            ],
            [
                'id' => Fix::ANA_USER_ID,
                'phone_e164' => Fix::ANA_PHONE,
                'name' => "Ana's Bakery",
                'bio' => 'Fresh daily breads and pastries in Tagudin Centro.',
                'roles' => ['provide', 'merchant'],
            ],
            [
                'id' => Fix::JUAN_USER_ID,
                'phone_e164' => Fix::JUAN_PHONE,
                'name' => 'Juan Carpentry Works',
                'bio' => 'Custom wood furniture, cabinet repairs, and home woodwork.',
                'roles' => ['provide'],
            ],
            [
                'id' => Fix::JOSE_USER_ID,
                'phone_e164' => Fix::JOSE_PHONE,
                'name' => 'Mang Jose Electrical',
                'bio' => 'Certified residential wiring, breaker repairs, and lighting installation.',
                'roles' => ['provide'],
            ],
            [
                'id' => Fix::STAFF_USER_ID,
                'phone_e164' => Fix::STAFF_PHONE,
                'name' => 'Officer Santos',
                'bio' => 'L4 Municipal desk supervisor and operational staff.',
                'roles' => ['admin', 'operate'],
                'primary_access_tier' => 'L4',
            ],
            [
                'id' => Fix::CHECKER_STAFF_USER_ID,
                'phone_e164' => Fix::CHECKER_STAFF_PHONE,
                'name' => 'Cora Checker',
                'bio' => 'Municipal desk compliance checker.',
                'roles' => ['admin', 'operate'],
                'primary_access_tier' => 'L4',
            ],
            [
                'id' => Fix::CARLO_AGENT_USER_ID,
                'phone_e164' => Fix::CARLO_AGENT_PHONE,
                'name' => 'Carlo Agent',
                'bio' => 'Authorized representative assisting Tagudin Hardware operations.',
                'roles' => ['agent'],
                'primary_access_tier' => 'L1',
            ],
        ];

        foreach ($principals as $p) {
            $corr = (string) Str::uuid7();
            DB::table('users')->updateOrInsert(
                ['id' => $p['id']],
                [
                    'phone_e164' => $p['phone_e164'],
                    'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                    'status' => 'active',
                    'primary_access_tier' => $p['primary_access_tier'] ?? 'L1',
                    'locale' => 'fil',
                    'timezone' => 'Asia/Manila',
                    'version' => 1,
                    'correlation_id' => $corr,
                    'phone_verified_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            if (Schema::hasTable('user_profiles')) {
                DB::table('user_profiles')->updateOrInsert(
                    ['user_id' => $p['id']],
                    [
                        'display_name' => $p['name'],
                        'public_bio' => $p['bio'],
                        'service_area_display' => 'Tagudin Centro',
                        'accessibility_preferences' => json_encode(['low_data_mode' => false], JSON_THROW_ON_ERROR),
                        'language_preferences' => json_encode(['primary' => 'fil'], JSON_THROW_ON_ERROR),
                        'version' => 1,
                        'correlation_id' => $corr,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }

            if (Schema::hasTable('role_assignments')) {
                foreach ($p['roles'] as $role) {
                    DB::table('role_assignments')->updateOrInsert(
                        ['user_id' => $p['id'], 'role_code' => $role],
                        [
                            'id' => (string) Str::uuid7(),
                            'status' => 'active',
                            'granted_by_user_id' => $p['id'],
                            'effective_at' => $now,
                            'scope' => '{}',
                            'version' => 1,
                            'correlation_id' => (string) Str::uuid7(),
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]
                    );
                }
            }
        }
    }
}

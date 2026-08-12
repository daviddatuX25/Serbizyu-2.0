<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Infrastructure\Demo\TagudinBrowseCatalog;
use App\Shared\Application\CapabilityCatalog;
use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\FixtureConstants;
use App\Shared\Contracts\FixtureManager;
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
    ) {}

    /**
     * @return array{seeded:int,fixture_keys:list<string>}
     *
     * @throws JsonException
     */
    public function handle(?string $correlationId = null): array
    {
        $this->fixtures->ensure();

        if (! Schema::hasTable('listings') || ! Schema::hasTable('listing_versions')) {
            return ['seeded' => 0, 'fixture_keys' => []];
        }

        $correlation = new CorrelationId($correlationId ?? (string) Str::uuid7());
        $now = now();
        $seeded = 0;
        $keys = [];

        foreach (TagudinBrowseCatalog::listings() as $row) {
            $capability = $this->capabilities->ensure(
                $row['category_code'],
                $row['listing_type'],
                $correlation,
            );

            DB::table('listings')->upsert([[
                'id' => $row['listing_id'],
                'owner_user_id' => FixtureConstants::ACTIVE_OWNER_ID,
                'capability_profile_id' => $capability['capability_profile_id'],
                'category_id' => $capability['category_id'],
                'listing_type' => $row['listing_type'],
                'status' => 'active',
                'geography' => json_encode(['area_code' => 'Tagudin'], JSON_THROW_ON_ERROR),
                'current_version' => 1,
                'review_status' => 'approved',
                'version' => 1,
                'correlation_id' => $row['listing_id'],
                'archived_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], [
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
                    'scope' => $row['scope'],
                    'fixture_key' => $row['fixture_key'],
                    'evidence_class' => 'CAPSTONE',
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
                'authored_by_user_id' => FixtureConstants::ACTIVE_OWNER_ID,
                'payload_version' => 1,
                'version' => 1,
                'correlation_id' => $row['listing_id'],
                'published_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $updateCols = [
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

            $seeded++;
            $keys[] = $row['fixture_key'];
        }

        return ['seeded' => $seeded, 'fixture_keys' => $keys];
    }
}

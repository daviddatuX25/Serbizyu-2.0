<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure;

use App\Modules\IdentityAccess\Application\DemoFixtures;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class FixtureRepository
{
    public const PROVIDER_FIXTURE = 'provider-tagudin';

    public const ACTIVE_OWNER_FIXTURE = 'tagudin-active-provider';

    public const PROVIDER_ID = '0198a3b1-7c40-7abc-8def-1234567890ab';

    public const ACTIVE_OWNER_ID = '0198a3b1-7c40-7abc-8def-2234567890ab';

    public const CATEGORY_ID = '0198a3b1-7c40-7abc-8def-3234567890ab';

    public const SERVICE_PROFILE_ID = '0198a3b1-7c40-7abc-8def-4234567890ab';

    public const ACTIVE_LISTING_ID = '0198a3b1-7c40-7abc-8def-5234567890ab';

    public const ACTIVE_VERSION_ID = '0198a3b1-7c40-7abc-8def-6234567890ab';

    public function isAvailable(): bool
    {
        return Schema::hasTable('users') && Schema::hasTable('user_profiles') && Schema::hasTable('listings');
    }

    public function ensure(): void
    {
        if (! $this->isAvailable()) {
            return;
        }

        $now = now();
        $this->users()->upsert([
            [
                'id' => self::PROVIDER_ID,
                'phone_e164' => 'fixture:'.self::PROVIDER_FIXTURE,
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'en',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => self::PROVIDER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => self::ACTIVE_OWNER_ID,
                'phone_e164' => 'fixture:'.self::ACTIVE_OWNER_FIXTURE,
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'en',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => self::ACTIVE_OWNER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ], ['id'], ['phone_e164', 'status', 'primary_access_tier', 'locale', 'timezone', 'updated_at']);

        DB::table('user_profiles')->upsert([
            [
                'user_id' => self::PROVIDER_ID,
                'display_name' => 'Rosa Tagudin',
                'public_bio' => 'Fictional local-services provider for the capstone slice.',
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode(['low_data_mode' => false, 'help_preference' => 'self_managed'], JSON_THROW_ON_ERROR),
                'language_preferences' => json_encode(['primary' => 'fil'], JSON_THROW_ON_ERROR),
                'version' => 1,
                'correlation_id' => self::PROVIDER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'user_id' => self::ACTIVE_OWNER_ID,
                'display_name' => 'Maya Tagudin',
                'public_bio' => 'Fictional active Tagudin service provider.',
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode(['low_data_mode' => false], JSON_THROW_ON_ERROR),
                'language_preferences' => json_encode(['primary' => 'fil'], JSON_THROW_ON_ERROR),
                'version' => 1,
                'correlation_id' => self::ACTIVE_OWNER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ], ['user_id'], ['display_name', 'public_bio', 'service_area_display', 'accessibility_preferences', 'language_preferences', 'updated_at']);

        if (Schema::hasTable('categories')) {
            DB::table('categories')->upsert([[
                'id' => self::CATEGORY_ID,
                'parent_id' => null,
                'code' => 'local-services',
                'name' => 'Local services',
                'safety_class' => 'standard',
                'data_class' => 'public',
                'status' => 'active',
                'pilot_status' => 'approved',
                'metadata' => json_encode(['area' => 'Tagudin'], JSON_THROW_ON_ERROR),
                'metadata_version' => 1,
                'version' => 1,
                'correlation_id' => self::CATEGORY_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], ['name', 'status', 'pilot_status', 'metadata', 'updated_at']);
        }

        if (Schema::hasTable('category_versions')) {
            $existing = DB::table('category_versions')
                ->where('category_id', self::CATEGORY_ID)
                ->where('business_version', 1)
                ->first();
            if ($existing === null) {
                DB::table('category_versions')->insert([
                    'id' => '0198a3b1-7c40-7abc-8def-3234567890ac',
                    'category_id' => self::CATEGORY_ID,
                    'business_version' => 1,
                    'status' => 'published',
                    'name' => 'Local services',
                    'description' => null,
                    'safety_class' => 'standard',
                    'data_class' => 'public',
                    'policy_content' => json_encode(new \stdClass, JSON_THROW_ON_ERROR),
                    'content_schema_version' => 1,
                    'checksum' => hash('sha256', self::CATEGORY_ID.':Local services:1'),
                    'effective_at' => $now,
                    'published_at' => $now,
                    'paused_at' => null,
                    'retired_at' => null,
                    'created_by_user_id' => null,
                    'correlation_id' => self::CATEGORY_ID,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('category_versions')
                    ->where('id', $existing->id)
                    ->update([
                        'status' => 'published',
                        'name' => 'Local services',
                        'policy_content' => json_encode(new \stdClass, JSON_THROW_ON_ERROR),
                        'checksum' => hash('sha256', self::CATEGORY_ID.':Local services:1'),
                        'updated_at' => $now,
                    ]);
            }
        }
        $serviceProfileId = self::SERVICE_PROFILE_ID;
        if (Schema::hasTable('capability_profiles')) {
            $serviceProfileId = DB::transaction(function () use ($now): string {
                if (DB::connection()->getDriverName() === 'pgsql') {
                    DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['capability_profile_family:service_listing']);
                }

                $profiles = DB::table('capability_profiles')
                    ->where('profile_family_code', 'service_listing')
                    ->orderByDesc('business_version')
                    ->get();
                $active = $profiles->first(
                    static fn (object $profile): bool => (string) $profile->status === 'active',
                );
                $latest = $profiles->first();
                $historical = $profiles->first(
                    static fn (object $profile): bool => (int) $profile->business_version === 1,
                );

                if ($historical === null && $latest !== null && (int) $latest->business_version > 1) {
                    DB::table('capability_profiles')->insert([
                        'id' => self::SERVICE_PROFILE_ID,
                        'code' => 'service_listing',
                        'profile_family_code' => 'service_listing',
                        'listing_type' => 'service',
                        'mechanism' => 'listing',
                        'work_shape' => 'A1',
                        'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                        'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
                        'safety_class' => 'standard',
                        'data_class' => 'public',
                        'status' => 'retired',
                        'activation_record_reference' => 'capstone-fixture',
                        'version' => 1,
                        'business_version' => 1,
                        'content_schema_version' => 1,
                        'row_version' => 1,
                        'correlation_id' => self::SERVICE_PROFILE_ID,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                if ($active !== null) {
                    return (string) $active->id;
                }

                if ($latest === null) {
                    $serviceProfileId = self::SERVICE_PROFILE_ID;
                    DB::table('capability_profiles')->insert([
                        'id' => $serviceProfileId,
                        'code' => 'service_listing',
                        'profile_family_code' => 'service_listing',
                        'listing_type' => 'service',
                        'mechanism' => 'listing',
                        'work_shape' => 'A1',
                        'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                        'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
                        'safety_class' => 'standard',
                        'data_class' => 'public',
                        'status' => 'active',
                        'activation_record_reference' => 'capstone-fixture',
                        'version' => 1,
                        'business_version' => 1,
                        'content_schema_version' => 1,
                        'row_version' => 1,
                        'correlation_id' => $serviceProfileId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    return $serviceProfileId;
                }

                $serviceProfileId = (string) Str::uuid7();
                $version = ((int) $latest->version) + 1;
                $businessVersion = ((int) $latest->business_version) + 1;
                DB::table('capability_profiles')->insert([
                    'id' => $serviceProfileId,
                    'code' => 'service_listing',
                    'profile_family_code' => 'service_listing',
                    'listing_type' => 'service',
                    'mechanism' => 'listing',
                    'work_shape' => 'A1',
                    'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                    'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
                    'safety_class' => 'standard',
                    'data_class' => 'public',
                    'status' => 'active',
                    'activation_record_reference' => 'capstone-fixture',
                    'version' => $version,
                    'business_version' => $businessVersion,
                    'content_schema_version' => 1,
                    'row_version' => 1,
                    'correlation_id' => $serviceProfileId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return $serviceProfileId;
            });
        }

        if (Schema::hasTable('role_assignments')) {
            DB::table('role_assignments')->upsert([[
                'id' => '0198a3b1-7c40-7abc-8def-8234567890ab',
                'user_id' => self::ACTIVE_OWNER_ID,
                'role_code' => 'provide',
                'status' => 'active',
                'granted_by_user_id' => self::ACTIVE_OWNER_ID,
                'effective_at' => $now,
                'expires_at' => null,
                'scope' => json_encode(['source' => 'capstone_fixture', 'area' => 'Tagudin'], JSON_THROW_ON_ERROR),
                'version' => 1,
                'correlation_id' => self::ACTIVE_OWNER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], ['status', 'scope', 'updated_at']);
        }

        if (Schema::hasTable('identity_verifications')) {
            DB::table('identity_verifications')->upsert([[
                'id' => '0198a3b1-7c40-7abc-8def-9234567890ab',
                'user_id' => self::PROVIDER_ID,
                'verification_type' => 'provider_readiness_fixture',
                'status' => 'pending',
                'provider' => 'mock',
                'reviewed_by_user_id' => null,
                'evidence_file_id' => null,
                'reason' => 'Synthetic review state; no real identity evidence is collected.',
                'reviewed_at' => null,
                'retention_class' => 'capstone',
                'version' => 1,
                'correlation_id' => self::PROVIDER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ], [
                'id' => '0198a3b1-7c40-7abc-8def-a234567890ab',
                'user_id' => self::ACTIVE_OWNER_ID,
                'verification_type' => 'provider_readiness_fixture',
                'status' => 'approved',
                'provider' => 'mock',
                'reviewed_by_user_id' => null,
                'evidence_file_id' => null,
                'reason' => 'Synthetic pre-approved public fixture.',
                'reviewed_at' => $now,
                'retention_class' => 'capstone',
                'version' => 1,
                'correlation_id' => self::ACTIVE_OWNER_ID,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], ['status', 'reason', 'reviewed_at', 'updated_at']);
        }

        if (Schema::hasTable('listings') && Schema::hasTable('listing_versions') && Schema::hasTable('categories') && Schema::hasTable('capability_profiles')) {
            DB::table('listings')->upsert([[
                'id' => self::ACTIVE_LISTING_ID,
                'owner_user_id' => self::ACTIVE_OWNER_ID,
                'capability_profile_id' => $serviceProfileId,
                'category_id' => self::CATEGORY_ID,
                'listing_type' => 'service',
                'status' => 'active',
                'geography' => json_encode(['area_code' => 'Tagudin'], JSON_THROW_ON_ERROR),
                'current_version' => 1,
                'review_status' => 'approved',
                'version' => 1,
                'correlation_id' => self::ACTIVE_LISTING_ID,
                'archived_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['id'], ['capability_profile_id', 'status', 'review_status', 'updated_at']);

            $versionRow = [
                'id' => self::ACTIVE_VERSION_ID,
                'listing_id' => self::ACTIVE_LISTING_ID,
                'version_number' => 1,
                'description' => 'Reliable local help with errands and simple household tasks in Tagudin.',
                'terms' => json_encode(['title' => 'Tagudin local help', 'category_code' => 'local-services', 'work_shape' => 'A1', 'scope' => 'Fictional active public fixture', 'fixture_key' => 'active-tagudin-service-01', 'evidence_class' => 'CAPSTONE'], JSON_THROW_ON_ERROR),
                'price_amount_minor' => null,
                'currency' => null,
                'payment_lane_availability' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'availability_capacity_summary' => json_encode(['summary' => 'Availability confirmed for the fixture only'], JSON_THROW_ON_ERROR),
                'safety_copy' => 'Agree scope and handoff details directly; Serbizyu holds no funds.',
                'effective_from' => $now,
                'effective_to' => null,
                'authored_by_user_id' => self::ACTIVE_OWNER_ID,
                'payload_version' => 1,
                'version' => 1,
                'correlation_id' => self::ACTIVE_LISTING_ID,
                'published_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $versionUpdate = ['description', 'terms', 'published_at', 'updated_at'];

            if (Schema::hasColumn('listing_versions', 'category_id')) {
                $versionRow['category_id'] = self::CATEGORY_ID;
                $versionRow['category_business_version'] = 1;
                $versionRow['capability_profile_family_code'] = 'service_listing';
                $versionRow['capability_profile_business_version'] = 1;
                $versionRow['row_version'] = 1;
                $versionUpdate = [
                    ...$versionUpdate,
                    'category_id',
                    'category_business_version',
                    'capability_profile_family_code',
                    'capability_profile_business_version',
                    'row_version',
                ];
            }

            DB::table('listing_versions')->upsert([$versionRow], ['id'], $versionUpdate);
        }
    }

    public function userForFixture(string $fixtureIdentifier): ?object
    {
        if (! $this->isAvailable()) {
            return null;
        }

        $fixtureKey = match ($fixtureIdentifier) {
            DemoFixtures::PROVIDER_IDENTIFIER => self::PROVIDER_FIXTURE,
            DemoFixtures::BUYER_IDENTIFIER, DemoFixtures::ACTIVE_OWNER_IDENTIFIER => self::ACTIVE_OWNER_FIXTURE,
            default => $fixtureIdentifier,
        };

        return $this->users()->where('phone_e164', 'fixture:'.$fixtureKey)->where('status', 'active')->first();
    }

    public function user(string $id): ?object
    {
        if (! $this->isAvailable()) {
            return null;
        }

        return $this->users()->where('id', $id)->where('status', 'active')->first();
    }

    private function users(): Builder
    {
        return DB::table('users');
    }
}

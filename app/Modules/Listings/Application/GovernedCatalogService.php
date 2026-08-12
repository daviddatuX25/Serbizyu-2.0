<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Resolves and ensures published category / active capability business versions for listing pins.
 *
 * @phpstan-type CatalogPins array{
 *     category_id: string,
 *     category_business_version: int,
 *     capability_profile_id: string,
 *     capability_profile_family_code: string,
 *     capability_profile_business_version: int,
 *     code: string
 * }
 */
final class GovernedCatalogService
{
    /**
     * @return CatalogPins
     */
    public function ensurePublished(string $categoryCode, string $listingType, string $correlationId): array
    {
        $now = now();
        $categoryCode = trim($categoryCode);
        $listingType = trim($listingType);

        return DB::transaction(function () use ($categoryCode, $listingType, $correlationId, $now): array {
            $categoryId = $this->ensureCategory($categoryCode, $correlationId, $now);
            $categoryBusinessVersion = $this->ensurePublishedCategoryVersion($categoryId, $categoryCode, $correlationId, $now);
            $profile = $this->ensureActiveCapabilityProfile($categoryCode, $listingType, $correlationId, $now);

            return [
                'category_id' => $categoryId,
                'category_business_version' => $categoryBusinessVersion,
                'capability_profile_id' => $profile['id'],
                'capability_profile_family_code' => $profile['family'],
                'capability_profile_business_version' => $profile['business_version'],
                'code' => $profile['code'],
            ];
        });
    }

    /**
     * @return CatalogPins
     */
    public function resolvePublished(string $categoryCode, string $listingType, string $correlationId): array
    {
        $category = DB::table('categories')->where('code', $categoryCode)->where('status', 'active')->first();
        if ($category === null) {
            throw new ListingError(
                'CATEGORY_NOT_PUBLISHED',
                'That category is not available for listings yet.',
                $correlationId,
                status: 422,
                fieldErrors: ['category_code' => ['Choose a published category.']],
            );
        }

        $version = null;
        if (Schema::hasTable('category_versions')) {
            $version = DB::table('category_versions')
                ->where('category_id', $category->id)
                ->where('status', 'published')
                ->orderByDesc('business_version')
                ->first();
        }

        if ($version === null) {
            throw new ListingError(
                'CATEGORY_NOT_PUBLISHED',
                'That category is not available for listings yet.',
                $correlationId,
                status: 422,
                fieldErrors: ['category_code' => ['Choose a published category.']],
            );
        }

        $family = $listingType === 'service' ? 'service_listing' : 'product_listing';
        $profile = DB::table('capability_profiles')
            ->where('profile_family_code', $family)
            ->where('status', 'active')
            ->orderByDesc('business_version')
            ->first();

        if ($profile === null) {
            $profile = DB::table('capability_profiles')
                ->where('listing_type', $listingType)
                ->where('status', 'active')
                ->orderByDesc('business_version')
                ->first();
        }

        if ($profile === null) {
            throw new ListingError(
                'CATEGORY_NOT_PUBLISHED',
                'That listing type is not available yet.',
                $correlationId,
                status: 422,
                fieldErrors: ['listing_type' => ['Choose an active capability profile.']],
            );
        }

        return [
            'category_id' => (string) $category->id,
            'category_business_version' => (int) $version->business_version,
            'capability_profile_id' => (string) $profile->id,
            'capability_profile_family_code' => (string) $profile->profile_family_code,
            'capability_profile_business_version' => (int) $profile->business_version,
            'code' => (string) $profile->code,
        ];
    }

    private function ensureCategory(string $code, string $correlationId, mixed $now): string
    {
        $category = DB::table('categories')->where('code', $code)->first();
        if ($category !== null) {
            if ((string) $category->status !== 'active') {
                DB::table('categories')->where('id', $category->id)->update([
                    'status' => 'active',
                    'pilot_status' => 'approved',
                    'updated_at' => $now,
                ]);
            }

            return (string) $category->id;
        }

        $id = (string) Str::uuid7();
        DB::table('categories')->insert([
            'id' => $id,
            'parent_id' => null,
            'code' => $code,
            'name' => ucwords(str_replace(['-', '_'], ' ', $code)),
            'safety_class' => 'standard',
            'data_class' => 'public',
            'status' => 'active',
            'pilot_status' => 'approved',
            'metadata' => json_encode(['area' => 'Tagudin', 'evidence_class' => 'CAPSTONE'], JSON_THROW_ON_ERROR),
            'metadata_version' => 1,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }

    private function ensurePublishedCategoryVersion(string $categoryId, string $code, string $correlationId, mixed $now): int
    {
        if (! Schema::hasTable('category_versions')) {
            return 1;
        }

        $published = DB::table('category_versions')
            ->where('category_id', $categoryId)
            ->where('status', 'published')
            ->orderByDesc('business_version')
            ->first();

        if ($published !== null) {
            return (int) $published->business_version;
        }

        $name = ucwords(str_replace(['-', '_'], ' ', $code));
        $businessVersion = 1;
        $checksum = hash('sha256', $categoryId.':'.$name.':'.$businessVersion);

        DB::table('category_versions')->insert([
            'id' => (string) Str::uuid7(),
            'category_id' => $categoryId,
            'business_version' => $businessVersion,
            'status' => 'published',
            'name' => $name,
            'description' => null,
            'safety_class' => 'standard',
            'data_class' => 'public',
            'policy_content' => json_encode(new \stdClass, JSON_THROW_ON_ERROR),
            'content_schema_version' => 1,
            'checksum' => $checksum,
            'effective_at' => $now,
            'published_at' => $now,
            'paused_at' => null,
            'retired_at' => null,
            'created_by_user_id' => null,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $businessVersion;
    }

    /**
     * @return array{id: string, family: string, business_version: int, code: string}
     */
    private function ensureActiveCapabilityProfile(string $categoryCode, string $listingType, string $correlationId, mixed $now): array
    {
        $family = $listingType === 'service' ? 'service_listing' : 'product_listing';
        $code = $family;

        $profile = DB::table('capability_profiles')
            ->where('profile_family_code', $family)
            ->where('status', 'active')
            ->orderByDesc('business_version')
            ->first();

        if ($profile !== null) {
            return [
                'id' => (string) $profile->id,
                'family' => (string) $profile->profile_family_code,
                'business_version' => (int) $profile->business_version,
                'code' => (string) $profile->code,
            ];
        }

        // Prefer existing code-unique rows from older seed paths.
        $legacy = DB::table('capability_profiles')
            ->where('code', $code)
            ->where('status', 'active')
            ->first();

        if ($legacy !== null) {
            return [
                'id' => (string) $legacy->id,
                'family' => (string) ($legacy->profile_family_code ?? $code),
                'business_version' => (int) ($legacy->business_version ?? $legacy->version ?? 1),
                'code' => (string) $legacy->code,
            ];
        }

        $id = (string) Str::uuid7();
        DB::table('capability_profiles')->insert([
            'id' => $id,
            'code' => $code,
            'profile_family_code' => $family,
            'listing_type' => $listingType,
            'mechanism' => 'listing',
            'work_shape' => $listingType === 'service' ? 'local_service' : 'product_handoff',
            'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
            'safety_class' => 'standard',
            'data_class' => 'public',
            'status' => 'active',
            'activation_record_reference' => 't2-governed-catalog',
            'version' => 1,
            'business_version' => 1,
            'content_schema_version' => 1,
            'row_version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [
            'id' => $id,
            'family' => $family,
            'business_version' => 1,
            'code' => $code,
        ];
    }
}

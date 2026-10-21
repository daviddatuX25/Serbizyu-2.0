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
    public function ensurePublished(string $categoryCode, string $listingType, string $workShape, string $correlationId): array
    {
        $now = now();
        $categoryCode = trim($categoryCode);
        $listingType = trim($listingType);

        return DB::transaction(function () use ($categoryCode, $listingType, $workShape, $correlationId, $now): array {
            $categoryId = $this->ensureCategory($categoryCode, $correlationId, $now);
            $categoryBusinessVersion = $this->ensurePublishedCategoryVersion($categoryId, $categoryCode, $correlationId, $now);
            $profile = $this->ensureActiveCapabilityProfile($listingType, $workShape, $correlationId, $now);

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
    public function resolvePublished(string $categoryCode, string $listingType, string $correlationId, ?string $workShape = null): array
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

        $activeShapes = $this->activeWorkShapesFor($categoryCode, $listingType);
        $workShape ??= $activeShapes[0] ?? null;
        if ($workShape === null || ! in_array($workShape, $activeShapes, true)) {
            throw new ListingError(
                'CATEGORY_NOT_PUBLISHED',
                'That listing type is not available yet.',
                $correlationId,
                status: 422,
                fieldErrors: ['listing_type' => ['Choose an active capability profile.']],
            );
        }

        $profile = DB::table('capability_profiles')
            ->where('profile_family_code', $this->profileFamilyFor($listingType, $workShape))
            ->where('listing_type', $listingType)
            ->where('work_shape', $workShape)
            ->where('status', 'active')
            ->orderByDesc('business_version')
            ->first();

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

    /**
     * Resolve the active Work Shapes available for a published category and listing type.
     *
     * @return list<string>
     */
    public function activeWorkShapesFor(string $categoryCode, string $listingType): array
    {
        $category = DB::table('categories')
            ->where('code', trim($categoryCode))
            ->where('status', 'active')
            ->first();
        if ($category === null || ! Schema::hasTable('category_versions')) {
            return [];
        }

        $published = DB::table('category_versions')
            ->where('category_id', $category->id)
            ->where('status', 'published')
            ->exists();
        if (! $published) {
            return [];
        }

        $shapes = $this->supportedWorkShapes($listingType);

        return DB::table('capability_profiles')
            ->where('listing_type', $listingType)
            ->where('status', 'active')
            ->whereIn('profile_family_code', array_map(
                fn (string $shape): string => $this->profileFamilyFor($listingType, $shape),
                $shapes,
            ))
            ->whereIn('work_shape', $shapes)
            ->orderByRaw("CASE work_shape WHEN 'A1' THEN 1 WHEN 'A4' THEN 1 WHEN 'A3' THEN 2 WHEN 'A9' THEN 3 ELSE 4 END")
            ->pluck('work_shape')
            ->map(static fn (mixed $shape): string => (string) $shape)
            ->unique()
            ->values()
            ->all();
    }

    private function ensureCategory(string $code, string $correlationId, mixed $now): string
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['category_code:'.$code]);
        }

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
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['category_version:'.$categoryId]);
        }

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
    private function ensureActiveCapabilityProfile(string $listingType, string $workShape, string $correlationId, mixed $now): array
    {
        $family = $this->profileFamilyFor($listingType, $workShape);

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['capability_profile_family:'.$family]);
        }

        $profile = DB::table('capability_profiles')
            ->where('profile_family_code', $family)
            ->where('status', 'active')
            ->orderByDesc('business_version')
            ->first();

        if ($profile !== null && (string) $profile->work_shape === $workShape) {
            return [
                'id' => (string) $profile->id,
                'family' => (string) $profile->profile_family_code,
                'business_version' => (int) $profile->business_version,
                'code' => (string) $profile->code,
            ];
        }

        DB::table('capability_profiles')
            ->where('profile_family_code', $family)
            ->where('status', 'active')
            ->update([
                'status' => 'retired',
                'updated_at' => $now,
            ]);

        $latest = DB::table('capability_profiles')
            ->where('profile_family_code', $family)
            ->orderByDesc('business_version')
            ->first();
        $businessVersion = $latest === null ? 1 : ((int) $latest->business_version) + 1;
        $version = $latest === null ? 1 : ((int) $latest->version) + 1;
        $code = $family;
        $id = (string) Str::uuid7();
        DB::table('capability_profiles')->insert([
            'id' => $id,
            'code' => $code,
            'profile_family_code' => $family,
            'listing_type' => $listingType,
            'mechanism' => 'listing',
            'work_shape' => $workShape,
            'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
            'safety_class' => 'standard',
            'data_class' => 'public',
            'status' => 'active',
            'activation_record_reference' => 't2-governed-catalog',
            'version' => $version,
            'business_version' => $businessVersion,
            'content_schema_version' => 1,
            'row_version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [
            'id' => $id,
            'family' => $family,
            'business_version' => $businessVersion,
            'code' => $code,
        ];
    }

    private function profileFamilyFor(string $listingType, string $workShape): string
    {
        if (! in_array($workShape, $this->supportedWorkShapes($listingType), true)) {
            throw new \InvalidArgumentException('Unsupported Work shape for a governed capability profile.');
        }

        return match ([$listingType, $workShape]) {
            ['service', 'A1'] => 'service_listing',
            ['service', 'A3'] => 'service_listing_a3',
            ['service', 'A9'] => 'service_listing_a9',
            ['product', 'A4'] => 'product_listing',
            ['product', 'A9'] => 'product_listing_a9',
            default => throw new \InvalidArgumentException('Unsupported Work shape for a governed capability profile.'),
        };
    }

    /** @return list<string> */
    private function supportedWorkShapes(string $listingType): array
    {
        return match ($listingType) {
            'service' => ['A1', 'A3', 'A9'],
            'product' => ['A4', 'A9'],
            default => throw new \InvalidArgumentException('Unsupported listing type for a governed capability profile.'),
        };
    }
}

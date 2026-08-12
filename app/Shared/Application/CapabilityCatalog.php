<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class CapabilityCatalog
{
    /** @return array{category_id:string,capability_profile_id:string,code:string} */
    public function ensure(string $categoryCode, string $listingType, CorrelationId $correlationId): array
    {
        $category = DB::table('categories')->where('code', $categoryCode)->first();

        if ($category === null) {
            $categoryId = (string) Str::uuid7();
            DB::table('categories')->insert([
                'id' => $categoryId,
                'code' => $categoryCode,
                'name' => ucwords(str_replace(['-', '_'], ' ', $categoryCode)),
                'safety_class' => 'standard',
                'data_class' => 'public',
                'status' => 'active',
                'pilot_status' => 'approved',
                'metadata' => json_encode(['evidence_class' => 'CAPSTONE'], JSON_THROW_ON_ERROR),
                'metadata_version' => 1,
                'version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $categoryId = (string) $category->id;
        }

        if (Schema::hasTable('category_versions')) {
            $published = DB::table('category_versions')
                ->where('category_id', $categoryId)
                ->where('status', 'published')
                ->orderByDesc('business_version')
                ->first();
            if ($published === null) {
                $name = ucwords(str_replace(['-', '_'], ' ', $categoryCode));
                $now = now();
                DB::table('category_versions')->insert([
                    'id' => (string) Str::uuid7(),
                    'category_id' => $categoryId,
                    'business_version' => 1,
                    'status' => 'published',
                    'name' => $name,
                    'description' => null,
                    'safety_class' => 'standard',
                    'data_class' => 'public',
                    'policy_content' => json_encode(new \stdClass, JSON_THROW_ON_ERROR),
                    'content_schema_version' => 1,
                    'checksum' => hash('sha256', $categoryId.':'.$name.':1'),
                    'effective_at' => $now,
                    'published_at' => $now,
                    'paused_at' => null,
                    'retired_at' => null,
                    'created_by_user_id' => null,
                    'correlation_id' => (string) $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        $code = $listingType.':'.$categoryCode;
        $profile = DB::table('capability_profiles')
            ->where('code', $code)
            ->where('version', 1)
            ->first();

        if ($profile === null) {
            $profileId = (string) Str::uuid7();
            DB::table('capability_profiles')->insert([
                'id' => $profileId,
                'code' => $code,
                'profile_family_code' => $code,
                'listing_type' => $listingType,
                'mechanism' => 'direct',
                'work_shape' => 'request_based',
                'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'allowed_access_tiers' => json_encode(['L0', 'L1', 'L2', 'L3', 'L4'], JSON_THROW_ON_ERROR),
                'safety_class' => 'standard',
                'data_class' => 'public',
                'status' => 'active',
                'activation_record_reference' => 'capstone:first-connected-slice',
                'version' => 1,
                'business_version' => 1,
                'content_schema_version' => 1,
                'row_version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $profileId = (string) $profile->id;
        }

        return [
            'category_id' => $categoryId,
            'capability_profile_id' => $profileId,
            'code' => $code,
        ];
    }
}

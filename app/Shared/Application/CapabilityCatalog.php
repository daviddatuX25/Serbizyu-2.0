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
    public function ensure(string $categoryCode, string $listingType, string $workShape, CorrelationId $correlationId): array
    {
        $code = $listingType.':'.$categoryCode;
        if (! in_array($workShape, ['A1', 'A3', 'A4', 'A9'], true)) {
            throw new \InvalidArgumentException('Unsupported Work shape for a capability profile.');
        }

        return DB::transaction(function () use ($categoryCode, $listingType, $workShape, $correlationId, $code): array {
            if (DB::connection()->getDriverName() === 'pgsql') {
                DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['capability_profile_code:'.$code]);
            }

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

            $profiles = DB::table('capability_profiles')
                ->where('code', $code)
                ->orderByDesc('version')
                ->get();
            $profile = $profiles->first(
                static fn (object $candidate): bool => (string) $candidate->work_shape === $workShape
                    && (string) $candidate->status === 'active',
            );

            if ($profile !== null) {
                return [
                    'category_id' => $categoryId,
                    'capability_profile_id' => (string) $profile->id,
                    'code' => $code,
                ];
            }

            $legacyActive = $profiles->first(
                static fn (object $candidate): bool => (string) $candidate->status === 'active',
            );
            if ($legacyActive !== null) {
                DB::table('capability_profiles')
                    ->where('id', $legacyActive->id)
                    ->update([
                        'status' => 'retired',
                        'updated_at' => now(),
                    ]);
            }

            $latest = $profiles->first();
            $version = $latest === null ? 1 : ((int) $latest->version) + 1;
            $businessVersion = $latest === null
                ? 1
                : ((int) ($latest->business_version ?? $latest->version ?? 1)) + 1;
            $profileId = (string) Str::uuid7();
            DB::table('capability_profiles')->insert([
                'id' => $profileId,
                'code' => $code,
                'profile_family_code' => $code,
                'listing_type' => $listingType,
                'mechanism' => 'direct',
                'work_shape' => $workShape,
                'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'allowed_access_tiers' => json_encode(['L0', 'L1', 'L2', 'L3', 'L4'], JSON_THROW_ON_ERROR),
                'safety_class' => 'standard',
                'data_class' => 'public',
                'status' => 'active',
                'activation_record_reference' => 'capstone:first-connected-slice',
                'version' => $version,
                'business_version' => $businessVersion,
                'content_schema_version' => 1,
                'row_version' => 1,
                'correlation_id' => (string) $correlationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'category_id' => $categoryId,
                'capability_profile_id' => $profileId,
                'code' => $code,
            ];
        });
    }
}

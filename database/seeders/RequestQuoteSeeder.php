<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class RequestQuoteSeeder extends Seeder
{
    public const REQ_PLUMBING = '0198a3b1-7c40-7abc-8def-600000000001';
    public const REQ_BREAKER = '0198a3b1-7c40-7abc-8def-600000000002';
    public const REQ_LIGHTING_SEALED = '0198a3b1-7c40-7abc-8def-600000000003';
    public const REQ_COURIER_BULK = '0198a3b1-7c40-7abc-8def-600000000004';
    public const REQ_STORM_EXPIRED = '0198a3b1-7c40-7abc-8def-600000000005';
    public const REQ_AWARDED = '0198a3b1-7c40-7abc-8def-600000000006';

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return;
        }

        if (! Schema::hasTable('requests') || ! Schema::hasTable('quotes')) {
            return;
        }

        $now = CarbonImmutable::now();
        $repairsCat = DB::table('categories')->where('code', 'repairs')->value('id') ?? (string) Str::uuid7();
        $courierCat = DB::table('categories')->where('code', 'courier')->value('id') ?? (string) Str::uuid7();
        $buyerId = Fix::BUYER_USER_ID;

        // 1. REQ-6231: Plumbing joint inspection & repair (Quoted tender, multi-quote, counter-offer)
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_PLUMBING],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $repairsCat,
                'capability_profile_id' => null,
                'description' => 'Leaking copper pipe joint under bathroom sink in Centro. Urgent inspection and replacement needed.',
                'item_list' => json_encode(['Bathroom copper pipe joint', 'Pressure test'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 150000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'flexible', 'description' => 'Within 2 days'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Tagudin Centro', 'barangay' => 'Centro'], JSON_THROW_ON_ERROR),
                'status' => 'quoted',
                'expires_at' => $now->addDays(3),
                'privacy_preferences' => json_encode(['tender_mode' => 'open_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode(['require_phone_verified' => true], JSON_THROW_ON_ERROR),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::REQ_PLUMBING,
                'created_at' => $now->subDays(1),
                'updated_at' => $now,
            ]
        );

        // Quotes for REQ-6231
        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000001'],
            [
                'request_id' => self::REQ_PLUMBING,
                'listing_id' => null,
                'provider_user_id' => Fix::TECH_USER_ID,
                'quote_version' => 1,
                'amount_minor' => 120000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 100000, 'materials' => 20000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'Complete joint diagnosis, solder joint replacement, and leak test.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['Copper coupling', 'Lead-free solder', 'Pressure test'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode(['Main pipe line replacement'], JSON_THROW_ON_ERROR),
                'expires_at' => $now->addDays(2),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000001',
                'created_at' => $now->subHours(18),
                'updated_at' => $now->subHours(18),
            ]
        );

        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000002'],
            [
                'request_id' => self::REQ_PLUMBING,
                'listing_id' => null,
                'provider_user_id' => Fix::JUAN_USER_ID,
                'quote_version' => 2,
                'amount_minor' => 140000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 120000, 'materials' => 20000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'Same-day copper joint seal and protective cabinetry access.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['Joint seal', 'Access panel reset'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode([]),
                'expires_at' => $now->addDays(2),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'superseded',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000002',
                'created_at' => $now->subHours(16),
                'updated_at' => $now->subHours(12),
            ]
        );

        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000022'],
            [
                'request_id' => self::REQ_PLUMBING,
                'listing_id' => null,
                'provider_user_id' => Fix::JUAN_USER_ID,
                'quote_version' => 3,
                'amount_minor' => 110000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 95000, 'materials' => 15000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'Revised: buyer supplies copper pipe joint from Tagudin Hardware; labor and sealant only.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['Labor', 'Sealant', 'Pressure test'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode(['Pipe materials'], JSON_THROW_ON_ERROR),
                'expires_at' => $now->addDays(2),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000022',
                'created_at' => $now->subHours(10),
                'updated_at' => $now->subHours(10),
            ]
        );

        // 2. REQ-6232: Breaker Diagnostic & Emergency Checkup
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_BREAKER],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $repairsCat,
                'capability_profile_id' => null,
                'description' => 'Subpanel breaker trips repeatedly when rice cooker and water pump run together.',
                'item_list' => json_encode(['Panel inspection', 'Load calculation'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 50000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'urgent', 'description' => 'Today'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Barangay Rizal', 'barangay' => 'Rizal'], JSON_THROW_ON_ERROR),
                'status' => 'quoted',
                'expires_at' => $now->addDays(1),
                'privacy_preferences' => json_encode(['tender_mode' => 'open_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode(['require_phone_verified' => true], JSON_THROW_ON_ERROR),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::REQ_BREAKER,
                'created_at' => $now->subHours(6),
                'updated_at' => $now,
            ]
        );

        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000003'],
            [
                'request_id' => self::REQ_BREAKER,
                'listing_id' => null,
                'provider_user_id' => Fix::JOSE_USER_ID,
                'quote_version' => 1,
                'amount_minor' => 38000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 38000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'Complete residential load check and breaker thermal diagnostics.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['Clamp meter test', 'Terminal tightening'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode(['New breaker replacement parts'], JSON_THROW_ON_ERROR),
                'expires_at' => $now->addHours(24),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000003',
                'created_at' => $now->subHours(4),
                'updated_at' => $now->subHours(4),
            ]
        );

        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000004'],
            [
                'request_id' => self::REQ_BREAKER,
                'listing_id' => null,
                'provider_user_id' => Fix::TECH_USER_ID,
                'quote_version' => 2,
                'amount_minor' => 35000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 35000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'AC technician breaker isolation and circuit inspection.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['Isolation check', 'Multimeter verification'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode([]),
                'expires_at' => $now->addHours(24),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000004',
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subHours(3),
            ]
        );

        // 3. REQ-6233: Sealed tender for Heritage Plaza Lighting Installation
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_LIGHTING_SEALED],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $repairsCat,
                'capability_profile_id' => null,
                'description' => 'Decorative LED lighting installation for Del Pilar Heritage Plaza entrance arch.',
                'item_list' => json_encode(['Weatherproof conduit', 'LED strip fixtures', 'Timer switch'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 450000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'scheduled', 'description' => 'Next week'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Del Pilar Heritage Plaza', 'barangay' => 'Del Pilar'], JSON_THROW_ON_ERROR),
                'status' => 'published',
                'expires_at' => $now->addDays(5),
                'privacy_preferences' => json_encode(['tender_mode' => 'sealed_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode(['require_trade_license' => true], JSON_THROW_ON_ERROR),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::REQ_LIGHTING_SEALED,
                'created_at' => $now->subDays(1),
                'updated_at' => $now,
            ]
        );

        // 4. REQ-6234: Bulk Weekend Market Courier Service
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_COURIER_BULK],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $courierCat,
                'capability_profile_id' => null,
                'description' => 'Four-stop market delivery run between Bio Beach Studio, Rizal market stall, and Centro.',
                'item_list' => json_encode(['Craft boxes', 'Produce trays'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 25000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'scheduled', 'description' => 'Saturday 8:00 AM'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Tagudin Multiple Barangays', 'barangay' => 'Centro'], JSON_THROW_ON_ERROR),
                'status' => 'published',
                'expires_at' => $now->addDays(4),
                'privacy_preferences' => json_encode(['tender_mode' => 'open_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode(['require_motorcycle_box' => true], JSON_THROW_ON_ERROR),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::REQ_COURIER_BULK,
                'created_at' => $now->subHours(12),
                'updated_at' => $now,
            ]
        );

        // 5. REQ-6235: Expired Request
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_STORM_EXPIRED],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $repairsCat,
                'capability_profile_id' => null,
                'description' => 'Pre-storm window shutter reinforcement and roof sandbagging.',
                'item_list' => json_encode(['Plywood shutters', 'Sandbags'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 80000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'immediate', 'description' => 'Immediate storm prep'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Barangay Bio', 'barangay' => 'Bio'], JSON_THROW_ON_ERROR),
                'status' => 'expired',
                'expires_at' => $now->subDays(2),
                'privacy_preferences' => json_encode(['tender_mode' => 'open_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode([]),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::REQ_STORM_EXPIRED,
                'created_at' => $now->subDays(5),
                'updated_at' => $now->subDays(2),
            ]
        );

        // 6. REQ-6236: Awarded Request linked to an accepted Order
        DB::table('requests')->updateOrInsert(
            ['id' => self::REQ_AWARDED],
            [
                'requester_user_id' => $buyerId,
                'listing_id' => null,
                'category_id' => $repairsCat,
                'capability_profile_id' => null,
                'description' => 'AC compressor vibration dampener installation and rubber pad fitting.',
                'item_list' => json_encode(['Rubber dampener pads', 'Bracket leveling'], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => 45000,
                'budget_currency' => 'PHP',
                'timing' => json_encode(['type' => 'completed', 'description' => 'Completed'], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area' => 'Tagudin Centro', 'barangay' => 'Centro'], JSON_THROW_ON_ERROR),
                'status' => 'awarded',
                'expires_at' => $now->addDays(1),
                'privacy_preferences' => json_encode(['tender_mode' => 'open_tender'], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode([]),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => self::REQ_AWARDED,
                'created_at' => $now->subDays(3),
                'updated_at' => $now->subDays(1),
            ]
        );

        DB::table('quotes')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-610000000006'],
            [
                'request_id' => self::REQ_AWARDED,
                'listing_id' => null,
                'provider_user_id' => Fix::TECH_USER_ID,
                'quote_version' => 1,
                'amount_minor' => 45000,
                'currency' => 'PHP',
                'amount_components' => json_encode(['labor' => 35000, 'materials' => 10000], JSON_THROW_ON_ERROR),
                'scope' => json_encode(['summary' => 'Vibration dampener pad installation and motor mount alignment.'], JSON_THROW_ON_ERROR),
                'inclusions' => json_encode(['High density rubber pads', 'Anti-vibration bolts'], JSON_THROW_ON_ERROR),
                'exclusions' => json_encode([]),
                'expires_at' => $now->addDays(1),
                'work_shape' => 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'accepted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => '0198a3b1-7c40-7abc-8def-610000000006',
                'created_at' => $now->subDays(2),
                'updated_at' => $now->subDays(1),
            ]
        );
    }
}

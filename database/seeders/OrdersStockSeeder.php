<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class OrdersStockSeeder extends Seeder
{
    public const CAPACITY_HOLCIM = '0198a3b1-7c40-7abc-8def-ca9000000001';
    public const RES_HOLCIM_HELD = '0198a3b1-7c40-7abc-8def-ca9100000001';
    public const RES_HOLCIM_COMMITTED = '0198a3b1-7c40-7abc-8def-ca9100000002';
    public const ORDER_HOLCIM_HELD = '0198a3b1-7c40-7abc-8def-0ede00000722';
    public const ORDER_HOLCIM_COMMITTED = '0198a3b1-7c40-7abc-8def-0ede00000712';

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return;
        }

        if (! Schema::hasTable('listing_capacity') || ! Schema::hasTable('stock_movements')) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        $storeId = Fix::STORE_USER_ID;
        $buyerId = Fix::BUYER_USER_ID;
        $listingId = Fix::LISTING_HOLCIM_CEMENT;
        $versionId = Fix::LISTING_VERSION_HOLCIM_CEMENT;

        // 1. Ensure Capacity Bucket for Holcim 40kg
        $existingBucket = DB::table('listing_capacity')
            ->where('listing_id', $listingId)
            ->where('resource_key', 'var-holcim-40kg')
            ->first();
        $capacityId = $existingBucket ? (string) $existingBucket->id : self::CAPACITY_HOLCIM;

        DB::table('listing_capacity')->updateOrInsert(
            ['id' => $capacityId],
            [
                'listing_id' => $listingId,
                'listing_version_id' => $versionId,
                'capacity_type' => 'quantity',
                'quantity' => 20,
                'remaining_quantity' => 11,
                'slot_start' => null,
                'slot_end' => null,
                'reservation_status' => 'open',
                'version' => 3,
                'row_version' => 5,
                'stock_policy' => 'tracked',
                'availability_status' => 'open',
                'low_stock_threshold' => 5,
                'resource_key' => 'var-holcim-40kg',
                'correlation_id' => $capacityId,
                'created_at' => $now->subDays(7),
                'updated_at' => $now,
            ]
        );

        // 2. Orders for Holcim Cement
        // Order ORD-2722 (4 bags requested, held)
        $snap722 = '0198a3b1-7c40-7abc-8def-0e7e00000722';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap722],
            [
                'order_id' => self::ORDER_HOLCIM_HELD,
                'snapshot_version' => 1,
                'source_listing_version_id' => $versionId,
                'source_quote_id' => null,
                'scope' => json_encode(['title' => '4x Holcim Excel 40kg Cement', 'quantity' => 4, 'amount_minor' => 114000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 114000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $storeId,
                'accepted_at' => $now->subHours(5),
                'correlation_id' => self::ORDER_HOLCIM_HELD,
                'created_at' => $now->subHours(5),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_HOLCIM_HELD],
            [
                'public_reference' => 'ORD-2722',
                'current_terms_snapshot_id' => $snap722,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $storeId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::ORDER_HOLCIM_HELD,
                'created_at' => $now->subHours(5),
                'updated_at' => $now->subHours(5),
            ]
        );

        $snap712 = '0198a3b1-7c40-7abc-8def-0e7e00000712';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap712],
            [
                'order_id' => self::ORDER_HOLCIM_COMMITTED,
                'snapshot_version' => 1,
                'source_listing_version_id' => $versionId,
                'source_quote_id' => null,
                'scope' => json_encode(['title' => '5x Holcim Excel 40kg Cement', 'quantity' => 5, 'amount_minor' => 142500], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 142500,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $storeId,
                'accepted_at' => $now->subHours(8),
                'correlation_id' => self::ORDER_HOLCIM_COMMITTED,
                'created_at' => $now->subHours(8),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_HOLCIM_COMMITTED],
            [
                'public_reference' => 'ORD-2712',
                'current_terms_snapshot_id' => $snap712,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $storeId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => self::ORDER_HOLCIM_COMMITTED,
                'created_at' => $now->subHours(8),
                'updated_at' => $now->subHours(2),
            ]
        );

        // 3. Reservations on Holcim Bucket
        // 4 held on ORD-2722
        DB::table('listing_capacity_reservations')->updateOrInsert(
            ['id' => self::RES_HOLCIM_HELD],
            [
                'listing_capacity_id' => $capacityId,
                'listing_version_id' => $versionId,
                'order_id' => self::ORDER_HOLCIM_HELD,
                'source_mechanism' => 'order',
                'source_reference_id' => self::ORDER_HOLCIM_HELD,
                'quantity' => 4,
                'status' => 'held',
                'command_scope' => json_encode(['order_ref' => 'ORD-2722'], JSON_THROW_ON_ERROR),
                'idempotency_key' => 'res-holcim-held-4',
                'row_version' => 1,
                'expires_at' => $now->addDays(2),
                'committed_at' => null,
                'released_at' => null,
                'fulfilled_quantity' => 0,
                'released_quantity' => 0,
                'fulfilled_at' => null,
                'actor_user_id' => $buyerId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'correlation_id' => self::RES_HOLCIM_HELD,
                'created_at' => $now->subHours(5),
                'updated_at' => $now->subHours(5),
            ]
        );

        // 5 committed on ORD-2712
        DB::table('listing_capacity_reservations')->updateOrInsert(
            ['id' => self::RES_HOLCIM_COMMITTED],
            [
                'listing_capacity_id' => $capacityId,
                'listing_version_id' => $versionId,
                'order_id' => self::ORDER_HOLCIM_COMMITTED,
                'source_mechanism' => 'order',
                'source_reference_id' => self::ORDER_HOLCIM_COMMITTED,
                'quantity' => 5,
                'status' => 'committed',
                'command_scope' => json_encode(['order_ref' => 'ORD-2712'], JSON_THROW_ON_ERROR),
                'idempotency_key' => 'res-holcim-committed-5',
                'row_version' => 2,
                'expires_at' => null,
                'committed_at' => $now->subHours(2),
                'released_at' => null,
                'fulfilled_quantity' => 0,
                'released_quantity' => 0,
                'fulfilled_at' => null,
                'actor_user_id' => $buyerId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'correlation_id' => self::RES_HOLCIM_COMMITTED,
                'created_at' => $now->subHours(8),
                'updated_at' => $now->subHours(2),
            ]
        );

        // 4. Stock Movement History for Holcim 40kg
        $movements = [
            [
                'id' => '0198a3b1-7c40-7abc-8def-ca9200000001',
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $versionId,
                'reservation_id' => null,
                'order_id' => null,
                'movement_type' => 'receiving',
                'delta_on_hand' => 20,
                'delta_held' => 0,
                'delta_committed' => 0,
                'balance_on_hand' => 20,
                'balance_held' => 0,
                'balance_committed' => 0,
                'balance_available' => 20,
                'counted_quantity' => null,
                'reason' => 'Supplier delivery batch RCV-040 from Holcim La Union warehouse.',
                'reference' => 'RCV-040',
                'evidence_file_id' => null,
                'actor_user_id' => $storeId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'command_scope' => null,
                'idempotency_key' => 'mov-rcv-040',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ca9200000001',
                'occurred_at' => $now->subDays(7),
                'created_at' => $now->subDays(7),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ca9200000002',
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $versionId,
                'reservation_id' => self::RES_HOLCIM_COMMITTED,
                'order_id' => self::ORDER_HOLCIM_COMMITTED,
                'movement_type' => 'commit',
                'delta_on_hand' => 0,
                'delta_held' => 0,
                'delta_committed' => 5,
                'balance_on_hand' => 20,
                'balance_held' => 0,
                'balance_committed' => 5,
                'balance_available' => 15,
                'counted_quantity' => null,
                'reason' => 'Committed stock for Order ORD-2712.',
                'reference' => 'ORD-2712',
                'evidence_file_id' => null,
                'actor_user_id' => $buyerId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'command_scope' => null,
                'idempotency_key' => 'mov-ord-2712-commit',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ca9200000002',
                'occurred_at' => $now->subHours(8),
                'created_at' => $now->subHours(8),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ca9200000003',
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $versionId,
                'reservation_id' => self::RES_HOLCIM_HELD,
                'order_id' => self::ORDER_HOLCIM_HELD,
                'movement_type' => 'hold',
                'delta_on_hand' => 0,
                'delta_held' => 4,
                'delta_committed' => 0,
                'balance_on_hand' => 20,
                'balance_held' => 4,
                'balance_committed' => 5,
                'balance_available' => 11,
                'counted_quantity' => null,
                'reason' => 'Reservation hold for Order ORD-2722.',
                'reference' => 'ORD-2722',
                'evidence_file_id' => null,
                'actor_user_id' => $buyerId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'command_scope' => null,
                'idempotency_key' => 'mov-ord-2722-hold',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ca9200000003',
                'occurred_at' => $now->subHours(5),
                'created_at' => $now->subHours(5),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ca9200000004',
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $versionId,
                'reservation_id' => null,
                'order_id' => null,
                'movement_type' => 'damaged',
                'delta_on_hand' => 0,
                'delta_held' => 0,
                'delta_committed' => 0,
                'balance_on_hand' => 20,
                'balance_held' => 4,
                'balance_committed' => 5,
                'balance_available' => 11,
                'counted_quantity' => null,
                'reason' => 'Torn sack inspection and dry salvage recount (ADJ-008).',
                'reference' => 'ADJ-008',
                'evidence_file_id' => null,
                'actor_user_id' => $storeId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'command_scope' => null,
                'idempotency_key' => 'mov-adj-008',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ca9200000004',
                'occurred_at' => $now->subHours(3),
                'created_at' => $now->subHours(3),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ca9200000005',
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $versionId,
                'reservation_id' => null,
                'order_id' => null,
                'movement_type' => 'recount',
                'delta_on_hand' => 0,
                'delta_held' => 0,
                'delta_committed' => 0,
                'balance_on_hand' => 20,
                'balance_held' => 4,
                'balance_committed' => 5,
                'balance_available' => 11,
                'counted_quantity' => 20,
                'reason' => 'Weekly inventory audit verified by Tagudin Hardware counter staff (INV-TH-204).',
                'reference' => 'INV-TH-204',
                'evidence_file_id' => null,
                'actor_user_id' => $storeId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => null,
                'command_scope' => null,
                'idempotency_key' => 'mov-inv-th-204',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ca9200000005',
                'occurred_at' => $now->subHours(1),
                'created_at' => $now->subHours(1),
            ],
        ];
        foreach ($movements as $m) {
            if (! DB::table('stock_movements')->where('id', $m['id'])->exists()) {
                DB::table('stock_movements')->insert($m);
            }
        }
    }
}

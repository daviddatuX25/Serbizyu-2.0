<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class PaymentObligationScenarioSeeder extends Seeder
{
    public const ORDER_PART = Fix::ORDER_ID_PART;
    public const ORDER_TRANSIT = Fix::ORDER_ID_TRANSIT;
    public const ORDER_LABOR = Fix::ORDER_ID_LABOR;

    public const OBL_PART = '0198a3b1-7c40-7abc-8def-0b1000001041';
    public const OBL_TRANSIT = '0198a3b1-7c40-7abc-8def-0b1000001042';
    public const OBL_LABOR = '0198a3b1-7c40-7abc-8def-0b1000001048';

    public const ORDER_MISMATCH = '0198a3b1-7c40-7abc-8def-0ede00000731';
    public const OBL_MISMATCH = '0198a3b1-7c40-7abc-8def-0b1000001088';
    public const CASE_MISMATCH = '0198a3b1-7c40-7abc-8def-ca5e00000413';
    public const DISPUTE_MISMATCH = '0198a3b1-7c40-7abc-8def-d15900000413';
    public const HOLD_MISMATCH = '0198a3b1-7c40-7abc-8def-f01d00000413';

    public const ORDER_P2P = '0198a3b1-7c40-7abc-8def-0ede00000772';
    public const OBL_P2P = '0198a3b1-7c40-7abc-8def-0b1000000772';
    public const EVIDENCE_P2P = '0198a3b1-7c40-7abc-8def-ea1d00000772';

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return;
        }

        if (! Schema::hasTable('payment_obligations') || ! Schema::hasTable('orders')) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        $buyerId = Fix::BUYER_USER_ID;
        $storeId = Fix::STORE_USER_ID;
        $courierId = Fix::COURIER_USER_ID;
        $techId = Fix::TECH_USER_ID;
        $anaId = Fix::ANA_USER_ID;
        $staffId = Fix::STAFF_USER_ID;

        // 1. Canonical Cool Again chain: ORD-2710/2711/2714 + OBL-1041/1042/1048
        // Update parent deal chain title to "Cool Again"
        DB::table('deal_chains')->where('id', Fix::CHAIN_ID_ONGOING)->update([
            'title' => 'Cool Again',
            'updated_at' => $now,
        ]);

        // ORD-2710 / OBL-1041: ₱180 settled cash (Tagudin Hardware, 35µF capacitor, completed)
        DB::table('orders')->where('id', self::ORDER_PART)->update([
            'public_reference' => 'ORD-2710',
            'status' => 'completed',
            'updated_at' => $now->subHours(1),
        ]);
        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => self::ORDER_PART],
            [
                'id' => self::OBL_PART,
                'public_reference' => 'OBL-1041',
                'purpose' => 'primary_consideration',
                'amount_minor' => 18000,
                'currency' => 'PHP',
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $storeId,
                'lane' => 'external_cash',
                'status' => 'settled',
                'due_condition' => 'on_work_acceptance',
                'due_at' => $now->subHours(2),
                'settled_at' => $now->subHours(1),
                'version' => 3,
                'correlation_id' => self::OBL_PART,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subHours(1),
            ]
        );

        if (Schema::hasTable('payment_events')) {
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0100001041'],
                [
                    'payment_obligation_id' => self::OBL_PART,
                    'event_type' => 'payment.cash.reported',
                    'lane' => 'external_cash',
                    'amount_minor' => 18000,
                    'currency' => 'PHP',
                    'actor_user_id' => $buyerId,
                    'previous_status' => 'due',
                    'new_status' => 'payer_reported_cash',
                    'idempotency_key' => 'pe-cash-reported-1041',
                    'correlation_id' => self::OBL_PART,
                    'occurred_at' => $now->subHours(1)->subMinutes(5),
                    'effective_at' => $now->subHours(1)->subMinutes(5),
                    'created_at' => $now->subHours(1)->subMinutes(5),
                ]
            );
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0200001041'],
                [
                    'payment_obligation_id' => self::OBL_PART,
                    'event_type' => 'payment.cash.receipt_acknowledged',
                    'lane' => 'external_cash',
                    'amount_minor' => 18000,
                    'currency' => 'PHP',
                    'actor_user_id' => $storeId,
                    'previous_status' => 'payer_reported_cash',
                    'new_status' => 'settled',
                    'idempotency_key' => 'pe-cash-ack-1041',
                    'correlation_id' => self::OBL_PART,
                    'occurred_at' => $now->subHours(1),
                    'effective_at' => $now->subHours(1),
                    'created_at' => $now->subHours(1),
                ]
            );
        }

        // ORD-2711 / OBL-1042: ₱80 settled cash (Danny Express, delivery, completed)
        DB::table('orders')->where('id', self::ORDER_TRANSIT)->update([
            'public_reference' => 'ORD-2711',
            'status' => 'completed',
            'updated_at' => $now->subMinutes(30),
        ]);
        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => self::ORDER_TRANSIT],
            [
                'id' => self::OBL_TRANSIT,
                'public_reference' => 'OBL-1042',
                'purpose' => 'primary_consideration',
                'amount_minor' => 8000,
                'currency' => 'PHP',
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $courierId,
                'lane' => 'external_cash',
                'status' => 'settled',
                'due_condition' => 'on_work_acceptance',
                'due_at' => $now->subHours(1),
                'settled_at' => $now->subMinutes(30),
                'version' => 3,
                'correlation_id' => self::OBL_TRANSIT,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subMinutes(30),
            ]
        );

        if (Schema::hasTable('payment_events')) {
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0100001042'],
                [
                    'payment_obligation_id' => self::OBL_TRANSIT,
                    'event_type' => 'payment.cash.receipt_acknowledged',
                    'lane' => 'external_cash',
                    'amount_minor' => 8000,
                    'currency' => 'PHP',
                    'actor_user_id' => $courierId,
                    'previous_status' => 'due',
                    'new_status' => 'settled',
                    'idempotency_key' => 'pe-cash-ack-1042',
                    'correlation_id' => self::OBL_TRANSIT,
                    'occurred_at' => $now->subMinutes(30),
                    'effective_at' => $now->subMinutes(30),
                    'created_at' => $now->subMinutes(30),
                ]
            );
        }

        // ORD-2714 / OBL-1048: ₱850 not_due awaiting sign-off (Kuya Ben, fit + test)
        DB::table('orders')->where('id', self::ORDER_LABOR)->update([
            'public_reference' => 'ORD-2714',
            'status' => 'accepted',
            'updated_at' => $now->subMinutes(25),
        ]);
        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => self::ORDER_LABOR],
            [
                'id' => self::OBL_LABOR,
                'public_reference' => 'OBL-1048',
                'purpose' => 'primary_consideration',
                'amount_minor' => 85000,
                'currency' => 'PHP',
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $techId,
                'lane' => 'external_cash',
                'status' => 'not_due',
                'due_condition' => 'on_work_acceptance',
                'due_at' => null,
                'settled_at' => null,
                'version' => 1,
                'correlation_id' => self::OBL_LABOR,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subMinutes(25),
            ]
        );

        // 2. Scenario 2: ORD-2731 / OBL-1088 (₱650 vs ₱500 cash mismatch + CASE-0413 + hold)
        $snap731 = '0198a3b1-7c40-7abc-8def-0e7e00000731';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap731],
            [
                'order_id' => self::ORDER_MISMATCH,
                'snapshot_version' => 1,
                'source_listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'source_quote_id' => null,
                'scope' => json_encode(['title' => 'Inverter Split AC Deep Clean & Checkup', 'quantity' => 1, 'amount_minor' => 65000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 65000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $techId,
                'accepted_at' => $now->subDays(1),
                'correlation_id' => self::ORDER_MISMATCH,
                'created_at' => $now->subDays(1),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_MISMATCH],
            [
                'public_reference' => 'ORD-2731',
                'current_terms_snapshot_id' => $snap731,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $techId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => self::ORDER_MISMATCH,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subHours(2),
            ]
        );

        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => self::ORDER_MISMATCH],
            [
                'id' => self::OBL_MISMATCH,
                'public_reference' => 'OBL-1088',
                'purpose' => 'primary_consideration',
                'amount_minor' => 65000,
                'currency' => 'PHP',
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $techId,
                'lane' => 'external_cash',
                'status' => 'disputed_mismatch',
                'due_condition' => 'on_work_acceptance',
                'due_at' => $now->subHours(4),
                'settled_at' => null,
                'version' => 3,
                'correlation_id' => self::OBL_MISMATCH,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subHours(2),
            ]
        );

        if (Schema::hasTable('payment_events')) {
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0100001088'],
                [
                    'payment_obligation_id' => self::OBL_MISMATCH,
                    'event_type' => 'payment.cash.reported',
                    'lane' => 'external_cash',
                    'amount_minor' => 65000,
                    'currency' => 'PHP',
                    'actor_user_id' => $buyerId,
                    'previous_status' => 'due',
                    'new_status' => 'payer_reported_cash',
                    'idempotency_key' => 'pe-cash-reported-1088',
                    'correlation_id' => self::OBL_MISMATCH,
                    'occurred_at' => $now->subHours(3),
                    'effective_at' => $now->subHours(3),
                    'created_at' => $now->subHours(3),
                ]
            );
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0200001088'],
                [
                    'payment_obligation_id' => self::OBL_MISMATCH,
                    'event_type' => 'payment.cash.mismatch_flagged',
                    'lane' => 'external_cash',
                    'amount_minor' => 50000,
                    'currency' => 'PHP',
                    'actor_user_id' => $techId,
                    'previous_status' => 'payer_reported_cash',
                    'new_status' => 'disputed_mismatch',
                    'idempotency_key' => 'pe-cash-mismatch-1088',
                    'correlation_id' => self::OBL_MISMATCH,
                    'occurred_at' => $now->subHours(2),
                    'effective_at' => $now->subHours(2),
                    'created_at' => $now->subHours(2),
                ]
            );
        }

        // Case CASE-0413
        DB::table('support_cases')->updateOrInsert(
            ['id' => self::CASE_MISMATCH],
            [
                'public_reference' => 'CASE-0413',
                'reporter_user_id' => $buyerId,
                'requester_user_id' => $buyerId,
                'category' => 'payment_mismatch_cash',
                'severity' => 'medium',
                'order_id' => self::ORDER_MISMATCH,
                'work_instance_id' => null,
                'payment_obligation_id' => self::OBL_MISMATCH,
                'status' => 'open',
                'owner_user_id' => $staffId,
                'resolution' => null,
                'opened_at' => $now->subHours(2),
                'opened_by_user_id' => $buyerId,
                'principal_user_id' => $buyerId,
                'current_responsibility_party' => 'staff',
                'current_responsibility_user_id' => null,
                'version' => 2,
                'correlation_id' => self::CASE_MISMATCH,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ]
        );

        // Dispute record
        DB::table('disputes')->updateOrInsert(
            ['id' => self::DISPUTE_MISMATCH],
            [
                'public_reference' => 'DSP-0413',
                'reporter_user_id' => $buyerId,
                'order_id' => self::ORDER_MISMATCH,
                'work_instance_id' => null,
                'payment_obligation_id' => self::OBL_MISMATCH,
                'reason' => 'Cash declaration mismatch: buyer declared ₱650.00, provider acknowledged ₱500.00.',
                'category' => 'payment_mismatch_cash',
                'status' => 'opened',
                'severity' => 'medium',
                'opened_at' => $now->subHours(2),
                'version' => 1,
                'correlation_id' => self::DISPUTE_MISMATCH,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ]
        );

        // Active administrative hold on OBL-1088
        DB::table('administrative_holds')->updateOrInsert(
            ['id' => self::HOLD_MISMATCH],
            [
                'order_id' => self::ORDER_MISMATCH,
                'work_instance_id' => null,
                'payment_obligation_id' => self::OBL_MISMATCH,
                'reason_class' => 'dispute',
                'status' => 'active',
                'created_by_user_id' => $staffId,
                'approved_by_user_id' => Fix::CHECKER_STAFF_USER_ID,
                'effective_at' => $now->subHours(2),
                'released_at' => null,
                'release_conditions' => json_encode(['Bilateral receipt reconciliation at Barangay desk or written acknowledgement'], JSON_THROW_ON_ERROR),
                'release_conditions_payload_version' => 1,
                'release_reason' => null,
                'support_case_id' => self::CASE_MISMATCH,
                'source_kind' => 'automatic',
                'version' => 1,
                'correlation_id' => self::HOLD_MISMATCH,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ]
        );

        // 3. Scenario 3: ORD-2772 / OBL-772 (₱360 GCash P2P proof with REAL private file bytes)
        $pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', true);
        $storageKey = 'evidence/payment/'.self::ORDER_P2P.'/p2p-gcash-receipt.png';
        Storage::disk('private')->put($storageKey, $pngBytes);

        DB::table('evidence_files')->updateOrInsert(
            ['id' => self::EVIDENCE_P2P],
            [
                'owner_user_id' => $buyerId,
                'storage_key' => $storageKey,
                'media_type' => 'image/png',
                'size_bytes' => strlen($pngBytes),
                'content_hash' => hash('sha256', $pngBytes),
                'evidence_type' => 'p2p_payment_receipt',
                'data_class' => 'PAYMENT_EVIDENCE',
                'scan_status' => 'clean',
                'visibility' => 'order_parties',
                'retention_policy' => 'order_dispute_window',
                'version' => 1,
                'correlation_id' => self::EVIDENCE_P2P,
                'created_at' => $now->subHours(4),
                'updated_at' => $now->subHours(4),
            ]
        );

        $snap772 = '0198a3b1-7c40-7abc-8def-0e7e00000772';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap772],
            [
                'order_id' => self::ORDER_P2P,
                'snapshot_version' => 1,
                'source_listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b5',
                'source_quote_id' => null,
                'scope' => json_encode(['title' => 'Weekend bibingka tray', 'quantity' => 2, 'amount_minor' => 36000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 36000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['p2p_transfer'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $anaId,
                'accepted_at' => $now->subHours(6),
                'correlation_id' => self::ORDER_P2P,
                'created_at' => $now->subHours(6),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_P2P],
            [
                'public_reference' => 'ORD-2772',
                'current_terms_snapshot_id' => $snap772,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => Fix::LISTING_BIBINGKA,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $anaId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => self::ORDER_P2P,
                'created_at' => $now->subHours(6),
                'updated_at' => $now->subHours(4),
            ]
        );

        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => self::ORDER_P2P],
            [
                'id' => self::OBL_P2P,
                'public_reference' => 'OBL-772',
                'purpose' => 'primary_consideration',
                'amount_minor' => 36000,
                'currency' => 'PHP',
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $anaId,
                'lane' => 'p2p_transfer',
                'status' => 'payer_submitted_p2p_proof',
                'due_condition' => 'on_work_acceptance',
                'due_at' => $now->subHours(5),
                'settled_at' => null,
                'version' => 2,
                'correlation_id' => self::OBL_P2P,
                'created_at' => $now->subHours(6),
                'updated_at' => $now->subHours(4),
            ]
        );

        if (Schema::hasTable('payment_events')) {
            DB::table('payment_events')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-fe0100000772'],
                [
                    'payment_obligation_id' => self::OBL_P2P,
                    'event_type' => 'payment.p2p.proof_submitted',
                    'lane' => 'p2p_transfer',
                    'amount_minor' => 36000,
                    'currency' => 'PHP',
                    'external_reference' => 'GCASH-9821447012',
                    'provider' => 'gcash',
                    'actor_user_id' => $buyerId,
                    'evidence_file_id' => self::EVIDENCE_P2P,
                    'previous_status' => 'due',
                    'new_status' => 'payer_submitted_p2p_proof',
                    'idempotency_key' => 'pe-p2p-proof-772',
                    'correlation_id' => self::OBL_P2P,
                    'payload' => json_encode(['transfer_reference' => 'GCASH-9821447012', 'amount_minor' => 36000], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'occurred_at' => $now->subHours(4),
                    'effective_at' => $now->subHours(4),
                    'created_at' => $now->subHours(4),
                ]
            );
        }
    }
}

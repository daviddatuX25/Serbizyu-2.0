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

final class WorkExecutionScenariosSeeder extends Seeder
{
    public const WORK_A1 = '0198a3b1-7c40-7abc-8def-ea1c00000801';
    public const ORDER_A1 = '0198a3b1-7c40-7abc-8def-0ede00000801';
    public const EVIDENCE_A1_PHOTO = '0198a3b1-7c40-7abc-8def-ea1d00000801';

    public const WORK_A4 = '0198a3b1-7c40-7abc-8def-ea1c00000804';
    public const ORDER_A4 = '0198a3b1-7c40-7abc-8def-0ede00000804';

    public const WORK_A9 = '0198a3b1-7c40-7abc-8def-ea1c00000809';
    public const ORDER_A9 = '0198a3b1-7c40-7abc-8def-0ede00000809';
    public const EVIDENCE_A9_V1 = '0198a3b1-7c40-7abc-8def-ea1d00000901';
    public const EVIDENCE_A9_V2 = '0198a3b1-7c40-7abc-8def-ea1d00000902';

    public const RES_A3_BOOKED = '0198a3b1-7c40-7abc-8def-a30000000001';
    public const RES_A3_HELD = '0198a3b1-7c40-7abc-8def-a30000000002';
    public const RES_A3_PROPOSED = '0198a3b1-7c40-7abc-8def-a30000000003';
    public const CHANGE_REQ_A3 = '0198a3b1-7c40-7abc-8def-cb9000000001';

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return;
        }

        if (! Schema::hasTable('work_instances') || ! Schema::hasTable('orders')) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        $buyerId = Fix::BUYER_USER_ID;
        $techId = Fix::TECH_USER_ID;
        $juanId = Fix::JUAN_USER_ID;
        $mayaId = '0198a3b1-7c40-7abc-8def-2234567890ab';
        $storeId = Fix::STORE_USER_ID;

        // 1. A1 Scenario: In-progress Linear Project with clean scanned photo + metric proof
        $pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', true);
        $a1StorageKey = 'evidence/work/'.self::WORK_A1.'/triage-photo.png';
        Storage::disk('private')->put($a1StorageKey, $pngBytes);

        DB::table('evidence_files')->updateOrInsert(
            ['id' => self::EVIDENCE_A1_PHOTO],
            [
                'owner_user_id' => $juanId,
                'storage_key' => $a1StorageKey,
                'media_type' => 'image/png',
                'size_bytes' => strlen($pngBytes),
                'content_hash' => hash('sha256', $pngBytes),
                'evidence_type' => 'work_node_photo_proof',
                'data_class' => 'WORK_EXECUTION',
                'scan_status' => 'clean',
                'visibility' => 'order_parties',
                'retention_policy' => 'order_dispute_window',
                'version' => 1,
                'correlation_id' => self::EVIDENCE_A1_PHOTO,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subHours(3),
            ]
        );

        $snap801 = '0198a3b1-7c40-7abc-8def-0e7e00000801';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap801],
            [
                'order_id' => self::ORDER_A1,
                'snapshot_version' => 1,
                'source_listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'source_quote_id' => null,
                'scope' => json_encode(['title' => 'Structural Woodwork Triage', 'quantity' => 1, 'amount_minor' => 45000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 45000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $juanId,
                'accepted_at' => $now->subHours(5),
                'correlation_id' => self::ORDER_A1,
                'created_at' => $now->subHours(5),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_A1],
            [
                'public_reference' => 'ORD-2801',
                'current_terms_snapshot_id' => $snap801,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $juanId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::ORDER_A1,
                'created_at' => $now->subHours(5),
                'updated_at' => $now->subHours(3),
            ]
        );

        $a1Structure = [
            'shape' => 'A1',
            'nodes' => [
                [
                    'id' => 'node-1',
                    'ordinal' => 1,
                    'title' => 'Structural Woodwork Triage',
                    'description' => 'Initial inspection and photo of damaged cabinet joint.',
                    'status' => 'completed',
                    'completed_at' => $now->subHours(3)->toIso8601String(),
                    'required_proofs' => ['photo_proof'],
                    'evidence_file_id' => self::EVIDENCE_A1_PHOTO,
                ],
                [
                    'id' => 'node-2',
                    'ordinal' => 2,
                    'title' => 'Joint Alignment & Clamp Verification',
                    'description' => 'Clamp alignment with quantitative clearance reading.',
                    'status' => 'in_progress',
                    'required_proofs' => ['metric_reading'],
                    'metric_requirements' => [
                        ['id' => 'clearance', 'name' => 'Clearance gap', 'unit' => 'mm', 'required' => true, 'max' => 2],
                    ],
                ],
                [
                    'id' => 'node-3',
                    'ordinal' => 3,
                    'title' => 'Citizen Sign-Off',
                    'description' => 'Final review and sign-off.',
                    'status' => 'not_started',
                    'approval_method' => 'presence_otp',
                ],
            ],
        ];

        DB::table('work_instances')->updateOrInsert(
            ['id' => self::WORK_A1],
            [
                'order_id' => self::ORDER_A1,
                'work_shape' => 'A1',
                'status' => 'in_progress',
                'scheduled_at' => null,
                'started_at' => $now->subHours(4),
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => json_encode($a1Structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'correlation_id' => self::WORK_A1,
                'version' => 2,
                'created_at' => $now->subHours(5),
                'updated_at' => $now->subHours(3),
            ]
        );

        // 2. A3 Scenario: Kuya Ben Agenda (booked, held, open, blocked) + Pending Reschedule
        $scheduleResourceId = '0198a3b1-7c40-7abc-8def-5c0000000001';
        DB::table('provider_schedule_resources')->updateOrInsert(
            ['provider_user_id' => $techId],
            [
                'id' => $scheduleResourceId,
                'row_version' => 1,
                'created_at' => $now->subDays(10),
                'updated_at' => $now,
            ]
        );

        // Booked appointment for ORD-2714
        DB::table('appointment_reservations')->updateOrInsert(
            ['id' => self::RES_A3_BOOKED],
            [
                'schedule_resource_id' => $scheduleResourceId,
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'source_quote_id' => null,
                'source_quote_version' => null,
                'order_id' => Fix::ORDER_ID_LABOR,
                'work_instance_id' => (string) (DB::table('work_instances')->where('order_id', Fix::ORDER_ID_LABOR)->value('id') ?? Str::uuid7()),
                'created_by_user_id' => $buyerId,
                'starts_at' => $now->setTime(10, 0, 0),
                'ends_at' => $now->setTime(11, 30, 0),
                'duration_minutes' => 90,
                'status' => 'committed',
                'hold_expires_at' => null,
                'idempotency_key' => 'res-a3-booked-1',
                'correlation_id' => self::RES_A3_BOOKED,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subDays(1),
            ]
        );

        // Held appointment for upcoming quote
        DB::table('appointment_reservations')->updateOrInsert(
            ['id' => self::RES_A3_HELD],
            [
                'schedule_resource_id' => $scheduleResourceId,
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'source_quote_id' => null,
                'source_quote_version' => null,
                'order_id' => null,
                'work_instance_id' => null,
                'created_by_user_id' => $buyerId,
                'starts_at' => $now->addDays(1)->setTime(14, 0, 0),
                'ends_at' => $now->addDays(1)->setTime(15, 30, 0),
                'duration_minutes' => 90,
                'status' => 'held',
                'hold_expires_at' => $now->addHours(4),
                'idempotency_key' => 'res-a3-held-1',
                'correlation_id' => self::RES_A3_HELD,
                'created_at' => $now->subHours(1),
                'updated_at' => $now->subHours(1),
            ]
        );

        // Proposed slot for reschedule
        DB::table('appointment_reservations')->updateOrInsert(
            ['id' => self::RES_A3_PROPOSED],
            [
                'schedule_resource_id' => $scheduleResourceId,
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b8',
                'source_quote_id' => null,
                'source_quote_version' => null,
                'order_id' => null,
                'work_instance_id' => null,
                'created_by_user_id' => $buyerId,
                'starts_at' => $now->setTime(14, 0, 0),
                'ends_at' => $now->setTime(15, 30, 0),
                'duration_minutes' => 90,
                'status' => 'held',
                'hold_expires_at' => $now->addHours(2),
                'idempotency_key' => 'res-a3-proposed-1',
                'correlation_id' => self::RES_A3_PROPOSED,
                'created_at' => $now->subMinutes(30),
                'updated_at' => $now->subMinutes(30),
            ]
        );

        // Blocked agenda slot in provider_agenda_blocks
        DB::table('provider_agenda_blocks')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-b10c00000001'],
            [
                'schedule_resource_id' => $scheduleResourceId,
                'created_by_user_id' => $techId,
                'starts_at' => $now->addDays(3)->setTime(8, 0, 0),
                'ends_at' => $now->addDays(3)->setTime(17, 0, 0),
                'reason' => 'Sunday rest & workshop equipment maintenance.',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-b10c00000001',
                'created_at' => $now->subDays(2),
            ]
        );

        // Pending reschedule request
        DB::table('work_schedule_change_requests')->updateOrInsert(
            ['id' => self::CHANGE_REQ_A3],
            [
                'order_id' => Fix::ORDER_ID_LABOR,
                'work_instance_id' => (string) (DB::table('work_instances')->where('order_id', Fix::ORDER_ID_LABOR)->value('id') ?? Str::uuid7()),
                'current_reservation_id' => self::RES_A3_BOOKED,
                'proposed_reservation_id' => self::RES_A3_PROPOSED,
                'proposed_by_user_id' => $buyerId,
                'responded_by_user_id' => null,
                'responded_at' => null,
                'status' => 'pending',
                'reason' => 'Customer requested 2-hour delay due to morning barangay assembly.',
                'correlation_id' => self::CHANGE_REQ_A3,
                'created_at' => $now->subMinutes(30),
                'updated_at' => $now->subMinutes(30),
            ]
        );

        // 3. A4 Scenario: Counter / Courier physical goods handoff
        $snap804 = '0198a3b1-7c40-7abc-8def-0e7e00000804';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap804],
            [
                'order_id' => self::ORDER_A4,
                'snapshot_version' => 1,
                'source_listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890ba',
                'source_quote_id' => null,
                'scope' => json_encode(['title' => 'AC Run Capacitor (35uF 450V)', 'quantity' => 1, 'amount_minor' => 18000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 18000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $storeId,
                'accepted_at' => $now->subHours(2),
                'correlation_id' => self::ORDER_A4,
                'created_at' => $now->subHours(2),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_A4],
            [
                'public_reference' => 'ORD-2804',
                'current_terms_snapshot_id' => $snap804,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => Fix::LISTING_AC_CAPACITOR,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $storeId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => self::ORDER_A4,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(1),
            ]
        );

        $a4Structure = [
            'shape' => 'A4',
            'nodes' => [
                [
                    'id' => 'a4-prep',
                    'ordinal' => 1,
                    'title' => 'Counter Stock Preparation',
                    'description' => 'Hardware merchant prepares physical capacitor.',
                    'status' => 'completed',
                    'completed_at' => $now->subHours(1)->toIso8601String(),
                ],
                [
                    'id' => 'a4-handoff',
                    'ordinal' => 2,
                    'title' => 'Counter Custody Departure',
                    'description' => 'Courier custody handoff with counter sign-off.',
                    'status' => 'in_progress',
                ],
                [
                    'id' => 'a4-receipt',
                    'ordinal' => 3,
                    'title' => 'Customer Receipt Acknowledged',
                    'description' => 'Customer verifies physical serial tag.',
                    'status' => 'not_started',
                ],
            ],
        ];

        DB::table('work_instances')->updateOrInsert(
            ['id' => self::WORK_A4],
            [
                'order_id' => self::ORDER_A4,
                'work_shape' => 'A4',
                'status' => 'in_progress',
                'scheduled_at' => null,
                'started_at' => $now->subHours(1),
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => json_encode($a4Structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'correlation_id' => self::WORK_A4,
                'version' => 1,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(1),
            ]
        );

        // 4. A9 Scenario: Greeting-card v1 -> v2 Revision Review
        $pdfV1Bytes = "%PDF-1.4\n1 0 obj\n<< /Title (Greeting Card Layout v1) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";
        $pdfV2Bytes = "%PDF-1.4\n1 0 obj\n<< /Title (Greeting Card Layout v2 - Serif & Lighthouse Motif) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";

        $v1StorageKey = 'evidence/work/'.self::WORK_A9.'/card-v1.pdf';
        $v2StorageKey = 'evidence/work/'.self::WORK_A9.'/card-v2.pdf';
        Storage::disk('private')->put($v1StorageKey, $pdfV1Bytes);
        Storage::disk('private')->put($v2StorageKey, $pdfV2Bytes);

        DB::table('evidence_files')->updateOrInsert(
            ['id' => self::EVIDENCE_A9_V1],
            [
                'owner_user_id' => $mayaId,
                'storage_key' => $v1StorageKey,
                'media_type' => 'application/pdf',
                'size_bytes' => strlen($pdfV1Bytes),
                'content_hash' => hash('sha256', $pdfV1Bytes),
                'evidence_type' => 'digital_delivery_file',
                'data_class' => 'WORK_EXECUTION',
                'scan_status' => 'clean',
                'visibility' => 'order_parties',
                'retention_policy' => 'order_dispute_window',
                'version' => 1,
                'correlation_id' => self::EVIDENCE_A9_V1,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subDays(1),
            ]
        );

        DB::table('evidence_files')->updateOrInsert(
            ['id' => self::EVIDENCE_A9_V2],
            [
                'owner_user_id' => $mayaId,
                'storage_key' => $v2StorageKey,
                'media_type' => 'application/pdf',
                'size_bytes' => strlen($pdfV2Bytes),
                'content_hash' => hash('sha256', $pdfV2Bytes),
                'evidence_type' => 'digital_delivery_file',
                'data_class' => 'WORK_EXECUTION',
                'scan_status' => 'clean',
                'visibility' => 'order_parties',
                'retention_policy' => 'order_dispute_window',
                'version' => 1,
                'correlation_id' => self::EVIDENCE_A9_V2,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ]
        );

        $snap809 = '0198a3b1-7c40-7abc-8def-0e7e00000809';
        DB::table('order_terms_snapshots')->updateOrInsert(
            ['id' => $snap809],
            [
                'order_id' => self::ORDER_A9,
                'snapshot_version' => 1,
                'source_listing_version_id' => '0198a3b1-7c40-7abc-8def-6234567890b1',
                'source_quote_id' => null,
                'scope' => json_encode(['title' => 'Hand-drawn greeting card layout', 'quantity' => 1, 'amount_minor' => 8000], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 8000,
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $mayaId,
                'accepted_at' => $now->subDays(1),
                'correlation_id' => self::ORDER_A9,
                'created_at' => $now->subDays(1),
            ]
        );
        DB::table('orders')->updateOrInsert(
            ['id' => self::ORDER_A9],
            [
                'public_reference' => 'ORD-2809',
                'current_terms_snapshot_id' => $snap809,
                'origin' => 'direct_booking',
                'mechanism' => 'direct_booking',
                'listing_id' => '0198a3b1-7c40-7abc-8def-5234567890b1',
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $mayaId,
                'status' => 'accepted',
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 2,
                'correlation_id' => self::ORDER_A9,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subHours(2),
            ]
        );

        $a9Structure = [
            'shape' => 'A9',
            'revisions' => [
                [
                    'version' => 1,
                    'status' => 'revision_requested',
                    'evidence_file_id' => self::EVIDENCE_A9_V1,
                    'feedback' => 'Please adjust font family to serif and add Tagudin lighthouse motif.',
                    'submitted_at' => $now->subDays(1)->toIso8601String(),
                ],
                [
                    'version' => 2,
                    'status' => 'delivered',
                    'evidence_file_id' => self::EVIDENCE_A9_V2,
                    'revision_notes' => 'Applied serif typeface and hand-drawn Tagudin Farola lighthouse illustration.',
                    'submitted_at' => $now->subHours(2)->toIso8601String(),
                ],
            ],
            'status' => 'in_progress',
        ];

        $delivery1Id = '0198a3b1-7c40-7abc-8def-de1100000901';
        $delivery2Id = '0198a3b1-7c40-7abc-8def-de1100000902';

        if (Schema::hasTable('work_deliveries')) {
            DB::table('work_deliveries')->updateOrInsert(
                ['id' => $delivery1Id],
                [
                    'work_instance_id' => self::WORK_A9,
                    'version' => 1,
                    'status' => 'superseded',
                    'manifest' => json_encode([['filename' => 'card-v1.pdf', 'evidence_file_id' => self::EVIDENCE_A9_V1]], JSON_THROW_ON_ERROR),
                    'manifest_hash' => hash('sha256', 'card-v1.pdf'),
                    'created_by_user_id' => $mayaId,
                    'submitted_at' => $now->subDays(1),
                    'accepted_at' => null,
                    'superseded_at' => $now->subHours(5),
                    'correlation_id' => self::WORK_A9,
                    'created_at' => $now->subDays(1),
                    'updated_at' => $now->subHours(5),
                ]
            );
            DB::table('work_deliveries')->updateOrInsert(
                ['id' => $delivery2Id],
                [
                    'work_instance_id' => self::WORK_A9,
                    'version' => 2,
                    'status' => 'submitted',
                    'manifest' => json_encode([['filename' => 'card-v2.pdf', 'evidence_file_id' => self::EVIDENCE_A9_V2]], JSON_THROW_ON_ERROR),
                    'manifest_hash' => hash('sha256', 'card-v2.pdf'),
                    'created_by_user_id' => $mayaId,
                    'submitted_at' => $now->subHours(2),
                    'accepted_at' => null,
                    'superseded_at' => null,
                    'correlation_id' => self::WORK_A9,
                    'created_at' => $now->subHours(2),
                    'updated_at' => $now->subHours(2),
                ]
            );
        }

        if (Schema::hasTable('work_deliverable_files')) {
            DB::table('work_deliverable_files')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-df0100000901'],
                [
                    'work_delivery_id' => $delivery1Id,
                    'evidence_file_id' => self::EVIDENCE_A9_V1,
                    'ordinal' => 1,
                    'filename' => 'card-v1.pdf',
                ]
            );
            DB::table('work_deliverable_files')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-df0100000902'],
                [
                    'work_delivery_id' => $delivery2Id,
                    'evidence_file_id' => self::EVIDENCE_A9_V2,
                    'ordinal' => 1,
                    'filename' => 'card-v2.pdf',
                ]
            );
        }

        if (Schema::hasTable('work_revision_requests')) {
            DB::table('work_revision_requests')->updateOrInsert(
                ['id' => '0198a3b1-7c40-7abc-8def-de1200000901'],
                [
                    'work_instance_id' => self::WORK_A9,
                    'work_delivery_id' => $delivery1Id,
                    'requested_by_user_id' => $buyerId,
                    'revision_number' => 1,
                    'message' => 'Please adjust font family to serif and add Tagudin lighthouse motif.',
                    'correlation_id' => self::WORK_A9,
                    'created_at' => $now->subHours(5),
                ]
            );
        }

        DB::table('work_instances')->updateOrInsert(
            ['id' => self::WORK_A9],
            [
                'order_id' => self::ORDER_A9,
                'work_shape' => 'A9',
                'status' => 'awaiting_signoff',
                'current_delivery_id' => $delivery2Id,
                'revisions_allowed' => 2,
                'revisions_used' => 1,
                'awaiting_signoff_at' => $now->subHours(2),
                'scheduled_at' => null,
                'started_at' => $now->subDays(1),
                'completion_proposed_at' => $now->subHours(2),
                'completed_at' => null,
                'structure' => json_encode($a9Structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'correlation_id' => self::WORK_A9,
                'version' => 2,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subHours(2),
            ]
        );
    }
}

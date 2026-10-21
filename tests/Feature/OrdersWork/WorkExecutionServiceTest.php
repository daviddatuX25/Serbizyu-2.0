<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Modules\OrdersWork\Application\WorkExecutionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class WorkExecutionServiceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_it_initializes_runtime_structure_from_work_specification(): void
    {
        $service = app(WorkExecutionService::class);

        $spec = [
            'work_specification' => [
                'signature_hash' => 'sig_test_123',
                'work_shape' => 'A1',
                'nodes' => [
                    [
                        'id' => 'node-1',
                        'ordinal' => 1,
                        'title' => 'Intake Triage',
                        'node_kind' => 'checkin_intake',
                        'evidence_type' => 'none',
                        'required_proofs' => [],
                        'control_mode' => 'provider_advance',
                        'mandatory' => true,
                    ],
                    [
                        'id' => 'node-2',
                        'ordinal' => 2,
                        'title' => 'Customer Part Confirmation',
                        'node_kind' => 'decision_gate',
                        'evidence_type' => 'dual_sign',
                        'control_mode' => 'customer_confirm',
                        'mandatory' => true,
                    ],
                    [
                        'id' => 'node-3',
                        'ordinal' => 3,
                        'title' => 'Completion & Sign-off',
                        'node_kind' => 'final_signoff',
                        'evidence_type' => 'dual_sign',
                        'control_mode' => 'customer_confirm',
                        'mandatory' => true,
                    ],
                ],
            ],
        ];

        $structure = $service->initializeStructure($spec, 'A1');

        self::assertSame('sig_test_123', $structure['signature_hash']);
        self::assertSame('node-1', $structure['active_node_id']);
        self::assertFalse($structure['pending_customer_confirmation']);
        self::assertCount(3, $structure['nodes']);
        self::assertSame('active', $structure['nodes'][0]['status']);
        self::assertSame('locked', $structure['nodes'][1]['status']);
        self::assertSame('locked', $structure['nodes'][2]['status']);
    }

    public function test_provider_advance_then_customer_confirm_gate_then_final_signoff_lifecycle(): void
    {
        $service = app(WorkExecutionService::class);

        $buyerId = (string) Str::uuid7();
        $providerId = (string) Str::uuid7();
        $orderId = (string) Str::uuid7();
        $workId = (string) Str::uuid7();
        $obligationId = (string) Str::uuid7();
        $now = now();

        DB::table('users')->insert([
            [
                'id' => $buyerId,
                'phone_e164' => '+639171112222',
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $providerId,
                'phone_e164' => '+639173334444',
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('orders')->insert([
            'id' => $orderId,
            'buyer_user_id' => $buyerId,
            'provider_user_id' => $providerId,
            'status' => 'accepted',
            'version' => 1,
            'mechanism' => 'direct_booking',
            'origin' => 'web',
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $initialStructure = $service->initializeStructure([
            'work_specification' => [
                'signature_hash' => 'sig_test_flow',
                'work_shape' => 'A1',
                'nodes' => [
                    [
                        'id' => 'step-1',
                        'ordinal' => 1,
                        'title' => 'Diagnostic Intake',
                        'node_kind' => 'checkin_intake',
                        'evidence_type' => 'none',
                        'required_proofs' => [],
                        'control_mode' => 'provider_advance',
                        'mandatory' => true,
                    ],
                    [
                        'id' => 'step-2',
                        'ordinal' => 2,
                        'title' => 'Part Replacement Gate',
                        'node_kind' => 'decision_gate',
                        'evidence_type' => 'none',
                        'control_mode' => 'customer_confirm',
                        'mandatory' => true,
                        'required_proofs' => [],
                        'approval_method' => 'app_confirm',
                    ],
                    [
                        'id' => 'step-3',
                        'ordinal' => 3,
                        'title' => 'Final Sign-off',
                        'node_kind' => 'final_signoff',
                        'evidence_type' => 'dual_sign',
                        'control_mode' => 'customer_confirm',
                        'mandatory' => true,
                    ],
                ],
            ],
        ], 'A1');

        DB::table('work_instances')->insert([
            'id' => $workId,
            'order_id' => $orderId,
            'work_shape' => 'A1',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
            'status' => 'not_started',
            'structure' => json_encode($initialStructure, JSON_THROW_ON_ERROR),
            'structure_payload_version' => 1,
            'row_version' => 1,
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('payment_obligations')->insert([
            'id' => $obligationId,
            'order_id' => $orderId,
            'work_instance_id' => $workId,
            'purpose' => 'primary_consideration',
            'status' => 'created',
            'lane' => 'external_cash',
            'due_condition' => 'on_acceptance',
            'amount_minor' => 45000,
            'currency' => 'PHP',
            'payer_user_id' => $buyerId,
            'recipient_user_id' => $providerId,
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Step 1: Provider completes step 1 (checkin_intake) -> Work becomes in_progress, step 2 unlocked
        $res1 = $service->advanceNode($orderId, $providerId, 'step-1', 'complete_step');

        self::assertSame('in_progress', $res1['work_status']);
        self::assertSame('completed', $res1['structure']['nodes'][0]['status']);
        self::assertSame('active', $res1['structure']['nodes'][1]['status']);
        self::assertSame('step-2', $res1['structure']['active_node_id']);

        // Step 2a: Provider requests confirmation on step 2 (decision_gate) -> pauses order for customer
        $res2 = $service->advanceNode($orderId, $providerId, 'step-2', 'request_confirmation', []);
        self::assertTrue($res2['structure']['pending_customer_confirmation']);
        self::assertSame('awaiting_customer_confirmation', $res2['structure']['nodes'][1]['status']);
        self::assertSame([], $res2['structure']['nodes'][1]['evidence_payload']);

        // Step 2b: Customer confirms gate -> unlocks step 3 for provider
        $res3 = $service->advanceNode($orderId, $buyerId, 'step-2', 'confirm_gate');

        self::assertFalse($res3['structure']['pending_customer_confirmation']);
        self::assertSame('completed', $res3['structure']['nodes'][1]['status']);
        self::assertSame('active', $res3['structure']['nodes'][2]['status']);
        self::assertSame('step-3', $res3['structure']['active_node_id']);

        // Step 3a: Provider proposes completion on step 3 -> work becomes awaiting_signoff
        $res4 = $service->advanceNode($orderId, $providerId, 'step-3', 'propose_completion');

        self::assertSame('awaiting_signoff', $res4['work_status']);

        // Step 3b: Customer signs off -> work completed, order closed, obligation released
        $res5 = $service->advanceNode($orderId, $buyerId, 'step-3', 'signoff_completion');

        self::assertSame('completed', $res5['work_status']);
        self::assertSame('closed', $res5['order_status']);
        self::assertSame('released', $res5['obligation_status']);
    }
}

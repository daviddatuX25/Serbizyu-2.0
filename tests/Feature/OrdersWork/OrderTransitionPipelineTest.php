<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Models\User;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class OrderTransitionPipelineTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order transition pipeline tests require PostgreSQL.');
        }

        // Ensure deterministic demo execution fixtures are present in the test transaction
        $this->seed(DealChainExecutionSeeder::class);
    }

    public function test_aggregates_active_deal_chain_into_dynamic_n_slot_progress_strip_for_coordinator(): void
    {
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();

        $manifestPath = public_path('build/manifest.json');
        $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';

        $response = $this->actingAs($buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get('/orders')
            ->assertOk();

        $ongoing = collect($response->json('props.ongoing'));
        $chainCard = $ongoing->firstWhere('id', Fix::CHAIN_ID_ONGOING);

        $this->assertNotNull($chainCard, 'Deal Chain #DC-892 set card must be present in Ongoing list.');
        expect($chainCard['type'])->toBe('deal_chain')
            ->and($chainCard['role'])->toBe('coordinator')
            ->and($chainCard['slots_count'])->toBe(3);

        $slots = $chainCard['slots'];
        expect($slots[0]['ordinal'])->toBe(1)
            ->and($slots[0]['status'])->toBe('completed')
            ->and($slots[0]['status_label'])->toBe('✓ Sourced');

        expect($slots[1]['ordinal'])->toBe(2)
            ->and($slots[1]['status'])->toBe('in_transit')
            ->and($slots[1]['status_label'])->toBe('In Transit (~8m)');

        // Slot 3 is gated by incomplete predecessor Slot 2
        expect($slots[2]['ordinal'])->toBe(3)
            ->and($slots[2]['status'])->toBe('blocked')
            ->and($slots[2]['status_label'])->toBe('⬡ Gated');

        // Verify buyer child orders are suppressed from being loose duplicates in ongoing
        $loosePartOrder = $ongoing->firstWhere('id', Fix::ORDER_ID_PART);
        $looseTransitOrder = $ongoing->firstWhere('id', Fix::ORDER_ID_TRANSIT);
        $this->assertNull($loosePartOrder, 'Child order 101 must not be a loose card in Ongoing for the buyer.');
        $this->assertNull($looseTransitOrder, 'Child order 102 must not be a loose card in Ongoing for the buyer.');
    }

    public function test_courier_pickup_advances_work_to_in_progress_and_logs_audit_events(): void
    {
        $courier = User::query()->where('phone_e164', Fix::COURIER_PHONE)->firstOrFail();

        // Ensure transit work instance is initially not_started for pickup test
        DB::table('work_instances')
            ->where('order_id', Fix::ORDER_ID_TRANSIT)
            ->update([
                'status' => 'not_started',
                'started_at' => null,
                'updated_at' => now(),
            ]);

        $response = $this->actingAs($courier)
            ->post('/orders/'.Fix::ORDER_ID_TRANSIT.'/courier/pickup');

        $response->assertRedirect();
        $response->assertSessionHas('notice', 'Store pickup verified by courier. En route to customer destination.');

        // Verify work_instances updated
        $work = DB::table('work_instances')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
        expect($work)->not->toBeNull()
            ->and($work->status)->toBe('in_progress')
            ->and($work->started_at)->not->toBeNull();

        // Verify work_events logged
        $workEvent = DB::table('work_events')
            ->where('work_instance_id', $work->id)
            ->where('event_type', 'work.courier.pickup')
            ->first();
        expect($workEvent)->not->toBeNull()
            ->and($workEvent->new_status)->toBe('in_progress')
            ->and((string) $workEvent->actor_user_id)->toBe((string) $courier->id);

        // Verify audit_events logged
        $auditEvent = DB::table('audit_events')
            ->where('order_id', Fix::ORDER_ID_TRANSIT)
            ->where('action', 'order.courier.pickup')
            ->first();
        expect($auditEvent)->not->toBeNull()
            ->and((string) $auditEvent->actor_user_id)->toBe((string) $courier->id)
            ->and($auditEvent->command_name)->toBe('CourierPickupCommand');
    }

    public function test_courier_handoff_settles_delivery_fee_and_unblocks_downstream_dependency_gate(): void
    {
        $courier = User::query()->where('phone_e164', Fix::COURIER_PHONE)->firstOrFail();
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();

        // Verify labor need is initially gated
        $laborNeedBefore = DB::table('deal_needs')->where('id', Fix::NEED_ID_LABOR)->first();
        $this->assertNotNull($laborNeedBefore);

        $response = $this->actingAs($courier)
            ->post('/orders/'.Fix::ORDER_ID_TRANSIT.'/courier/handoff');

        $response->assertRedirect();
        $response->assertSessionHas('notice');

        // Verify courier order and work closed
        $transitWork = DB::table('work_instances')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
        expect($transitWork->status)->toBe('completed')
            ->and($transitWork->completed_at)->not->toBeNull();

        $transitOrder = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
        expect($transitOrder->status)->toBe('closed');

        // Verify courier payment obligation released
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
        expect($obligation->status)->toBe('released');

        // Verify payment_events logged
        $payEvent = DB::table('payment_events')
            ->where('payment_obligation_id', $obligation->id)
            ->where('event_type', 'payment.obligation.released')
            ->first();
        expect($payEvent)->not->toBeNull()
            ->and($payEvent->new_status)->toBe('released');

        // Verify predecessor deal_need marked completed
        $transitNeed = DB::table('deal_needs')->where('id', Fix::NEED_ID_TRANSIT)->first();
        expect($transitNeed->status)->toBe('completed');

        // UNBLOCKING VERIFICATION:
        // On subsequent query to /orders as buyer, Slot 2 is completed and Slot 3 is unblocked!
        $manifestPath = public_path('build/manifest.json');
        $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';

        $hubResponse = $this->actingAs($buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get('/orders')
            ->assertOk();

        $ongoing = collect($hubResponse->json('props.ongoing'));
        $chainCard = $ongoing->firstWhere('id', Fix::CHAIN_ID_ONGOING);
        $slots = $chainCard['slots'];

        // Slot 2 (Transit) is now completed
        expect($slots[1]['status'])->toBe('completed')
            ->and($slots[1]['status_label'])->toBe('✓ Completed');

        // Slot 3 (Labor) is unblocked!
        expect($slots[2]['status'])->not->toBe('blocked');
    }

    public function test_buyer_signoff_completes_work_releases_escrow_and_finishes_deal_chain(): void
    {
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();

        // Mark Need 1 and Need 2 completed
        DB::table('deal_needs')->where('id', Fix::NEED_ID_PART)->update(['status' => 'completed']);
        DB::table('deal_needs')->where('id', Fix::NEED_ID_TRANSIT)->update(['status' => 'completed']);
        $tech = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $techId = (string) $tech->id;
        $laborOrderId = '0198a3b1-7c40-7abc-8def-0ede00000103';
        DB::table('orders')->updateOrInsert(
            ['id' => $laborOrderId],
            [
                'buyer_user_id' => $buyer->id,
                'provider_user_id' => $techId,
                'listing_id' => Fix::LISTING_AC_CLEAN,
                'deal_chain_id' => Fix::CHAIN_ID_ONGOING,
                'deal_need_id' => Fix::NEED_ID_LABOR,
                'origin' => 'deal_chain',
                'status' => 'accepted',
                'mechanism' => 'DIRECT_BOOKING',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $existingLaborWork = DB::table('work_instances')->where('order_id', $laborOrderId)->first();
        $laborWorkId = $existingLaborWork ? (string) $existingLaborWork->id : (string) Str::uuid7();
        $signoffStructure = [
            'schema_version' => 1,
            'signature_hash' => hash('sha256', 'buyer-signoff-zero-proof'),
            'work_shape' => 'A1',
            'active_node_id' => 'final-signoff',
            'active_ordinal' => 1,
            'pending_customer_confirmation' => true,
            'nodes' => [[
                'id' => 'final-signoff',
                'ordinal' => 1,
                'title' => 'Final sign-off',
                'description' => 'Buyer confirms the completed Work.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'dual_sign',
                'evidence_description' => 'Buyer app confirmation.',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => [],
                'approval_method' => 'app_confirm',
                'metric_unit' => null,
                'status' => 'awaiting_customer_confirmation',
                'completed_at' => null,
                'completed_by_user_id' => null,
                'evidence_payload' => [],
                'customer_confirmed_at' => null,
            ]],
        ];
        DB::table('work_instances')->updateOrInsert(
            ['order_id' => $laborOrderId],
            [
                'id' => $laborWorkId,
                'status' => 'awaiting_signoff',
                'work_shape' => 'A1',
                'structure' => json_encode($signoffStructure, JSON_THROW_ON_ERROR),
                'started_at' => now(),
                'completion_proposed_at' => now(),
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $existingLaborObligation = DB::table('payment_obligations')->where('order_id', $laborOrderId)->first();
        $laborObligationId = $existingLaborObligation ? (string) $existingLaborObligation->id : (string) Str::uuid7();
        DB::table('payment_obligations')->updateOrInsert(
            ['order_id' => $laborOrderId],
            [
                'id' => $laborObligationId,
                'payer_user_id' => $buyer->id,
                'recipient_user_id' => $techId,
                'purpose' => 'primary_consideration',
                'amount_minor' => 45000,
                'currency' => 'PHP',
                'lane' => 'tiwala_protected_digital',
                'status' => 'due',
                'due_condition' => 'on_acceptance',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Buyer signs off
        $response = $this->actingAs($buyer)
            ->post("/orders/{$laborOrderId}/work/signoff");

        $response->assertRedirect();
        $response->assertSessionHas('notice', 'Work sign-off approved! Escrow payment released to provider.');

        // Verify labor order closed and work completed
        $work = DB::table('work_instances')->where('order_id', $laborOrderId)->first();
        expect($work->status)->toBe('completed');

        $order = DB::table('orders')->where('id', $laborOrderId)->first();
        expect($order->status)->toBe('closed');

        $obligation = DB::table('payment_obligations')->where('order_id', $laborOrderId)->first();
        expect($obligation->status)->toBe('released');

        // Verify deal need completed
        $need = DB::table('deal_needs')->where('id', Fix::NEED_ID_LABOR)->first();
        expect($need->status)->toBe('completed');

        // All 3 needs are completed -> Parent Deal Chain must now be completed!
        $chain = DB::table('deal_chains')->where('id', Fix::CHAIN_ID_ONGOING)->first();
        expect($chain->status)->toBe('completed');
    }

    public function test_prevents_unauthorized_users_from_confirming_courier_pickup(): void
    {
        $tech = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();

        $response = $this->actingAs($tech)
            ->post('/orders/'.Fix::ORDER_ID_TRANSIT.'/courier/pickup');

        // Technician is neither provider nor courier on transit order
        $response->assertSessionHasErrors(['form']);
    }
}

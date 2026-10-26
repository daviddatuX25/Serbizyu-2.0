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

        $active = collect($response->json('props.active'));
        $chainCard = $active->firstWhere('id', Fix::CHAIN_ID_ONGOING);

        $this->assertNotNull($chainCard, 'Deal Chain #DC-892 set card must be present in Active.');
        expect($chainCard['type'])->toBe('deal_chain')
            ->and($chainCard['role'])->toBe('coordinator')
            ->and($chainCard['slots_count'])->toBe(3);

        $slots = $chainCard['slots'];
        expect($slots[0]['ordinal'])->toBe(1)
            ->and($slots[0]['status'])->toBe('completed')
            ->and($slots[0]['status_label'])->toBe('✓ Sourced');

        expect($slots[1]['ordinal'])->toBe(2)
            ->and($slots[1]['status'])->toBe('in_transit')
            ->and($slots[1]['status_label'])->toBe('In Transit');

        // Slot 3 is gated by incomplete predecessor Slot 2
        expect($slots[2]['ordinal'])->toBe(3)
            ->and($slots[2]['status'])->toBe('blocked')
            ->and($slots[2]['status_label'])->toBe('⬡ Gated');

        // Verify buyer child orders are suppressed from being loose duplicates in Active.
        $loosePartOrder = $active->firstWhere('id', Fix::ORDER_ID_PART);
        $looseTransitOrder = $active->firstWhere('id', Fix::ORDER_ID_TRANSIT);
        $this->assertNull($loosePartOrder, 'Child order 101 must not be a loose card in Active for the buyer.');
        $this->assertNull($looseTransitOrder, 'Child order 102 must not be a loose card in Active for the buyer.');
    }

    public function test_buyer_signoff_completes_work_marks_payment_due_and_finishes_deal_chain(): void
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
                'lane' => 'protected_digital',
                'status' => 'due',
                'due_condition' => 'on_work_acceptance',
                'due_at' => now(),
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Buyer signs off
        $response = $this->actingAs($buyer)
            ->post("/orders/{$laborOrderId}/work/signoff");

        $response->assertRedirect();
        $response->assertSessionHas('notice', 'Work sign-off approved. Payment settlement still requires separate confirmation.');

        // Verify labor order closed and work completed
        $work = DB::table('work_instances')->where('order_id', $laborOrderId)->first();
        expect($work->status)->toBe('completed');

        $order = DB::table('orders')->where('id', $laborOrderId)->first();
        expect($order->status)->toBe('completed');

        $obligation = DB::table('payment_obligations')->where('order_id', $laborOrderId)->first();
        expect($obligation->status)->toBe('due')
            ->and($obligation->settled_at)->toBeNull();

        // Verify deal need completed
        $need = DB::table('deal_needs')->where('id', Fix::NEED_ID_LABOR)->first();
        expect($need->status)->toBe('completed');

        // All 3 needs are completed -> Parent Deal Chain must now be completed!
        $chain = DB::table('deal_chains')->where('id', Fix::CHAIN_ID_ONGOING)->first();
        expect($chain->status)->toBe('completed');
    }
}

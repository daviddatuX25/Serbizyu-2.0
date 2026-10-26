<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class PaymentObligationLifecycleMigrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cutover_preserves_legacy_gateway_lane_fees_and_capture_evidence_without_settling(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Payment lifecycle migration regression requires PostgreSQL.');
        }

        $this->seed(DealChainExecutionSeeder::class);

        $migration = require database_path('migrations/2026_10_25_001700_cutover_payment_obligation_lifecycle.php');
        $migration->down();

        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
        $this->assertNotNull($obligation);
        $order = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
        $evidenceId = (string) Str::uuid7();
        $paymentEventId = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();
        $now = now();

        DB::table('payment_obligations')->where('id', $obligation->id)->update([
            'lane' => 'direct_digital',
            'status' => 'paid_out',
            'platform_fee_amount_minor' => 175,
            'processor_cost_amount_minor' => 12,
            'updated_at' => $now,
        ]);
        DB::table('evidence_files')->insert([
            'id' => $evidenceId,
            'owner_user_id' => Fix::BUYER_USER_ID,
            'storage_key' => 'test/payment-cutover/'.$evidenceId,
            'media_type' => 'image/jpeg',
            'size_bytes' => 32,
            'content_hash' => str_repeat('a', 64),
            'evidence_type' => 'payment_proof',
            'data_class' => 'SENSITIVE',
            'scan_status' => 'clean',
            'visibility' => 'participants_only',
            'retention_policy' => 'order_evidence',
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('payment_events')->insert([
            'id' => $paymentEventId,
            'payment_obligation_id' => $obligation->id,
            'event_type' => 'payment.gateway.capture',
            'lane' => 'direct_digital',
            'amount_minor' => (int) $obligation->amount_minor,
            'currency' => (string) $obligation->currency,
            'external_reference' => 'GATEWAY-CAPTURE-TEST-17',
            'provider' => 'sandbox_gateway',
            'actor_user_id' => $order->buyer_user_id,
            'evidence_file_id' => $evidenceId,
            'previous_status' => 'due',
            'new_status' => 'paid_out',
            'idempotency_key' => 'legacy-gateway-capture-'.$paymentEventId,
            'correlation_id' => $correlationId,
            'payload' => json_encode(['capture_reference' => 'GATEWAY-CAPTURE-TEST-17'], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        $migration->up();

        $migrated = DB::table('payment_obligations')->where('id', $obligation->id)->first();
        $event = DB::table('payment_events')->where('id', $paymentEventId)->first();

        $this->assertSame('protected_digital', $migrated->lane);
        $this->assertSame('disputed_mismatch', $migrated->status);
        $this->assertSame(175, (int) $migrated->platform_fee_amount_minor);
        $this->assertSame(12, (int) $migrated->processor_cost_amount_minor);
        $this->assertNull($migrated->settled_at);
        $this->assertSame('direct_digital', $migrated->legacy_lane);
        $this->assertSame('paid_out', $migrated->legacy_status);
        $this->assertSame(175, (int) $migrated->legacy_platform_fee_amount_minor);
        $this->assertSame(12, (int) $migrated->legacy_processor_cost_amount_minor);
        $this->assertSame('direct_digital', $event->lane);
        $this->assertSame('GATEWAY-CAPTURE-TEST-17', $event->external_reference);
        $this->assertSame($evidenceId, (string) $event->evidence_file_id);
    }
}

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_obligations', function (Blueprint $table): void {
            $table->uuid('supersedes_obligation_id')->nullable();
            $table->timestampTz('due_at')->nullable();
            $table->timestampTz('settled_at')->nullable();
            $table->text('legacy_lane')->nullable();
            $table->text('legacy_status')->nullable();
            $table->bigInteger('legacy_platform_fee_amount_minor')->nullable();
            $table->bigInteger('legacy_processor_cost_amount_minor')->nullable();
        });

        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_lane');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_status');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_external_cash_fee');

        // Keep a per-row provenance snapshot before normalizing stored values. Existing
        // payment_events/provider_events remain append-only and are not rewritten.
        DB::statement('UPDATE payment_obligations SET legacy_lane = lane, legacy_status = status, legacy_platform_fee_amount_minor = platform_fee_amount_minor, legacy_processor_cost_amount_minor = processor_cost_amount_minor');
        DB::statement("UPDATE payment_obligations SET lane = CASE lane WHEN 'external_digital_proof' THEN 'p2p_transfer' WHEN 'direct_digital' THEN 'protected_digital' WHEN 'tiwala_protected_digital' THEN 'protected_digital' ELSE lane END");
        DB::statement("UPDATE payment_obligations SET status = CASE status WHEN 'created' THEN 'not_due' WHEN 'due' THEN 'due' WHEN 'reported' THEN 'payer_reported_cash' WHEN 'awaiting_confirmation' THEN 'payer_submitted_p2p_proof' WHEN 'provider_verified' THEN 'payer_submitted_p2p_proof' WHEN 'disputed' THEN 'disputed_mismatch' WHEN 'held' THEN 'disputed_mismatch' WHEN 'superseded' THEN 'superseded' WHEN 'cancelled' THEN 'cancelled' ELSE 'disputed_mismatch' END");
        DB::statement("UPDATE payment_obligations SET due_condition = 'on_work_acceptance' WHERE due_condition = 'on_acceptance'");
        DB::statement("UPDATE payment_obligations SET platform_fee_amount_minor = 0, processor_cost_amount_minor = 0 WHERE lane IN ('external_cash', 'p2p_transfer')");
        DB::statement("UPDATE payment_obligations SET due_at = updated_at WHERE status IN ('due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'disputed_mismatch')");

        // Keep historical event vocabulary while allowing canonical lifecycle events.
        DB::statement('ALTER TABLE payment_events DROP CONSTRAINT chk_payment_events_lane');
        DB::statement('ALTER TABLE payment_events DROP CONSTRAINT chk_payment_events_new_status');
        DB::statement('ALTER TABLE payment_events DROP CONSTRAINT chk_payment_events_previous_status');
        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_lane CHECK (lane IN ('external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital', 'p2p_transfer', 'protected_digital'))");
        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_new_status CHECK (new_status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded', 'not_due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch', 'settled'))");
        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_previous_status CHECK (previous_status IS NULL OR previous_status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded', 'not_due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch', 'settled'))");

        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_lane CHECK (lane IN ('external_cash', 'p2p_transfer', 'protected_digital'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_status CHECK (status IN ('not_due', 'due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch', 'settled', 'cancelled', 'superseded'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_external_fee CHECK (lane NOT IN ('external_cash', 'p2p_transfer') OR (platform_fee_amount_minor = 0 AND processor_cost_amount_minor = 0))");
        DB::statement('ALTER TABLE payment_obligations ADD CONSTRAINT fk_payment_obligations_supersedes FOREIGN KEY (supersedes_obligation_id) REFERENCES payment_obligations(id) ON DELETE RESTRICT');
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_settled_at CHECK ((status = 'settled' AND settled_at IS NOT NULL) OR (status <> 'settled' AND settled_at IS NULL))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_due_at CHECK (status NOT IN ('due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch', 'settled') OR due_at IS NOT NULL)");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_due_at');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_settled_at');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT fk_payment_obligations_supersedes');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_external_fee');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_status');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT chk_payment_obligations_lane');
        DB::statement("UPDATE payment_obligations SET lane = CASE WHEN legacy_lane IN ('external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital') THEN legacy_lane ELSE CASE lane WHEN 'p2p_transfer' THEN 'external_digital_proof' WHEN 'protected_digital' THEN 'tiwala_protected_digital' ELSE lane END END, status = CASE WHEN legacy_status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded') THEN legacy_status ELSE CASE status WHEN 'not_due' THEN 'created' WHEN 'payer_reported_cash' THEN 'reported' WHEN 'payer_submitted_p2p_proof' THEN 'awaiting_confirmation' WHEN 'proof_rejected' THEN 'awaiting_confirmation' WHEN 'disputed_mismatch' THEN 'disputed' WHEN 'settled' THEN 'counterparty_confirmed' ELSE status END END, platform_fee_amount_minor = COALESCE(legacy_platform_fee_amount_minor, platform_fee_amount_minor), processor_cost_amount_minor = COALESCE(legacy_processor_cost_amount_minor, processor_cost_amount_minor)");
        DB::statement("UPDATE payment_obligations SET due_condition = 'on_acceptance' WHERE due_condition = 'on_work_acceptance'");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_lane CHECK (lane IN ('external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_status CHECK (status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_external_cash_fee CHECK (lane <> 'external_cash' OR platform_fee_amount_minor = 0)");
        Schema::table('payment_obligations', function (Blueprint $table): void {
            $table->dropColumn([
                'supersedes_obligation_id',
                'due_at',
                'settled_at',
                'legacy_lane',
                'legacy_status',
                'legacy_platform_fee_amount_minor',
                'legacy_processor_cost_amount_minor',
            ]);
        });
    }
};

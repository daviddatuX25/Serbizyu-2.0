<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_obligations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('work_instance_id')->nullable();
            $table->text('purpose');
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->text('lane');
            $table->text('status');
            $table->text('due_condition');
            $table->uuid('policy_version_id')->nullable();
            $table->bigInteger('platform_fee_amount_minor')->default(0);
            $table->bigInteger('processor_cost_amount_minor')->default(0);
            $table->uuid('payer_user_id')->nullable();
            $table->uuid('recipient_user_id')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_payment_obligations_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_payment_obligations_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('policy_version_id', 'fk_payment_obligations_policy')->references('id')->on('policy_versions')->restrictOnDelete();
            $table->foreign('payer_user_id', 'fk_payment_obligations_payer')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('recipient_user_id', 'fk_payment_obligations_recipient')->references('id')->on('users')->restrictOnDelete();

            $table->index(['order_id', 'status', 'lane'], 'idx_payment_obligations_order_status_lane');
            $table->index(['work_instance_id', 'status'], 'idx_payment_obligations_work_status');
            $table->index(['status', 'lane'], 'idx_payment_obligations_status_lane');
        });

        DB::statement('ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_amount CHECK (amount_minor >= 0)');
        DB::statement('ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_platform_fee CHECK (platform_fee_amount_minor >= 0)');
        DB::statement('ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_processor_cost CHECK (processor_cost_amount_minor >= 0)');
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_lane CHECK (lane IN ('external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_status CHECK (status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded'))");
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT chk_payment_obligations_external_cash_fee CHECK (lane <> 'external_cash' OR platform_fee_amount_minor = 0)");

        Schema::create('payment_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payment_obligation_id');
            $table->text('event_type');
            $table->text('lane');
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->text('external_reference')->nullable();
            $table->text('provider')->nullable();
            $table->uuid('actor_user_id')->nullable();
            $table->uuid('evidence_file_id')->nullable();
            $table->text('previous_status')->nullable();
            $table->text('new_status');
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->jsonb('payload')->nullable();
            $table->unsignedInteger('payload_version')->nullable();
            $table->timestampTz('occurred_at');
            $table->timestampTz('effective_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('payment_obligation_id', 'fk_payment_events_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('actor_user_id', 'fk_payment_events_actor')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_payment_events_evidence')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->unique(['payment_obligation_id', 'idempotency_key'], 'uq_payment_events_idempotency');
            $table->index(['payment_obligation_id', 'occurred_at'], 'idx_payment_events_obligation_occurred');
            $table->index(['external_reference', 'provider'], 'idx_payment_events_external_provider');
        });

        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_lane CHECK (lane IN ('external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'))");
        DB::statement('ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_amount CHECK (amount_minor >= 0)');
        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_new_status CHECK (new_status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded'))");
        DB::statement("ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_previous_status CHECK (previous_status IS NULL OR previous_status IN ('created', 'due', 'reported', 'awaiting_confirmation', 'counterparty_confirmed', 'provider_verified', 'disputed', 'held', 'eligible_for_release', 'released', 'paid_out', 'refunded', 'partially_refunded', 'reversed', 'cancelled', 'superseded'))");
        DB::statement('ALTER TABLE payment_events ADD CONSTRAINT chk_payment_events_payload_version CHECK ((payload IS NULL AND payload_version IS NULL) OR (payload IS NOT NULL AND payload_version IS NOT NULL))');

        Schema::create('financial_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('account_code');
            $table->text('account_type');
            $table->uuid('owner_user_id')->nullable();
            $table->text('context_type')->nullable();
            $table->uuid('context_id')->nullable();
            $table->char('currency', 3);
            $table->text('status');
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('owner_user_id', 'fk_financial_accounts_owner')->references('id')->on('users')->restrictOnDelete();

            $table->unique(['account_code', 'context_type', 'context_id', 'currency'], 'uq_financial_accounts_code_scope_currency');
            $table->index(['owner_user_id', 'status'], 'idx_financial_accounts_owner_status');
            $table->index(['context_type', 'context_id', 'status'], 'idx_financial_accounts_context_status');
        });

        Schema::create('financial_transactions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('transaction_type');
            $table->uuid('source_payment_event_id')->nullable();
            $table->uuid('source_payment_obligation_id')->nullable();
            $table->char('currency', 3);
            $table->text('status');
            $table->timestampTz('occurred_at');
            $table->timestampTz('effective_at');
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('posted_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('source_payment_event_id', 'fk_financial_transactions_payment_event')->references('id')->on('payment_events')->restrictOnDelete();
            $table->foreign('source_payment_obligation_id', 'fk_financial_transactions_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();

            $table->unique('idempotency_key', 'uq_financial_transactions_idempotency');
            $table->index(['source_payment_event_id', 'occurred_at'], 'idx_financial_transactions_source_time');
            $table->index(['status', 'effective_at'], 'idx_financial_transactions_status_effective');
        });

        DB::statement("ALTER TABLE financial_transactions ADD CONSTRAINT chk_financial_transactions_status CHECK (status IN ('draft', 'posted'))");
        DB::statement('ALTER TABLE financial_transactions ADD CONSTRAINT chk_financial_transactions_source CHECK (source_payment_event_id IS NOT NULL OR source_payment_obligation_id IS NOT NULL)');
        DB::statement("ALTER TABLE financial_transactions ADD CONSTRAINT chk_financial_transactions_posted_at CHECK ((status = 'draft' AND posted_at IS NULL) OR (status = 'posted' AND posted_at IS NOT NULL))");

        Schema::create('financial_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('financial_transaction_id');
            $table->uuid('financial_account_id');
            $table->text('direction');
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->text('reference')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('financial_transaction_id', 'fk_financial_entries_transaction')->references('id')->on('financial_transactions')->restrictOnDelete();
            $table->foreign('financial_account_id', 'fk_financial_entries_account')->references('id')->on('financial_accounts')->restrictOnDelete();

            $table->index(['financial_account_id', 'created_at'], 'idx_financial_entries_account_time');
            $table->index(['financial_transaction_id', 'direction'], 'idx_financial_entries_transaction_direction');
        });

        DB::statement("ALTER TABLE financial_entries ADD CONSTRAINT chk_financial_entries_direction CHECK (direction IN ('debit', 'credit'))");
        DB::statement('ALTER TABLE financial_entries ADD CONSTRAINT chk_financial_entries_amount CHECK (amount_minor > 0)');

        Schema::create('provider_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('provider');
            $table->text('provider_event_id');
            $table->text('event_type');
            $table->jsonb('payload');
            $table->unsignedInteger('payload_version');
            $table->boolean('authenticated');
            $table->uuid('payment_event_id')->nullable();
            $table->uuid('payment_obligation_id')->nullable();
            $table->uuid('financial_transaction_id')->nullable();
            $table->text('processing_status');
            $table->text('processing_error')->nullable();
            $table->timestampTz('received_at');
            $table->timestampTz('processed_at')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('payment_event_id', 'fk_provider_events_payment_event')->references('id')->on('payment_events')->restrictOnDelete();
            $table->foreign('payment_obligation_id', 'fk_provider_events_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('financial_transaction_id', 'fk_provider_events_transaction')->references('id')->on('financial_transactions')->restrictOnDelete();

            $table->unique(['provider', 'provider_event_id'], 'uq_provider_events_identity');
            $table->index(['processing_status', 'received_at'], 'idx_provider_events_processing');
            $table->index(['payment_obligation_id', 'received_at'], 'idx_provider_events_obligation_received');
        });

        DB::statement("ALTER TABLE provider_events ADD CONSTRAINT chk_provider_events_processing_status CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored'))");
        DB::statement("ALTER TABLE provider_events ADD CONSTRAINT chk_provider_events_processed_at CHECK ((processing_status IN ('processed', 'ignored') AND processed_at IS NOT NULL) OR (processing_status IN ('received', 'processing', 'failed') AND processed_at IS NULL))");

        Schema::create('financial_adjustments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('source_payment_obligation_id')->nullable();
            $table->uuid('source_financial_transaction_id')->nullable();
            $table->uuid('resulting_financial_transaction_id')->nullable();
            $table->text('adjustment_type');
            $table->text('reason');
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->uuid('approval_actor_user_id')->nullable();
            $table->uuid('policy_version_id')->nullable();
            $table->text('status');
            $table->text('external_reference')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('source_payment_obligation_id', 'fk_financial_adjustments_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('source_financial_transaction_id', 'fk_financial_adjustments_source_transaction')->references('id')->on('financial_transactions')->restrictOnDelete();
            $table->foreign('resulting_financial_transaction_id', 'fk_financial_adjustments_result_transaction')->references('id')->on('financial_transactions')->restrictOnDelete();
            $table->foreign('approval_actor_user_id', 'fk_financial_adjustments_approver')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('policy_version_id', 'fk_financial_adjustments_policy')->references('id')->on('policy_versions')->restrictOnDelete();

            $table->index(['source_payment_obligation_id', 'status'], 'idx_financial_adjustments_obligation_status');
            $table->index(['source_financial_transaction_id', 'created_at'], 'idx_financial_adjustments_transaction_time');
        });

        DB::statement('ALTER TABLE financial_adjustments ADD CONSTRAINT chk_financial_adjustments_amount CHECK (amount_minor >= 0)');
        DB::statement('ALTER TABLE financial_adjustments ADD CONSTRAINT chk_financial_adjustments_source CHECK (source_payment_obligation_id IS NOT NULL OR source_financial_transaction_id IS NOT NULL)');
        DB::statement("ALTER TABLE financial_adjustments ADD CONSTRAINT chk_financial_adjustments_status CHECK (status IN ('requested', 'approved', 'applied', 'rejected', 'cancelled'))");
        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '004',
            'status' => 'completed',
            'checksum' => hash_file('sha256', __FILE__),
            'started_at' => now(),
            'completed_at' => now(),
            'operator' => null,
            'version' => 1,
            'correlation_id' => Str::uuid7()->toString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('migration_checkpoints')->where('batch', '004')->delete();
        Schema::dropIfExists('financial_adjustments');
        Schema::dropIfExists('provider_events');
        Schema::dropIfExists('financial_entries');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('financial_accounts');
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('payment_obligations');
    }
};

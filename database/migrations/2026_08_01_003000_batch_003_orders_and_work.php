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
        Schema::create('orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('origin');
            $table->text('mechanism');
            $table->uuid('listing_id')->nullable();
            $table->uuid('request_id')->nullable();
            $table->uuid('quote_id')->nullable();
            $table->uuid('buyer_user_id')->nullable();
            $table->uuid('provider_user_id')->nullable();
            $table->text('status');
            $table->text('geography')->nullable();
            $table->uuid('deal_chain_id')->nullable();
            $table->uuid('deal_need_id')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('listing_id', 'fk_orders_listing')->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('request_id', 'fk_orders_request')->references('id')->on('requests')->restrictOnDelete();
            $table->foreign('quote_id', 'fk_orders_quote')->references('id')->on('quotes')->restrictOnDelete();
            $table->foreign('buyer_user_id', 'fk_orders_buyer')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('provider_user_id', 'fk_orders_provider')->references('id')->on('users')->restrictOnDelete();
            $table->foreign(['deal_chain_id', 'deal_need_id'], 'fk_orders_deal_need')->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();

            $table->index(['status', 'updated_at'], 'idx_orders_status_updated');
            $table->index(['geography', 'status'], 'idx_orders_geography_status');
            $table->index(['buyer_user_id', 'status'], 'idx_orders_buyer_status');
            $table->index(['provider_user_id', 'status'], 'idx_orders_provider_status');
            $table->index(['deal_need_id', 'status'], 'idx_orders_deal_need_status');
        });

        DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_orders_status CHECK (status IN ('draft', 'pending_acceptance', 'accepted', 'cancel_requested', 'cancelled', 'closed'))");
        DB::statement('ALTER TABLE orders ADD CONSTRAINT chk_orders_deal_lineage CHECK ((deal_chain_id IS NULL AND deal_need_id IS NULL) OR (deal_chain_id IS NOT NULL AND deal_need_id IS NOT NULL))');
        DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_orders_origin_lineage CHECK ((origin = 'deal_chain' AND deal_chain_id IS NOT NULL AND deal_need_id IS NOT NULL) OR (origin <> 'deal_chain' AND deal_chain_id IS NULL AND deal_need_id IS NULL))");
        DB::statement("CREATE UNIQUE INDEX uq_orders_active_deal_need ON orders (deal_need_id) WHERE deal_need_id IS NOT NULL AND status NOT IN ('cancelled', 'closed')");

        Schema::create('order_parties', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('user_id');
            $table->text('party_type');
            $table->text('responsibility');
            $table->jsonb('scope');
            $table->uuid('consent_grant_id')->nullable();
            $table->text('status');
            $table->timestampTz('effective_at');
            $table->timestampTz('ended_at')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_order_parties_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('user_id', 'fk_order_parties_user')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('consent_grant_id', 'fk_order_parties_consent')->references('id')->on('consent_grants')->restrictOnDelete();

            $table->index(['order_id', 'status'], 'idx_order_parties_order_status');
            $table->index(['user_id', 'status'], 'idx_order_parties_user_status');
        });

        DB::statement("CREATE UNIQUE INDEX uq_order_parties_active_scope ON order_parties (order_id, party_type, responsibility) WHERE status = 'active'");

        Schema::create('order_terms_snapshots', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->unsignedInteger('snapshot_version');
            $table->uuid('source_listing_version_id')->nullable();
            $table->uuid('source_quote_id')->nullable();
            $table->jsonb('scope');
            $table->unsignedInteger('scope_payload_version');
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->jsonb('payment_lane_options');
            $table->unsignedInteger('payment_lane_options_payload_version');
            $table->jsonb('cancellation_rules');
            $table->unsignedInteger('cancellation_rules_payload_version');
            $table->jsonb('review_rules');
            $table->unsignedInteger('review_rules_payload_version');
            $table->uuid('policy_version_id')->nullable();
            $table->uuid('accepted_by_user_id')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('order_id', 'fk_order_terms_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('source_listing_version_id', 'fk_order_terms_listing_version')->references('id')->on('listing_versions')->restrictOnDelete();
            $table->foreign('source_quote_id', 'fk_order_terms_quote')->references('id')->on('quotes')->restrictOnDelete();
            $table->foreign('policy_version_id', 'fk_order_terms_policy')->references('id')->on('policy_versions')->restrictOnDelete();
            $table->foreign('accepted_by_user_id', 'fk_order_terms_acceptor')->references('id')->on('users')->restrictOnDelete();

            $table->unique(['order_id', 'snapshot_version'], 'uq_order_terms_order_version');
            $table->index(['order_id', 'created_at'], 'idx_order_terms_order_created');
        });

        DB::statement('ALTER TABLE order_terms_snapshots ADD CONSTRAINT chk_order_terms_amount CHECK (amount_minor >= 0)');

        Schema::create('work_instances', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('capability_profile_id')->nullable();
            $table->text('work_shape');
            $table->text('status');
            $table->timestampTz('scheduled_at')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completion_proposed_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->jsonb('structure')->nullable();
            $table->unsignedInteger('structure_payload_version')->nullable();
            $table->uuid('completion_evidence_id')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_work_instances_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('capability_profile_id', 'fk_work_instances_capability')->references('id')->on('capability_profiles')->restrictOnDelete();
            $table->foreign('completion_evidence_id', 'fk_work_instances_completion_evidence')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->index(['status', 'scheduled_at'], 'idx_work_instances_status_schedule');
            $table->index(['order_id', 'status'], 'idx_work_instances_order_status');
            $table->index(['status', 'updated_at'], 'idx_work_instances_status_updated');
        });

        DB::statement("ALTER TABLE work_instances ADD CONSTRAINT chk_work_instances_status CHECK (status IN ('not_started', 'scheduled', 'in_progress', 'completion_proposed', 'awaiting_signoff', 'completed', 'disputed', 'cancel_requested', 'cancelled', 'failed'))");
        DB::statement('ALTER TABLE work_instances ADD CONSTRAINT chk_work_instances_structure_version CHECK ((structure IS NULL AND structure_payload_version IS NULL) OR (structure IS NOT NULL AND structure_payload_version IS NOT NULL))');

        Schema::create('work_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('work_instance_id');
            $table->text('previous_status')->nullable();
            $table->text('new_status');
            $table->text('event_type');
            $table->unsignedInteger('event_version');
            $table->uuid('actor_user_id')->nullable();
            $table->uuid('evidence_file_id')->nullable();
            $table->jsonb('payload')->nullable();
            $table->unsignedInteger('payload_version')->nullable();
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->timestampTz('occurred_at');
            $table->timestampTz('effective_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('work_instance_id', 'fk_work_events_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('actor_user_id', 'fk_work_events_actor')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_work_events_evidence')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->unique(['work_instance_id', 'idempotency_key'], 'uq_work_events_idempotency');
            $table->index(['work_instance_id', 'occurred_at'], 'idx_work_events_work_occurred');
            $table->index(['new_status', 'occurred_at'], 'idx_work_events_status_occurred');
        });

        DB::statement("ALTER TABLE work_events ADD CONSTRAINT chk_work_events_new_status CHECK (new_status IN ('not_started', 'scheduled', 'in_progress', 'completion_proposed', 'awaiting_signoff', 'completed', 'disputed', 'cancel_requested', 'cancelled', 'failed'))");
        DB::statement("ALTER TABLE work_events ADD CONSTRAINT chk_work_events_previous_status CHECK (previous_status IS NULL OR previous_status IN ('not_started', 'scheduled', 'in_progress', 'completion_proposed', 'awaiting_signoff', 'completed', 'disputed', 'cancel_requested', 'cancelled', 'failed'))");
        DB::statement('ALTER TABLE work_events ADD CONSTRAINT chk_work_events_payload_version CHECK ((payload IS NULL AND payload_version IS NULL) OR (payload IS NOT NULL AND payload_version IS NOT NULL))');
        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '003',
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
        DB::table('migration_checkpoints')->where('batch', '003')->delete();
        Schema::dropIfExists('work_events');
        Schema::dropIfExists('work_instances');
        Schema::dropIfExists('order_terms_snapshots');
        Schema::dropIfExists('order_parties');
        Schema::dropIfExists('orders');
    }
};

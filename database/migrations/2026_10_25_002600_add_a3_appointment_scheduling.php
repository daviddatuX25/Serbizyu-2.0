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
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('provider_schedule_resources', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('provider_user_id')->unique('uq_provider_schedule_resources_provider');
            $table->unsignedInteger('row_version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->foreign('provider_user_id', 'fk_provider_schedule_resources_provider')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('appointment_reservations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('schedule_resource_id');
            $table->uuid('listing_id')->nullable();
            $table->uuid('listing_version_id')->nullable();
            $table->uuid('source_quote_id')->nullable();
            $table->unsignedInteger('source_quote_version')->nullable();
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('created_by_user_id');
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->unsignedSmallInteger('duration_minutes');
            $table->text('status');
            $table->timestampTz('hold_expires_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->foreign('schedule_resource_id', 'fk_appointment_reservations_resource')->references('id')->on('provider_schedule_resources')->restrictOnDelete();
            $table->foreign('listing_id', 'fk_appointment_reservations_listing')->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('listing_version_id', 'fk_appointment_reservations_listing_version')->references('id')->on('listing_versions')->restrictOnDelete();
            $table->foreign('source_quote_id', 'fk_appointment_reservations_quote')->references('id')->on('quotes')->restrictOnDelete();
            $table->foreign('order_id', 'fk_appointment_reservations_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_appointment_reservations_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_appointment_reservations_creator')->references('id')->on('users')->restrictOnDelete();
            $table->index(['schedule_resource_id', 'starts_at', 'ends_at'], 'idx_appointment_reservations_interval');
            $table->index(['status', 'hold_expires_at'], 'idx_appointment_reservations_expiry');
            $table->index(['source_quote_id', 'source_quote_version'], 'idx_appointment_reservations_quote_source');
        });
        DB::statement("ALTER TABLE appointment_reservations ADD CONSTRAINT ck_appointment_reservations_status CHECK (status IN ('held', 'committed', 'released', 'expired'))");
        DB::statement('ALTER TABLE appointment_reservations ADD CONSTRAINT ck_appointment_reservations_interval CHECK (starts_at < ends_at AND duration_minutes > 0)');
        DB::statement("ALTER TABLE appointment_reservations ADD CONSTRAINT ck_appointment_reservations_state CHECK ((status = 'held' AND hold_expires_at IS NOT NULL AND order_id IS NULL AND work_instance_id IS NULL) OR (status = 'committed' AND hold_expires_at IS NULL AND order_id IS NOT NULL AND work_instance_id IS NOT NULL) OR (status IN ('released', 'expired')))");
        DB::statement('ALTER TABLE appointment_reservations ADD CONSTRAINT ck_appointment_reservations_source CHECK ((source_quote_id IS NOT NULL AND source_quote_version IS NOT NULL AND listing_id IS NULL AND listing_version_id IS NULL) OR (source_quote_id IS NULL AND source_quote_version IS NULL AND listing_id IS NOT NULL AND listing_version_id IS NOT NULL))');
        DB::statement("CREATE UNIQUE INDEX uq_appointment_reservation_order ON appointment_reservations (order_id) WHERE order_id IS NOT NULL AND status = 'committed'");

        Schema::create('provider_agenda_blocks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('schedule_resource_id');
            $table->uuid('created_by_user_id');
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->text('reason')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('schedule_resource_id', 'fk_provider_agenda_blocks_resource')->references('id')->on('provider_schedule_resources')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_provider_agenda_blocks_creator')->references('id')->on('users')->restrictOnDelete();
            $table->index(['schedule_resource_id', 'starts_at', 'ends_at'], 'idx_provider_agenda_blocks_interval');
        });
        DB::statement('ALTER TABLE provider_agenda_blocks ADD CONSTRAINT ck_provider_agenda_blocks_interval CHECK (starts_at < ends_at)');

        Schema::create('work_schedule_change_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('work_instance_id');
            $table->uuid('current_reservation_id');
            $table->uuid('proposed_reservation_id');
            $table->uuid('proposed_by_user_id');
            $table->uuid('responded_by_user_id')->nullable();
            $table->timestampTz('responded_at')->nullable();
            $table->text('status');
            $table->text('reason')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->foreign('order_id', 'fk_schedule_changes_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_schedule_changes_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('current_reservation_id', 'fk_schedule_changes_current_reservation')->references('id')->on('appointment_reservations')->restrictOnDelete();
            $table->foreign('proposed_reservation_id', 'fk_schedule_changes_proposed_reservation')->references('id')->on('appointment_reservations')->restrictOnDelete();
            $table->foreign('proposed_by_user_id', 'fk_schedule_changes_proposer')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('responded_by_user_id', 'fk_schedule_changes_responder')->references('id')->on('users')->restrictOnDelete();
            $table->index(['order_id', 'created_at'], 'idx_schedule_changes_order_created');
        });
        DB::statement("ALTER TABLE work_schedule_change_requests ADD CONSTRAINT ck_schedule_changes_status CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired'))");
        DB::statement("CREATE UNIQUE INDEX uq_schedule_changes_single_pending ON work_schedule_change_requests (order_id) WHERE status = 'pending'");

        Schema::create('work_schedule_history', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('work_instance_id');
            $table->uuid('schedule_change_request_id');
            $table->uuid('previous_reservation_id');
            $table->uuid('new_reservation_id');
            $table->uuid('actor_user_id');
            $table->timestampTz('changed_at')->useCurrent();
            $table->uuid('correlation_id');
            $table->foreign('order_id', 'fk_schedule_history_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_schedule_history_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('schedule_change_request_id', 'fk_schedule_history_request')->references('id')->on('work_schedule_change_requests')->restrictOnDelete();
            $table->foreign('previous_reservation_id', 'fk_schedule_history_previous')->references('id')->on('appointment_reservations')->restrictOnDelete();
            $table->foreign('new_reservation_id', 'fk_schedule_history_new')->references('id')->on('appointment_reservations')->restrictOnDelete();
            $table->foreign('actor_user_id', 'fk_schedule_history_actor')->references('id')->on('users')->restrictOnDelete();
            $table->unique('schedule_change_request_id', 'uq_schedule_history_request');
        });
        Schema::table('appointment_reservations', function (Blueprint $table): void {
            $table->string('idempotency_key', 128)->nullable();
            $table->unique(['created_by_user_id', 'idempotency_key'], 'uq_appointment_reservations_customer_key');
        });
        Schema::table('order_proposals', function (Blueprint $table): void {
            $table->uuid('appointment_reservation_id')->nullable();
            $table->foreign('appointment_reservation_id', 'fk_order_proposals_appointment_reservation')
                ->references('id')->on('appointment_reservations')->restrictOnDelete();
        });
        DB::statement("CREATE UNIQUE INDEX uq_order_proposals_appointment_reservation ON order_proposals (appointment_reservation_id) WHERE appointment_reservation_id IS NOT NULL AND status = 'proposed'");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }
        DB::statement('DROP INDEX IF EXISTS uq_order_proposals_appointment_reservation');
        Schema::table('order_proposals', function (Blueprint $table): void {
            $table->dropForeign('fk_order_proposals_appointment_reservation');
            $table->dropColumn('appointment_reservation_id');
        });
        Schema::table('appointment_reservations', function (Blueprint $table): void {
            $table->dropUnique('uq_appointment_reservations_customer_key');
            $table->dropColumn('idempotency_key');
        });

        Schema::dropIfExists('work_schedule_history');
        Schema::dropIfExists('work_schedule_change_requests');
        Schema::dropIfExists('provider_agenda_blocks');
        Schema::dropIfExists('appointment_reservations');
        Schema::dropIfExists('provider_schedule_resources');
    }
};

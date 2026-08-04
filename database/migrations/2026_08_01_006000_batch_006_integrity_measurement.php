<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('idempotency_keys', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('scope', 191);
            $table->string('key', 255);
            $table->uuid('actor_user_id')->nullable();
            $table->char('request_hash', 64);
            $table->uuid('response_event_id')->nullable();
            $table->string('response_reference', 191)->nullable();
            $table->string('status', 24);
            $table->timestampTz('expires_at');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');

            $table->unique(['scope', 'key'], 'idempotency_keys_scope_key_uq');
            $table->foreign('actor_user_id', 'idempotency_keys_actor_user_fk')
                ->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('audit_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('actor_user_id')->nullable();
            $table->uuid('acting_for_user_id')->nullable();
            $table->string('action', 191);
            $table->string('target_type', 100);
            $table->uuid('target_id')->nullable();
            $table->uuid('order_id')->nullable();
            $table->uuid('payment_obligation_id')->nullable();
            $table->uuid('idempotency_key_id')->nullable();
            $table->uuid('migration_checkpoint_id')->nullable();
            $table->jsonb('previous_value_summary')->nullable();
            $table->jsonb('new_value_summary')->nullable();
            $table->text('reason')->nullable();
            $table->string('command_name', 191)->nullable();
            $table->unsignedInteger('expected_version')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('occurred_at');
            $table->timestampTz('created_at');

            $table->foreign('actor_user_id', 'audit_events_actor_user_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('acting_for_user_id', 'audit_events_acting_for_user_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('order_id', 'audit_events_order_fk')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('payment_obligation_id', 'audit_events_payment_obligation_fk')
                ->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('idempotency_key_id', 'audit_events_idempotency_key_fk')
                ->references('id')->on('idempotency_keys')->restrictOnDelete();
            $table->foreign('migration_checkpoint_id', 'audit_events_checkpoint_fk')
                ->references('id')->on('migration_checkpoints')->restrictOnDelete();
        });

        Schema::create('outbox_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('event_id');
            $table->string('event_type', 191);
            $table->string('aggregate_type', 100);
            $table->uuid('aggregate_id');
            $table->uuid('audit_event_id')->nullable();
            $table->unsignedInteger('payload_version');
            $table->jsonb('payload');
            $table->string('status', 24);
            $table->unsignedInteger('attempt_count');
            $table->timestampTz('next_attempt_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');

            $table->unique('event_id', 'outbox_messages_event_id_uq');
            $table->foreign('audit_event_id', 'outbox_messages_audit_event_fk')
                ->references('id')->on('audit_events')->restrictOnDelete();
        });

        Schema::create('cohort_classifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('actor_user_id')->nullable();
            $table->uuid('order_id')->nullable();
            $table->uuid('audit_event_id')->nullable();
            $table->string('cohort_class', 32);
            $table->string('geography', 128)->nullable();
            $table->string('source', 64);
            $table->uuid('classified_by_user_id')->nullable();
            $table->timestampTz('classified_at');
            $table->text('reason')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');

            $table->foreign('actor_user_id', 'cohort_classifications_actor_user_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('order_id', 'cohort_classifications_order_fk')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('audit_event_id', 'cohort_classifications_audit_event_fk')
                ->references('id')->on('audit_events')->restrictOnDelete();
            $table->foreign('classified_by_user_id', 'cohort_classifications_classifier_fk')
                ->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('retention_holds', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('evidence_file_id')->nullable();
            $table->string('target_type', 100)->nullable();
            $table->uuid('target_id')->nullable();
            $table->string('hold_type', 32);
            $table->string('status', 24);
            $table->text('reason');
            $table->uuid('placed_by_user_id')->nullable();
            $table->uuid('released_by_user_id')->nullable();
            $table->timestampTz('starts_at');
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('released_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');

            $table->foreign('evidence_file_id', 'retention_holds_evidence_file_fk')
                ->references('id')->on('evidence_files')->restrictOnDelete();
            $table->foreign('placed_by_user_id', 'retention_holds_placed_by_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('released_by_user_id', 'retention_holds_released_by_fk')
                ->references('id')->on('users')->nullOnDelete();
        });

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '006',
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
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::dropIfExists('retention_holds');
        Schema::dropIfExists('cohort_classifications');
        Schema::dropIfExists('outbox_messages');
        Schema::dropIfExists('audit_events');
        DB::table('migration_checkpoints')->where('batch', '006')->delete();
        Schema::dropIfExists('idempotency_keys');
    }
};

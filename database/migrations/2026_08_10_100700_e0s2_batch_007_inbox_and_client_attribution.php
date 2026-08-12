<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

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

        Schema::create('inbox_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('consumer');
            $table->uuid('source_event_id');
            $table->text('aggregate_type');
            $table->uuid('aggregate_id');
            $table->unsignedInteger('aggregate_version');
            $table->unsignedBigInteger('aggregate_sequence');
            $table->unsignedInteger('event_contract_version');
            $table->unsignedInteger('payload_contract_version');
            $table->text('payload_hash');
            $table->jsonb('payload')->default('{}');
            $table->text('status');
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedBigInteger('prior_sequence')->nullable();
            $table->timestampTz('processed_at')->nullable();
            $table->timestampTz('next_attempt_at')->nullable();
            $table->text('error_code')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['consumer', 'source_event_id'], 'uq_inbox_messages_consumer_event');
            $table->unique(['consumer', 'aggregate_type', 'aggregate_id', 'aggregate_sequence'], 'uq_inbox_messages_consumer_aggregate_sequence');
            $table->index(['status', 'next_attempt_at'], 'idx_inbox_messages_due');
            $table->index(['status', 'updated_at'], 'idx_inbox_messages_gap_dead');
        });

        DB::statement("ALTER TABLE inbox_messages ADD CONSTRAINT ck_inbox_messages_status CHECK (status IN ('received', 'processing', 'processed', 'gap', 'unsupported', 'dead_letter'))");
        DB::statement('ALTER TABLE inbox_messages ADD CONSTRAINT ck_inbox_messages_versions CHECK (aggregate_version > 0 AND event_contract_version > 0 AND payload_contract_version > 0)');
        DB::statement('ALTER TABLE inbox_messages ADD CONSTRAINT ck_inbox_messages_sequence CHECK (aggregate_sequence >= 0 AND attempts >= 0)');

        Schema::table('audit_events', function (Blueprint $table): void {
            $table->uuid('integration_client_id')->nullable();
        });
        Schema::table('idempotency_keys', function (Blueprint $table): void {
            $table->uuid('integration_client_id')->nullable();
        });
        Schema::table('outbox_messages', function (Blueprint $table): void {
            $table->uuid('integration_client_id')->nullable();
        });

        // FKs added in Batch 008 after integration_clients exists.
        canonical58_checkpoint_complete('007', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('007');

        Schema::table('outbox_messages', function (Blueprint $table): void {
            $table->dropColumn('integration_client_id');
        });
        Schema::table('idempotency_keys', function (Blueprint $table): void {
            $table->dropColumn('integration_client_id');
        });
        Schema::table('audit_events', function (Blueprint $table): void {
            $table->dropColumn('integration_client_id');
        });

        Schema::dropIfExists('inbox_messages');
    }
};

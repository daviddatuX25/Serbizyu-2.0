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
        Schema::create('order_handoff_transfers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->unique()->constrained('orders')->restrictOnDelete();
            $table->foreignUuid('work_instance_id')->constrained('work_instances')->restrictOnDelete();
            $table->string('status', 24);
            $table->string('transfer_mode', 24)->nullable();
            $table->foreignUuid('prepared_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('offered_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('offered_to_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('departed_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('received_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('prepared_evidence_file_id')->constrained('evidence_files')->restrictOnDelete();
            $table->foreignUuid('custody_evidence_file_id')->nullable()->constrained('evidence_files')->restrictOnDelete();
            $table->foreignUuid('receipt_evidence_file_id')->nullable()->constrained('evidence_files')->restrictOnDelete();
            $table->string('prepared_idempotency_key', 128);
            $table->string('custody_idempotency_key', 128)->nullable();
            $table->string('accept_idempotency_key', 128)->nullable();
            $table->string('receipt_idempotency_key', 128)->nullable();
            $table->timestampTz('prepared_at');
            $table->timestampTz('offered_at')->nullable();
            $table->timestampTz('departed_at')->nullable();
            $table->timestampTz('received_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampsTz();
            $table->unique(['order_id', 'prepared_idempotency_key'], 'order_handoff_prepared_idempotency_uq');
            $table->index(['status', 'updated_at'], 'order_handoff_status_updated_idx');
        });

        DB::statement("ALTER TABLE order_handoff_transfers ADD CONSTRAINT order_handoff_status_ck CHECK (status IN ('prepared', 'offered', 'departed', 'received'))");
        DB::statement("ALTER TABLE order_handoff_transfers ADD CONSTRAINT order_handoff_mode_ck CHECK (transfer_mode IS NULL OR transfer_mode IN ('counter_pickup', 'courier_delivery'))");
        DB::statement('ALTER TABLE order_handoff_transfers ADD CONSTRAINT order_handoff_version_ck CHECK (version > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('order_handoff_transfers');
    }
};

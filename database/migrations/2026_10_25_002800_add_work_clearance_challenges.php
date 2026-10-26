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
        Schema::create('work_clearance_challenges', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('work_instance_id');
            $table->text('node_id');
            $table->text('kind');
            $table->uuid('issuer_user_id');
            $table->uuid('verifier_user_id');
            $table->uuid('consumed_by_user_id')->nullable();
            $table->char('code_digest', 64);
            $table->unsignedSmallInteger('code_length');
            $table->unsignedInteger('work_version');
            $table->unsignedSmallInteger('attempt_count')->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(5);
            $table->timestampTz('issued_at');
            $table->timestampTz('expires_at');
            $table->timestampTz('consumed_at')->nullable();
            $table->timestampTz('invalidated_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_work_challenges_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_work_challenges_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('issuer_user_id', 'fk_work_challenges_issuer')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('verifier_user_id', 'fk_work_challenges_verifier')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('consumed_by_user_id', 'fk_work_challenges_consumer')->references('id')->on('users')->restrictOnDelete();
            $table->index(['work_instance_id', 'node_id', 'issued_at'], 'idx_work_challenges_node_issued');
            $table->index(['issuer_user_id', 'issued_at'], 'idx_work_challenges_issuer_issued');
        });

        DB::statement("ALTER TABLE work_clearance_challenges ADD CONSTRAINT ck_work_challenges_kind_length CHECK ((kind = 'presence_otp' AND code_length = 4) OR (kind = 'worker_dropoff' AND code_length = 6))");
        DB::statement('ALTER TABLE work_clearance_challenges ADD CONSTRAINT ck_work_challenges_attempt_bounds CHECK (max_attempts > 0 AND attempt_count <= max_attempts)');
        DB::statement('ALTER TABLE work_clearance_challenges ADD CONSTRAINT ck_work_challenges_consumption CHECK ((consumed_at IS NULL AND consumed_by_user_id IS NULL) OR (consumed_at IS NOT NULL AND consumed_by_user_id IS NOT NULL))');
        DB::statement('CREATE UNIQUE INDEX uq_work_challenges_active_node ON work_clearance_challenges (work_instance_id, node_id) WHERE consumed_at IS NULL AND invalidated_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('work_clearance_challenges');
    }
};

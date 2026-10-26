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
        Schema::create('lupon_packets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('case_id')->references('id')->on('support_cases')->restrictOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 24)->default('prepared');
            $table->string('recipient', 160);
            $table->timestampTz('transmitted_at')->nullable();
            $table->uuid('transmitted_by_user_id')->nullable();
            $table->string('return_kind', 32)->nullable();
            $table->timestampTz('returned_at')->nullable();
            $table->uuid('returned_evidence_file_id')->nullable();
            $table->string('cabinet_code', 80)->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->uuid('archived_by_user_id')->nullable();
            $table->string('idempotency_scope', 180);
            $table->string('idempotency_key', 120);
            $table->char('request_hash', 64);
            $table->string('correlation_id', 64);
            $table->timestampsTz();
            $table->unique(['idempotency_scope', 'idempotency_key'], 'uq_lupon_packets_idempotency');
            $table->index(['case_id', 'created_at'], 'idx_lupon_packets_case_created');
            $table->foreign('transmitted_by_user_id', 'fk_lupon_packets_transmitter')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('returned_evidence_file_id', 'fk_lupon_packets_return_evidence')->references('id')->on('evidence_files')->restrictOnDelete();
            $table->foreign('archived_by_user_id', 'fk_lupon_packets_archiver')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('lupon_packet_artifacts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('packet_id')->references('id')->on('lupon_packets')->restrictOnDelete();
            $table->string('kind', 32);
            $table->string('filename', 160);
            $table->string('media_type', 100);
            $table->string('storage_key', 512)->unique('uq_lupon_artifacts_storage_key');
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('created_at');
            $table->unique(['packet_id', 'kind'], 'uq_lupon_artifacts_packet_kind');
            $table->index(['packet_id', 'created_at'], 'idx_lupon_artifacts_packet_created');
        });

        Schema::create('lupon_packet_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('packet_id')->references('id')->on('lupon_packets')->restrictOnDelete();
            $table->string('event_type', 40);
            $table->uuid('actor_user_id');
            $table->jsonb('payload')->default(DB::raw("'{}'::jsonb"));
            $table->string('idempotency_key', 120);
            $table->string('correlation_id', 64);
            $table->timestampTz('occurred_at');
            $table->unique(['packet_id', 'idempotency_key'], 'uq_lupon_packet_events_idempotency');
            $table->foreign('actor_user_id', 'fk_lupon_packet_events_actor')->references('id')->on('users')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_status CHECK (status IN ('prepared', 'transmitted', 'returned', 'archived'))");
        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_version CHECK (version > 0)");
        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_return_state CHECK ((return_kind IS NULL AND returned_at IS NULL AND returned_evidence_file_id IS NULL AND cabinet_code IS NULL) OR (return_kind IN ('signed_kasunduan', 'katibayan') AND returned_at IS NOT NULL AND returned_evidence_file_id IS NOT NULL AND cabinet_code IS NOT NULL))");
        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_transmission_state CHECK ((status = 'prepared' AND transmitted_at IS NULL AND transmitted_by_user_id IS NULL) OR (status IN ('transmitted', 'returned', 'archived') AND transmitted_at IS NOT NULL AND transmitted_by_user_id IS NOT NULL))");
        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_return_status CHECK ((status IN ('prepared', 'transmitted') AND return_kind IS NULL) OR (status IN ('returned', 'archived') AND return_kind IS NOT NULL))");
        DB::statement("ALTER TABLE lupon_packets ADD CONSTRAINT ck_lupon_packets_archive_state CHECK ((status <> 'archived' AND archived_at IS NULL AND archived_by_user_id IS NULL) OR (status = 'archived' AND archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL AND cabinet_code IS NOT NULL))");
        DB::statement("ALTER TABLE lupon_packet_artifacts ADD CONSTRAINT ck_lupon_artifacts_kind CHECK (kind IN ('transmittal_letter', 'exhibit_manifest', 'kasunduan_worksheet'))");
        DB::statement('ALTER TABLE lupon_packet_artifacts ADD CONSTRAINT ck_lupon_artifacts_size CHECK (size_bytes > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('lupon_packet_events');
        Schema::dropIfExists('lupon_packet_artifacts');
        Schema::dropIfExists('lupon_packets');
    }
};
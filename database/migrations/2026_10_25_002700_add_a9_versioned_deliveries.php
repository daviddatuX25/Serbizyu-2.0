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
        Schema::create('work_deliveries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('work_instance_id');
            $table->unsignedInteger('version');
            $table->text('status');
            $table->jsonb('manifest')->nullable();
            $table->char('manifest_hash', 64)->nullable();
            $table->uuid('created_by_user_id');
            $table->timestampTz('submitted_at')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('superseded_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('work_instance_id', 'fk_work_deliveries_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_work_deliveries_creator')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['work_instance_id', 'version'], 'uq_work_deliveries_work_version');
            $table->index(['work_instance_id', 'status'], 'idx_work_deliveries_work_status');
        });
        DB::statement("ALTER TABLE work_deliveries ADD CONSTRAINT ck_work_deliveries_status CHECK (status IN ('draft', 'submitted', 'accepted', 'superseded'))");
        DB::statement("ALTER TABLE work_deliveries ADD CONSTRAINT ck_work_deliveries_manifest CHECK ((status = 'draft' AND manifest IS NULL AND manifest_hash IS NULL AND submitted_at IS NULL) OR (status <> 'draft' AND manifest IS NOT NULL AND manifest_hash IS NOT NULL AND submitted_at IS NOT NULL))");
        DB::statement("CREATE UNIQUE INDEX uq_work_deliveries_single_draft ON work_deliveries (work_instance_id) WHERE status = 'draft'");

        Schema::create('work_deliverable_files', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('work_delivery_id');
            $table->uuid('evidence_file_id');
            $table->unsignedSmallInteger('ordinal');
            $table->text('filename');
            $table->foreign('work_delivery_id', 'fk_work_deliverable_files_delivery')->references('id')->on('work_deliveries')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_work_deliverable_files_evidence')->references('id')->on('evidence_files')->restrictOnDelete();
            $table->unique(['work_delivery_id', 'ordinal'], 'uq_work_deliverable_files_ordinal');
            $table->unique(['work_delivery_id', 'evidence_file_id'], 'uq_work_deliverable_files_evidence');
            $table->index('evidence_file_id', 'idx_work_deliverable_files_evidence');
        });

        Schema::create('work_revision_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('work_instance_id');
            $table->uuid('work_delivery_id');
            $table->uuid('requested_by_user_id');
            $table->unsignedInteger('revision_number');
            $table->text('message');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('work_instance_id', 'fk_work_revision_requests_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('work_delivery_id', 'fk_work_revision_requests_delivery')->references('id')->on('work_deliveries')->restrictOnDelete();
            $table->foreign('requested_by_user_id', 'fk_work_revision_requests_requester')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['work_instance_id', 'revision_number'], 'uq_work_revision_requests_number');
            $table->index(['work_instance_id', 'created_at'], 'idx_work_revision_requests_work');
        });

        Schema::table('work_instances', function (Blueprint $table): void {
            $table->uuid('current_delivery_id')->nullable();
            $table->foreign('current_delivery_id', 'fk_work_instances_current_delivery')->references('id')->on('work_deliveries')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_instances', function (Blueprint $table): void {
            $table->dropForeign('fk_work_instances_current_delivery');
            $table->dropColumn('current_delivery_id');
        });
        Schema::dropIfExists('work_revision_requests');
        Schema::dropIfExists('work_deliverable_files');
        Schema::dropIfExists('work_deliveries');
    }
};

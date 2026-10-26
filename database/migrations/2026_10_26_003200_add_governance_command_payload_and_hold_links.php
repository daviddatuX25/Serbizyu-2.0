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
        Schema::table('command_approvals', function (Blueprint $table): void {
            $table->jsonb('command_payload')->nullable();
            $table->jsonb('command_result')->nullable();
            $table->uuid('support_case_id')->nullable();
            $table->unsignedInteger('command_version')->default(1);
            $table->foreign('support_case_id', 'fk_command_approvals_case')->references('id')->on('support_cases')->restrictOnDelete();
        });

        Schema::table('administrative_holds', function (Blueprint $table): void {
            $table->uuid('support_case_id')->nullable();
            $table->uuid('placement_approval_id')->nullable();
            $table->uuid('release_approval_id')->nullable();
            $table->text('source_kind')->default('automatic');
            $table->foreign('support_case_id', 'fk_administrative_holds_case')->references('id')->on('support_cases')->restrictOnDelete();
            $table->foreign('placement_approval_id', 'fk_administrative_holds_placement_approval')->references('id')->on('command_approvals')->restrictOnDelete();
            $table->foreign('release_approval_id', 'fk_administrative_holds_release_approval')->references('id')->on('command_approvals')->restrictOnDelete();
        });
        DB::statement(<<<'SQL'
            UPDATE administrative_holds AS hold
            SET support_case_id = cases.id
            FROM support_cases AS cases
            WHERE hold.source_kind = 'automatic'
              AND hold.support_case_id IS NULL
              AND hold.release_conditions->>'case_id' = cases.id::text
            SQL);

        DB::statement("ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_command_version CHECK (command_version > 0)");
        DB::statement("ALTER TABLE administrative_holds ADD CONSTRAINT ck_administrative_holds_source_kind CHECK (source_kind IN ('automatic', 'manual'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE command_approvals DROP CONSTRAINT IF EXISTS ck_command_approvals_command_version');
        DB::statement('ALTER TABLE administrative_holds DROP CONSTRAINT IF EXISTS ck_administrative_holds_source_kind');
        Schema::table('administrative_holds', function (Blueprint $table): void {
            $table->dropForeign('fk_administrative_holds_case');
            $table->dropForeign('fk_administrative_holds_placement_approval');
            $table->dropForeign('fk_administrative_holds_release_approval');
            $table->dropColumn(['support_case_id', 'placement_approval_id', 'release_approval_id', 'source_kind']);
        });
        Schema::table('command_approvals', function (Blueprint $table): void {
            $table->dropForeign('fk_command_approvals_case');
            $table->dropColumn(['command_payload', 'command_result', 'support_case_id', 'command_version']);
        });
    }
};

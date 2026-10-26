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
        if (! Schema::hasTable('work_clearance_challenges')) {
            return;
        }

        Schema::table('work_clearance_challenges', function (Blueprint $table): void {
            $table->char('work_signature_hash', 64)->nullable();
        });

        DB::table('work_clearance_challenges')
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->whereNull('work_signature_hash')
            ->update(['invalidated_at' => now(), 'updated_at' => now()]);

        DB::statement("ALTER TABLE work_clearance_challenges ADD CONSTRAINT ck_work_challenges_active_signature CHECK (consumed_at IS NOT NULL OR invalidated_at IS NOT NULL OR (work_signature_hash IS NOT NULL AND work_signature_hash ~ '^[0-9a-f]{64}$'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE work_clearance_challenges DROP CONSTRAINT IF EXISTS ck_work_challenges_active_signature');
        Schema::table('work_clearance_challenges', function (Blueprint $table): void {
            $table->dropColumn('work_signature_hash');
        });
    }
};

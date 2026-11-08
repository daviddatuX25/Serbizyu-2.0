<?php

declare(strict_types=1);

use App\Modules\DealCoordination\Application\WorkCompletedGateBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::statement('ALTER TABLE work_step_dependency_gates DROP CONSTRAINT ck_work_step_dependency_gates_condition');
            DB::statement("ALTER TABLE work_step_dependency_gates ADD CONSTRAINT ck_work_step_dependency_gates_condition CHECK (condition_code IN ('part_ready', 'delivery_signed', 'work_completed'))");

            app(WorkCompletedGateBackfill::class)->reconcile();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('This forward-only repair cannot be rolled back independently of the base work_completed gate migration.');
    }
};

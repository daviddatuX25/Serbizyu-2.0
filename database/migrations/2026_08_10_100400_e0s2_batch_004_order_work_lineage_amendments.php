<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Orders/Work same-Order lineage mostly exists historically. Adds accepted-terms and
 * obligation/work same-order guards required by the 58-table contract.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        // One current terms snapshot identity helper for accepted orders (application still enforces transition timing).
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_order_terms_snapshots_order_version ON order_terms_snapshots (order_id, snapshot_version)');

        // Work instances must reference their order (already FK); ensure positive versions remain checked.
        DB::statement('ALTER TABLE work_instances DROP CONSTRAINT IF EXISTS ck_work_instances_version');
        DB::statement('ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_version CHECK (version > 0)');

        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT IF EXISTS ck_payment_obligations_lane_present');
        DB::statement("ALTER TABLE payment_obligations ADD CONSTRAINT ck_payment_obligations_lane_present CHECK (lane IS NOT NULL AND btrim(lane) <> '')");

        canonical58_checkpoint_complete('004', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('004');
        DB::statement('ALTER TABLE payment_obligations DROP CONSTRAINT IF EXISTS ck_payment_obligations_lane_present');
        DB::statement('ALTER TABLE work_instances DROP CONSTRAINT IF EXISTS ck_work_instances_version');
        DB::statement('DROP INDEX IF EXISTS uq_order_terms_snapshots_order_version');
    }
};

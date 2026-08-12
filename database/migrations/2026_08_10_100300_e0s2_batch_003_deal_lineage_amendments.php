<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Deal-Chaining foundation and Request/Quote/Order lineage already exist in historical
 * batches 002A/003. This file records canonical-58 Batch 003 completion and adds any
 * missing Request/Quote composite uniqueness guards.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS uq_requests_active_deal_need ON requests (deal_need_id) WHERE deal_need_id IS NOT NULL AND status NOT IN ('cancelled', 'closed', 'expired')");
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_active_deal_need ON quotes (deal_need_id) WHERE deal_need_id IS NOT NULL AND status NOT IN ('declined', 'withdrawn', 'expired', 'superseded')");

        canonical58_checkpoint_complete('003', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('003');
        DB::statement('DROP INDEX IF EXISTS uq_quotes_active_deal_need');
        DB::statement('DROP INDEX IF EXISTS uq_requests_active_deal_need');
    }
};

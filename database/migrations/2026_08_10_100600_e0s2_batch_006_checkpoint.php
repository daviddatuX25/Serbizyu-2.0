<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Registrar for historically complete trust/support Batch 006. */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_complete('006', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('006');
    }
};

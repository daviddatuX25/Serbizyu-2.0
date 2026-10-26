<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS ck_stock_movements_type');
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT ck_stock_movements_type CHECK (movement_type IN ('opening_balance', 'receiving', 'damaged', 'recount', 'hold', 'commit', 'release', 'fulfillment'))");
    }

    public function down(): void
    {
        if (DB::table('stock_movements')->whereIn('movement_type', ['hold', 'commit', 'release'])->exists()) {
            throw new RuntimeException('Cannot remove reservation movement types after the ledger has recorded them.');
        }
        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS ck_stock_movements_type');
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT ck_stock_movements_type CHECK (movement_type IN ('opening_balance', 'receiving', 'damaged', 'recount', 'fulfillment'))");
    }
};

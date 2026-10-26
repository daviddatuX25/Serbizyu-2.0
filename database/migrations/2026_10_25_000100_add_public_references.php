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
        foreach ([
            'orders' => 'ORD',
            'payment_obligations' => 'OBL',
            'support_cases' => 'CASE',
            'disputes' => 'CASE',
        ] as $table => $prefix) {
            DB::statement("CREATE SEQUENCE {$table}_public_reference_seq START WITH 1");
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('public_reference', 32)->nullable();
            });
            DB::statement("ALTER TABLE {$table} ALTER COLUMN public_reference SET DEFAULT ('{$prefix}-' || lpad(nextval('{$table}_public_reference_seq')::text, 8, '0'))");
            DB::statement("UPDATE {$table} SET public_reference = ('{$prefix}-' || lpad(nextval('{$table}_public_reference_seq')::text, 8, '0')) WHERE public_reference IS NULL");
            DB::statement("ALTER TABLE {$table} ALTER COLUMN public_reference SET NOT NULL");
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_public_reference_uq UNIQUE (public_reference)");
        }
    }

    public function down(): void
    {
        foreach (['orders', 'payment_obligations', 'support_cases', 'disputes'] as $table) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_public_reference_uq");
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn('public_reference');
            });
            DB::statement("DROP SEQUENCE IF EXISTS {$table}_public_reference_seq");
        }
    }
};

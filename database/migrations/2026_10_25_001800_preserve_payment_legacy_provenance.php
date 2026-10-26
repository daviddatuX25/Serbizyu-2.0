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
        if (! Schema::hasColumn('payment_obligations', 'legacy_lane')) {
            Schema::table('payment_obligations', function (Blueprint $table): void {
                $table->text('legacy_lane')->nullable();
                $table->text('legacy_status')->nullable();
                $table->bigInteger('legacy_platform_fee_amount_minor')->nullable();
                $table->bigInteger('legacy_processor_cost_amount_minor')->nullable();
            });

            // Rows already cut over by the first rollout have no pre-cutover snapshot.
            // Preserve their currently stored values rather than inventing prior facts.
            DB::statement('UPDATE payment_obligations SET legacy_lane = lane, legacy_status = status, legacy_platform_fee_amount_minor = platform_fee_amount_minor, legacy_processor_cost_amount_minor = processor_cost_amount_minor');
        }
    }

    public function down(): void
    {
        // Provenance columns are owned by the lifecycle migration and are removed there.
    }
};

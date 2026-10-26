<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('deal_need_confirmations', function (Blueprint $table): void {
            $table->foreign('appointment_reservation_id', 'fk_deal_need_confirmations_appointment')
                ->references('id')->on('appointment_reservations')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deal_need_confirmations', function (Blueprint $table): void {
            $table->dropForeign('fk_deal_need_confirmations_appointment');
        });
    }
};

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
        Schema::table('notifications', function (Blueprint $table): void {
            $table->string('attention', 32)->default('updates');
            $table->timestampTz('read_at')->nullable();
            $table->index(['recipient_user_id', 'read_at', 'attention'], 'idx_notifications_recipient_unread');
        });

        DB::statement("ALTER TABLE notifications ADD CONSTRAINT chk_notifications_attention CHECK (attention IN ('needs_action', 'updates'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_attention');
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('idx_notifications_recipient_unread');
            $table->dropColumn(['attention', 'read_at']);
        });
    }
};

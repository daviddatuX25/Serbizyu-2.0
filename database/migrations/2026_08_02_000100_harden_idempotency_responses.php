<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::table('idempotency_keys', function (Blueprint $table): void {
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->jsonb('response_payload')->nullable();
            $table->unsignedInteger('fingerprint_version')->default(1);
        });

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '008',
            'status' => 'completed',
            'checksum' => hash_file('sha256', __FILE__),
            'started_at' => now(),
            'completed_at' => now(),
            'operator' => null,
            'version' => 1,
            'correlation_id' => Str::uuid7()->toString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::table('migration_checkpoints')->where('batch', '008')->delete();

        Schema::table('idempotency_keys', function (Blueprint $table): void {
            $table->dropColumn(['response_status', 'response_payload', 'fingerprint_version']);
        });
    }
};

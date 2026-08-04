<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
        }

        Schema::create('migration_checkpoints', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('migration_version', 191);
            $table->string('batch', 16);
            $table->text('status');
            $table->char('checksum', 64);
            $table->timestampTz('started_at');
            $table->timestampTz('completed_at')->nullable();
            $table->text('operator')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['migration_version', 'batch'], 'migration_checkpoints_version_batch_uq');
        });

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '000',
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
        Schema::dropIfExists('migration_checkpoints');
    }
};

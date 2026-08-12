<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

if (! function_exists('canonical58_checkpoint_complete')) {
    function canonical58_checkpoint_complete(string $batch, string $migrationFilePath): void
    {
        $migrationVersion = 'canonical-58-v1';

        $payload = [
            'status' => 'completed',
            'checksum' => hash_file('sha256', $migrationFilePath),
            'started_at' => now(),
            'completed_at' => now(),
            'operator' => 'e0-s2',
            'version' => 1,
            'correlation_id' => Str::uuid7()->toString(),
            'updated_at' => now(),
        ];

        $existing = DB::table('migration_checkpoints')
            ->where('migration_version', $migrationVersion)
            ->where('batch', $batch)
            ->first();

        if ($existing !== null) {
            DB::table('migration_checkpoints')
                ->where('id', $existing->id)
                ->update($payload);

            return;
        }

        DB::table('migration_checkpoints')->insert([
            ...$payload,
            'id' => Str::uuid7()->toString(),
            'migration_version' => $migrationVersion,
            'batch' => $batch,
            'created_at' => now(),
        ]);
    }
}

if (! function_exists('canonical58_checkpoint_forget')) {
    function canonical58_checkpoint_forget(string $batch): void
    {
        DB::table('migration_checkpoints')
            ->where('migration_version', 'canonical-58-v1')
            ->where('batch', $batch)
            ->delete();
    }
}

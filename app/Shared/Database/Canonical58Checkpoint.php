<?php

declare(strict_types=1);

namespace App\Shared\Database;

require_once dirname(__DIR__, 3).'/database/migrations/support/canonical58_checkpoint.php';

/** Thin wrapper over the migration checkpoint helper for application code. */
final class Canonical58Checkpoint
{
    public const MIGRATION_VERSION = 'canonical-58-v1';

    public static function complete(string $batch, string $migrationFilePath): void
    {
        canonical58_checkpoint_complete($batch, $migrationFilePath);
    }

    public static function forget(string $batch): void
    {
        canonical58_checkpoint_forget($batch);
    }
}

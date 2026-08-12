<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Batch 009 closes remaining index/check gaps and records canonical-58 completion.
 * Deterministic factories remain owned by later seed work; this batch is schema-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Reject capacity rows that still lack listing_version_id after Batch 002 backfill.
        $orphans = (int) DB::table('listing_capacity')->whereNull('listing_version_id')->count();
        if ($orphans > 0) {
            throw new RuntimeException("listing_capacity has {$orphans} rows without listing_version_id; fix before Batch 009.");
        }

        DB::statement('CREATE INDEX IF NOT EXISTS idx_category_versions_published_at ON category_versions (published_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_listing_capacity_reservations_capacity_status ON listing_capacity_reservations (listing_capacity_id, status)');
        DB::statement("CREATE INDEX IF NOT EXISTS idx_inbox_messages_dead_letter ON inbox_messages (updated_at) WHERE status IN ('gap', 'unsupported', 'dead_letter')");
        DB::statement("CREATE INDEX IF NOT EXISTS idx_integration_credentials_overlap ON integration_credentials (integration_client_id, overlap_ends_at) WHERE status = 'overlap'");
        DB::statement('CREATE INDEX IF NOT EXISTS idx_capability_activations_owner ON capability_activations (owner_user_id, effective_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_command_approvals_actors ON command_approvals (initiator_user_id, approver_user_id, status)');

        canonical58_checkpoint_complete('009', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('009');

        DB::statement('DROP INDEX IF EXISTS idx_command_approvals_actors');
        DB::statement('DROP INDEX IF EXISTS idx_capability_activations_owner');
        DB::statement('DROP INDEX IF EXISTS idx_integration_credentials_overlap');
        DB::statement('DROP INDEX IF EXISTS idx_inbox_messages_dead_letter');
        DB::statement('DROP INDEX IF EXISTS idx_listing_capacity_reservations_capacity_status');
        DB::statement('DROP INDEX IF EXISTS idx_category_versions_published_at');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_capacity_default_bucket ON listing_capacity (listing_id, listing_version_id, capacity_type, resource_key) WHERE capacity_type = 'quantity' AND resource_key = ''");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_listing_capacity_default_bucket');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE requests DROP CONSTRAINT IF EXISTS ck_requests_status');
        DB::statement("ALTER TABLE requests ADD CONSTRAINT ck_requests_status CHECK (status IN ('draft', 'published', 'sourcing', 'quoted', 'accepted', 'awarded', 'expired', 'cancelled', 'closed'))");

        DB::statement('ALTER TABLE quotes DROP CONSTRAINT IF EXISTS ck_quotes_status');
        DB::statement("ALTER TABLE quotes ADD CONSTRAINT ck_quotes_status CHECK (status IN ('draft', 'submitted', 'accepted', 'declined', 'not_selected', 'withdrawn', 'expired', 'superseded'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE requests DROP CONSTRAINT IF EXISTS ck_requests_status');
        DB::statement("ALTER TABLE requests ADD CONSTRAINT ck_requests_status CHECK (status IN ('draft', 'published', 'sourcing', 'quoted', 'accepted', 'expired', 'cancelled', 'closed'))");

        DB::statement('ALTER TABLE quotes DROP CONSTRAINT IF EXISTS ck_quotes_status');
        DB::statement("ALTER TABLE quotes ADD CONSTRAINT ck_quotes_status CHECK (status IN ('draft', 'submitted', 'accepted', 'declined', 'withdrawn', 'expired', 'superseded'))");
    }
};

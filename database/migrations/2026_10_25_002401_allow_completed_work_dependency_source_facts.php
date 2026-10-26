<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE work_dependency_source_facts DROP CONSTRAINT ck_work_dependency_source_facts_event_type');
        DB::statement("ALTER TABLE work_dependency_source_facts ADD CONSTRAINT ck_work_dependency_source_facts_event_type CHECK (event_type IN ('work.ready_for_collection', 'work.delivered_to_site', 'work.completed'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE work_dependency_source_facts DROP CONSTRAINT ck_work_dependency_source_facts_event_type');
        DB::statement("ALTER TABLE work_dependency_source_facts ADD CONSTRAINT ck_work_dependency_source_facts_event_type CHECK (event_type IN ('work.ready_for_collection', 'work.delivered_to_site'))");
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, string> */
    private const REFERENCES = [
        'deal_chains' => 'DC',
        'listings' => 'LST',
        'identity_verifications' => 'IDV',
    ];

    public function up(): void
    {
        foreach (self::REFERENCES as $table => $prefix) {
            $sequence = $table.'_public_reference_seq';
            DB::statement("CREATE SEQUENCE {$sequence} AS bigint START WITH 1");
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('public_reference', 32)->nullable();
            });
            DB::statement("WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at, id) AS position FROM {$table}) UPDATE {$table} AS target SET public_reference = '{$prefix}-' || lpad(numbered.position::text, greatest(8, length(numbered.position::text)), '0') FROM numbered WHERE target.id = numbered.id");
            DB::selectOne("SELECT setval('{$sequence}', greatest((SELECT count(*) + 1 FROM {$table}), 1), false)");
            DB::statement("ALTER TABLE {$table} ALTER COLUMN public_reference SET DEFAULT ('{$prefix}-' || lpad(nextval('{$sequence}')::text, 8, '0'))");
            DB::statement("ALTER TABLE {$table} ALTER COLUMN public_reference SET NOT NULL");
            Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                $blueprint->unique('public_reference', $table.'_public_reference_uq');
            });
        }

        Schema::table('support_cases', function (Blueprint $table): void {
            $table->string('current_responsibility_party', 16)->default('staff');
            $table->uuid('current_responsibility_user_id')->nullable();
            $table->foreign('current_responsibility_user_id', 'fk_support_cases_responsibility_user')->references('id')->on('users')->nullOnDelete();
            $table->index(['current_responsibility_party', 'owner_user_id', 'status'], 'idx_support_cases_staff_responsibility');
        });
        DB::table('support_cases')->whereIn('status', ['resolved', 'closed', 'rejected', 'withdrawn'])->update([
            'current_responsibility_party' => 'none',
            'current_responsibility_user_id' => null,
        ]);
        DB::statement("ALTER TABLE support_cases ADD CONSTRAINT ck_support_cases_responsibility CHECK (current_responsibility_party IN ('staff', 'participant', 'none') AND (current_responsibility_party = 'participant' OR current_responsibility_user_id IS NULL))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE support_cases DROP CONSTRAINT IF EXISTS ck_support_cases_responsibility');
        Schema::table('support_cases', function (Blueprint $table): void {
            $table->dropIndex('idx_support_cases_staff_responsibility');
            $table->dropForeign('fk_support_cases_responsibility_user');
            $table->dropColumn(['current_responsibility_party', 'current_responsibility_user_id']);
        });
        foreach (array_reverse(array_keys(self::REFERENCES)) as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                $blueprint->dropUnique($table.'_public_reference_uq');
                $blueprint->dropColumn('public_reference');
            });
            DB::statement('DROP SEQUENCE '.$table.'_public_reference_seq');
        }
    }
};

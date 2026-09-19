<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        if (! Schema::hasTable('t4_work_migration_audits')) {
            Schema::create('t4_work_migration_audits', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('work_instance_id')->unique();
                $table->text('legacy_work_shape');
                $table->text('migrated_work_shape');
                $table->unsignedInteger('legacy_row_version');
                $table->unsignedInteger('migrated_row_version')->nullable();
                $table->text('migrated_fingerprint')->nullable();
                $table->timestampTz('migrated_at')->useCurrent();
            });
        } else {
            Schema::table('t4_work_migration_audits', function (Blueprint $table): void {
                if (! Schema::hasColumn('t4_work_migration_audits', 'migrated_row_version')) {
                    $table->unsignedInteger('migrated_row_version')->nullable();
                }
                if (! Schema::hasColumn('t4_work_migration_audits', 'migrated_fingerprint')) {
                    $table->text('migrated_fingerprint')->nullable();
                }
            });
        }

        Schema::table('work_instances', function (Blueprint $table): void {
            if (! Schema::hasColumn('work_instances', 'shape_contract_version')) {
                $table->unsignedInteger('shape_contract_version')->nullable();
            }
            if (! Schema::hasColumn('work_instances', 'payload_schema_version')) {
                $table->unsignedInteger('payload_schema_version')->nullable();
            }
            if (! Schema::hasColumn('work_instances', 'row_version')) {
                $table->unsignedInteger('row_version')->nullable();
            }
            if (! Schema::hasColumn('work_instances', 'revisions_allowed')) {
                $table->unsignedInteger('revisions_allowed')->default(1);
            }
            if (! Schema::hasColumn('work_instances', 'revisions_used')) {
                $table->unsignedInteger('revisions_used')->default(0);
            }
            if (! Schema::hasColumn('work_instances', 'awaiting_signoff_at')) {
                $table->timestampTz('awaiting_signoff_at')->nullable();
            }
            if (! Schema::hasColumn('work_instances', 'cancelled_at')) {
                $table->timestampTz('cancelled_at')->nullable();
            }
        });

        DB::statement(<<<'SQL'
            INSERT INTO t4_work_migration_audits (id, work_instance_id, legacy_work_shape, migrated_work_shape, legacy_row_version, migrated_at)
            SELECT
                gen_random_uuid(),
                wi.id,
                wi.work_shape,
                CASE wi.work_shape
                    WHEN 'local_service' THEN 'A1'
                    WHEN 'product_handoff' THEN 'A4'
                END,
                COALESCE(wi.version, 1),
                now()
            FROM work_instances wi
            WHERE wi.work_shape IN ('local_service', 'product_handoff')
              AND NOT EXISTS (
                  SELECT 1 FROM t4_work_migration_audits a WHERE a.work_instance_id = wi.id
              )
            SQL);

        DB::statement(<<<'SQL'
            UPDATE work_instances
            SET
                work_shape = CASE work_shape
                    WHEN 'local_service' THEN 'A1'
                    WHEN 'product_handoff' THEN 'A4'
                    ELSE work_shape
                END,
                shape_contract_version = COALESCE(shape_contract_version, 1),
                payload_schema_version = COALESCE(payload_schema_version, GREATEST(1, COALESCE(structure_payload_version, 1))),
                row_version = COALESCE(row_version, GREATEST(1, COALESCE(version, 1))),
                revisions_allowed = COALESCE(revisions_allowed, GREATEST(0, COALESCE(revisions_allowed, 1))),
                revisions_used = COALESCE(revisions_used, GREATEST(0, COALESCE(revisions_used, 0)))
            SQL);

        DB::statement(<<<'SQL'
            UPDATE t4_work_migration_audits a
            SET
                migrated_row_version = wi.row_version,
                migrated_fingerprint = md5(to_jsonb(wi)::text)
            FROM work_instances wi
            WHERE wi.id = a.work_instance_id
              AND (a.migrated_row_version IS NULL OR a.migrated_fingerprint IS NULL)
            SQL);

        DB::statement('ALTER TABLE work_instances ALTER COLUMN shape_contract_version SET NOT NULL');
        DB::statement('ALTER TABLE work_instances ALTER COLUMN payload_schema_version SET NOT NULL');
        DB::statement('ALTER TABLE work_instances ALTER COLUMN row_version SET NOT NULL');
        DB::statement('ALTER TABLE work_instances ALTER COLUMN shape_contract_version SET DEFAULT 1');
        DB::statement('ALTER TABLE work_instances ALTER COLUMN payload_schema_version SET DEFAULT 1');
        DB::statement('ALTER TABLE work_instances ALTER COLUMN row_version SET DEFAULT 1');

        DB::statement(<<<'SQL'
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'work_instances'::regclass
                      AND conname = 'ck_work_instances_shape_contract_version'
                ) THEN
                    ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_shape_contract_version CHECK (shape_contract_version > 0);
                END IF;
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'work_instances'::regclass
                      AND conname = 'ck_work_instances_payload_schema_version'
                ) THEN
                    ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_payload_schema_version CHECK (payload_schema_version > 0);
                END IF;
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'work_instances'::regclass
                      AND conname = 'ck_work_instances_row_version'
                ) THEN
                    ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_row_version CHECK (row_version > 0);
                END IF;
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'work_instances'::regclass
                      AND conname = 'ck_work_instances_revisions_used'
                ) THEN
                    ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_revisions_used CHECK (revisions_used >= 0);
                END IF;
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'work_instances'::regclass
                      AND conname = 'ck_work_instances_revisions_allowed'
                ) THEN
                    ALTER TABLE work_instances ADD CONSTRAINT ck_work_instances_revisions_allowed CHECK (revisions_allowed >= 0);
                END IF;
            END
            $$;
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        if (! Schema::hasTable('t4_work_migration_audits')) {
            throw new RuntimeException('Cannot rollback T4 work migration: t4_work_migration_audits table is missing; rollback is refused to prevent data loss.');
        }

        if (! Schema::hasColumn('t4_work_migration_audits', 'migrated_row_version')
            || ! Schema::hasColumn('t4_work_migration_audits', 'migrated_fingerprint')) {
            throw new RuntimeException('Cannot rollback T4 work migration: audit fingerprints are missing; rollback is refused to prevent data loss.');
        }

        $incompleteAudit = DB::table('t4_work_migration_audits')
            ->where(function ($query): void {
                $query->whereNull('migrated_row_version')
                    ->orWhereNull('migrated_fingerprint');
            })
            ->exists();

        if ($incompleteAudit) {
            throw new RuntimeException('Cannot rollback T4 work migration: audit fingerprints are incomplete; rollback is refused to prevent data loss.');
        }

        $mutatedRows = DB::selectOne(<<<'SQL'
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM t4_work_migration_audits a
                LEFT JOIN work_instances wi ON wi.id = a.work_instance_id
                WHERE wi.id IS NULL
                   OR wi.work_shape IS DISTINCT FROM a.migrated_work_shape
                   OR wi.row_version IS DISTINCT FROM a.migrated_row_version
                   OR md5(to_jsonb(wi)::text) IS DISTINCT FROM a.migrated_fingerprint
            ) THEN 1 ELSE 0 END AS mutated
            SQL);

        if ((int) ($mutatedRows->mutated ?? 0) === 1) {
            throw new RuntimeException('Cannot rollback T4 work migration: audited work instances changed after migration; rollback is refused to preserve progressed data.');
        }

        DB::statement(<<<'SQL'
            UPDATE work_instances wi
            SET
                work_shape = a.legacy_work_shape,
                version = a.legacy_row_version
            FROM t4_work_migration_audits a
            WHERE wi.id = a.work_instance_id
              AND wi.work_shape = a.migrated_work_shape
              AND wi.row_version = a.migrated_row_version
              AND md5(to_jsonb(wi)::text) = a.migrated_fingerprint
            SQL);

        Schema::dropIfExists('t4_work_migration_audits');
        Schema::table('work_instances', function (Blueprint $table): void {
            $table->dropColumn([
                'shape_contract_version',
                'payload_schema_version',
                'row_version',
                'revisions_allowed',
                'revisions_used',
                'awaiting_signoff_at',
                'cancelled_at',
            ]);
        });
    }
};

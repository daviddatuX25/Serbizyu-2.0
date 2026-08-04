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
        Schema::create('deal_chains', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('coordinator_user_id');
            $table->text('status');
            $table->text('title');
            $table->text('goal');
            $table->timestampTz('target_at')->nullable();
            $table->jsonb('target_location')->nullable();
            $table->unsignedInteger('payload_version')->default(1);
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('archived_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['coordinator_user_id', 'status'], 'idx_deal_chains_coordinator_status');
            $table->index(['status', 'target_at'], 'idx_deal_chains_status_target');
            $table->foreign('coordinator_user_id', 'fk_deal_chains_coordinator')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('deal_needs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_chain_id');
            $table->unsignedInteger('ordinal');
            $table->text('need_kind');
            $table->text('title');
            $table->text('description');
            $table->text('status');
            $table->timestampTz('requested_at');
            $table->timestampTz('due_at')->nullable();
            $table->uuid('replaces_deal_need_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['deal_chain_id', 'id'], 'uq_deal_needs_chain_id');
            $table->unique(['deal_chain_id', 'ordinal'], 'uq_deal_needs_chain_ordinal');
            $table->index(['deal_chain_id', 'status'], 'idx_deal_needs_chain_status');
            $table->foreign('deal_chain_id', 'fk_deal_needs_chain')
                ->references('id')->on('deal_chains')->restrictOnDelete();
        });

        Schema::table('deal_needs', function (Blueprint $table): void {
            $table->foreign('replaces_deal_need_id', 'fk_deal_needs_replacement')
                ->references('id')->on('deal_needs')->restrictOnDelete();
        });

        Schema::create('deal_dependencies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_chain_id');
            $table->uuid('predecessor_need_id');
            $table->uuid('successor_need_id');
            $table->text('dependency_type');
            $table->text('status');
            $table->text('condition_code');
            $table->uuid('created_by_user_id');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('removed_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['deal_chain_id', 'status'], 'idx_deal_dependencies_chain_status');
            $table->foreign('deal_chain_id', 'fk_deal_dependencies_chain')
                ->references('id')->on('deal_chains')->restrictOnDelete();
            $table->foreign(['deal_chain_id', 'predecessor_need_id'], 'fk_deal_dependencies_predecessor')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign(['deal_chain_id', 'successor_need_id'], 'fk_deal_dependencies_successor')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_deal_dependencies_creator')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('deal_invitations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_need_id');
            $table->uuid('invited_provider_user_id');
            $table->uuid('invited_by_user_id');
            $table->uuid('acting_for_user_id')->nullable();
            $table->text('purpose');
            $table->jsonb('scope');
            $table->unsignedInteger('payload_version')->default(1);
            $table->text('status');
            $table->timestampTz('expires_at');
            $table->timestampTz('responded_at')->nullable();
            $table->text('response_note')->nullable();
            $table->text('acceptance_idempotency_key')->nullable();
            $table->uuid('acceptance_correlation_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['deal_need_id', 'status', 'expires_at'], 'idx_deal_invitations_need_status_expiry');
            $table->index(['invited_provider_user_id', 'status'], 'idx_deal_invitations_provider_status');
            $table->foreign('deal_need_id', 'fk_deal_invitations_need')
                ->references('id')->on('deal_needs')->restrictOnDelete();
            $table->foreign('invited_provider_user_id', 'fk_deal_invitations_provider')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('invited_by_user_id', 'fk_deal_invitations_inviter')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('acting_for_user_id', 'fk_deal_invitations_acting_for')
                ->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('requests', function (Blueprint $table): void {
            $table->foreign(['deal_chain_id', 'deal_need_id'], 'fk_requests_deal_need')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
        });

        Schema::table('quotes', function (Blueprint $table): void {
            $table->foreign(['deal_chain_id', 'deal_need_id'], 'fk_quotes_deal_need')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
        });

        $checks = [
            ['deal_chains', 'ck_deal_chains_status', "status IN ('draft', 'planning', 'sourcing', 'in_progress', 'partially_complete', 'blocked', 'completed', 'cancelled', 'archived')"],
            ['deal_chains', 'ck_deal_chains_payload_version', 'payload_version > 0'],
            ['deal_needs', 'ck_deal_needs_ordinal', 'ordinal > 0'],
            ['deal_needs', 'ck_deal_needs_kind', "need_kind IN ('service', 'product')"],
            ['deal_needs', 'ck_deal_needs_status', "status IN ('draft', 'open', 'sourcing', 'invited', 'quoted', 'accepted', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled', 'replacement_needed', 'superseded')"],
            ['deal_dependencies', 'ck_deal_dependencies_type', "dependency_type = 'blocks'"],
            ['deal_dependencies', 'ck_deal_dependencies_status', "status IN ('active', 'removed', 'superseded')"],
            ['deal_dependencies', 'ck_deal_dependencies_distinct_ends', 'predecessor_need_id <> successor_need_id'],
            ['deal_invitations', 'ck_deal_invitations_status', "status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'revoked', 'superseded', 'cancelled')"],
            ['deal_invitations', 'ck_deal_invitations_payload_version', 'payload_version > 0'],
            ['deal_invitations', 'ck_deal_invitations_expiry', 'expires_at > created_at'],
        ];

        foreach ($checks as [$table, $name, $expression]) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$expression})");
        }

        DB::statement(
            'CREATE UNIQUE INDEX uq_deal_dependencies_active_edge '.
            'ON deal_dependencies (deal_chain_id, predecessor_need_id, successor_need_id, dependency_type) '.
            "WHERE status = 'active'"
        );

        DB::statement(
            'CREATE UNIQUE INDEX uq_deal_invitations_acceptance_key '.
            'ON deal_invitations (deal_need_id, acceptance_idempotency_key) '.
            'WHERE acceptance_idempotency_key IS NOT NULL'
        );

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_deal_dependency_cycles()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $function$
            BEGIN
                IF NEW.status <> 'active' THEN
                    RETURN NEW;
                END IF;

                IF EXISTS (
                    WITH RECURSIVE reachable(need_id) AS (
                        SELECT NEW.successor_need_id
                        UNION
                        SELECT dependency.successor_need_id
                        FROM deal_dependencies AS dependency
                        INNER JOIN reachable
                            ON reachable.need_id = dependency.predecessor_need_id
                        WHERE dependency.deal_chain_id = NEW.deal_chain_id
                          AND dependency.status = 'active'
                          AND dependency.id <> NEW.id
                    )
                    SELECT 1
                    FROM reachable
                    WHERE need_id = NEW.predecessor_need_id
                ) THEN
                    RAISE EXCEPTION 'Deal dependency cycle detected for chain %', NEW.deal_chain_id
                        USING ERRCODE = '23514';
                END IF;

                RETURN NEW;
            END;
            $function$;
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE CONSTRAINT TRIGGER trg_deal_dependencies_no_cycles
            AFTER INSERT OR UPDATE OF deal_chain_id, predecessor_need_id, successor_need_id, status
            ON deal_dependencies
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE FUNCTION prevent_deal_dependency_cycles()
            SQL
        );

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '002A',
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
        DB::table('migration_checkpoints')->where('batch', '002A')->delete();

        DB::statement('DROP TRIGGER IF EXISTS trg_deal_dependencies_no_cycles ON deal_dependencies');
        DB::statement('DROP FUNCTION IF EXISTS prevent_deal_dependency_cycles()');

        Schema::table('quotes', function (Blueprint $table): void {
            $table->dropForeign('fk_quotes_deal_need');
        });

        Schema::table('requests', function (Blueprint $table): void {
            $table->dropForeign('fk_requests_deal_need');
        });

        Schema::dropIfExists('deal_invitations');
        Schema::dropIfExists('deal_dependencies');
        Schema::dropIfExists('deal_needs');
        Schema::dropIfExists('deal_chains');
    }
};

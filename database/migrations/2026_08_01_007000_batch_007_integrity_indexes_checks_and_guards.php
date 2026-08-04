<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $this->addNamedIndexesAndChecks();
        $this->installFinancialPostingGuards();
        $this->installRetentionHoldGuard();
        $this->installAuditAppendOnlyGuard();

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '007',
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
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::table('migration_checkpoints')->where('batch', '007')->delete();

        DB::statement('DROP TRIGGER IF EXISTS evidence_files_retention_hold_guard ON evidence_files');
        DB::statement('DROP TRIGGER IF EXISTS audit_events_append_only_guard ON audit_events');
        DB::statement('DROP TRIGGER IF EXISTS financial_entries_posted_guard ON financial_entries');
        DB::statement('DROP TRIGGER IF EXISTS financial_transactions_posting_guard ON financial_transactions');

        DB::statement('DROP FUNCTION IF EXISTS prevent_evidence_delete_under_retention_hold()');
        DB::statement('DROP FUNCTION IF EXISTS prevent_audit_event_mutation()');
        DB::statement('DROP FUNCTION IF EXISTS prevent_posted_financial_entry_mutation()');
        DB::statement('DROP FUNCTION IF EXISTS prevent_direct_financial_transaction_posting()');
        DB::statement('DROP PROCEDURE IF EXISTS post_financial_transaction(uuid, integer)');

        foreach ([
            'cohort_classifications_classified_at_idx',
            'cohort_classifications_subject_idx',
            'audit_events_target_occurred_at_idx',
            'audit_events_actor_occurred_at_idx',
            'audit_events_correlation_idx',
            'outbox_messages_pending_delivery_idx',
            'idempotency_keys_open_idx',
            'retention_holds_active_target_idx',
            'retention_holds_active_evidence_idx',
            'migration_checkpoints_batch_status_idx',
        ] as $index) {
            DB::statement('DROP INDEX IF EXISTS '.$index);
        }

        foreach ([
            ['cohort_classifications', 'cohort_classifications_class_ck'],
            ['cohort_classifications', 'cohort_classifications_subject_ck'],
            ['audit_events', 'audit_events_expected_version_ck'],
            ['outbox_messages', 'outbox_messages_status_ck'],
            ['outbox_messages', 'outbox_messages_attempt_count_ck'],
            ['outbox_messages', 'outbox_messages_payload_version_ck'],
            ['idempotency_keys', 'idempotency_keys_status_ck'],
            ['idempotency_keys', 'idempotency_keys_expiry_ck'],
            ['retention_holds', 'retention_holds_status_ck'],
            ['retention_holds', 'retention_holds_target_ck'],
            ['retention_holds', 'retention_holds_release_ck'],
            ['migration_checkpoints', 'migration_checkpoints_status_ck'],
            ['migration_checkpoints', 'migration_checkpoints_completion_ck'],
        ] as [$table, $constraint]) {
            DB::statement(sprintf(
                'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                $table,
                $constraint
            ));
        }
    }

    private function addNamedIndexesAndChecks(): void
    {
        DB::statement(
            'CREATE INDEX cohort_classifications_classified_at_idx ON cohort_classifications (cohort_class, classified_at DESC)'
        );
        DB::statement(
            'CREATE INDEX cohort_classifications_subject_idx ON cohort_classifications (actor_user_id, order_id, classified_at DESC)'
        );
        DB::statement(
            'CREATE INDEX audit_events_target_occurred_at_idx ON audit_events (target_type, target_id, occurred_at DESC)'
        );
        DB::statement(
            'CREATE INDEX audit_events_actor_occurred_at_idx ON audit_events (actor_user_id, occurred_at DESC)'
        );
        DB::statement(
            'CREATE INDEX audit_events_correlation_idx ON audit_events (correlation_id)'
        );
        DB::statement(
            "CREATE INDEX outbox_messages_pending_delivery_idx ON outbox_messages (next_attempt_at, created_at) WHERE status IN ('pending', 'failed')"
        );
        DB::statement(
            "CREATE INDEX idempotency_keys_open_idx ON idempotency_keys (scope, expires_at) WHERE status IN ('in_progress', 'succeeded')"
        );
        DB::statement(
            "CREATE INDEX retention_holds_active_target_idx ON retention_holds (target_type, target_id) WHERE status = 'active'"
        );
        DB::statement(
            "CREATE INDEX retention_holds_active_evidence_idx ON retention_holds (evidence_file_id) WHERE status = 'active' AND evidence_file_id IS NOT NULL"
        );
        DB::statement(
            'CREATE INDEX migration_checkpoints_batch_status_idx ON migration_checkpoints (batch, status)'
        );

        DB::statement(
            "ALTER TABLE cohort_classifications ADD CONSTRAINT cohort_classifications_class_ck CHECK (cohort_class IN ('genuine_tagudin', 'capstone_demo', 'sandbox', 'team', 'training', 'support'))"
        );
        DB::statement(
            'ALTER TABLE cohort_classifications ADD CONSTRAINT cohort_classifications_subject_ck CHECK (actor_user_id IS NOT NULL OR order_id IS NOT NULL)'
        );
        DB::statement(
            'ALTER TABLE audit_events ADD CONSTRAINT audit_events_expected_version_ck CHECK (expected_version IS NULL OR expected_version >= 0)'
        );
        DB::statement(
            "ALTER TABLE outbox_messages ADD CONSTRAINT outbox_messages_status_ck CHECK (status IN ('pending', 'published', 'failed', 'dead_letter'))"
        );
        DB::statement(
            'ALTER TABLE outbox_messages ADD CONSTRAINT outbox_messages_attempt_count_ck CHECK (attempt_count >= 0)'
        );
        DB::statement(
            'ALTER TABLE outbox_messages ADD CONSTRAINT outbox_messages_payload_version_ck CHECK (payload_version > 0)'
        );
        DB::statement(
            "ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_status_ck CHECK (status IN ('in_progress', 'succeeded', 'failed', 'expired'))"
        );
        DB::statement(
            'ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_expiry_ck CHECK (expires_at > created_at)'
        );
        DB::statement(
            "ALTER TABLE retention_holds ADD CONSTRAINT retention_holds_status_ck CHECK (status IN ('active', 'released', 'expired'))"
        );
        DB::statement(
            'ALTER TABLE retention_holds ADD CONSTRAINT retention_holds_target_ck CHECK (evidence_file_id IS NOT NULL OR (target_type IS NOT NULL AND target_id IS NOT NULL))'
        );
        DB::statement(
            "ALTER TABLE retention_holds ADD CONSTRAINT retention_holds_release_ck CHECK ((status = 'active' AND released_at IS NULL) OR (status IN ('released', 'expired') AND released_at IS NOT NULL))"
        );
        DB::statement(
            "ALTER TABLE migration_checkpoints ADD CONSTRAINT migration_checkpoints_status_ck CHECK (status IN ('started', 'completed', 'failed'))"
        );
        DB::statement(
            "ALTER TABLE migration_checkpoints ADD CONSTRAINT migration_checkpoints_completion_ck CHECK ((status = 'started' AND completed_at IS NULL) OR (status IN ('completed', 'failed') AND completed_at IS NOT NULL))"
        );
    }

    private function installFinancialPostingGuards(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE PROCEDURE post_financial_transaction(
                p_transaction_id uuid,
                p_expected_version integer
            )
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_transaction financial_transactions%ROWTYPE;
                v_debits numeric := 0;
                v_credits numeric := 0;
            BEGIN
                SELECT * INTO v_transaction
                FROM financial_transactions
                WHERE id = p_transaction_id
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'financial transaction % does not exist', p_transaction_id
                        USING ERRCODE = 'P0002';
                END IF;

                IF v_transaction.version <> p_expected_version THEN
                    RAISE EXCEPTION 'financial transaction % has stale version', p_transaction_id
                        USING ERRCODE = '40001';
                END IF;

                IF v_transaction.status <> 'draft' THEN
                    RAISE EXCEPTION 'financial transaction % is not draft', p_transaction_id
                        USING ERRCODE = '55000';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM financial_entries
                    WHERE financial_transaction_id = p_transaction_id
                      AND currency <> v_transaction.currency
                ) THEN
                    RAISE EXCEPTION 'financial transaction % contains mixed currencies', p_transaction_id
                        USING ERRCODE = '22023';
                END IF;

                SELECT
                    COALESCE(SUM(amount_minor) FILTER (WHERE direction = 'debit'), 0),
                    COALESCE(SUM(amount_minor) FILTER (WHERE direction = 'credit'), 0)
                INTO v_debits, v_credits
                FROM financial_entries
                WHERE financial_transaction_id = p_transaction_id;

                IF v_debits = 0 OR v_debits <> v_credits THEN
                    RAISE EXCEPTION 'financial transaction % is not balanced', p_transaction_id
                        USING ERRCODE = '23514';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM financial_entries entry
                    LEFT JOIN financial_accounts account ON account.id = entry.financial_account_id
                    WHERE entry.financial_transaction_id = p_transaction_id
                      AND (account.id IS NULL OR account.status <> 'active')
                ) THEN
                    RAISE EXCEPTION 'financial transaction % contains an ineligible account', p_transaction_id
                        USING ERRCODE = '23514';
                END IF;

                BEGIN
                    PERFORM set_config('serbizyu.financial_posting', 'on', true);
                    UPDATE financial_transactions
                    SET status = 'posted',
                        posted_at = CURRENT_TIMESTAMP,
                        version = version + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = p_transaction_id
                      AND status = 'draft'
                      AND version = p_expected_version;
                    PERFORM set_config('serbizyu.financial_posting', 'off', true);
                EXCEPTION WHEN OTHERS THEN
                    PERFORM set_config('serbizyu.financial_posting', 'off', true);
                    RAISE;
                END;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'financial transaction % could not be posted', p_transaction_id
                        USING ERRCODE = '40001';
                END IF;
            END;
            $$
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_direct_financial_transaction_posting()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF OLD.status = 'draft' AND NEW.status = 'posted'
                   AND COALESCE(current_setting('serbizyu.financial_posting', true), 'off') <> 'on' THEN
                    RAISE EXCEPTION 'financial transactions must be posted with post_financial_transaction()'
                        USING ERRCODE = '55000';
                END IF;

                IF OLD.status = 'posted' AND ROW(OLD.*) IS DISTINCT FROM ROW(NEW.*) THEN
                    RAISE EXCEPTION 'posted financial transactions are immutable'
                        USING ERRCODE = '55000';
                END IF;

                RETURN NEW;
            END;
            $$
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE TRIGGER financial_transactions_posting_guard
            BEFORE UPDATE ON financial_transactions
            FOR EACH ROW
            EXECUTE FUNCTION prevent_direct_financial_transaction_posting()
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_posted_financial_entry_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_transaction_id uuid;
                v_status text;
            BEGIN
                v_transaction_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.financial_transaction_id ELSE NEW.financial_transaction_id END;
                SELECT status INTO v_status
                FROM financial_transactions
                WHERE id = v_transaction_id;

                IF v_status = 'posted' THEN
                    RAISE EXCEPTION 'financial entries for a posted transaction are append-only'
                        USING ERRCODE = '55000';
                END IF;

                RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
            END;
            $$
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE TRIGGER financial_entries_posted_guard
            BEFORE INSERT OR UPDATE OR DELETE ON financial_entries
            FOR EACH ROW
            EXECUTE FUNCTION prevent_posted_financial_entry_mutation()
            SQL
        );
    }

    private function installRetentionHoldGuard(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_evidence_delete_under_retention_hold()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM retention_holds
                    WHERE evidence_file_id = OLD.id
                      AND status = 'active'
                      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                ) THEN
                    RAISE EXCEPTION 'evidence file % is protected by an active retention hold', OLD.id
                        USING ERRCODE = '55000';
                END IF;

                RETURN OLD;
            END;
            $$
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE TRIGGER evidence_files_retention_hold_guard
            BEFORE DELETE ON evidence_files
            FOR EACH ROW
            EXECUTE FUNCTION prevent_evidence_delete_under_retention_hold()
            SQL
        );
    }

    private function installAuditAppendOnlyGuard(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RAISE EXCEPTION 'audit events are append-only'
                    USING ERRCODE = '55000';
            END;
            $$
            SQL
        );

        DB::statement(<<<'SQL'
            CREATE TRIGGER audit_events_append_only_guard
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_event_mutation()
            SQL
        );
    }
};

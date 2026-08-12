<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ledger currency equality guards. Balanced posting already enforced by
 * post_financial_transaction() from historical batch 007.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION enforce_financial_entry_currency_match()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_tx_currency char(3);
                v_account_currency char(3);
            BEGIN
                SELECT currency INTO v_tx_currency
                FROM financial_transactions
                WHERE id = NEW.financial_transaction_id;

                SELECT currency INTO v_account_currency
                FROM financial_accounts
                WHERE id = NEW.financial_account_id;

                IF v_tx_currency IS NULL OR v_account_currency IS NULL THEN
                    RAISE EXCEPTION 'financial entry references missing transaction or account';
                END IF;

                IF NEW.currency <> v_tx_currency OR NEW.currency <> v_account_currency THEN
                    RAISE EXCEPTION 'financial entry currency must match transaction and account currency';
                END IF;

                RETURN NEW;
            END;
            $$;
            SQL);

        DB::statement('DROP TRIGGER IF EXISTS financial_entries_currency_match ON financial_entries');
        DB::statement(<<<'SQL'
            CREATE TRIGGER financial_entries_currency_match
            BEFORE INSERT OR UPDATE ON financial_entries
            FOR EACH ROW
            EXECUTE FUNCTION enforce_financial_entry_currency_match()
            SQL);

        canonical58_checkpoint_complete('005', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('005');
        DB::statement('DROP TRIGGER IF EXISTS financial_entries_currency_match ON financial_entries');
        DB::statement('DROP FUNCTION IF EXISTS enforce_financial_entry_currency_match()');
    }
};

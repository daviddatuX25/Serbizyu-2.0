<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SEQUENCE case_public_reference_seq START WITH 1');
        DB::statement(<<<'SQL'
            SELECT setval(
                'case_public_reference_seq',
                COALESCE((
                    SELECT max(substring(public_reference FROM 6)::bigint)
                    FROM (
                        SELECT public_reference FROM support_cases
                        UNION ALL
                        SELECT public_reference FROM disputes
                    ) AS case_references
                    WHERE public_reference ~ '^CASE-[0-9]+$'
                ), 0) + 1,
                false
            )
            SQL);
        DB::statement(<<<'SQL'
            UPDATE disputes AS dispute
            SET public_reference = 'CASE-' || lpad(nextval('case_public_reference_seq')::text, 8, '0')
            WHERE EXISTS (
                SELECT 1 FROM support_cases AS support_case
                WHERE support_case.public_reference = dispute.public_reference
            )
            SQL);
        DB::statement("ALTER TABLE support_cases ALTER COLUMN public_reference SET DEFAULT ('CASE-' || lpad(nextval('case_public_reference_seq')::text, 8, '0'))");
        DB::statement("ALTER TABLE disputes ALTER COLUMN public_reference SET DEFAULT ('CASE-' || lpad(nextval('case_public_reference_seq')::text, 8, '0'))");
    }

    public function down(): void
    {
        // Keep issued CASE references intact; the shared sequence is forward-only.
    }
};

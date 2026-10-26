<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outbox_messages', function (Blueprint $table): void {
            $table->unsignedBigInteger('aggregate_sequence')->nullable();
            $table->unsignedInteger('aggregate_version')->nullable();
        });

        DB::statement(<<<'SQL'
            WITH numbered AS (
                SELECT id, row_number() OVER (PARTITION BY aggregate_type, aggregate_id ORDER BY created_at, id) AS stream_sequence
                FROM outbox_messages
            )
            UPDATE outbox_messages AS message
            SET aggregate_sequence = numbered.stream_sequence,
                aggregate_version = numbered.stream_sequence
            FROM numbered
            WHERE message.id = numbered.id
            SQL);

        DB::statement('ALTER TABLE outbox_messages ALTER COLUMN aggregate_sequence SET NOT NULL');
        DB::statement('ALTER TABLE outbox_messages ALTER COLUMN aggregate_version SET NOT NULL');
        DB::statement('CREATE UNIQUE INDEX outbox_messages_stream_sequence_uq ON outbox_messages (aggregate_type, aggregate_id, aggregate_sequence)');
        DB::statement('CREATE TABLE outbox_streams (aggregate_type varchar(100) NOT NULL, aggregate_id uuid NOT NULL, last_sequence bigint NOT NULL CHECK (last_sequence >= 0), PRIMARY KEY (aggregate_type, aggregate_id))');
        DB::statement(<<<'SQL'
            INSERT INTO outbox_streams (aggregate_type, aggregate_id, last_sequence)
            SELECT aggregate_type, aggregate_id, max(aggregate_sequence)
            FROM outbox_messages
            GROUP BY aggregate_type, aggregate_id
            SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS outbox_streams');
        DB::statement('DROP INDEX IF EXISTS outbox_messages_stream_sequence_uq');
        Schema::table('outbox_messages', function (Blueprint $table): void {
            $table->dropColumn(['aggregate_sequence', 'aggregate_version']);
        });
    }
};

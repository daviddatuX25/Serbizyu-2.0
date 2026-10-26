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
        if (DB::table('conversations')->exists() || DB::table('messages')->exists()) {
            throw new RuntimeException('Communications migration requires explicit attribution for pre-existing conversation history.');
        }

        Schema::table('conversations', function (Blueprint $table): void {
            $table->text('scope_type');
            $table->uuid('scope_id');
            $table->unsignedBigInteger('next_sequence')->default(1);
            $table->index(['scope_type', 'scope_id'], 'idx_conversations_scope');
            $table->unique(['scope_type', 'scope_id'], 'uq_conversations_scope');
        });
        Schema::table('messages', function (Blueprint $table): void {
            $table->uuid('owner_user_id');
            $table->uuid('consent_grant_id')->nullable();
            $table->unsignedBigInteger('sequence');
            $table->text('audience')->default('participants');
            $table->text('actor_display_name');
            $table->text('owner_display_name');
            $table->char('payload_hash', 64);
            $table->foreign('owner_user_id', 'fk_messages_owner')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('consent_grant_id', 'fk_messages_consent_grant')->references('id')->on('consent_grants')->restrictOnDelete();
            $table->dropUnique('uq_messages_idempotency');
            $table->unique(['conversation_id', 'actor_user_id', 'owner_user_id', 'idempotency_key'], 'uq_messages_actor_owner_idempotency');
            $table->unique(['conversation_id', 'sequence'], 'uq_messages_conversation_sequence');
            $table->index(['conversation_id', 'audience', 'sequence'], 'idx_messages_audience_sequence');
        });
        Schema::table('support_cases', function (Blueprint $table): void {
            $table->uuid('opened_by_user_id')->nullable();
            $table->uuid('principal_user_id')->nullable();
            $table->uuid('consent_grant_id')->nullable();
            $table->text('idempotency_key')->nullable();
            $table->char('initial_payload_hash', 64)->nullable();
            $table->foreign('opened_by_user_id', 'fk_support_cases_opened_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('principal_user_id', 'fk_support_cases_principal')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('consent_grant_id', 'fk_support_cases_consent_grant')->references('id')->on('consent_grants')->restrictOnDelete();
            $table->unique(['opened_by_user_id', 'principal_user_id', 'idempotency_key'], 'uq_support_cases_actor_principal_idempotency');
        });
        DB::statement("ALTER TABLE conversations ADD CONSTRAINT chk_conversations_scope_type CHECK (scope_type IN ('order', 'deal_chain_relay', 'support_case'))");
        DB::statement('ALTER TABLE conversations ADD CONSTRAINT chk_conversations_next_sequence CHECK (next_sequence > 0)');
        DB::statement("ALTER TABLE messages ADD CONSTRAINT chk_messages_audience CHECK (audience IN ('participants', 'staff_internal'))");
        DB::statement('ALTER TABLE messages ADD CONSTRAINT chk_messages_sequence CHECK (sequence > 0)');
        DB::statement('ALTER TABLE messages ADD CONSTRAINT chk_messages_attribution CHECK ((actor_user_id = owner_user_id AND consent_grant_id IS NULL) OR (actor_user_id <> owner_user_id AND consent_grant_id IS NOT NULL))');
        DB::statement('ALTER TABLE support_cases ADD CONSTRAINT chk_support_cases_open_attribution CHECK (idempotency_key IS NULL OR (opened_by_user_id IS NOT NULL AND principal_user_id IS NOT NULL AND initial_payload_hash IS NOT NULL))');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE support_cases DROP CONSTRAINT IF EXISTS chk_support_cases_open_attribution');
        DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_attribution');
        DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_sequence');
        DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_audience');
        DB::statement('ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_next_sequence');
        DB::statement('ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_scope_type');
        Schema::table('support_cases', function (Blueprint $table): void {
            $table->dropUnique('uq_support_cases_actor_principal_idempotency');
            $table->dropForeign('fk_support_cases_opened_by');
            $table->dropForeign('fk_support_cases_principal');
            $table->dropForeign('fk_support_cases_consent_grant');
            $table->dropColumn(['opened_by_user_id', 'principal_user_id', 'consent_grant_id', 'idempotency_key', 'initial_payload_hash']);
        });
        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex('idx_messages_audience_sequence');
            $table->dropUnique('uq_messages_conversation_sequence');
            $table->dropUnique('uq_messages_actor_owner_idempotency');
            $table->unique(['conversation_id', 'idempotency_key'], 'uq_messages_idempotency');
            $table->dropForeign('fk_messages_owner');
            $table->dropForeign('fk_messages_consent_grant');
            $table->dropColumn(['owner_user_id', 'consent_grant_id', 'sequence', 'audience', 'actor_display_name', 'owner_display_name', 'payload_hash']);
        });
        Schema::table('conversations', function (Blueprint $table): void {
            $table->dropUnique('uq_conversations_scope');
            $table->dropIndex('idx_conversations_scope');
            $table->dropColumn(['scope_type', 'scope_id', 'next_sequence']);
        });
    }
};

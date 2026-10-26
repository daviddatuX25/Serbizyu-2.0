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
        Schema::table('deal_needs', function (Blueprint $table): void {
            $table->text('node_key')->nullable();
            $table->text('node_role')->nullable();
            $table->text('recipe_code')->nullable();
            $table->unsignedInteger('recipe_version')->nullable();
            $table->uuid('source_listing_id')->nullable();
        });

        DB::statement("UPDATE deal_needs SET node_key = 'legacy-' || ordinal::text, node_role = 'legacy', recipe_code = 'legacy_unversioned', recipe_version = 1");
        DB::statement('
            UPDATE deal_needs AS needs
            SET source_listing_id = orders.listing_id
            FROM orders
            WHERE orders.deal_need_id = needs.id
              AND needs.source_listing_id IS NULL
        ');
        DB::statement("
            UPDATE deal_needs AS needs
            SET source_listing_id = (
                SELECT CASE
                    WHEN invitations.scope->>'listing_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    THEN (invitations.scope->>'listing_id')::uuid
                    ELSE NULL
                END
                FROM deal_invitations AS invitations
                WHERE invitations.deal_need_id = needs.id
                  AND invitations.purpose = 'primary_listing_assignment'
                ORDER BY invitations.created_at
                LIMIT 1
            )
            WHERE needs.source_listing_id IS NULL
        ");

        Schema::table('deal_needs', function (Blueprint $table): void {
            $table->text('node_key')->nullable(false)->change();
            $table->text('node_role')->nullable(false)->change();
            $table->text('recipe_code')->nullable(false)->change();
            $table->unsignedInteger('recipe_version')->nullable(false)->change();
            $table->index(
                ['deal_chain_id', 'source_listing_id', 'recipe_code', 'recipe_version', 'node_key'],
                'idx_deal_needs_chain_source_node',
            );
            $table->foreign('source_listing_id', 'fk_deal_needs_source_listing')
                ->references('id')->on('listings')->restrictOnDelete();
        });
        DB::statement('ALTER TABLE deal_needs DROP CONSTRAINT IF EXISTS ck_deal_needs_status');
        DB::statement("ALTER TABLE deal_needs ADD CONSTRAINT ck_deal_needs_status CHECK (status IN ('draft', 'open', 'sourcing', 'invited', 'quoted', 'accepted', 'awaiting_customer_confirmation', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled', 'replacement_needed', 'superseded'))");

        Schema::create('deal_need_confirmations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_chain_id');
            $table->uuid('deal_need_id');
            $table->uuid('invitation_id');
            $table->uuid('order_id');
            $table->uuid('confirmed_by_user_id');
            $table->uuid('listing_id');
            $table->uuid('appointment_reservation_id')->nullable();
            $table->uuid('listing_version_id');
            $table->char('terms_hash', 64);
            $table->char('capacity_hash', 64);
            $table->unsignedInteger('payload_version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('confirmed_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->unique('deal_need_id', 'uq_deal_need_confirmation_need');
            $table->unique('invitation_id', 'uq_deal_need_confirmation_invitation');
            $table->foreign(['deal_chain_id', 'deal_need_id'], 'fk_deal_need_confirmations_need')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign('invitation_id', 'fk_deal_need_confirmations_invitation')
                ->references('id')->on('deal_invitations')->restrictOnDelete();
            $table->foreign('order_id', 'fk_deal_need_confirmations_order')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('confirmed_by_user_id', 'fk_deal_need_confirmations_customer')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('listing_id', 'fk_deal_need_confirmations_listing')
                ->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('listing_version_id', 'fk_deal_need_confirmations_listing_version')
                ->references('id')->on('listing_versions')->restrictOnDelete();
        });

        DB::statement('ALTER TABLE deal_need_confirmations ADD CONSTRAINT ck_deal_need_confirmations_payload_version CHECK (payload_version > 0)');
        DB::statement("ALTER TABLE deal_need_confirmations ADD CONSTRAINT ck_deal_need_confirmations_hashes CHECK (terms_hash ~ '^[0-9a-f]{64}$' AND capacity_hash ~ '^[0-9a-f]{64}$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_need_confirmations');
        DB::statement('ALTER TABLE deal_needs DROP CONSTRAINT IF EXISTS ck_deal_needs_status');
        DB::statement("ALTER TABLE deal_needs ADD CONSTRAINT ck_deal_needs_status CHECK (status IN ('draft', 'open', 'sourcing', 'invited', 'quoted', 'accepted', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled', 'replacement_needed', 'superseded'))");
        Schema::table('deal_needs', function (Blueprint $table): void {
            $table->dropForeign('fk_deal_needs_source_listing');
            $table->dropIndex('idx_deal_needs_chain_source_node');
            $table->dropColumn(['node_key', 'node_role', 'recipe_code', 'recipe_version', 'source_listing_id']);
        });
    }
};

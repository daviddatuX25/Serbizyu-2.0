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
        Schema::create('categories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('parent_id')->nullable();
            $table->text('code');
            $table->text('name');
            $table->text('safety_class');
            $table->text('data_class');
            $table->text('status');
            $table->text('pilot_status');
            $table->jsonb('metadata')->default('{}');
            $table->unsignedInteger('metadata_version')->default(1);
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique('code', 'uq_categories_code');
            $table->index(['status', 'pilot_status'], 'idx_categories_status_pilot');
        });

        Schema::table('categories', function (Blueprint $table): void {
            $table->foreign('parent_id', 'fk_categories_parent')
                ->references('id')->on('categories')->restrictOnDelete();
        });

        Schema::create('capability_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('code');
            $table->text('listing_type');
            $table->text('mechanism');
            $table->text('work_shape');
            $table->jsonb('allowed_payment_lanes');
            $table->jsonb('allowed_access_tiers');
            $table->text('safety_class');
            $table->text('data_class');
            $table->text('status');
            $table->text('activation_record_reference')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['code', 'version'], 'uq_capability_profiles_code_version');
            $table->index(['status', 'listing_type', 'work_shape'], 'idx_capability_profiles_active_shape');
        });

        Schema::create('policy_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('policy_type');
            $table->text('policy_key');
            $table->unsignedInteger('policy_version');
            $table->timestampTz('effective_from');
            $table->timestampTz('effective_to')->nullable();
            $table->jsonb('configuration');
            $table->unsignedInteger('payload_version')->default(1);
            $table->text('status');
            $table->uuid('authored_by_user_id');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['policy_type', 'policy_key', 'policy_version'], 'uq_policy_versions_identity');
            $table->index(['policy_type', 'policy_key', 'status'], 'idx_policy_versions_active_key');
            $table->foreign('authored_by_user_id', 'fk_policy_versions_author')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('listings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('owner_user_id');
            $table->uuid('capability_profile_id');
            $table->uuid('category_id');
            $table->text('listing_type');
            $table->text('status');
            $table->jsonb('geography')->nullable();
            $table->unsignedInteger('current_version')->default(1);
            $table->text('review_status');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('archived_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['status', 'category_id', 'capability_profile_id'], 'idx_listings_active_category_profile');
            $table->index(['status', 'geography'], 'idx_listings_active_geography');
            $table->foreign('owner_user_id', 'fk_listings_owner')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('capability_profile_id', 'fk_listings_capability_profile')
                ->references('id')->on('capability_profiles')->restrictOnDelete();
            $table->foreign('category_id', 'fk_listings_category')
                ->references('id')->on('categories')->restrictOnDelete();
        });

        Schema::create('listing_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->unsignedInteger('version_number');
            $table->text('description');
            $table->jsonb('terms');
            $table->unsignedBigInteger('price_amount_minor')->nullable();
            $table->char('currency', 3)->nullable();
            $table->jsonb('payment_lane_availability');
            $table->jsonb('availability_capacity_summary');
            $table->text('safety_copy')->nullable();
            $table->timestampTz('effective_from');
            $table->timestampTz('effective_to')->nullable();
            $table->uuid('authored_by_user_id');
            $table->unsignedInteger('payload_version')->default(1);
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['listing_id', 'version_number'], 'uq_listing_versions_listing_version');
            $table->index(['listing_id', 'published_at'], 'idx_listing_versions_listing_published');
            $table->foreign('listing_id', 'fk_listing_versions_listing')
                ->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('authored_by_user_id', 'fk_listing_versions_author')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('listing_capacity', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('listing_version_id')->nullable();
            $table->text('capacity_type');
            $table->unsignedBigInteger('quantity')->nullable();
            $table->unsignedBigInteger('remaining_quantity')->nullable();
            $table->timestampTz('slot_start')->nullable();
            $table->timestampTz('slot_end')->nullable();
            $table->text('reservation_status');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique('listing_id', 'uq_listing_capacity_listing');
            $table->index(['reservation_status', 'slot_start', 'slot_end'], 'idx_listing_capacity_reservation_window');
            $table->foreign('listing_id', 'fk_listing_capacity_listing')
                ->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('listing_version_id', 'fk_listing_capacity_listing_version')
                ->references('id')->on('listing_versions')->restrictOnDelete();
        });

        Schema::create('requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('requester_user_id');
            $table->uuid('listing_id')->nullable();
            $table->uuid('category_id')->nullable();
            $table->uuid('capability_profile_id')->nullable();
            $table->text('description');
            $table->jsonb('item_list')->nullable();
            $table->unsignedBigInteger('budget_amount_minor')->nullable();
            $table->char('budget_currency', 3)->nullable();
            $table->jsonb('timing')->nullable();
            $table->jsonb('location')->nullable();
            $table->text('status');
            $table->timestampTz('expires_at')->nullable();
            $table->jsonb('privacy_preferences')->nullable();
            $table->jsonb('safety_preferences')->nullable();
            $table->uuid('deal_chain_id')->nullable();
            $table->uuid('deal_need_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['status', 'expires_at'], 'idx_requests_status_expiry');
            $table->index(['deal_need_id', 'status', 'expires_at'], 'idx_requests_deal_need_status_expiry');
            $table->foreign('requester_user_id', 'fk_requests_requester')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('listing_id', 'fk_requests_listing')
                ->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('category_id', 'fk_requests_category')
                ->references('id')->on('categories')->restrictOnDelete();
            $table->foreign('capability_profile_id', 'fk_requests_capability_profile')
                ->references('id')->on('capability_profiles')->restrictOnDelete();
        });

        Schema::create('quotes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('request_id');
            $table->uuid('listing_id')->nullable();
            $table->uuid('provider_user_id');
            $table->unsignedInteger('quote_version');
            $table->unsignedBigInteger('amount_minor');
            $table->char('currency', 3);
            $table->jsonb('amount_components')->default('{}');
            $table->jsonb('scope');
            $table->jsonb('inclusions')->nullable();
            $table->jsonb('exclusions')->nullable();
            $table->timestampTz('expires_at');
            $table->text('work_shape');
            $table->jsonb('payment_lane_options');
            $table->text('status');
            $table->uuid('deal_chain_id')->nullable();
            $table->uuid('deal_need_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['request_id', 'quote_version'], 'uq_quotes_request_version');
            $table->index(['request_id', 'status', 'expires_at'], 'idx_quotes_request_status_expiry');
            $table->index(['deal_need_id', 'status', 'expires_at'], 'idx_quotes_deal_need_status_expiry');
            $table->foreign('request_id', 'fk_quotes_request')
                ->references('id')->on('requests')->restrictOnDelete();
            $table->foreign('listing_id', 'fk_quotes_listing')
                ->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('provider_user_id', 'fk_quotes_provider')
                ->references('id')->on('users')->restrictOnDelete();
        });

        $checks = [
            ['categories', 'ck_categories_version', 'version > 0'],
            ['capability_profiles', 'ck_capability_profiles_status', "status IN ('draft', 'approved', 'active', 'retired')"],
            ['capability_profiles', 'ck_capability_profiles_version', 'version > 0'],
            ['policy_versions', 'ck_policy_versions_dates', 'effective_to IS NULL OR effective_to > effective_from'],
            ['listings', 'ck_listings_status', "status IN ('draft', 'pending_review', 'active', 'paused', 'unavailable', 'expired', 'archived', 'rejected')"],
            ['listings', 'ck_listings_review_status', "review_status IN ('not_required', 'pending', 'approved', 'rejected')"],
            ['listing_versions', 'ck_listing_versions_price_currency', '(price_amount_minor IS NULL AND currency IS NULL) OR (price_amount_minor IS NOT NULL AND currency IS NOT NULL)'],
            ['listing_versions', 'ck_listing_versions_price', 'price_amount_minor IS NULL OR price_amount_minor >= 0'],
            ['listing_versions', 'ck_listing_versions_dates', 'effective_to IS NULL OR effective_to > effective_from'],
            ['listing_capacity', 'ck_listing_capacity_quantities', '(quantity IS NULL OR quantity >= 0) AND (remaining_quantity IS NULL OR remaining_quantity >= 0) AND (quantity IS NULL OR remaining_quantity IS NULL OR remaining_quantity <= quantity)'],
            ['listing_capacity', 'ck_listing_capacity_slots', 'slot_end IS NULL OR slot_start IS NULL OR slot_end > slot_start'],
            ['requests', 'ck_requests_status', "status IN ('draft', 'published', 'sourcing', 'quoted', 'accepted', 'expired', 'cancelled', 'closed')"],
            ['requests', 'ck_requests_budget_currency', '(budget_amount_minor IS NULL AND budget_currency IS NULL) OR (budget_amount_minor IS NOT NULL AND budget_currency IS NOT NULL)'],
            ['requests', 'ck_requests_budget', 'budget_amount_minor IS NULL OR budget_amount_minor >= 0'],
            ['requests', 'ck_requests_deal_lineage_all_or_none', '(deal_chain_id IS NULL AND deal_need_id IS NULL) OR (deal_chain_id IS NOT NULL AND deal_need_id IS NOT NULL)'],
            ['quotes', 'ck_quotes_amount', 'amount_minor >= 0'],
            ['quotes', 'ck_quotes_status', "status IN ('draft', 'submitted', 'accepted', 'declined', 'withdrawn', 'expired', 'superseded')"],
            ['quotes', 'ck_quotes_deal_lineage_all_or_none', '(deal_chain_id IS NULL AND deal_need_id IS NULL) OR (deal_chain_id IS NOT NULL AND deal_need_id IS NOT NULL)'],
        ];

        foreach ($checks as [$table, $name, $expression]) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$expression})");
        }

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '002',
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
        DB::table('migration_checkpoints')->where('batch', '002')->delete();

        Schema::dropIfExists('quotes');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('listing_capacity');
        Schema::dropIfExists('listing_versions');
        Schema::dropIfExists('listings');
        Schema::dropIfExists('policy_versions');
        Schema::dropIfExists('capability_profiles');
        Schema::dropIfExists('categories');
    }
};

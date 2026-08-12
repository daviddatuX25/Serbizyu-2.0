<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('category_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('category_id');
            $table->unsignedInteger('business_version');
            $table->text('status');
            $table->text('name');
            $table->text('description')->nullable();
            $table->text('safety_class');
            $table->text('data_class');
            $table->jsonb('policy_content')->default('{}');
            $table->unsignedInteger('content_schema_version')->default(1);
            $table->text('checksum');
            $table->timestampTz('effective_at')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('paused_at')->nullable();
            $table->timestampTz('retired_at')->nullable();
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['category_id', 'business_version'], 'uq_category_versions_category_business');
            $table->index(['category_id', 'status'], 'idx_category_versions_category_status');
            $table->foreign('category_id', 'fk_category_versions_category')
                ->references('id')->on('categories')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_category_versions_creator')
                ->references('id')->on('users')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE category_versions ADD CONSTRAINT ck_category_versions_status CHECK (status IN ('draft', 'published', 'paused', 'retired'))");
        DB::statement('ALTER TABLE category_versions ADD CONSTRAINT ck_category_versions_business_version CHECK (business_version > 0)');
        DB::statement('ALTER TABLE category_versions ADD CONSTRAINT ck_category_versions_content_schema CHECK (content_schema_version > 0)');
        DB::statement("CREATE UNIQUE INDEX uq_category_versions_one_active ON category_versions (category_id) WHERE status = 'published'");

        Schema::table('capability_profiles', function (Blueprint $table): void {
            $table->text('profile_family_code')->nullable();
            $table->unsignedInteger('business_version')->nullable();
            $table->unsignedInteger('content_schema_version')->default(1);
            $table->unsignedInteger('row_version')->default(1);
        });

        DB::statement('UPDATE capability_profiles SET profile_family_code = code, business_version = version, row_version = version WHERE profile_family_code IS NULL');
        DB::statement('ALTER TABLE capability_profiles ALTER COLUMN profile_family_code SET NOT NULL');
        DB::statement('ALTER TABLE capability_profiles ALTER COLUMN business_version SET NOT NULL');
        DB::statement('ALTER TABLE capability_profiles ADD CONSTRAINT ck_capability_profiles_business_version CHECK (business_version > 0)');
        DB::statement('ALTER TABLE capability_profiles ADD CONSTRAINT ck_capability_profiles_row_version CHECK (row_version > 0)');
        DB::statement('ALTER TABLE capability_profiles ADD CONSTRAINT ck_capability_profiles_content_schema CHECK (content_schema_version > 0)');
        DB::statement('CREATE UNIQUE INDEX uq_capability_profiles_family_business ON capability_profiles (profile_family_code, business_version)');
        DB::statement("CREATE UNIQUE INDEX uq_capability_profiles_one_active_family ON capability_profiles (profile_family_code) WHERE status = 'active'");

        Schema::table('listing_versions', function (Blueprint $table): void {
            $table->uuid('category_id')->nullable();
            $table->unsignedInteger('category_business_version')->nullable();
            $table->text('capability_profile_family_code')->nullable();
            $table->unsignedInteger('capability_profile_business_version')->nullable();
            $table->unsignedInteger('row_version')->default(1);
        });

        DB::statement(<<<'SQL'
            UPDATE listing_versions lv
            SET
                category_id = l.category_id,
                category_business_version = 1,
                capability_profile_family_code = cp.profile_family_code,
                capability_profile_business_version = cp.business_version,
                row_version = lv.version
            FROM listings l
            JOIN capability_profiles cp ON cp.id = l.capability_profile_id
            WHERE l.id = lv.listing_id
            SQL);

        // Ensure pinned category versions exist for any listing pins.
        DB::statement(<<<'SQL'
            INSERT INTO category_versions (
                id, category_id, business_version, status, name, description, safety_class, data_class,
                policy_content, content_schema_version, checksum, effective_at, published_at,
                created_by_user_id, correlation_id, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                c.id,
                1,
                'published',
                c.name,
                NULL,
                c.safety_class,
                c.data_class,
                '{}'::jsonb,
                1,
                encode(sha256(convert_to(c.id::text || ':' || c.name, 'UTF8')), 'hex'),
                now(),
                now(),
                NULL,
                c.correlation_id,
                now(),
                now()
            FROM categories c
            WHERE NOT EXISTS (
                SELECT 1 FROM category_versions cv
                WHERE cv.category_id = c.id AND cv.business_version = 1
            )
            SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE listing_versions
                ADD CONSTRAINT fk_listing_versions_category_version
                FOREIGN KEY (category_id, category_business_version)
                REFERENCES category_versions (category_id, business_version)
                ON DELETE RESTRICT
            SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE listing_versions
                ADD CONSTRAINT fk_listing_versions_capability_profile_version
                FOREIGN KEY (capability_profile_family_code, capability_profile_business_version)
                REFERENCES capability_profiles (profile_family_code, business_version)
                ON DELETE RESTRICT
            SQL);

        Schema::table('listing_capacity', function (Blueprint $table): void {
            $table->text('resource_key')->default('');
            $table->unsignedInteger('row_version')->default(1);
        });

        DB::statement("UPDATE listing_capacity SET resource_key = '' WHERE resource_key IS NULL");
        DB::statement('UPDATE listing_capacity SET row_version = version');

        // Backfill null listing_version_id from the listing's current published/latest version when possible.
        DB::statement(<<<'SQL'
            UPDATE listing_capacity lc
            SET listing_version_id = (
                SELECT lv.id
                FROM listing_versions lv
                WHERE lv.listing_id = lc.listing_id
                ORDER BY lv.version_number DESC
                LIMIT 1
            )
            WHERE lc.listing_version_id IS NULL
            SQL);

        DB::statement('ALTER TABLE listing_capacity DROP CONSTRAINT IF EXISTS uq_listing_capacity_listing');
        DB::statement('CREATE UNIQUE INDEX uq_listing_capacity_bucket ON listing_capacity (listing_id, listing_version_id, capacity_type, resource_key)');
        DB::statement('CREATE UNIQUE INDEX uq_listing_capacity_id_version ON listing_capacity (id, listing_version_id)');

        Schema::create('listing_capacity_reservations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('listing_capacity_id');
            $table->uuid('listing_version_id');
            $table->uuid('order_id')->nullable();
            $table->text('source_mechanism');
            $table->uuid('source_reference_id')->nullable();
            $table->unsignedBigInteger('quantity');
            $table->timestampTz('slot_start')->nullable();
            $table->timestampTz('slot_end')->nullable();
            $table->text('status');
            $table->text('command_scope');
            $table->text('idempotency_key');
            $table->unsignedInteger('row_version')->default(1);
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('committed_at')->nullable();
            $table->timestampTz('released_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['command_scope', 'idempotency_key'], 'uq_listing_capacity_reservations_command');
            $table->index(['order_id', 'status'], 'idx_listing_capacity_reservations_order_status');
            $table->index(['expires_at', 'status'], 'idx_listing_capacity_reservations_expiry');
            $table->foreign('order_id', 'fk_listing_capacity_reservations_order')
                ->references('id')->on('orders')->restrictOnDelete();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE listing_capacity_reservations
                ADD CONSTRAINT fk_listing_capacity_reservations_capacity_version
                FOREIGN KEY (listing_capacity_id, listing_version_id)
                REFERENCES listing_capacity (id, listing_version_id)
                ON DELETE RESTRICT
            SQL);

        DB::statement("ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_status CHECK (status IN ('held', 'committed', 'released', 'expired'))");
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_quantity CHECK (quantity > 0)');
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_slots CHECK (slot_end IS NULL OR slot_start IS NULL OR slot_end > slot_start)');
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_row_version CHECK (row_version > 0)');
        DB::statement("CREATE UNIQUE INDEX uq_listing_capacity_reservations_active_slot ON listing_capacity_reservations (listing_capacity_id, slot_start, slot_end) WHERE status IN ('held', 'committed') AND slot_start IS NOT NULL AND slot_end IS NOT NULL");

        canonical58_checkpoint_complete('002', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('002');

        Schema::dropIfExists('listing_capacity_reservations');

        DB::statement('DROP INDEX IF EXISTS uq_listing_capacity_id_version');
        DB::statement('DROP INDEX IF EXISTS uq_listing_capacity_bucket');
        DB::statement('CREATE UNIQUE INDEX uq_listing_capacity_listing ON listing_capacity (listing_id)');

        Schema::table('listing_capacity', function (Blueprint $table): void {
            $table->dropColumn(['resource_key', 'row_version']);
        });

        DB::statement('ALTER TABLE listing_versions DROP CONSTRAINT IF EXISTS fk_listing_versions_capability_profile_version');
        DB::statement('ALTER TABLE listing_versions DROP CONSTRAINT IF EXISTS fk_listing_versions_category_version');

        Schema::table('listing_versions', function (Blueprint $table): void {
            $table->dropColumn([
                'category_id',
                'category_business_version',
                'capability_profile_family_code',
                'capability_profile_business_version',
                'row_version',
            ]);
        });

        DB::statement('DROP INDEX IF EXISTS uq_capability_profiles_one_active_family');
        DB::statement('DROP INDEX IF EXISTS uq_capability_profiles_family_business');
        DB::statement('ALTER TABLE capability_profiles DROP CONSTRAINT IF EXISTS ck_capability_profiles_content_schema');
        DB::statement('ALTER TABLE capability_profiles DROP CONSTRAINT IF EXISTS ck_capability_profiles_row_version');
        DB::statement('ALTER TABLE capability_profiles DROP CONSTRAINT IF EXISTS ck_capability_profiles_business_version');

        Schema::table('capability_profiles', function (Blueprint $table): void {
            $table->dropColumn([
                'profile_family_code',
                'business_version',
                'content_schema_version',
                'row_version',
            ]);
        });

        Schema::dropIfExists('category_versions');
    }
};

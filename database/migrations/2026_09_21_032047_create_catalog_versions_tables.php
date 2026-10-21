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
        Schema::create('work_catalog_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('catalog_code');
            $table->text('work_shape');
            $table->unsignedInteger('shape_contract_version');
            $table->unsignedInteger('payload_schema_version');
            $table->unsignedInteger('catalog_version');
            $table->text('title');
            $table->text('summary');
            $table->text('status');
            $table->jsonb('definition');
            $table->unsignedInteger('payload_version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['catalog_code', 'catalog_version'], 'uq_work_catalog_code_version');
            $table->unique(
                ['work_shape', 'shape_contract_version', 'payload_schema_version', 'catalog_version'],
                'uq_work_catalog_shape_version',
            );
            $table->index(['status', 'work_shape'], 'idx_work_catalog_status_shape');
        });

        Schema::create('deal_chain_catalog_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('recipe_code');
            $table->unsignedInteger('catalog_version');
            $table->text('title');
            $table->text('pattern');
            $table->text('description');
            $table->text('status');
            $table->jsonb('category_codes');
            $table->jsonb('listing_types');
            $table->jsonb('work_shapes');
            $table->unsignedBigInteger('extra_fee_amount_minor');
            $table->char('currency', 3);
            $table->decimal('rating', 2, 1);
            $table->unsignedInteger('booked_count')->default(0);
            $table->jsonb('definition');
            $table->unsignedInteger('payload_version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['recipe_code', 'catalog_version'], 'uq_deal_chain_catalog_recipe_version');
            $table->index(['status', 'recipe_code'], 'idx_deal_chain_catalog_status_code');
        });

        DB::statement(
            "ALTER TABLE work_catalog_versions ADD CONSTRAINT ck_work_catalog_status CHECK (status IN ('draft', 'published', 'retired'))"
        );
        DB::statement(
            "ALTER TABLE deal_chain_catalog_versions ADD CONSTRAINT ck_deal_chain_catalog_status CHECK (status IN ('draft', 'published', 'retired'))"
        );
        DB::statement(
            'ALTER TABLE deal_chain_catalog_versions ADD CONSTRAINT ck_deal_chain_catalog_rating CHECK (rating >= 0 AND rating <= 5)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_chain_catalog_versions');
        Schema::dropIfExists('work_catalog_versions');
    }
};

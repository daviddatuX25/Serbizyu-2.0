<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('listing_daily_metrics')) {
            Schema::create('listing_daily_metrics', function (Blueprint $table): void {
                $table->date('metric_date');
                $table->uuid('listing_id');
                $table->unsignedInteger('impressions')->default(0);
                $table->unsignedInteger('views')->default(0);
                $table->unsignedInteger('inquiries')->default(0);
                $table->unsignedInteger('orders')->default(0);
                $table->unsignedBigInteger('gross_amount_minor')->default(0);
                $table->string('currency', 3)->default('PHP');
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();

                $table->primary(['metric_date', 'listing_id'], 'pk_listing_daily_metrics');
                $table->foreign('listing_id', 'fk_listing_daily_metrics_listing')
                    ->references('id')
                    ->on('listings')
                    ->cascadeOnDelete();
                $table->index(['listing_id', 'metric_date'], 'idx_listing_daily_metrics_listing_date');
            });
        }

        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table): void {
                if (! Schema::hasColumn('reviews', 'author_role')) {
                    $table->string('author_role', 32)->default('buyer');
                }
                if (! Schema::hasColumn('reviews', 'attribute_chips')) {
                    $table->jsonb('attribute_chips')->nullable();
                }
                if (! Schema::hasColumn('reviews', 'sealed_until')) {
                    $table->timestampTz('sealed_until')->nullable();
                }
                if (! Schema::hasColumn('reviews', 'unblinded_at')) {
                    $table->timestampTz('unblinded_at')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_daily_metrics');

        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table): void {
                $drop = [];
                foreach (['author_role', 'attribute_chips', 'sealed_until', 'unblinded_at'] as $col) {
                    if (Schema::hasColumn('reviews', $col)) {
                        $drop[] = $col;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }
};

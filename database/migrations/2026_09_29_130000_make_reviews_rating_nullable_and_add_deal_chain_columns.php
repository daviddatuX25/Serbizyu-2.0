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
        if (Schema::hasTable('reviews')) {
            // Drop NOT NULL on rating to allow providers to submit non-numeric citizen reliability evaluations
            DB::statement('ALTER TABLE reviews ALTER COLUMN rating DROP NOT NULL');

            // Replace constraint to enforce 1-5 for buyers, and NULL rating for providers
            DB::statement('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS chk_reviews_rating');
            DB::statement("ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (
                (author_role = 'buyer' AND rating BETWEEN 1 AND 5) OR
                (author_role = 'provider' AND rating IS NULL)
            )");

            Schema::table('reviews', function (Blueprint $table): void {
                if (! Schema::hasColumn('reviews', 'deal_chain_id')) {
                    $table->uuid('deal_chain_id')->nullable()->index('idx_reviews_deal_chain');
                }
                if (! Schema::hasColumn('reviews', 'submission_mode')) {
                    $table->string('submission_mode', 32)->nullable()->default('single');
                }
                if (! Schema::hasColumn('reviews', 'submission_id')) {
                    $table->uuid('submission_id')->nullable()->index('idx_reviews_submission_id');
                }
            });

            // Backfill existing synthetic provider ratings from 5 to NULL
            DB::statement("UPDATE reviews SET rating = NULL WHERE author_role = 'provider' AND rating IS NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('reviews')) {
            // Restore default constraint
            DB::statement('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS chk_reviews_rating');
            DB::statement('UPDATE reviews SET rating = 5 WHERE rating IS NULL');
            DB::statement('ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL');
            DB::statement('ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)');

            Schema::table('reviews', function (Blueprint $table): void {
                $drop = [];
                foreach (['deal_chain_id', 'submission_mode', 'submission_id'] as $col) {
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

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\TagudinDealChainCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use JsonException;

final class DealChainCatalogSeeder extends Seeder
{
    /**
     * @throws JsonException
     */
    public function run(): void
    {
        if (! Schema::hasTable('deal_chain_catalog_versions')) {
            return;
        }

        $now = now();
        $rows = [];
        foreach (TagudinDealChainCatalog::definitions() as $definition) {
            $rows[] = [
                'id' => $definition['id'],
                'recipe_code' => $definition['recipe_code'],
                'catalog_version' => $definition['catalog_version'],
                'title' => $definition['title'],
                'pattern' => $definition['pattern'],
                'description' => $definition['description'],
                'status' => $definition['status'],
                'category_codes' => json_encode($definition['category_codes'], JSON_THROW_ON_ERROR),
                'listing_types' => json_encode($definition['listing_types'], JSON_THROW_ON_ERROR),
                'work_shapes' => json_encode($definition['work_shapes'], JSON_THROW_ON_ERROR),
                'extra_fee_amount_minor' => $definition['extra_fee_amount_minor'],
                'currency' => $definition['currency'],
                'rating' => $definition['rating'],
                'booked_count' => $definition['booked_count'],
                'definition' => json_encode($definition['definition'], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'correlation_id' => $definition['id'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('deal_chain_catalog_versions')->upsert(
            $rows,
            ['recipe_code', 'catalog_version'],
            [
                'title',
                'pattern',
                'description',
                'status',
                'category_codes',
                'listing_types',
                'work_shapes',
                'extra_fee_amount_minor',
                'currency',
                'rating',
                'booked_count',
                'definition',
                'payload_version',
                'updated_at',
            ],
        );
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\TagudinWorkCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use JsonException;

final class WorkCatalogSeeder extends Seeder
{
    /**
     * @throws JsonException
     */
    public function run(): void
    {
        if (! Schema::hasTable('work_catalog_versions')) {
            return;
        }

        $now = now();
        $existingCatalogCodes = DB::table('work_catalog_versions')
            ->distinct()
            ->pluck('catalog_code')
            ->flip();
        $rows = [];
        foreach (TagudinWorkCatalog::definitions() as $definition) {
            if (isset($existingCatalogCodes[$definition['catalog_code']])) {
                continue;
            }
            $rows[] = [
                'id' => $definition['id'],
                'catalog_code' => $definition['catalog_code'],
                'work_shape' => $definition['work_shape'],
                'shape_contract_version' => $definition['shape_contract_version'],
                'payload_schema_version' => $definition['payload_schema_version'],
                'catalog_version' => $definition['catalog_version'],
                'title' => $definition['title'],
                'summary' => $definition['summary'],
                'status' => $definition['status'],
                'definition' => json_encode($definition['definition'], JSON_THROW_ON_ERROR),
                'payload_version' => $definition['payload_schema_version'],
                'correlation_id' => $definition['id'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows === []) {
            return;
        }

        DB::table('work_catalog_versions')->upsert(
            $rows,
            ['catalog_code', 'catalog_version'],
            [
                'work_shape',
                'shape_contract_version',
                'payload_schema_version',
                'title',
                'summary',
                'status',
                'definition',
                'payload_version',
                'updated_at',
            ],
        );
    }
}

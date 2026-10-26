<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const CATALOGS = [
        'tagudin-local-service-a1' => [
            'id' => '0198a3b1-7c40-7abc-8def-7234567890c1',
            'root_steps' => [],
            'sets' => [
                'set-repairs-inverter-clean' => [
                    'inverter-check' => [
                        ['id' => 'cooling-delta', 'name' => 'Supply-to-return air temperature difference', 'unit' => '°C', 'required' => true],
                    ],
                ],
            ],
        ],
        'tagudin-onsite-service-a3' => [
            'id' => '0198a3b1-7c40-7abc-8def-7234567890c3',
            'root_steps' => [],
            'sets' => [
                'set-repairs-electrical-turnkey' => [
                    'electrical-test' => [
                        ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true],
                        ['id' => 'load-current', 'name' => 'Load current', 'unit' => 'A', 'required' => true],
                    ],
                ],
            ],
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('work_catalog_versions')) {
            return;
        }

        foreach (self::CATALOGS as $catalogCode => $definition) {
            $published = DB::table('work_catalog_versions')
                ->where('catalog_code', $catalogCode)
                ->where('status', 'published')
                ->orderByDesc('catalog_version')
                ->get();
            $latest = $published->first();
            if ($latest === null) {
                continue;
            }

            $catalogDefinition = is_array($latest->definition)
                ? $latest->definition
                : json_decode((string) $latest->definition, true, 512, JSON_THROW_ON_ERROR);
            $catalogDefinition = is_array($catalogDefinition) ? $catalogDefinition : [];
            $needsNewVersion = $this->hasMissingRequirements($catalogDefinition, $definition);
            $latestVersion = (int) $latest->catalog_version;
            $targetSchemaVersion = max(2, (int) $latest->payload_schema_version);
            $highestVersion = (int) DB::table('work_catalog_versions')->where('catalog_code', $catalogCode)->max('catalog_version');
            if ($needsNewVersion) {
                $catalogDefinition['steps'] = $this->addRequirements(
                    (array) ($catalogDefinition['steps'] ?? []),
                    $definition['root_steps'],
                );
                foreach ((array) ($catalogDefinition['work_sets'] ?? []) as $index => $workSet) {
                    if (! is_array($workSet)) {
                        continue;
                    }
                    $setCode = (string) ($workSet['set_code'] ?? '');
                    $setRequirements = $definition['sets'][$setCode] ?? [];
                    if ($setRequirements === [] || ! $this->setNeedsVersion($workSet, $setRequirements)) {
                        continue;
                    }
                    $catalogDefinition['work_sets'][$index]['steps'] = $this->addRequirements(
                        (array) ($workSet['steps'] ?? []),
                        $setRequirements,
                    );
                    $catalogDefinition['work_sets'][$index]['set_version'] = (int) ($workSet['set_version'] ?? 1) + 1;
                    $catalogDefinition['work_sets'][$index]['payload_schema_version'] = $targetSchemaVersion;
                }

                $newVersion = $highestVersion + 1;
                $idIsFree = ! DB::table('work_catalog_versions')->where('id', $definition['id'])->exists();
                $newId = $newVersion === 2 && $idIsFree ? $definition['id'] : (string) Str::uuid7();
                $now = now();
                DB::table('work_catalog_versions')->insert([
                    'id' => $newId,
                    'catalog_code' => $catalogCode,
                    'work_shape' => (string) $latest->work_shape,
                    'shape_contract_version' => (int) $latest->shape_contract_version,
                    'payload_schema_version' => $targetSchemaVersion,
                    'catalog_version' => $newVersion,
                    'title' => (string) $latest->title,
                    'summary' => (string) $latest->summary,
                    'status' => 'published',
                    'definition' => json_encode($catalogDefinition, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'payload_version' => (int) $latest->payload_version + 1,
                    'correlation_id' => $newId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            $retireBeforeVersion = $needsNewVersion ? $newVersion : $latestVersion;

            DB::table('work_catalog_versions')
                ->where('catalog_code', $catalogCode)
                ->where('status', 'published')
                ->where('catalog_version', '<', $retireBeforeVersion)
                ->update(['status' => 'retired', 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Published Work catalog versions are forward-only; restore prior semantics with a new catalog version.');
    }

    /**
     * @param  array<string, mixed>  $workSet
     * @param  array<string, list<array{id: string, name: string, unit: string, required: bool}>>  $metricMap
     */
    private function setNeedsVersion(array $workSet, array $metricMap): bool
    {
        foreach ($metricMap as $nodeId => $_requirements) {
            foreach ((array) ($workSet['steps'] ?? []) as $step) {
                if (! is_array($step) || (string) ($step['id'] ?? '') !== $nodeId) {
                    continue;
                }
                $metrics = $step['metric_requirements'] ?? $step['metricRequirements'] ?? [];
                $proofs = $step['required_proofs'] ?? $step['requiredProofs'] ?? [];

                return ! is_array($metrics)
                    || $metrics === []
                    || ! is_array($proofs)
                    || ! in_array('metric_reading', $proofs, true);
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $catalogDefinition
     * @param  array<string, mixed>  $metricMap
     */
    private function hasMissingRequirements(array $catalogDefinition, array $metricMap): bool
    {
        foreach ((array) ($catalogDefinition['steps'] ?? []) as $step) {
            if (! is_array($step) || ! isset($metricMap['root_steps'][$step['id']])) {
                continue;
            }
            $metrics = $step['metric_requirements'] ?? $step['metricRequirements'] ?? [];
            $proofs = $step['required_proofs'] ?? $step['requiredProofs'] ?? [];
            if (empty($metrics) || ! is_array($proofs) || ! in_array('metric_reading', $proofs, true)) {
                return true;
            }
        }
        foreach ((array) ($catalogDefinition['work_sets'] ?? []) as $workSet) {
            if (! is_array($workSet)) {
                continue;
            }
            $setRequirements = $metricMap['sets'][(string) ($workSet['set_code'] ?? '')] ?? [];
            if ($setRequirements !== [] && $this->setNeedsVersion($workSet, $setRequirements)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $steps
     * @param  array<string, list<array{id: string, name: string, unit: string, required: bool}>>  $metricMap
     * @return list<array<string, mixed>>
     */
    private function addRequirements(array $steps, array $metricMap): array
    {
        foreach ($steps as $index => $step) {
            if (! is_array($step)) {
                continue;
            }
            $nodeId = (string) ($step['id'] ?? '');
            if (! isset($metricMap[$nodeId])) {
                continue;
            }
            $requiredProofs = $steps[$index]['required_proofs'] ?? $steps[$index]['requiredProofs'] ?? [];
            if (! is_array($requiredProofs)) {
                throw new RuntimeException('A published Work catalog contains an invalid required_proofs list.');
            }
            $requiredProofs = array_values(array_unique(array_filter(
                $requiredProofs,
                static fn (mixed $proof): bool => is_string($proof),
            )));
            if (! in_array('metric_reading', $requiredProofs, true)) {
                $requiredProofs[] = 'metric_reading';
            }
            $steps[$index]['required_proofs'] = $requiredProofs;
            $existingMetrics = $steps[$index]['metric_requirements'] ?? $steps[$index]['metricRequirements'] ?? [];
            $steps[$index]['metric_requirements'] = is_array($existingMetrics) && $existingMetrics !== []
                ? $existingMetrics
                : $metricMap[$nodeId];
            unset($steps[$index]['metricRequirements']);
        }

        return $steps;
    }
};

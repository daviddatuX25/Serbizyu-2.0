<?php

declare(strict_types=1);

namespace App\Modules\Catalogs\Application;

use App\Shared\Contracts\WorkSpecificationPort;
use App\Shared\Infrastructure\Demo\TagudinWorkCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkCatalog implements WorkSpecificationPort
{
    public const NODE_KINDS = [
        'checkin_intake',
        'execution_proof',
        'decision_gate',
        'handoff_ready',
        'final_signoff',
    ];

    public const CONTROL_MODES = [
        'provider_advance',
        'customer_confirm',
        'counterparty_handoff',
    ];

    public const EVIDENCE_TYPES = [
        'photo_required',
        'video_required',
        'meter_log',
        'receipt_upload',
        'dual_sign',
    ];

    /** @var list<array<string, mixed>>|null */
    private ?array $memoizedDefinitions = null;

    /**
     * @return list<array<string, mixed>>
     */
    public function published(): array
    {
        if ($this->memoizedDefinitions !== null) {
            return $this->memoizedDefinitions;
        }

        $definitions = Schema::hasTable('work_catalog_versions')
            ? DB::table('work_catalog_versions')
                ->whereIn('status', ['published', 'draft'])
                ->orderByRaw("CASE WHEN status = 'published' THEN 0 ELSE 1 END")
                ->orderBy('work_shape')
                ->orderByDesc('catalog_version')
                ->get()
                ->map(fn (object $row): array => $this->fromRow($row))
                ->unique('catalog_code')
                ->values()
                ->all()
            : [];

        $this->memoizedDefinitions = $definitions !== [] ? $definitions : TagudinWorkCatalog::definitions();

        return $this->memoizedDefinitions;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function publishedForShape(string $shape): ?array
    {
        foreach ($this->published() as $definition) {
            if ((string) $definition['work_shape'] === $shape && (string) ($definition['status'] ?? 'published') === 'published') {
                return $definition;
            }
        }

        foreach ($this->published() as $definition) {
            if ((string) $definition['work_shape'] === $shape) {
                return $definition;
            }
        }

        return null;
    }

    /**
     * Normalize raw stage/step arrays into canonical Work Nodes with 5 fundamental node_kinds and 3 control_modes.
     *
     * @param  array<int, array<string, mixed>>  $rawSteps
     * @return list<array{
     *     id: string,
     *     ordinal: int,
     *     title: string,
     *     description: string,
     *     node_kind: string,
     *     evidence_type: string,
     *     evidence_description: string,
     *     control_mode: string,
     *     mandatory: bool,
     *     duration_label: string|null
     * }>
     */
    public function normalizeNodes(array $rawSteps, string $workShape = 'A1'): array
    {
        $values = array_values($rawSteps);
        $total = count($values);
        $normalized = [];

        foreach ($values as $idx => $raw) {
            $ordinal = $idx + 1;
            $isFirst = $ordinal === 1;
            $isLast = $ordinal === $total && $total > 1;

            $rawEvidenceType = (string) ($raw['evidence_type'] ?? $raw['evidenceType'] ?? '');
            $evidenceDescription = trim((string) ($raw['evidence_description'] ?? $raw['evidenceDescription'] ?? $raw['evidence'] ?? 'Verification proof required at this gate.'));

            if (! in_array($rawEvidenceType, self::EVIDENCE_TYPES, true)) {
                $lowerDesc = strtolower($evidenceDescription.' '.(string) ($raw['title'] ?? ''));
                if (str_contains($lowerDesc, 'sign') || str_contains($lowerDesc, 'confirm') || str_contains($lowerDesc, 'approve')) {
                    $rawEvidenceType = 'dual_sign';
                } elseif (str_contains($lowerDesc, 'meter') || str_contains($lowerDesc, 'amp') || str_contains($lowerDesc, 'psi') || str_contains($lowerDesc, 'temp') || str_contains($lowerDesc, 'reading')) {
                    $rawEvidenceType = 'meter_log';
                } elseif (str_contains($lowerDesc, 'receipt') || str_contains($lowerDesc, 'slip')) {
                    $rawEvidenceType = 'receipt_upload';
                } elseif (str_contains($lowerDesc, 'video')) {
                    $rawEvidenceType = 'video_required';
                } else {
                    $rawEvidenceType = $isLast ? 'dual_sign' : 'photo_required';
                }
            }

            $rawNodeKind = (string) ($raw['node_kind'] ?? $raw['nodeKind'] ?? '');
            if (! in_array($rawNodeKind, self::NODE_KINDS, true)) {
                if ($isLast) {
                    $rawNodeKind = 'final_signoff';
                } elseif ($isFirst) {
                    $rawNodeKind = 'checkin_intake';
                } elseif ($rawEvidenceType === 'dual_sign') {
                    $rawNodeKind = $workShape === 'A4' ? 'handoff_ready' : 'decision_gate';
                } elseif ($workShape === 'A4' && $ordinal === 2) {
                    $rawNodeKind = 'handoff_ready';
                } else {
                    $rawNodeKind = 'execution_proof';
                }
            }

            $rawControlMode = (string) ($raw['control_mode'] ?? $raw['controlMode'] ?? '');
            if (! in_array($rawControlMode, self::CONTROL_MODES, true)) {
                $rawControlMode = match ($rawNodeKind) {
                    'decision_gate', 'final_signoff' => 'customer_confirm',
                    'handoff_ready' => 'counterparty_handoff',
                    default => $rawEvidenceType === 'dual_sign' ? 'customer_confirm' : 'provider_advance',
                };
            }

            $normalized[] = [
                'id' => trim((string) ($raw['id'] ?? strtolower($workShape).'-node-'.$ordinal)),
                'ordinal' => $ordinal,
                'title' => trim((string) ($raw['title'] ?? 'Step '.$ordinal)),
                'description' => trim((string) ($raw['description'] ?? $raw['desc'] ?? '')),
                'node_kind' => $rawNodeKind,
                'evidence_type' => $rawEvidenceType,
                'evidence_description' => $evidenceDescription,
                'control_mode' => $rawControlMode,
                'mandatory' => (bool) ($raw['mandatory'] ?? true),
                'duration_label' => isset($raw['dur']) || isset($raw['duration_label'])
                    ? trim((string) ($raw['duration_label'] ?? $raw['dur']))
                    : null,
            ];
        }

        return $normalized;
    }

    /**
     * Compute the deterministic structural signature hash for a Work Shape + ordered node mechanics.
     * Ignores titles, descriptions, and category labels so identical structures compound across trades.
     *
     * @param  array<int, array<string, mixed>>  $nodes
     */
    public function computeSignature(string $workShape, array $nodes): string
    {
        $normalizedShape = strtoupper(trim($workShape)) ?: 'A1';
        $normalizedNodes = $this->normalizeNodes($nodes, $normalizedShape);

        $structuralTuples = array_map(
            static fn (array $node): array => [
                'ordinal' => $node['ordinal'],
                'node_kind' => $node['node_kind'],
                'evidence_type' => $node['evidence_type'],
                'control_mode' => $node['control_mode'],
                'mandatory' => $node['mandatory'],
            ],
            $normalizedNodes,
        );

        $canonicalPreimage = json_encode([
            'work_shape' => $normalizedShape,
            'nodes' => $structuralTuples,
        ], JSON_THROW_ON_ERROR);

        return 'sig_'.substr(hash('sha256', $canonicalPreimage), 0, 16);
    }

    /**
     * Resolve a listing's Work nodes at write-time, compute its structural signature hash,
     * and compound the (signature_hash, category_code, listing_type) variation in work_catalog_versions.
     *
     * @param  array<int, array<string, mixed>>  $rawStages
     * @return array{
     *     signature_hash: string,
     *     work_shape: string,
     *     catalog_code: string,
     *     based_on_catalog_code: string|null,
     *     is_custom_variation: bool,
     *     category_code: string,
     *     listing_type: string,
     *     nodes: list<array<string, mixed>>
     * }
     */
    public function resolveAndRecordListingWork(
        string $workShape,
        string $categoryCode,
        string $listingType,
        string $listingTitle,
        array $rawStages,
        ?string $selectedCatalogCode = null,
    ): array {
        $normalizedShape = strtoupper(trim($workShape)) ?: 'A1';
        $normalizedCategory = strtolower(trim($categoryCode)) ?: 'general';
        $normalizedType = strtolower(trim($listingType)) ?: 'service';

        if ($rawStages === []) {
            $fallback = $this->publishedForShape($normalizedShape);
            $rawStages = (array) ($fallback['definition']['steps'] ?? []);
        }

        $nodes = $this->normalizeNodes($rawStages, $normalizedShape);
        $signatureHash = $this->computeSignature($normalizedShape, $nodes);

        $definitions = $this->published();
        $matchedArchetype = null;
        $selectedArchetype = null;

        foreach ($definitions as $def) {
            $defSteps = (array) ($def['definition']['steps'] ?? []);
            $defSig = (string) ($def['definition']['signature_hash'] ?? $this->computeSignature((string) $def['work_shape'], $defSteps));

            if ($selectedCatalogCode !== null && (string) $def['catalog_code'] === $selectedCatalogCode) {
                $selectedArchetype = $def;
            }
            if ($defSig === $signatureHash && $matchedArchetype === null) {
                $matchedArchetype = $def;
            }
        }

        $isCustomVariation = $matchedArchetype === null
            || ($selectedArchetype !== null && (string) $matchedArchetype['catalog_code'] !== (string) $selectedArchetype['catalog_code'])
            || ((string) ($matchedArchetype['status'] ?? 'published') !== 'published');

        $targetArchetype = $matchedArchetype ?? $selectedArchetype ?? $this->publishedForShape($normalizedShape);
        $resolvedCatalogCode = $matchedArchetype !== null
            ? (string) $matchedArchetype['catalog_code']
            : 'custom-'.strtolower($normalizedShape).'-'.substr($signatureHash, 4, 8);

        if ($targetArchetype !== null && Schema::hasTable('work_catalog_versions')) {
            $this->persistVariationOnCatalogRow(
                targetArchetype: $targetArchetype,
                signatureHash: $signatureHash,
                workShape: $normalizedShape,
                categoryCode: $normalizedCategory,
                listingType: $normalizedType,
                listingTitle: $listingTitle,
                nodes: $nodes,
                isCustomVariation: $isCustomVariation,
            );
            $this->memoizedDefinitions = null;
        }

        return [
            'signature_hash' => $signatureHash,
            'work_shape' => $normalizedShape,
            'catalog_code' => $resolvedCatalogCode,
            'based_on_catalog_code' => $selectedCatalogCode ?? ($targetArchetype['catalog_code'] ?? null),
            'is_custom_variation' => $isCustomVariation,
            'category_code' => $normalizedCategory,
            'listing_type' => $normalizedType,
            'nodes' => $nodes,
        ];
    }

    /**
     * Fast, pre-grouped work options for Listing Creation (1 query per request via memoized published()).
     *
     * @return array{
     *     recommended: list<array<string, mixed>>,
     *     other_archetypes: list<array<string, mixed>>
     * }
     */
    public function optionsFor(?string $categoryCode = null, ?string $listingType = null): array
    {
        $normCat = $categoryCode !== null && trim($categoryCode) !== '' ? strtolower(trim($categoryCode)) : null;
        $normType = $listingType !== null && trim($listingType) !== '' ? strtolower(trim($listingType)) : null;

        $recommended = [];
        $otherArchetypes = [];

        foreach ($this->frontend() as $archetype) {
            $matchesCat = $normCat === null || in_array($normCat, $archetype['category_codes'], true);
            $matchesType = $normType === null || in_array($normType, $archetype['listing_types'], true);

            if ($matchesCat && $matchesType) {
                $recommended[] = [
                    'option_id' => $archetype['catalog_code'],
                    'catalog_code' => $archetype['catalog_code'],
                    'signature_hash' => $archetype['signature_hash'],
                    'work_shape' => $archetype['work_shape'],
                    'category_code' => $normCat ?? ($archetype['category_codes'][0] ?? 'general'),
                    'listing_type' => $normType ?? ($archetype['listing_types'][0] ?? 'service'),
                    'title' => $archetype['title'],
                    'summary' => $archetype['summary'],
                    'is_official' => $archetype['status'] === 'published',
                    'adopted_jobs_count' => $archetype['total_adopted_count'],
                    'steps' => $archetype['steps'],
                ];
            } else {
                $otherArchetypes[] = [
                    'option_id' => $archetype['catalog_code'],
                    'catalog_code' => $archetype['catalog_code'],
                    'signature_hash' => $archetype['signature_hash'],
                    'work_shape' => $archetype['work_shape'],
                    'category_code' => $archetype['category_codes'][0] ?? 'general',
                    'listing_type' => $archetype['listing_types'][0] ?? 'service',
                    'title' => $archetype['title'],
                    'summary' => $archetype['summary'],
                    'is_official' => $archetype['status'] === 'published',
                    'adopted_jobs_count' => $archetype['total_adopted_count'],
                    'steps' => $archetype['steps'],
                ];
            }

            foreach ($archetype['observed_variations'] as $variation) {
                $varCat = strtolower((string) ($variation['category_code'] ?? ''));
                $varType = strtolower((string) ($variation['listing_type'] ?? 'service'));
                $varMatchesCat = $normCat === null || $varCat === '' || $varCat === $normCat;
                $varMatchesType = $normType === null || $varType === '' || $varType === $normType;

                if ($varMatchesCat && $varMatchesType) {
                    $recommended[] = [
                        'option_id' => (string) ($variation['id'] ?? $variation['signature_hash'] ?? Str::random(8)),
                        'catalog_code' => $archetype['catalog_code'],
                        'signature_hash' => (string) ($variation['signature_hash'] ?? $archetype['signature_hash']),
                        'work_shape' => $archetype['work_shape'],
                        'category_code' => $varCat !== '' ? $varCat : ($normCat ?? 'general'),
                        'listing_type' => $varType,
                        'title' => (string) ($variation['title'] ?? $archetype['title']),
                        'summary' => (string) ($variation['steps_summary'] ?? $archetype['summary']),
                        'is_official' => (bool) ($variation['is_promoted'] ?? false),
                        'adopted_jobs_count' => (int) ($variation['adopted_jobs_count'] ?? 1),
                        'steps' => isset($variation['steps']) && is_array($variation['steps']) && $variation['steps'] !== []
                            ? $this->normalizeNodes($variation['steps'], (string) $archetype['work_shape'])
                            : $archetype['steps'],
                    ];
                }
            }
        }

        return [
            'recommended' => $recommended,
            'other_archetypes' => $otherArchetypes,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function frontend(): array
    {
        return array_map(function (array $definition): array {
            $catalog = (array) ($definition['definition'] ?? []);
            $workShape = (string) $definition['work_shape'];
            $normalizedSteps = $this->normalizeNodes((array) ($catalog['steps'] ?? []), $workShape);
            $signatureHash = (string) ($catalog['signature_hash'] ?? $this->computeSignature($workShape, $normalizedSteps));
            $categoryCodes = array_values(array_map('strtolower', (array) ($catalog['category_codes'] ?? [])));
            $listingTypes = array_values(array_map('strtolower', (array) ($catalog['listing_types'] ?? ['service'])));

            $variations = array_values(array_map(function (mixed $rawVar) use ($workShape, $signatureHash, $normalizedSteps, $categoryCodes, $listingTypes): array {
                $var = (array) $rawVar;
                $varSteps = isset($var['steps']) && is_array($var['steps']) && $var['steps'] !== []
                    ? $this->normalizeNodes($var['steps'], $workShape)
                    : $normalizedSteps;
                $varSig = (string) ($var['signature_hash'] ?? $this->computeSignature($workShape, $varSteps));

                return [
                    'id' => (string) ($var['id'] ?? $varSig),
                    'signature_hash' => $varSig,
                    'category_code' => (string) ($var['category_code'] ?? ($categoryCodes[0] ?? 'general')),
                    'listing_type' => (string) ($var['listing_type'] ?? ($listingTypes[0] ?? 'service')),
                    'title' => (string) ($var['title'] ?? 'Observed category variation'),
                    'adopted_jobs_count' => (int) ($var['adopted_jobs_count'] ?? 1),
                    'adoption_rate' => (int) ($var['adoption_rate'] ?? 80),
                    'is_custom_variation' => (bool) ($var['is_custom_variation'] ?? ($varSig !== $signatureHash)),
                    'is_promoted' => (bool) ($var['is_promoted'] ?? false),
                    'steps_count' => count($varSteps),
                    'steps_summary' => implode(' -> ', array_map(
                        static fn (array $s): string => $s['ordinal'].'. '.$s['title'],
                        $varSteps,
                    )),
                    'steps' => $varSteps,
                ];
            }, (array) ($catalog['observed_variations'] ?? [])));

            $totalAdopted = array_reduce(
                $variations,
                static fn (int $carry, array $v): int => $carry + (int) ($v['adopted_jobs_count'] ?? 0),
                0,
            );

            return [
                'id' => (string) $definition['id'],
                'catalog_code' => (string) $definition['catalog_code'],
                'signature_hash' => $signatureHash,
                'work_shape' => $workShape,
                'shape_contract_version' => (int) $definition['shape_contract_version'],
                'payload_schema_version' => (int) $definition['payload_schema_version'],
                'catalog_version' => (int) $definition['catalog_version'],
                'title' => (string) $definition['title'],
                'summary' => (string) $definition['summary'],
                'status' => (string) $definition['status'],
                'category_codes' => $categoryCodes,
                'listing_types' => $listingTypes,
                'variance_threshold_percent' => (int) ($catalog['variance_threshold_percent'] ?? 0),
                'evaluation_window_hours' => (int) ($catalog['evaluation_window_hours'] ?? 0),
                'total_adopted_count' => $totalAdopted,
                'steps' => $normalizedSteps,
                'observed_variations' => $variations,
            ];
        }, $this->published());
    }

    /**
     * @param  array<string, mixed>  $targetArchetype
     * @param  list<array<string, mixed>>  $nodes
     */
    private function persistVariationOnCatalogRow(
        array $targetArchetype,
        string $signatureHash,
        string $workShape,
        string $categoryCode,
        string $listingType,
        string $listingTitle,
        array $nodes,
        bool $isCustomVariation,
    ): void {
        $row = DB::table('work_catalog_versions')
            ->where('id', (string) $targetArchetype['id'])
            ->lockForUpdate()
            ->first();

        if ($row === null) {
            return;
        }

        $definition = $this->decodeObject($row->definition);
        $categoryCodes = array_values(array_unique(array_merge(
            array_map('strtolower', (array) ($definition['category_codes'] ?? [])),
            [$categoryCode],
        )));
        $listingTypes = array_values(array_unique(array_merge(
            array_map('strtolower', (array) ($definition['listing_types'] ?? ['service'])),
            [$listingType],
        )));

        $variations = array_values((array) ($definition['observed_variations'] ?? []));
        $variationKey = $signatureHash.':'.$categoryCode.':'.$listingType;
        $found = false;

        foreach ($variations as $idx => $existing) {
            $arr = (array) $existing;
            $existingKey = (string) ($arr['variation_key'] ?? (($arr['signature_hash'] ?? '').':'.($arr['category_code'] ?? '').':'.($arr['listing_type'] ?? '')));
            if ($existingKey === $variationKey) {
                $arr['adopted_jobs_count'] = ((int) ($arr['adopted_jobs_count'] ?? 1)) + 1;
                $arr['steps'] = $nodes;
                $variations[$idx] = $arr;
                $found = true;
                break;
            }
        }

        if (! $found) {
            $variations[] = [
                'id' => 'var-'.substr(hash('sha256', $variationKey), 0, 10),
                'variation_key' => $variationKey,
                'signature_hash' => $signatureHash,
                'work_shape' => $workShape,
                'category_code' => $categoryCode,
                'listing_type' => $listingType,
                'title' => trim($listingTitle) !== '' ? trim($listingTitle) : strtoupper($categoryCode).' '.$workShape.' Variation',
                'adopted_jobs_count' => 1,
                'adoption_rate' => 100,
                'is_custom_variation' => $isCustomVariation,
                'is_promoted' => false,
                'steps' => $nodes,
            ];
        }

        $definition['category_codes'] = $categoryCodes;
        $definition['listing_types'] = $listingTypes;
        $definition['observed_variations'] = $variations;

        DB::table('work_catalog_versions')
            ->where('id', (string) $row->id)
            ->update([
                'definition' => json_encode($definition, JSON_THROW_ON_ERROR),
                'updated_at' => now(),
            ]);
    }

    /** @return array<string, mixed> */
    private function fromRow(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'catalog_code' => (string) $row->catalog_code,
            'work_shape' => (string) $row->work_shape,
            'shape_contract_version' => (int) $row->shape_contract_version,
            'payload_schema_version' => (int) $row->payload_schema_version,
            'catalog_version' => (int) $row->catalog_version,
            'title' => (string) $row->title,
            'summary' => (string) $row->summary,
            'status' => (string) $row->status,
            'definition' => $this->decodeObject($row->definition),
        ];
    }

    /** @return array<string, mixed> */
    private function decodeObject(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }

        return is_array($value) ? $value : [];
    }
}

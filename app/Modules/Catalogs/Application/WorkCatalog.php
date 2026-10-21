<?php

declare(strict_types=1);

namespace App\Modules\Catalogs\Application;

use App\Shared\Contracts\WorkSpecificationPort;
use App\Shared\Infrastructure\Demo\TagudinWorkCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

    public const WORK_TOOLS = [
        'photo_proof',
        'gps_checkin',
        'metric_reading',
        'checklist_steps',
        'external_connector',
    ];

    public const APPROVAL_METHODS = [
        'app_confirm',
        'presence_otp',
        'worker_dropoff',
        'none',
    ];

    public const EVIDENCE_TYPES = [
        'photo_required',
        'video_required',
        'meter_log',
        'receipt_upload',
        'dual_sign',
        'none',
        'gps_checkin',
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
     *     duration_label: string|null,
     *     required_proofs: list<string>,
     *     approval_method: string,
     *     metric_unit: string|null
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

            $hasRequiredProofs = array_key_exists('required_proofs', $raw) || array_key_exists('requiredProofs', $raw);
            $rawRequiredProofs = $raw['required_proofs'] ?? $raw['requiredProofs'] ?? null;
            $hasExplicitEvidenceType = array_key_exists('evidence_type', $raw) || array_key_exists('evidenceType', $raw);
            $rawEvidenceType = (string) ($raw['evidence_type'] ?? $raw['evidenceType'] ?? '');
            $evidenceDescription = trim((string) ($raw['evidence_description'] ?? $raw['evidenceDescription'] ?? $raw['evidence'] ?? 'Verification proof required at this gate.'));

            if ($hasRequiredProofs && is_array($rawRequiredProofs) && ! $hasExplicitEvidenceType) {
                if (in_array('gps_checkin', $rawRequiredProofs, true)) {
                    $rawEvidenceType = 'gps_checkin';
                } elseif (in_array('metric_reading', $rawRequiredProofs, true)) {
                    $rawEvidenceType = 'meter_log';
                } elseif (in_array('photo_proof', $rawRequiredProofs, true)) {
                    $rawEvidenceType = 'photo_required';
                } elseif ($rawRequiredProofs === []) {
                    $rawEvidenceType = 'none';
                }
            }

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

            if ($hasRequiredProofs && is_array($rawRequiredProofs)) {
                $requiredProofs = array_values(array_filter(
                    $rawRequiredProofs,
                    static fn (mixed $proof): bool => is_string($proof) && in_array($proof, self::WORK_TOOLS, true),
                ));
            } else {
                $requiredProofs = match ($rawEvidenceType) {
                    'photo_required', 'video_required', 'receipt_upload' => ['photo_proof'],
                    'meter_log' => ['metric_reading'],
                    'gps_checkin' => ['gps_checkin'],
                    default => [],
                };
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

            $hasDirectControlMode = array_key_exists('control_mode', $raw) || array_key_exists('controlMode', $raw);
            $rawControlMode = (string) ($raw['control_mode'] ?? $raw['controlMode'] ?? '');
            if (! $hasDirectControlMode) {
                $rawControlMode = match ($raw['clearance_mode'] ?? $raw['clearanceMode'] ?? '') {
                    'worker_direct' => 'provider_advance',
                    'customer_approval' => 'customer_confirm',
                    'physical_handoff' => 'counterparty_handoff',
                    default => '',
                };
            }
            if (! in_array($rawControlMode, self::CONTROL_MODES, true)) {
                $rawControlMode = match ($rawNodeKind) {
                    'decision_gate', 'final_signoff' => 'customer_confirm',
                    'handoff_ready' => 'counterparty_handoff',
                    default => $rawEvidenceType === 'dual_sign' ? 'customer_confirm' : 'provider_advance',
                };
            }

            $approvalMethod = (string) ($raw['approval_method'] ?? $raw['approvalMethod'] ?? '');
            if (! in_array($approvalMethod, self::APPROVAL_METHODS, true)) {
                $approvalMethod = match (true) {
                    $rawControlMode === 'customer_confirm' => 'app_confirm',
                    ($raw['handoff_party'] ?? $raw['handoffParty'] ?? '') === 'worker_dropoff' => 'worker_dropoff',
                    $rawControlMode === 'provider_advance' => 'none',
                    default => 'none',
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
                'required_proofs' => $requiredProofs,
                'approval_method' => $approvalMethod,
                'metric_unit' => isset($raw['metric_unit']) || isset($raw['metricUnit'])
                    ? trim((string) ($raw['metric_unit'] ?? $raw['metricUnit']))
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
                'required_proofs' => $node['required_proofs'],
                'approval_method' => $node['approval_method'],
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
     * Resolve a listing's Work nodes and retain immutable selected-set provenance.
     *
     * @param  array<int, array<string, mixed>>  $rawStages
     * @return array<string, mixed>
     */
    public function resolveAndRecordListingWork(
        string $workShape,
        string $categoryCode,
        string $listingType,
        string $listingTitle,
        array $rawStages,
        ?string $selectedCatalogCode = null,
        ?int $selectedSetVersion = null,
    ): array {
        $normalizedCategory = strtolower(trim($categoryCode)) ?: 'general';
        $normalizedType = strtolower(trim($listingType)) ?: 'service';
        $selected = $selectedCatalogCode !== null ? $this->findWorkSet($selectedCatalogCode, $selectedSetVersion) : null;

        if ($selectedCatalogCode !== null && ($selected === null
            || ! in_array('published', [(string) ($selected['status'] ?? 'published')], true)
            || ! in_array($normalizedType, (array) ($selected['listing_types'] ?? []), true))) {
            throw new \InvalidArgumentException('The selected Work Set is unavailable or incompatible with this listing type.');
        }

        $normalizedShape = $selected !== null
            ? (string) $selected['work_shape']
            : (strtoupper(trim($workShape)) ?: 'A1');
        $selectedSteps = (array) ($selected['steps'] ?? []);
        if ($rawStages === []) {
            $rawStages = $selectedSteps !== [] ? $selectedSteps : (array) ($this->publishedForShape($normalizedShape)['definition']['steps'] ?? []);
        }

        $nodes = $this->normalizeNodes($rawStages, $normalizedShape);
        $signatureHash = $this->computeSignature($normalizedShape, $nodes);
        $isCustomVariation = $selected !== null && $this->stepsDiffer($nodes, $this->normalizeNodes($selectedSteps, $normalizedShape));
        $catalogCode = $selected['set_code'] ?? $selected['catalog_code'] ?? $selected['option_id'] ?? null;

        return [
            'signature_hash' => $signatureHash,
            'work_shape' => $normalizedShape,
            'catalog_code' => 'custom-'.strtolower($normalizedShape).'-'.substr($signatureHash, 4, 8),
            'based_on_catalog_code' => $selected['catalog_code'] ?? null,
            'based_on_set_code' => $selected['set_code'] ?? $catalogCode,
            'based_on_set_version' => isset($selected['set_version']) ? (int) $selected['set_version'] : null,
            'shape_contract_version' => isset($selected['shape_contract_version']) ? (int) $selected['shape_contract_version'] : null,
            'payload_schema_version' => isset($selected['payload_schema_version']) ? (int) $selected['payload_schema_version'] : null,
            'is_custom_variation' => $isCustomVariation,
            'category_code' => $normalizedCategory,
            'listing_type' => $normalizedType,
            'nodes' => $nodes,
        ];
    }

    /**
     * @return array{recommended: list<array<string, mixed>>, other_archetypes: list<array<string, mixed>>}
     */
    public function optionsFor(?string $categoryCode = null, ?string $listingType = null): array
    {
        $category = $categoryCode !== null && trim($categoryCode) !== '' ? strtolower(trim($categoryCode)) : null;
        $type = $listingType !== null && trim($listingType) !== '' ? strtolower(trim($listingType)) : null;
        $recommended = [];
        $other = [];
        $activeShapesByType = [];
        $sets = $this->selectableWorkSets();

        if (Schema::hasTable('capability_profiles')) {
            $profileTypes = $type !== null
                ? [$type]
                : array_values(array_unique(array_merge(...array_map(
                    static fn (array $set): array => $set['listing_types'],
                    $sets === [] ? [[]] : $sets,
                ))));
            foreach ($profileTypes as $profileType) {
                $profiles = DB::table('capability_profiles')
                    ->where('listing_type', $profileType)
                    ->get(['status', 'work_shape']);
                if ($profiles->isNotEmpty()) {
                    $activeShapesByType[$profileType] = $profiles
                        ->where('status', 'active')
                        ->pluck('work_shape')
                        ->map(static fn ($shape): string => strtoupper((string) $shape))
                        ->unique()
                        ->all();
                }
            }
        }

        foreach ($sets as $set) {
            if ($type !== null && ! in_array($type, $set['listing_types'], true)) {
                continue;
            }
            $typesToCheck = $type !== null ? [$type] : $set['listing_types'];
            $compatibleShapes = [];
            foreach ($typesToCheck as $compatibleType) {
                $compatibleShapes = array_merge(
                    $compatibleShapes,
                    $compatibleType === 'service' ? ['A1', 'A3', 'A9'] : ($compatibleType === 'product' ? ['A4', 'A9'] : []),
                );
                if (isset($activeShapesByType[$compatibleType])
                    && ! in_array(strtoupper((string) ($set['work_shape'] ?? '')), $activeShapesByType[$compatibleType], true)) {
                    continue 2;
                }
            }
            if (! in_array((string) ($set['work_shape'] ?? ''), $compatibleShapes, true)) {
                continue;
            }
            $item = $set;
            $item['category_code'] = $category ?? ($set['category_codes'][0] ?? 'general');
            $item['listing_type'] = $type ?? ($set['listing_types'][0] ?? 'service');
            if ($category === null || in_array($category, $set['category_codes'], true)) {
                $recommended[] = $item;
            } else {
                $other[] = $item;
            }
        }

        return ['recommended' => $recommended, 'other_archetypes' => $other];
    }

    /** @return list<array<string, mixed>> */
    private function selectableWorkSets(): array
    {
        $sets = [];
        foreach ($this->published() as $definition) {
            if (($definition['status'] ?? '') !== 'published') {
                continue;
            }
            $root = (array) ($definition['definition'] ?? []);
            $workSets = (array) ($root['work_sets'] ?? []);
            foreach ($workSets as $set) {
                $set = (array) $set;
                if (($set['status'] ?? '') !== 'published') {
                    continue;
                }
                $set['category_codes'] = array_values(array_map('strtolower', (array) ($set['category_codes'] ?? [])));
                $set['listing_types'] = array_values(array_map('strtolower', (array) ($set['listing_types'] ?? [])));
                $set['steps'] = $this->normalizeNodes((array) ($set['steps'] ?? []), (string) ($set['work_shape'] ?? $definition['work_shape']));
                $set['signature_hash'] = $this->computeSignature((string) ($set['work_shape'] ?? $definition['work_shape']), $set['steps']);
                $sets[] = $set;
            }
        }

        return $sets;
    }

    /** @return array<string, mixed>|null */
    private function findWorkSet(string $code, ?int $setVersion = null): ?array
    {
        foreach ($this->selectableWorkSets() as $set) {
            if (! in_array($code, array_filter([
                $set['set_code'] ?? null,
                $set['option_id'] ?? null,
            ]), true)) {
                continue;
            }
            if ($setVersion !== null && (int) ($set['set_version'] ?? 1) !== $setVersion) {
                continue;
            }

            return $set;
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    public function publishedWorkSet(string $code, ?int $setVersion = null): ?array
    {
        return $this->findWorkSet($code, $setVersion);
    }

    /** @param list<array<string, mixed>> $actual @param list<array<string, mixed>> $expected */
    private function stepsDiffer(array $actual, array $expected): bool
    {
        $fields = ['title', 'description', 'node_kind', 'evidence_type', 'evidence_description', 'control_mode', 'mandatory', 'duration_label', 'required_proofs', 'approval_method'];
        if (count($actual) !== count($expected)) {
            return true;
        }
        foreach ($actual as $index => $step) {
            foreach ($fields as $field) {
                if (($step[$field] ?? null) !== ($expected[$index][$field] ?? null)) {
                    return true;
                }
            }
        }

        return false;
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

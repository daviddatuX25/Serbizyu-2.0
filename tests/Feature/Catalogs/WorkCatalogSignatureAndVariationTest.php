<?php

declare(strict_types=1);

namespace Tests\Feature\Catalogs;

use App\Modules\Catalogs\Application\WorkCatalog;
use App\Shared\Infrastructure\Demo\TagudinWorkCatalog;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class WorkCatalogSignatureAndVariationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_same_node_mechanics_across_different_titles_and_categories_produce_identical_signature_hash(): void
    {
        $catalog = app(WorkCatalog::class);

        $plumbingNodes = [
            [
                'ordinal' => 1,
                'title' => 'Check water pipe pressure',
                'description' => 'Inspect main valve and measure baseline PSI.',
                'node_kind' => 'checkin_intake',
                'evidence_type' => 'photo_required',
                'control_mode' => 'provider_advance',
                'mandatory' => true,
            ],
            [
                'ordinal' => 2,
                'title' => 'Customer approves brass fitting replacement',
                'description' => 'Confirm replacement part before cutting pipe.',
                'node_kind' => 'decision_gate',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
            [
                'ordinal' => 3,
                'title' => 'Final leak check and sign-off',
                'description' => 'Verify zero leaks and customer sign-off.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
        ];

        $electricalNodes = [
            [
                'ordinal' => 1,
                'title' => 'Isolate panel breaker',
                'description' => 'Lock out main breaker and inspect busbar.',
                'node_kind' => 'checkin_intake',
                'evidence_type' => 'photo_required',
                'control_mode' => 'provider_advance',
                'mandatory' => true,
            ],
            [
                'ordinal' => 2,
                'title' => 'Approve 20A breaker swap',
                'description' => 'Customer confirms new breaker spec.',
                'node_kind' => 'decision_gate',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
            [
                'ordinal' => 3,
                'title' => 'Load test and completion sign-off',
                'description' => 'Verify amperage and sign off.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
        ];

        $plumbingSig = $catalog->computeSignature('A1', $plumbingNodes);
        $electricalSig = $catalog->computeSignature('A1', $electricalNodes);

        self::assertSame($plumbingSig, $electricalSig);

        // Adding a node or changing control_mode must produce a different structural signature
        $modifiedNodes = $electricalNodes;
        $modifiedNodes[1]['control_mode'] = 'provider_advance';
        $modifiedNodes[1]['node_kind'] = 'execution_proof';
        $modifiedNodes[1]['evidence_type'] = 'photo_required';

        $modifiedSig = $catalog->computeSignature('A1', $modifiedNodes);
        self::assertNotSame($plumbingSig, $modifiedSig);
    }

    public function test_published_work_sets_are_compatible_immutable_and_keep_exact_provenance(): void
    {
        app(WorkCatalogSeeder::class)->run();
        $catalog = new WorkCatalog;
        $repairs = $catalog->optionsFor('repairs', 'service');
        $courier = $catalog->optionsFor('courier', 'service');

        self::assertContains('set-repairs-inverter-clean', array_column($repairs['recommended'], 'set_code'));
        self::assertNotContains('set-local-services-errand', array_column($repairs['recommended'], 'set_code'));
        self::assertSame([], $courier['recommended']);
        self::assertNotEmpty($courier['other_archetypes']);
        self::assertNotContains('draft', array_column([...$repairs['recommended'], ...$repairs['other_archetypes']], 'status'));

        $set = $catalog->publishedWorkSet('set-repairs-inverter-clean');
        self::assertNotNull($set);
        self::assertSame(2, $set['set_version']);
        self::assertSame('A1', $set['work_shape']);

        $before = Schema::hasTable('work_catalog_versions')
            ? DB::table('work_catalog_versions')->orderBy('id')->pluck('definition', 'id')->all()
            : [];
        $specification = $catalog->resolveAndRecordListingWork(
            workShape: 'A9',
            categoryCode: 'repairs',
            listingType: 'service',
            listingTitle: 'Inverter service',
            rawStages: $set['steps'],
            selectedCatalogCode: 'set-repairs-inverter-clean',
        );

        self::assertSame('A1', $specification['work_shape']);
        self::assertSame('tagudin-local-service-a1', $specification['based_on_catalog_code']);
        self::assertSame('set-repairs-inverter-clean', $specification['based_on_set_code']);
        self::assertSame(2, $specification['based_on_set_version']);
        self::assertSame(1, $specification['shape_contract_version']);
        self::assertSame(2, $specification['payload_schema_version']);
        self::assertFalse($specification['is_custom_variation']);

        $changedSteps = $set['steps'];
        $changedSteps[0]['title'] .= ' modified';
        $custom = $catalog->resolveAndRecordListingWork(
            workShape: 'A1',
            categoryCode: 'repairs',
            listingType: 'service',
            listingTitle: 'Customized inverter service',
            rawStages: $changedSteps,
            selectedCatalogCode: 'set-repairs-inverter-clean',
        );
        self::assertTrue($custom['is_custom_variation']);

        foreach ([
            'node_kind' => 'execution_proof',
            'control_mode' => 'provider_advance',
            'mandatory' => false,
            'required_proofs' => ['gps_checkin'],
            'approval_method' => 'presence_otp',
        ] as $field => $value) {
            $structuralChange = $set['steps'];
            $structuralChange[0][$field] = $value;
            $custom = $catalog->resolveAndRecordListingWork(
                workShape: 'A1',
                categoryCode: 'repairs',
                listingType: 'service',
                listingTitle: 'Structurally customized inverter service',
                rawStages: $structuralChange,
                selectedCatalogCode: 'set-repairs-inverter-clean',
            );
            self::assertTrue($custom['is_custom_variation'], "Changing {$field} must mark a custom variation.");
        }

        self::assertNull($catalog->publishedWorkSet('tagudin-local-service-a1'));
        self::assertNull($catalog->publishedWorkSet('set-repairs-inverter-clean', 1));

        if (Schema::hasTable('work_catalog_versions')) {
            self::assertSame($before, DB::table('work_catalog_versions')->orderBy('id')->pluck('definition', 'id')->all());
        }
    }

    public function test_frontend_work_proofs_and_approval_fields_are_normalized_and_signed(): void
    {
        $catalog = app(WorkCatalog::class);

        $customerApproval = $catalog->normalizeNodes([[
            'id' => 'approval-stage',
            'clearanceMode' => 'customer_approval',
            'approvalMethod' => 'app_confirm',
            'requiredProofs' => [],
        ]])[0];

        self::assertSame('customer_confirm', $customerApproval['control_mode']);
        self::assertSame('app_confirm', $customerApproval['approval_method']);
        self::assertSame('none', $customerApproval['evidence_type']);
        self::assertSame([], $customerApproval['required_proofs']);

        $gpsStage = $catalog->normalizeNodes([[
            'id' => 'gps-stage',
            'requiredProofs' => ['gps_checkin'],
        ]])[0];

        self::assertSame('gps_checkin', $gpsStage['evidence_type']);
        self::assertSame(['gps_checkin'], $gpsStage['required_proofs']);

        $base = [[
            'node_kind' => 'execution_proof',
            'control_mode' => 'customer_confirm',
            'evidence_type' => 'none',
            'required_proofs' => [],
            'approval_method' => 'app_confirm',
        ]];
        $gpsProof = $base;
        $gpsProof[0]['required_proofs'] = ['gps_checkin'];
        $gpsProof[0]['evidence_type'] = 'gps_checkin';
        $presenceApproval = $base;
        $presenceApproval[0]['approval_method'] = 'presence_otp';

        $baseSignature = $catalog->computeSignature('A1', $base);
        self::assertNotSame($baseSignature, $catalog->computeSignature('A1', $gpsProof));
        self::assertNotSame($baseSignature, $catalog->computeSignature('A1', $presenceApproval));
    }

    public function test_named_tool_definitions_are_required_normalized_and_signed(): void
    {
        $catalog = app(WorkCatalog::class);
        $node = [
            'id' => 'named-tool-node',
            'node_kind' => 'execution_proof',
            'control_mode' => 'provider_advance',
            'evidence_type' => 'none',
            'required_proofs' => ['checklist_steps', 'metric_reading'],
            'checklist_items' => [['id' => 'seal', 'label' => 'Seal is intact']],
            'metric_requirements' => [[
                'id' => 'supply-voltage',
                'name' => 'Supply voltage',
                'unit' => 'V',
                'target' => 220,
                'min' => 210,
                'max' => 230,
            ]],
        ];

        $normalized = $catalog->normalizeNodes([$node], 'A1', requireToolDefinitions: true)[0];
        self::assertSame([['id' => 'seal', 'label' => 'Seal is intact', 'required' => true]], $normalized['checklist_items']);
        self::assertSame([
            ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true, 'target' => 220.0, 'min' => 210.0, 'max' => 230.0],
        ], $normalized['metric_requirements']);

        $changedRequirement = $node;
        $changedRequirement['metric_requirements'][0]['min'] = 215;
        self::assertNotSame(
            $catalog->computeSignature('A1', [$node]),
            $catalog->computeSignature('A1', [$changedRequirement]),
        );

        $missingMetrics = $node;
        unset($missingMetrics['metric_requirements']);
        try {
            $catalog->normalizeNodes([$missingMetrics], 'A1', requireToolDefinitions: true);
            self::fail('A metric proof with no named readings should fail normalization.');
        } catch (\InvalidArgumentException $error) {
            self::assertStringContainsString('metric_requirements', $error->getMessage());
        }

        $retiredMetricUnit = $node;
        $retiredMetricUnit['metric_unit'] = null;
        try {
            $catalog->normalizeNodes([$retiredMetricUnit], 'A1');
            self::fail('The retired anonymous metric unit field should fail normalization.');
        } catch (\InvalidArgumentException $error) {
            self::assertStringContainsString('Anonymous metric units are retired', $error->getMessage());
        }
    }

    public function test_catalog_seeder_preserves_authored_versions_and_retired_seed_records(): void
    {
        if (! Schema::hasTable('work_catalog_versions')) {
            self::markTestSkipped('Versioned catalog table is unavailable.');
        }

        $now = now();
        DB::table('work_catalog_versions')->insert([
            'id' => '0198a3b1-7c40-7abc-8def-7234567890d1',
            'catalog_code' => 'tagudin-local-service-a1',
            'work_shape' => 'A1',
            'shape_contract_version' => 1,
            'payload_schema_version' => 9,
            'catalog_version' => 9,
            'title' => 'Authored higher version',
            'summary' => 'Preserve this authored record.',
            'status' => 'published',
            'definition' => json_encode(['authored' => true], JSON_THROW_ON_ERROR),
            'payload_version' => 9,
            'correlation_id' => 'catalog-seeder-preserve-test',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('work_catalog_versions')->insert([
            'id' => '0198a3b1-7c40-7abc-8def-7234567890d2',
            'catalog_code' => 'tagudin-local-service-a1',
            'work_shape' => 'A1',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
            'catalog_version' => 1,
            'title' => 'Retired broken seed',
            'summary' => 'Must not be resurrected.',
            'status' => 'retired',
            'definition' => json_encode([], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'correlation_id' => 'catalog-seeder-retired-test',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        app(WorkCatalogSeeder::class)->run();

        self::assertSame(2, DB::table('work_catalog_versions')->where('catalog_code', 'tagudin-local-service-a1')->count());

        self::assertSame('Authored higher version', DB::table('work_catalog_versions')->where('catalog_code', 'tagudin-local-service-a1')->value('title'));
        self::assertSame(0, DB::table('work_catalog_versions')->where('catalog_code', 'tagudin-local-service-a1')->where('catalog_version', 1)->count());
    }

    public function test_named_metric_migration_versions_changed_work_sets_without_rewriting_published_set_v1(): void
    {
        if (! Schema::hasTable('work_catalog_versions')) {
            self::markTestSkipped('Versioned catalog table is unavailable.');
        }
        $now = now();
        $seedDefinitions = collect(TagudinWorkCatalog::definitions())->keyBy('catalog_code');
        foreach (['tagudin-local-service-a1', 'tagudin-onsite-service-a3'] as $catalogCode) {
            if (DB::table('work_catalog_versions')->where('catalog_code', $catalogCode)->where('catalog_version', 1)->exists()) {
                continue;
            }
            $legacy = $seedDefinitions[$catalogCode];
            $legacy['catalog_version'] = 1;
            $legacy['payload_schema_version'] = 1;
            foreach ($legacy['definition']['work_sets'] as &$workSet) {
                $workSet['set_version'] = 1;
                $workSet['payload_schema_version'] = 1;
                $metricNodeIds = $catalogCode === 'tagudin-local-service-a1'
                    ? ['inverter-check']
                    : ['electrical-test'];
                foreach ($workSet['steps'] as &$step) {
                    if (in_array((string) ($step['id'] ?? ''), $metricNodeIds, true)) {
                        unset($step['metric_requirements'], $step['metricRequirements'], $step['required_proofs'], $step['requiredProofs']);
                    }
                }
                unset($step);
            }
            unset($workSet);
            DB::table('work_catalog_versions')->insert([
                'id' => (string) Str::uuid7(),
                'catalog_code' => $catalogCode,
                'work_shape' => $legacy['work_shape'],
                'shape_contract_version' => $legacy['shape_contract_version'],
                'payload_schema_version' => 1,
                'catalog_version' => 1,
                'title' => $legacy['title'],
                'summary' => $legacy['summary'],
                'status' => 'published',
                'definition' => json_encode($legacy['definition'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'payload_version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        (require database_path('migrations/2026_10_25_002801_version_named_work_metrics.php'))->up();

        foreach ([
            'tagudin-local-service-a1' => ['set-repairs-inverter-clean', 'inverter-check', 'cooling-delta', '°C'],
            'tagudin-onsite-service-a3' => ['set-repairs-electrical-turnkey', 'electrical-test', 'supply-voltage', 'V'],
        ] as $catalogCode => [$setCode, $nodeId, $metricId, $unit]) {
            $versionOne = DB::table('work_catalog_versions')->where('catalog_code', $catalogCode)->where('catalog_version', 1)->first();
            $versionTwo = DB::table('work_catalog_versions')
                ->where('catalog_code', $catalogCode)
                ->where('status', 'published')
                ->where('catalog_version', '>', 1)
                ->orderByDesc('catalog_version')
                ->first();
            self::assertNotNull($versionOne);
            self::assertNotNull($versionTwo);

            $oldDefinition = is_string($versionOne->definition)
                ? json_decode($versionOne->definition, true, 512, JSON_THROW_ON_ERROR)
                : (array) $versionOne->definition;
            $newDefinition = is_string($versionTwo->definition)
                ? json_decode($versionTwo->definition, true, 512, JSON_THROW_ON_ERROR)
                : (array) $versionTwo->definition;
            $oldSet = collect($oldDefinition['work_sets'])->firstWhere('set_code', $setCode);
            $newSet = collect($newDefinition['work_sets'])->firstWhere('set_code', $setCode);
            self::assertSame(1, $oldSet['set_version']);
            self::assertNotSame(2, $oldSet['set_version']);
            self::assertSame(2, $newSet['set_version']);
            $oldNode = collect($oldSet['steps'])->firstWhere('id', $nodeId);
            $newNode = collect($newSet['steps'])->firstWhere('id', $nodeId);
            self::assertSame([], $oldNode['metric_requirements'] ?? []);
            self::assertContains('metric_reading', $newNode['required_proofs']);
            self::assertSame($metricId, $newNode['metric_requirements'][0]['id']);
            self::assertSame($unit, $newNode['metric_requirements'][0]['unit']);
        }
    }
}
it('allows named checklist and metric requirements for A4 and A9 authored proofs', function (): void {
    $catalog = app(WorkCatalog::class);
    $steps = [
        [
            'id' => 'check',
            'node_kind' => 'checkin_intake',
            'control_mode' => 'provider_advance',
            'required_proofs' => ['checklist_steps', 'metric_reading'],
            'checklist_items' => [['id' => 'seal', 'label' => 'Check seal', 'required' => true]],
            'metric_requirements' => [['id' => 'weight', 'name' => 'Package weight', 'unit' => 'kg', 'required' => true]],
        ],
        ['id' => 'custody', 'node_kind' => 'handoff_ready', 'control_mode' => 'counterparty_handoff'],
        ['id' => 'receipt', 'node_kind' => 'final_signoff', 'control_mode' => 'customer_confirm', 'approval_method' => 'app_confirm'],
    ];

    expect($catalog->normalizeNodes($steps, 'A4', requireToolDefinitions: true)[0]['metric_requirements'][0]['unit'])->toBe('kg')
        ->and($catalog->normalizeNodes([$steps[0]], 'A9', requireToolDefinitions: true)[0]['checklist_items'][0]['id'])->toBe('seal')
        ->and($catalog->normalizeNodes([$steps[0]], 'A9', requireToolDefinitions: true)[0]['metric_requirements'][0]['unit'])->toBe('kg');
});

it('rejects in-person clearance on A9 without rejecting its named digital proofs', function (): void {
    $catalog = app(WorkCatalog::class);
    expect(fn () => $catalog->normalizeNodes([[
        'id' => 'accept',
        'required_proofs' => ['checklist_steps', 'metric_reading'],
        'checklist_items' => [['id' => 'qa', 'label' => 'QA passed', 'required' => true]],
        'metric_requirements' => [['id' => 'pixel-count', 'name' => 'Pixel count', 'unit' => 'px', 'required' => true]],
        'approval_method' => 'presence_otp',
    ]], 'A9', requireToolDefinitions: true))->toThrow(\InvalidArgumentException::class);
});
it('pins newly authored A4 and A9 named proofs to schema v2', function (): void {
    $catalog = app(WorkCatalog::class);
    $a4 = $catalog->resolveAndRecordListingWork(
        workShape: 'A4',
        categoryCode: 'local-goods',
        listingType: 'product',
        listingTitle: 'Authored physical item',
        rawStages: [
            [
                'id' => 'prep',
                'node_kind' => 'checkin_intake',
                'control_mode' => 'provider_advance',
                'required_proofs' => ['checklist_steps', 'metric_reading'],
                'checklist_items' => [['id' => 'item-check', 'label' => 'Check the item']],
                'metric_requirements' => [['id' => 'weight', 'name' => 'Weight', 'unit' => 'kg']],
            ],
            ['id' => 'custody', 'node_kind' => 'handoff_ready', 'control_mode' => 'counterparty_handoff'],
            ['id' => 'receipt', 'node_kind' => 'final_signoff', 'control_mode' => 'customer_confirm', 'approval_method' => 'app_confirm'],
        ],
    );
    $a9 = $catalog->resolveAndRecordListingWork(
        workShape: 'A9',
        categoryCode: 'digital-services',
        listingType: 'service',
        listingTitle: 'Authored digital QA',
        rawStages: [[
            'id' => 'qa',
            'required_proofs' => ['checklist_steps', 'metric_reading'],
            'checklist_items' => [['id' => 'content-check', 'label' => 'Review content']],
            'metric_requirements' => [['id' => 'pixel-count', 'name' => 'Pixel count', 'unit' => 'px']],
        ]],
    );

    expect($a4['shape_contract_version'])->toBe(1)
        ->and($a4['payload_schema_version'])->toBe(2)
        ->and($a9['shape_contract_version'])->toBe(1)
        ->and($a9['payload_schema_version'])->toBe(2);
    app(WorkCatalogSeeder::class)->run();
    $baseA4 = $catalog->publishedWorkSet('set-product-market-handoff');
    expect($baseA4)->not->toBeNull()
        ->and($baseA4['payload_schema_version'])->toBe(1);
    $customA4Stages = $baseA4['steps'];
    $customA4Stages[0]['required_proofs'] = ['checklist_steps', 'metric_reading'];
    $customA4Stages[0]['checklist_items'] = [['id' => 'item-check', 'label' => 'Check the item', 'required' => true]];
    $customA4Stages[0]['metric_requirements'] = [['id' => 'weight', 'name' => 'Weight', 'unit' => 'kg', 'required' => true]];
    $customA4 = $catalog->resolveAndRecordListingWork(
        workShape: 'A4',
        categoryCode: 'local-goods',
        listingType: 'product',
        listingTitle: 'Custom authored physical item',
        rawStages: $customA4Stages,
        selectedCatalogCode: 'set-product-market-handoff',
    );
    expect($customA4['is_custom_variation'])->toBeTrue()
        ->and($customA4['payload_schema_version'])->toBe(2);
    $baseA9 = $catalog->publishedWorkSet('set-print-proof-assist');
    expect($baseA9)->not->toBeNull()
        ->and($baseA9['payload_schema_version'])->toBe(1);
    $customA9Stages = $baseA9['steps'];
    $customA9Stages[0]['required_proofs'] = ['checklist_steps', 'metric_reading'];
    $customA9Stages[0]['checklist_items'] = [['id' => 'content-check', 'label' => 'Review content', 'required' => true]];
    $customA9Stages[0]['metric_requirements'] = [['id' => 'pixel-count', 'name' => 'Pixel count', 'unit' => 'px', 'required' => true]];
    $customA9 = $catalog->resolveAndRecordListingWork(
        workShape: 'A9',
        categoryCode: 'print-assist',
        listingType: 'service',
        listingTitle: 'Custom digital QA',
        rawStages: $customA9Stages,
        selectedCatalogCode: 'set-print-proof-assist',
    );
    expect($customA9['is_custom_variation'])->toBeTrue()
        ->and($customA9['payload_schema_version'])->toBe(2);
});
it('rejects unsupported required tools during Work authoring', function (): void {
    $catalog = app(WorkCatalog::class);
    expect(fn () => $catalog->normalizeNodes([[
        'id' => 'external-action',
        'required_proofs' => ['external_connector'],
    ]], 'A1', requireToolDefinitions: true))->toThrow(\InvalidArgumentException::class, 'external_connector proof is unsupported');
});

it('pins clearance-only A4 authoring to schema v2', function (): void {
    $catalog = app(WorkCatalog::class);
    $specification = $catalog->resolveAndRecordListingWork(
        workShape: 'A4',
        categoryCode: 'local-goods',
        listingType: 'product',
        listingTitle: 'Recipient-cleared product',
        rawStages: [
            ['id' => 'prep', 'node_kind' => 'checkin_intake', 'control_mode' => 'provider_advance'],
            ['id' => 'custody', 'node_kind' => 'handoff_ready', 'control_mode' => 'counterparty_handoff'],
            [
                'id' => 'recipient-clearance',
                'node_kind' => 'final_signoff',
                'control_mode' => 'counterparty_handoff',
                'approval_method' => 'worker_dropoff',
                'handoff_party' => 'worker_dropoff',
            ],
        ],
    );

    expect($specification['shape_contract_version'])->toBe(1)
        ->and($specification['payload_schema_version'])->toBe(2);
});

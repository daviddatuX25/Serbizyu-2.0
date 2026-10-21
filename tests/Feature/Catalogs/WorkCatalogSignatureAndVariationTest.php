<?php

declare(strict_types=1);

namespace Tests\Feature\Catalogs;

use App\Modules\Catalogs\Application\WorkCatalog;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        self::assertSame(1, $set['set_version']);
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
        self::assertSame(1, $specification['based_on_set_version']);
        self::assertSame(1, $specification['shape_contract_version']);
        self::assertSame(1, $specification['payload_schema_version']);
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
        self::assertNull($catalog->publishedWorkSet('set-repairs-inverter-clean', 2));

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
}

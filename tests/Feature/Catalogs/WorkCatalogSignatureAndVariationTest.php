<?php

declare(strict_types=1);

namespace Tests\Feature\Catalogs;

use App\Modules\Catalogs\Application\WorkCatalog;
use Illuminate\Foundation\Testing\DatabaseTransactions;
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

    public function test_resolving_listing_work_compounds_category_variations_and_surfaces_fast_options(): void
    {
        $catalog = app(WorkCatalog::class);

        $customStages = [
            [
                'id' => 'step-1',
                'title' => 'Suction line check-in',
                'description' => 'Check pump prime and valve state.',
                'node_kind' => 'checkin_intake',
                'evidence_type' => 'photo_required',
                'control_mode' => 'provider_advance',
                'mandatory' => true,
            ],
            [
                'id' => 'step-2',
                'title' => 'Confirm impeller part swap',
                'description' => 'Ask customer to approve replacement impeller.',
                'node_kind' => 'decision_gate',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
            [
                'id' => 'step-3',
                'title' => 'Pressure gauge test',
                'description' => 'Log PSI reading after swap.',
                'node_kind' => 'execution_proof',
                'evidence_type' => 'meter_log',
                'control_mode' => 'provider_advance',
                'mandatory' => true,
            ],
            [
                'id' => 'step-4',
                'title' => 'Final water flow sign-off',
                'description' => 'Customer confirms steady water flow.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'dual_sign',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
            ],
        ];

        $spec1 = $catalog->resolveAndRecordListingWork(
            workShape: 'A1',
            categoryCode: 'plumbing',
            listingType: 'service',
            listingTitle: 'Bore-Pump Impeller Repair',
            rawStages: $customStages,
            selectedCatalogCode: 'tagudin-local-service-a1',
        );

        self::assertTrue($spec1['is_custom_variation']);
        self::assertSame('tagudin-local-service-a1', $spec1['based_on_catalog_code']);
        self::assertCount(4, $spec1['nodes']);
        self::assertSame('customer_confirm', $spec1['nodes'][1]['control_mode']);

        // Second listing in same category with same structure compounds adoption count
        $spec2 = $catalog->resolveAndRecordListingWork(
            workShape: 'A1',
            categoryCode: 'plumbing',
            listingType: 'service',
            listingTitle: 'Jetmatic Valve & Seal Overhaul',
            rawStages: $customStages,
            selectedCatalogCode: 'tagudin-local-service-a1',
        );

        self::assertSame($spec1['signature_hash'], $spec2['signature_hash']);

        // Third listing in a DIFFERENT category ('electrical') with same structure attaches a new category variation under the same signature_hash
        $spec3 = $catalog->resolveAndRecordListingWork(
            workShape: 'A1',
            categoryCode: 'repairs',
            listingType: 'service',
            listingTitle: 'Breaker Panel Diagnostic & Swap',
            rawStages: $customStages,
            selectedCatalogCode: 'tagudin-local-service-a1',
        );

        self::assertSame($spec1['signature_hash'], $spec3['signature_hash']);

        // Fast options query for 'plumbing' + 'service' surfaces the recorded variation
        $plumbingOptions = $catalog->optionsFor('plumbing', 'service');
        $matchingVariation = collect($plumbingOptions['recommended'])
            ->firstWhere('signature_hash', $spec1['signature_hash']);

        self::assertNotNull($matchingVariation);
        self::assertSame('plumbing', $matchingVariation['category_code']);
        self::assertGreaterThanOrEqual(2, $matchingVariation['adopted_jobs_count']);
    }
}

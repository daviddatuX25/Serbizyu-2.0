<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;
use Tests\TestCase;

final class WorkToolsRegressionTest extends TestCase
{
    use CreatesAcceptedWorkOrder;
    use DatabaseTransactions;

    public function test_provider_cannot_advance_checklist_node_with_legacy_blanket_boolean(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Work execution contract tests require PostgreSQL.');
        }

        $nodeId = 'itemized-checklist-regression';
        $fixture = $this->createAcceptedWorkOrder('A1', [[
            'id' => $nodeId,
            'ordinal' => 1,
            'title' => 'Check the sealed package',
            'description' => 'Confirm each authored package condition.',
            'node_kind' => 'execution_proof',
            'evidence_type' => 'none',
            'evidence_description' => 'Itemized package condition checklist.',
            'control_mode' => 'provider_advance',
            'mandatory' => true,
            'duration_label' => null,
            'required_proofs' => ['checklist_steps'],
            'approval_method' => 'none',
            'handoff_party' => null,
            'checklist_items' => [
                ['id' => 'seal-intact', 'label' => 'Seal is intact', 'required' => true],
            ],
            'metric_requirements' => [],
        ]]);
        $provider = $fixture['provider'];
        $orderId = $fixture['order_id'];
        $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();

        $this->actingAs($provider)
            ->postJson("/orders/{$orderId}/work-nodes/{$nodeId}", [
                'action' => 'complete_step',
                'payload' => ['checklist_completed' => true],
            ])
            ->assertUnprocessable();

        $updatedWork = DB::table('work_instances')->where('id', $work->id)->firstOrFail();
        $updatedStructure = json_decode((string) $updatedWork->structure, true, 512, JSON_THROW_ON_ERROR);
        expect($updatedWork->status)->toBe('not_started')
            ->and($updatedStructure['nodes'][0]['status'])->toBe('active')
            ->and($updatedStructure['nodes'][0]['evidence_payload'])->toBeNull();
    }
    public function test_optional_location_is_accepted_without_weakening_required_checklist(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Work execution contract tests require PostgreSQL.');
        }

        $nodeId = 'optional-location';
        $fixture = $this->createAcceptedWorkOrder('A1', [[
            'id' => $nodeId,
            'title' => 'Check the package',
            'node_kind' => 'execution_proof',
            'evidence_type' => 'none',
            'control_mode' => 'provider_advance',
            'required_proofs' => ['checklist_steps'],
            'permitted_proofs' => ['checklist_steps', 'gps_checkin'],
            'checklist_items' => [['id' => 'seal', 'label' => 'Seal is intact', 'required' => true]],
        ]]);
        $orderId = $fixture['order_id'];
        $url = "/orders/{$orderId}/work-nodes/{$nodeId}";
        $location = [
            'latitude' => 16.94,
            'longitude' => 120.44,
            'source' => 'manual',
            'observed_at' => '2026-01-01T00:00:00Z',
            'landmark' => 'Market',
        ];

        $this->actingAs($fixture['provider'])->postJson($url, [
            'action' => 'complete_step',
            'payload' => ['location' => $location],
        ])->assertUnprocessable();
        $this->actingAs($fixture['provider'])->postJson($url, [
            'action' => 'complete_step',
            'payload' => [
                'checklist_responses' => [['id' => 'seal', 'completed' => true]],
                'metric_readings' => [],
            ],
        ])->assertUnprocessable();
        $this->actingAs($fixture['provider'])->postJson($url, [
            'action' => 'complete_step',
            'payload' => [
                'checklist_responses' => [['id' => 'seal', 'completed' => true]],
                'location' => $location,
            ],
        ])->assertSuccessful();

        $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        expect((int) $work->payload_schema_version)->toBe(3)
            ->and($structure['nodes'][0]['status'])->toBe('completed')
            ->and($structure['nodes'][0]['evidence_payload']['location']['landmark'])->toBe('Market')
            ->and($structure['nodes'][0]['evidence_payload']['checklist_responses'][0]['completed'])->toBeTrue();
    }
}

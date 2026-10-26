<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;
use Tests\TestCase;

final class WorkClearanceChallengeTest extends TestCase
{
    use CreatesAcceptedWorkOrder;
    use DatabaseTransactions;

    private string $orderId;

    private User $buyer;

    private User $provider;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Work clearance tests require PostgreSQL.');
        }

    }

    public function test_a9_generic_pending_final_node_never_projects_customer_signoff_capability(): void
    {
        $node = [
            'id' => 'a9-generic-final-signoff',
            'ordinal' => 1,
            'title' => 'Legacy generic final node',
            'description' => 'A9 completion belongs to accepted digital delivery.',
            'node_kind' => 'final_signoff',
            'evidence_type' => 'none',
            'evidence_description' => 'No generic sign-off proof.',
            'control_mode' => 'customer_confirm',
            'mandatory' => true,
            'duration_label' => null,
            'required_proofs' => [],
            'approval_method' => 'app_confirm',
            'handoff_party' => null,
            'checklist_items' => [],
            'metric_requirements' => [],
        ];
        $fixture = $this->createAcceptedWorkOrder('A9', [$node]);
        $this->orderId = $fixture['order_id'];
        $this->buyer = $fixture['buyer'];
        $this->provider = $fixture['provider'];
        $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        $structure['nodes'][0]['status'] = 'awaiting_customer_confirmation';
        $structure['pending_customer_confirmation'] = true;
        DB::table('work_instances')->where('id', $work->id)->update([
            'status' => 'awaiting_signoff',
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
        ]);
        $version = file_exists(public_path('build/manifest.json'))
            ? hash_file('xxh128', public_path('build/manifest.json'))
            : 'test';
        $response = $this->actingAs($this->buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get("/orders/{$this->orderId}")
            ->assertOk();

        expect($response->json('props.order.can_signoff'))->toBeFalse();
    }

    public function test_named_readings_and_required_checklist_items_are_validated_and_persisted_exactly(): void
    {
        $node = $this->configureNode([
            'control_mode' => 'customer_confirm',
            'required_proofs' => ['checklist_steps', 'metric_reading'],
            'approval_method' => 'app_confirm',
            'checklist_items' => [
                ['id' => 'seal-intact', 'label' => 'Seal is intact', 'required' => true],
                ['id' => 'label-readable', 'label' => 'Product label is readable', 'required' => true],
            ],
            'metric_requirements' => [
                ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true, 'target' => 220, 'min' => 210, 'max' => 240],
                ['id' => 'line-current', 'name' => 'Line current', 'unit' => 'A', 'required' => true, 'min' => 0, 'max' => 10],
            ],
        ], 'in_progress');
        $url = "/orders/{$this->orderId}/work-nodes/{$node['id']}";

        $res = $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => [
                'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
                'metric_readings' => [
                    ['id' => 'supply-voltage', 'value' => 220, 'unit' => 'V'],
                    ['id' => 'line-current', 'value' => 2.4, 'unit' => 'A'],
                ],
            ],
        ])->assertUnprocessable()->assertJsonPath('code', 'WORK_CHECKLIST_REQUIRED');
        $checklist = [
            ['id' => 'seal-intact', 'completed' => true],
            ['id' => 'label-readable', 'completed' => true],
        ];
        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => [
                'checklist_responses' => $checklist,
                'metric_readings' => [['id' => 'supply-voltage', 'value' => 220, 'unit' => 'V']],
            ],
        ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_METRIC_PROOF');

        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => [
                'checklist_responses' => $checklist,
                'metric_readings' => [
                    ['id' => 'supply-voltage', 'value' => 220, 'unit' => 'v'],
                    ['id' => 'line-current', 'value' => 2.4, 'unit' => 'A'],
                ],
            ],
        ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_METRIC_PROOF');

        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => [
                'checklist_responses' => $checklist,
                'metric_readings' => [
                    ['id' => 'supply-voltage', 'value' => 250, 'unit' => 'V'],
                    ['id' => 'line-current', 'value' => 2.4, 'unit' => 'A'],
                ],
            ],
        ])->assertUnprocessable()->assertJsonPath('code', 'METRIC_OUT_OF_BOUNDS');
        self::assertSame(0, DB::table('notifications')->where('event_source_id', $node['work_id'])->count());


        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => [
                'checklist_responses' => $checklist,
                'metric_readings' => [
                    ['id' => 'supply-voltage', 'value' => 220, 'unit' => 'V'],
                    ['id' => 'line-current', 'value' => 2.4, 'unit' => 'A'],
                ],
            ],
        ])->assertOk();
        $approvalIntent = DB::table('notifications')
            ->where('recipient_user_id', $this->buyer->id)
            ->where('event_source_type', 'work_instance')
            ->where('event_source_id', $node['work_id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        expect($approvalIntent)->not->toBeNull();
        $approvalPayload = json_decode((string) $approvalIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($approvalIntent->priority)->toBe('needs_action')
            ->and($approvalPayload['attention'])->toBe('needs_action')
            ->and($approvalPayload['title'])->toBeString()
            ->and($approvalPayload['body'])->toBeString()
            ->and($approvalPayload['action_url'])->toBe(route('orders.show', ['order' => $this->orderId], false))
            ->and(DB::table('notifications')->where('event_source_id', $node['work_id'])->where('event_type', 'work.approval_requested')->count())->toBe(1);


        $event = DB::table('work_events')->where('work_instance_id', $node['work_id'])
            ->where('event_type', 'work.node.request_confirmation')->firstOrFail();
        $payload = json_decode((string) $event->payload, true, 512, JSON_THROW_ON_ERROR)['payload'];
        expect($payload['checklist_responses'])->toBe($checklist)
            ->and($payload['metric_readings'][0]['id'])->toBe('supply-voltage')
            ->and((float) $payload['metric_readings'][0]['value'])->toBe(220.0)
            ->and($payload['metric_readings'][0]['unit'])->toBe('V')
            ->and($payload['metric_readings'][1])->toMatchArray([
                'id' => 'line-current',
                'value' => 2.4,
                'unit' => 'A',
            ]);

        $structure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        expect($structure['nodes'][0]['status'])->toBe('awaiting_customer_confirmation')
            ->and($structure['nodes'][0]['checklist_items'][0]['label'])->toBe('Seal is intact')
            ->and((float) $structure['nodes'][0]['metric_requirements'][0]['target'])->toBe(220.0);
    }

    public function test_app_confirm_revalidation_preserves_metric_receipt_time_and_rejects_client_timestamp(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'decision_gate',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'app_confirm',
            'required_proofs' => ['metric_reading'],
            'metric_requirements' => [
                ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true, 'min' => 210, 'max' => 240],
            ],
            'status' => 'active',
        ], 'in_progress');
        $url = "/orders/{$this->orderId}/work-nodes/{$node['id']}";
        $reading = ['id' => 'supply-voltage', 'value' => 220, 'unit' => 'V', 'observed_at' => now()->toIso8601String()];

        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => ['metric_readings' => [$reading + ['received_at' => '2000-01-01T00:00:00+00:00']]],
        ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_METRIC_PROOF');

        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'request_confirmation',
            'payload' => ['metric_readings' => [$reading]],
        ])->assertOk();
        $structure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        $receivedAt = $structure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'];

        $this->actingAs($this->buyer)->postJson($url, ['action' => 'confirm_gate'])->assertOk();

        $completedStructure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        expect($completedStructure['nodes'][0]['status'])->toBe('completed')
            ->and($completedStructure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'])->toBe($receivedAt);
    }

    public function test_presence_challenge_revalidation_preserves_metric_receipt_time(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'decision_gate',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'required_proofs' => ['metric_reading'],
            'metric_requirements' => [
                ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true, 'min' => 210, 'max' => 240],
            ],
            'status' => 'active',
        ], 'in_progress');
        $nodeUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}";
        $this->actingAs($this->provider)->postJson($nodeUrl, [
            'action' => 'request_confirmation',
            'payload' => ['metric_readings' => [[
                'id' => 'supply-voltage',
                'value' => 220,
                'unit' => 'V',
                'observed_at' => now()->toIso8601String(),
            ]]],
        ])->assertOk();
        $customerApprovalIntent = DB::table('notifications')
            ->where('recipient_user_id', $this->buyer->id)
            ->where('event_source_type', 'work_instance')
            ->where('event_source_id', $node['work_id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        expect($customerApprovalIntent)->not->toBeNull();
        $customerApprovalPayload = json_decode((string) $customerApprovalIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($customerApprovalIntent->priority)->toBe('needs_action')
            ->and($customerApprovalPayload['attention'])->toBe('needs_action')
            ->and($customerApprovalPayload['action_url'])->toBe(route('orders.show', ['order' => $this->orderId], false));

        $structure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        $receivedAt = $structure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'];

        $issueUrl = $nodeUrl.'/clearance-challenges';
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        $challengeIntent = DB::table('notifications')
            ->where('recipient_user_id', $this->provider->id)
            ->where('event_source_type', 'work_clearance_challenge')
            ->where('event_source_id', $issued['challenge_id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        expect($challengeIntent)->not->toBeNull();
        $challengePayload = json_decode((string) $challengeIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($challengeIntent->priority)->toBe('needs_action')
            ->and($challengePayload['attention'])->toBe('needs_action')
            ->and($challengePayload['title'])->toBeString()
            ->and($challengePayload['body'])->toBeString()
            ->and($challengePayload['action_url'])->toBe(route('orders.show', ['order' => $this->orderId], false))
            ->and(array_key_exists('code', $challengePayload))->toBeFalse()
            ->and(array_key_exists('code_digest', $challengePayload))->toBeFalse();

        $this->actingAs($this->provider)->postJson($issueUrl.'/'.(string) $issued['challenge_id'].'/verify', [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertOk();
        $confirmationIntent = DB::table('notifications')
            ->where('recipient_user_id', $this->buyer->id)
            ->where('event_source_type', 'work_clearance_challenge')
            ->where('event_source_id', $issued['challenge_id'])
            ->where('event_type', 'work.approval_confirmed')
            ->first();
        expect($confirmationIntent)->not->toBeNull();
        $confirmationPayload = json_decode((string) $confirmationIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($confirmationIntent->priority)->toBe('updates')
            ->and($confirmationPayload['attention'])->toBe('updates')
            ->and($confirmationPayload['action_url'])->toBe(route('orders.show', ['order' => $this->orderId], false));


        $completedStructure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        expect($completedStructure['nodes'][0]['status'])->toBe('completed')
            ->and($completedStructure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'])->toBe($receivedAt);
    }

    public function test_final_app_signoff_revalidation_preserves_metric_receipt_time(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'app_confirm',
            'required_proofs' => ['metric_reading'],
            'metric_requirements' => [
                ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true, 'min' => 210, 'max' => 240],
            ],
            'status' => 'active',
        ], 'in_progress');
        $url = "/orders/{$this->orderId}/work-nodes/{$node['id']}";
        $this->actingAs($this->provider)->postJson($url, [
            'action' => 'propose_completion',
            'payload' => ['metric_readings' => [[
                'id' => 'supply-voltage',
                'value' => 220,
                'unit' => 'V',
                'observed_at' => now()->toIso8601String(),
            ]]],
        ])->assertOk();
        $structure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        $receivedAt = $structure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'];

        $this->actingAs($this->buyer)->postJson("/orders/{$this->orderId}/work/signoff")->assertRedirect();

        $completedStructure = json_decode((string) DB::table('work_instances')->where('id', $node['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        expect(DB::table('work_instances')->where('id', $node['work_id'])->value('status'))->toBe('completed')
            ->and($completedStructure['nodes'][0]['status'])->toBe('completed')
            ->and($completedStructure['nodes'][0]['evidence_payload']['metric_readings'][0]['received_at'])->toBe($receivedAt);
    }

    public function test_presence_code_is_four_digits_private_and_single_use_with_server_roles(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $this->actingAs($this->buyer)->postJson("/orders/{$this->orderId}/work/signoff")
            ->assertConflict();
        $this->actingAs($this->buyer)->postJson("/orders/{$this->orderId}/work-nodes/{$node['id']}", [
            'action' => 'confirm_gate',
        ])->assertConflict()->assertJsonPath('code', 'CONFIRMATION_METHOD_UNAVAILABLE');

        $this->actingAs($this->provider)->postJson($issueUrl)->assertForbidden();
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        expect(preg_match('/\A[0-9]{4}\z/', (string) $issued['code']))->toBe(1);

        $challenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
        expect(strlen((string) $challenge->code_digest))->toBe(64)
            ->and((string) $challenge->code_digest)->not->toBe((string) $issued['code'])
            ->and((string) $challenge->code_digest)->not->toBe(hash('sha256', (string) $issued['code']))
            ->and((int) $challenge->code_length)->toBe(4)
            ->and((string) $challenge->issuer_user_id)->toBe((string) $this->buyer->id)
            ->and((string) $challenge->verifier_user_id)->toBe((string) $this->provider->id);

        $version = file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : 'test';
        $showHeaders = [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => $version,
        ];
        $customerPage = $this->actingAs($this->buyer)->withHeaders($showHeaders)->get("/orders/{$this->orderId}")->assertOk();
        $customerProps = json_encode($customerPage->json('props'), JSON_THROW_ON_ERROR);
        expect($customerProps)->not->toContain((string) $issued['code'])
            ->and($customerProps)->not->toContain((string) $challenge->code_digest);
        $customerNode = collect($customerPage->json('props.work.nodes'))->firstWhere('id', $node['id']);
        expect($customerNode['can_issue_challenge'])->toBeTrue()
            ->and($customerNode['pending_challenge']['id'])->toBe((string) $issued['challenge_id']);

        $providerPage = $this->actingAs($this->provider)->withHeaders($showHeaders)->get("/orders/{$this->orderId}")->assertOk();
        $providerProps = json_encode($providerPage->json('props'), JSON_THROW_ON_ERROR);
        $providerNode = collect($providerPage->json('props.work.nodes'))->firstWhere('id', $node['id']);
        expect($providerProps)->not->toContain((string) $issued['code'])
            ->and($providerProps)->not->toContain((string) $challenge->code_digest)
            ->and($providerNode['can_issue_challenge'])->toBeFalse()
            ->and($providerNode['can_verify_challenge'])->toBeTrue();

        $verifyUrl = $issueUrl.'/'.(string) $issued['challenge_id'].'/verify';
        $crossNodeUrl = "/orders/{$this->orderId}/work-nodes/another-node/clearance-challenges/{$issued['challenge_id']}/verify";
        $this->actingAs($this->provider)->postJson($crossNodeUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertNotFound();
        expect(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe(0);

        $this->actingAs($this->buyer)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertForbidden();
        expect(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe(0);

        $this->actingAs($this->provider)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertOk()->assertJsonPath('data.work_status', 'completed');

        $this->assertDatabaseHas('work_clearance_challenges', [
            'id' => $issued['challenge_id'],
            'consumed_by_user_id' => $this->provider->id,
        ]);
        $this->actingAs($this->provider)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertConflict();

        $eventPayloads = DB::table('work_events')->where('work_instance_id', $node['work_id'])->pluck('payload')->implode(' ');
        $outboxPayloads = DB::table('outbox_messages')->where('aggregate_id', $node['work_id'])->pluck('payload')->implode(' ');
        $auditPayloads = DB::table('audit_events')->where('target_id', $issued['challenge_id'])
            ->selectRaw("COALESCE(previous_value_summary::text, '') || ' ' || COALESCE(new_value_summary::text, '') || ' ' || COALESCE(reason, '') AS audit_text")
            ->pluck('audit_text')->implode(' ');
        foreach ([$eventPayloads, $outboxPayloads, $auditPayloads] as $storedText) {
            expect($storedText)->not->toContain((string) $issued['code'])
                ->and($storedText)->not->toContain((string) $challenge->code_digest);
        }

        $completion = json_decode((string) DB::table('outbox_messages')->where('event_type', 'work.completed')
            ->where('aggregate_id', $node['work_id'])->value('payload'), true, 512, JSON_THROW_ON_ERROR);
        expect($completion['authorized_by_user_id'])->toBe((string) $this->buyer->id)
            ->and($completion['verified_by_user_id'])->toBe((string) $this->provider->id)
            ->and($completion['challenge_id'])->toBe((string) $issued['challenge_id']);
    }

    public function test_database_rejects_an_active_challenge_without_a_signature_fingerprint(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Work challenge binding constraints require PostgreSQL.');
        }

        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');

        try {
            DB::table('work_clearance_challenges')
                ->where('id', $issued['challenge_id'])
                ->update(['work_signature_hash' => null]);

            expect(false)->toBeTrue('The database must reject a signatureless active challenge.');
        } catch (QueryException $exception) {
            expect($exception->getMessage())->toContain('ck_work_challenges_active_signature');
        }
    }

    public function test_challenge_is_invalidated_when_the_accepted_work_signature_changes(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        $work = DB::table('work_instances')->where('id', $node['work_id'])->firstOrFail();
        $structure = is_array($work->structure)
            ? $work->structure
            : json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        $structure['signature_hash'] = hash('sha256', 'different-accepted-work-signature');
        DB::table('work_instances')->where('id', $work->id)->update([
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
        ]);

        $this->actingAs($this->provider)->postJson($issueUrl.'/'.(string) $issued['challenge_id'].'/verify', [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertConflict()->assertJsonPath('code', 'CHALLENGE_STALE');

        $challenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
        expect($challenge->invalidated_at)->not->toBeNull()
            ->and((int) $challenge->attempt_count)->toBe(0)
            ->and(DB::table('work_instances')->where('id', $work->id)->value('status'))->toBe('awaiting_signoff');
    }

    public function test_legacy_final_signoff_cannot_bypass_an_authored_checklist(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'app_confirm',
            'required_proofs' => ['checklist_steps'],
            'checklist_items' => [
                ['id' => 'seal-intact', 'label' => 'Seal is intact', 'required' => true],
            ],
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');

        $this->actingAs($this->buyer)->postJson("/orders/{$this->orderId}/work-nodes/{$node['id']}", [
            'action' => 'confirm_gate',
        ])->assertConflict()->assertJsonPath('code', 'INVALID_ACTION');

        $this->actingAs($this->buyer)->postJson("/orders/{$this->orderId}/work/signoff")
            ->assertUnprocessable()
            ->assertJsonPath('code', 'WORK_CHECKLIST_REQUIRED');

        $work = DB::table('work_instances')->where('id', $node['work_id'])->firstOrFail();
        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        expect($work->status)->toBe('awaiting_signoff')
            ->and((int) $work->version)->toBe(1)
            ->and($structure['nodes'][0]['status'])->toBe('awaiting_customer_confirmation')
            ->and(DB::table('orders')->where('id', $this->orderId)->value('status'))->toBe('in_progress')
            ->and(DB::table('outbox_messages')->where('event_type', 'work.completed')->where('aggregate_id', $node['work_id'])->exists())->toBeFalse();
    }

    public function test_failed_code_attempts_commit_and_exhaust_the_bound_challenge(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        $wrongCode = str_pad((string) (((int) $issued['code'] + 1) % 10000), 4, '0', STR_PAD_LEFT);
        $verifyUrl = $issueUrl.'/'.(string) $issued['challenge_id'].'/verify';

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this->actingAs($this->provider)->postJson($verifyUrl, [
                'code' => $wrongCode,
                'work_version' => (int) $issued['work_version'],
            ]);
            $response->assertStatus($attempt === 5 ? 429 : 422);
        }

        $challenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
        $work = DB::table('work_instances')->where('id', $node['work_id'])->firstOrFail();
        expect((int) $challenge->attempt_count)->toBe(5)
            ->and($challenge->invalidated_at)->not->toBeNull()
            ->and($work->status)->toBe('awaiting_signoff')
            ->and((int) $work->version)->toBe(1);
    }

    public function test_expired_or_stale_challenge_cannot_advance_the_work_node(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        DB::table('work_instances')->where('id', $node['work_id'])->update(['version' => 2]);
        $verifyUrl = $issueUrl.'/'.(string) $issued['challenge_id'].'/verify';
        $this->actingAs($this->provider)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertConflict();
        expect(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('invalidated_at'))->not->toBeNull()
            ->and(DB::table('work_instances')->where('id', $node['work_id'])->value('status'))->toBe('awaiting_signoff');

        $node = $this->configureNode([
            'id' => 'expired-presence-node',
            'node_kind' => 'final_signoff',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'awaiting_signoff');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $issued = $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated()->json('data');
        Carbon::setTestNow(now()->addMinutes(11));
        try {
            $this->actingAs($this->provider)->postJson($issueUrl.'/'.(string) $issued['challenge_id'].'/verify', [
                'code' => (string) $issued['code'],
                'work_version' => (int) $issued['work_version'],
            ])->assertUnprocessable();
        } finally {
            Carbon::setTestNow();
        }
        expect(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('invalidated_at'))->not->toBeNull()
            ->and(DB::table('work_instances')->where('id', $node['work_id'])->value('status'))->toBe('awaiting_signoff');
    }

    public function test_presence_issue_rate_limit_is_scoped_to_the_authored_node(): void
    {
        $node = $this->configureNode([
            'node_kind' => 'decision_gate',
            'control_mode' => 'customer_confirm',
            'approval_method' => 'presence_otp',
            'status' => 'awaiting_customer_confirmation',
        ], 'in_progress');
        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";

        for ($issue = 0; $issue < 3; $issue++) {
            $this->actingAs($this->buyer)->postJson($issueUrl)->assertCreated();
        }
        $this->actingAs($this->buyer)->postJson($issueUrl)
            ->assertStatus(429)
            ->assertJsonPath('code', 'CHALLENGE_RATE_LIMITED');

        expect(DB::table('work_clearance_challenges')->where('order_id', $this->orderId)->where('node_id', $node['id'])->count())->toBe(3)
            ->and(DB::table('work_clearance_challenges')->where('order_id', $this->orderId)->where('node_id', $node['id'])->whereNull('invalidated_at')->whereNull('consumed_at')->count())->toBe(1)
            ->and(DB::table('work_instances')->where('id', $node['work_id'])->value('status'))->toBe('in_progress');
    }

    public function test_six_digit_dropoff_code_is_verified_by_the_assigned_receiving_counterparty(): void
    {
        $courier = User::factory()->create();
        $recipient = User::factory()->create();
        $node = $this->configureNode([
            'node_kind' => 'final_signoff',
            'control_mode' => 'counterparty_handoff',
            'approval_method' => 'worker_dropoff',
            'handoff_party' => 'worker_dropoff',
            'status' => 'active',
        ], 'in_progress');
        $this->addOrderParty($courier, 'courier', 'delivery');
        $this->addOrderParty($recipient, 'recipient', 'final_recipient');
        $nodeUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}";
        $this->actingAs($this->provider)->postJson($nodeUrl, ['action' => 'mark_ready_for_handoff'])->assertOk();

        $issueUrl = "/orders/{$this->orderId}/work-nodes/{$node['id']}/clearance-challenges";
        $this->actingAs($this->provider)->postJson($issueUrl)->assertForbidden();
        $issued = $this->actingAs($courier)->postJson($issueUrl)->assertCreated()->json('data');
        expect(preg_match('/\A[0-9]{6}\z/', (string) $issued['code']))->toBe(1);
        $verifyUrl = $issueUrl.'/'.(string) $issued['challenge_id'].'/verify';

        $this->actingAs($courier)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertForbidden();
        $this->actingAs($recipient)->postJson($verifyUrl, [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertOk()->assertJsonPath('data.work_status', 'completed');

        expect(DB::table('work_instances')->where('id', $node['work_id'])->value('status'))->toBe('completed')
            ->and(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('consumed_by_user_id'))->toBe($recipient->id);
        $completion = json_decode((string) DB::table('outbox_messages')->where('event_type', 'work.completed')
            ->where('aggregate_id', $node['work_id'])->value('payload'), true, 512, JSON_THROW_ON_ERROR);
        expect($completion['authorized_by_user_id'])->toBe((string) $recipient->id)
            ->and($completion['verified_by_user_id'])->toBe((string) $recipient->id)
            ->and($completion['challenge_kind'])->toBe('worker_dropoff');
    }
    public function test_presence_code_notifications_follow_the_customer_issuer_and_provider_verifier(): void
    {
        $node = [
            'id' => 'customer-issued-code-step',
            'ordinal' => 1,
            'title' => 'Customer-issued code step',
            'description' => 'The customer issues the in-person approval code.',
            'node_kind' => 'decision_gate',
            'evidence_type' => 'none',
            'evidence_description' => '',
            'control_mode' => 'customer_confirm',
            'mandatory' => true,
            'duration_label' => null,
            'required_proofs' => [],
            'approval_method' => 'presence_otp',
            'handoff_party' => null,
            'checklist_items' => [],
            'metric_requirements' => [],
        ];
        $fixture = $this->createAcceptedWorkOrder('A1', [$node]);
        $orderId = (string) $fixture['order_id'];
        $nodeUrl = "/orders/{$orderId}/work-nodes/{$node['id']}";

        $this->actingAs($fixture['provider'])->postJson($nodeUrl, [
            'action' => 'request_confirmation',
            'payload' => [],
        ])->assertOk();
        $customerIntent = DB::table('notifications')
            ->where('recipient_user_id', $fixture['buyer']->id)
            ->where('event_source_type', 'work_instance')
            ->where('event_source_id', $fixture['work_id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        self::assertNotNull($customerIntent);
        $customerPayload = json_decode((string) $customerIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('needs_action', $customerIntent->priority);
        self::assertSame(route('orders.show', ['order' => $orderId], false), $customerPayload['action_url']);

        $issueUrl = $nodeUrl.'/clearance-challenges';
        $issued = $this->actingAs($fixture['buyer'])->postJson($issueUrl)->assertCreated()->json('data');
        $verifierIntent = DB::table('notifications')
            ->where('recipient_user_id', $fixture['provider']->id)
            ->where('event_source_type', 'work_clearance_challenge')
            ->where('event_source_id', $issued['challenge_id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        self::assertNotNull($verifierIntent);
        $verifierPayload = json_decode((string) $verifierIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('needs_action', $verifierIntent->priority);
        self::assertEqualsCanonicalizing(['attention', 'title', 'body', 'action_url'], array_keys($verifierPayload));
        self::assertSame(route('orders.show', ['order' => $orderId], false), $verifierPayload['action_url']);

        $this->actingAs($fixture['provider'])->postJson($issueUrl.'/'.(string) $issued['challenge_id'].'/verify', [
            'code' => (string) $issued['code'],
            'work_version' => (int) $issued['work_version'],
        ])->assertOk();
        $issuerUpdate = DB::table('notifications')
            ->where('recipient_user_id', $fixture['buyer']->id)
            ->where('event_source_type', 'work_clearance_challenge')
            ->where('event_source_id', $issued['challenge_id'])
            ->where('event_type', 'work.approval_confirmed')
            ->first();
        self::assertNotNull($issuerUpdate);
        $issuerPayload = json_decode((string) $issuerUpdate->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('updates', $issuerUpdate->priority);
        self::assertEqualsCanonicalizing(['attention', 'title', 'body', 'action_url'], array_keys($issuerPayload));
        self::assertSame(route('orders.show', ['order' => $orderId], false), $issuerPayload['action_url']);
    }


    /**
     * @param  array<string, mixed>  $overrides
     * @return array{work_id: string, id: string}
     */
    private function configureNode(array $overrides, string $workStatus): array
    {
        $node = array_replace([
            'id' => 'challenge-test-node',
            'ordinal' => 1,
            'title' => 'Challenge test node',
            'description' => 'Test authored Work requirements.',
            'node_kind' => 'execution_proof',
            'evidence_type' => 'none',
            'evidence_description' => 'Test proof.',
            'control_mode' => 'provider_advance',
            'mandatory' => true,
            'duration_label' => null,
            'required_proofs' => [],
            'approval_method' => 'none',
            'handoff_party' => null,
            'checklist_items' => [],
            'metric_requirements' => [],
            'status' => 'active',
        ], $overrides);
        $authoredNode = array_intersect_key($node, array_flip([
            'id',
            'ordinal',
            'title',
            'description',
            'node_kind',
            'evidence_type',
            'evidence_description',
            'control_mode',
            'mandatory',
            'duration_label',
            'required_proofs',
            'approval_method',
            'handoff_party',
            'checklist_items',
            'metric_requirements',
        ]));
        $fixture = $this->createAcceptedWorkOrder('A1', [$authoredNode]);
        $this->orderId = $fixture['order_id'];
        $this->buyer = $fixture['buyer'];
        $this->provider = $fixture['provider'];
        $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        $structure['nodes'][0]['status'] = (string) $node['status'];
        $structure['nodes'][0]['completed_at'] = null;
        $structure['nodes'][0]['completed_by_user_id'] = null;
        $structure['nodes'][0]['evidence_payload'] = null;
        $structure['nodes'][0]['customer_confirmed_at'] = null;
        $structure['active_node_id'] = (string) $node['id'];
        $structure['active_ordinal'] = 1;
        $structure['pending_customer_confirmation'] = $node['status'] === 'awaiting_customer_confirmation';

        DB::table('work_instances')->where('id', $work->id)->update([
            'status' => $workStatus,
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
            'version' => 1,
            'row_version' => 1,
            'started_at' => now(),
            'completion_proposed_at' => $workStatus === 'awaiting_signoff' ? now() : null,
            'completed_at' => null,
            'updated_at' => now(),
        ]);
        DB::table('orders')->where('id', $this->orderId)->update([
            'status' => 'in_progress',
            'completed_at' => null,
            'updated_at' => now(),
        ]);

        return ['work_id' => (string) $work->id, 'id' => (string) $node['id']];
    }

    private function addOrderParty(User $user, string $partyType, string $responsibility): void
    {
        $now = now();
        DB::table('order_parties')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $this->orderId,
            'user_id' => $user->id,
            'party_type' => $partyType,
            'responsibility' => $responsibility,
            'scope' => json_encode([], JSON_THROW_ON_ERROR),
            'consent_grant_id' => null,
            'status' => 'active',
            'effective_at' => $now,
            'ended_at' => null,
            'correlation_id' => (string) Str::uuid7(),
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}

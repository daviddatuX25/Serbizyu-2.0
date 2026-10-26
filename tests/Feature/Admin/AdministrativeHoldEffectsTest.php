<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\AppointmentSchedulingService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\RespondToOrderProposal;
use App\Modules\OrdersWork\Application\ScanWorkEvidenceHandler;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\TrustSupport\Application\AdministrativeHoldService;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\AdministrativeWorkVersionPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;
uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);


function holdEffectsWorkVersion(string $workId): int
{
    return app(AdministrativeWorkVersionPort::class)->readTarget($workId)['version'];
}

function holdEffectsRequestWorkApproval(string $caseId, string $workId, int $version, string $correlationId, User $maker, User $checker): string
{
    return (string) app(AdministrativeHoldService::class)->requestApproval([
        'case_id' => $caseId,
        'command_type' => 'administrative_hold.place',
        'checker_user_id' => (string) $checker->id,
        'target_kind' => 'work_instance',
        'target_id' => $workId,
        'expected_target_version' => $version,
        'reason_class' => 'operational',
        'reason' => 'Review the exact Work before its scheduled change.',
        'idempotency_key' => 'hold-effect-pending-'.Str::uuid7(),
    ], (string) $maker->id, $correlationId)['id'];
}


function holdEffectsOpenCase(Tests\TestCase $test, array $order): string
{
    return (string) $test->actingAs($order['buyer'])->postJson('/support-cases', [
        'order_id' => $order['order_id'],
        'category' => 'fulfillment',
        'content' => 'Please review this real Order concern.',
        'idempotency_key' => 'hold-effect-case-'.Str::uuid7(),
    ])->assertCreated()->json('data.id');
}

function holdEffectsStaffPair(): array
{
    return [
        User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']),
        User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']),
    ];
}

function holdEffectsPlace(string $caseId, string $targetKind, string $targetId, int $targetVersion, string $correlationId, User $maker, User $checker): array
{
    $governance = app(AdministrativeHoldService::class);
    $approval = $governance->requestApproval([
        'case_id' => $caseId,
        'command_type' => 'administrative_hold.place',
        'checker_user_id' => (string) $checker->id,
        'target_kind' => $targetKind,
        'target_id' => $targetId,
        'expected_target_version' => $targetVersion,
        'reason_class' => 'operational',
        'reason' => 'Review the exact selected target.',
        'idempotency_key' => 'hold-effect-place-'.Str::uuid7(),
    ], (string) $maker->id, $correlationId);
    $governance->approve($approval['id'], (string) $checker->id, $correlationId);

    return $governance->execute($approval['id'], (string) $checker->id, $correlationId);
}

function holdEffectsRelease(array $hold, string $caseId, string $targetKind, string $targetId, int $targetVersion, string $correlationId, User $maker, User $checker): array
{
    $governance = app(AdministrativeHoldService::class);
    $approval = $governance->requestApproval([
        'case_id' => $caseId,
        'command_type' => 'administrative_hold.release',
        'checker_user_id' => (string) $maker->id,
        'target_kind' => $targetKind,
        'target_id' => $targetId,
        'expected_target_version' => $targetVersion,
        'hold_id' => $hold['hold_id'],
        'expected_hold_version' => $hold['hold_version'],
        'reason_class' => 'operational',
        'reason' => 'The review is complete.',
        'idempotency_key' => 'hold-effect-release-'.Str::uuid7(),
    ], (string) $checker->id, $correlationId);
    $governance->approve($approval['id'], (string) $maker->id, $correlationId);

    return $governance->execute($approval['id'], (string) $maker->id, $correlationId);
}


it('holds only the exact order agreement while independent Work continues and release restores agreement eligibility', function (): void {
    $nodeId = 'hold-effect-provider-step';
    $order = $this->createAcceptedWorkOrder('A1', [[
        'id' => $nodeId,
        'ordinal' => 1,
        'title' => 'Perform agreed service',
        'description' => 'Complete the first provider-controlled Work step.',
        'node_kind' => 'checkin_intake',
        'evidence_type' => 'none',
        'control_mode' => 'provider_advance',
        'mandatory' => true,
        'required_proofs' => [],
        'approval_method' => 'none',
    ]]);
    $case = $this->actingAs($order['buyer'])->postJson('/support-cases', [
        'order_id' => $order['order_id'],
        'category' => 'fulfillment',
        'content' => 'Please review a concern about the agreed terms.',
        'idempotency_key' => 'hold-effect-case-'.Str::uuid7(),
    ])->assertCreated()->json('data');

    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $orderVersion = (int) DB::table('orders')->where('id', $order['order_id'])->value('version');
    $governance = app(AdministrativeHoldService::class);
    $placement = $governance->requestApproval([
        'case_id' => $case['id'],
        'command_type' => 'administrative_hold.place',
        'checker_user_id' => (string) $checker->id,
        'target_kind' => 'order',
        'target_id' => $order['order_id'],
        'expected_target_version' => $orderVersion,
        'reason_class' => 'operational',
        'reason' => 'Review the agreement before further agreement changes.',
        'idempotency_key' => 'hold-effect-place-'.Str::uuid7(),
    ], (string) $maker->id, $order['correlation_id']);
    $governance->approve($placement['id'], (string) $checker->id, $order['correlation_id']);
    $placed = $governance->execute($placement['id'], (string) $checker->id, $order['correlation_id']);

    $orderRow = DB::table('orders')->where('id', $order['order_id'])->firstOrFail();
    $work = DB::table('work_instances')->where('id', $order['work_id'])->firstOrFail();
    $obligationBeforeWork = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    $proposalInput = [
        'expected_order_version' => (int) $orderRow->version,
        'amount_minor' => 27000,
        'currency' => 'PHP',
        'idempotency_key' => 'hold-effect-amend-'.Str::uuid7(),
    ];
    $this->actingAs($order['buyer'])
        ->postJson('/orders/'.$order['order_id'].'/amend', $proposalInput)
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect((int) DB::table('orders')->where('id', $order['order_id'])->value('version'))->toBe((int) $orderRow->version)
        ->and(DB::table('order_proposals')->where('order_id', $order['order_id'])->where('kind', 'amendment')->exists())->toBeFalse()
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();

    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodeId, ['action' => 'complete_step'])
        ->assertOk();
    $progressedWork = DB::table('work_instances')->where('id', $order['work_id'])->firstOrFail();
    $progressedStructure = is_array($progressedWork->structure) ? $progressedWork->structure : json_decode((string) $progressedWork->structure, true, 512, JSON_THROW_ON_ERROR);
    $obligationAfterWork = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    expect((int) $progressedWork->version)->toBeGreaterThan((int) $work->version)
        ->and($progressedStructure['nodes'][0]['status'])->toBe('completed')
        ->and($obligationAfterWork->status)->toBe($obligationBeforeWork->status)
        ->and($obligationAfterWork->due_at)->toBe($obligationBeforeWork->due_at)
        ->and($obligationAfterWork->settled_at)->toBe($obligationBeforeWork->settled_at)
        ->and((int) $obligationAfterWork->version)->toBe((int) $obligationBeforeWork->version);

    $orderVersionAfterWork = (int) DB::table('orders')->where('id', $order['order_id'])->value('version');
    $release = $governance->requestApproval([
        'case_id' => $case['id'],
        'command_type' => 'administrative_hold.release',
        'checker_user_id' => (string) $maker->id,
        'target_kind' => 'order',
        'target_id' => $order['order_id'],
        'expected_target_version' => $orderVersionAfterWork,
        'hold_id' => $placed['hold_id'],
        'expected_hold_version' => $placed['hold_version'],
        'reason_class' => 'operational',
        'reason' => 'The agreement review is complete.',
        'idempotency_key' => 'hold-effect-release-'.Str::uuid7(),
    ], (string) $checker->id, $order['correlation_id']);
    $governance->approve($release['id'], (string) $maker->id, $order['correlation_id']);
    expect($governance->execute($release['id'], (string) $maker->id, $order['correlation_id'])['status'])->toBe('released');

    $this->actingAs($order['buyer'])
        ->postJson('/orders/'.$order['order_id'].'/amend', [
            ...$proposalInput,
            'expected_order_version' => (int) DB::table('orders')->where('id', $order['order_id'])->value('version'),
            'idempotency_key' => 'hold-effect-amend-after-release-'.Str::uuid7(),
        ])
        ->assertOk();
    expect(DB::table('administrative_holds')->where('id', $placed['hold_id'])->value('status'))->toBe('released')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();
});

it('blocks native Work progression under an exact Work hold without suppressing incoming evidence', function (): void {
    Storage::fake('private');
    $nodeId = 'hold-effect-photo-step';
    $order = $this->createAcceptedWorkOrder('A1', [[
        'id' => $nodeId,
        'ordinal' => 1,
        'title' => 'Capture current job condition',
        'description' => 'Attach the requested site photo.',
        'node_kind' => 'execution_proof',
        'evidence_type' => 'photo_required',
        'evidence_description' => 'A current job photo.',
        'control_mode' => 'provider_advance',
        'mandatory' => true,
        'required_proofs' => ['photo_proof'],
        'approval_method' => 'none',
    ]]);
    $caseId = holdEffectsOpenCase($this, $order);
    [$maker, $checker] = holdEffectsStaffPair();
    $workVersion = holdEffectsWorkVersion($order['work_id']);
    $hold = holdEffectsPlace($caseId, 'work_instance', $order['work_id'], $workVersion, $order['correlation_id'], $maker, $checker);
    $workBefore = DB::table('work_instances')->where('id', $order['work_id'])->firstOrFail();
    $eventCount = DB::table('work_events')->where('work_instance_id', $order['work_id'])->count();

    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodeId, ['action' => 'complete_step'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe($workBefore->status)
        ->and((int) DB::table('work_instances')->where('id', $order['work_id'])->value('version'))->toBe((int) $workBefore->version)
        ->and(DB::table('work_events')->where('work_instance_id', $order['work_id'])->count())->toBe($eventCount);

    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($png)->toBeString();
    $evidenceResponse = $this->actingAs($order['provider'])
        ->post('/orders/'.$order['order_id'].'/work-nodes/'.$nodeId.'/evidence', [
            'file' => UploadedFile::fake()->createWithContent('site-proof.png', $png),
            'tool_key' => 'photo_proof',
        ])
        ->assertCreated();
    $evidenceId = (string) $evidenceResponse->json('data.id');
    expect($evidenceId)->not->toBe('')
        ->and(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('quarantined')
        ->and(DB::table('work_events')->where('work_instance_id', $order['work_id'])->where('event_type', 'work.evidence.uploaded')->exists())->toBeTrue();

    $release = holdEffectsRelease(
        $hold,
        $caseId,
        'work_instance',
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($release['status'])->toBe('released')
        ->and(app(AdministrativeHoldReaderPort::class)->hasActiveHold('work_instance', $order['work_id']))->toBeFalse()
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('not_started')
        ->and(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('quarantined');
});

it('prevents accepted monetary amendments from superseding an exactly held obligation', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = holdEffectsOpenCase($this, $order);
    $obligation = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    [$maker, $checker] = holdEffectsStaffPair();
    holdEffectsPlace(
        $caseId,
        'payment_obligation',
        (string) $obligation->id,
        (int) $obligation->version,
        $order['correlation_id'],
        $maker,
        $checker,
    );

    $amendment = app(RespondToOrderProposal::class)->handle(
        actorUserId: (string) $order['provider']->id,
        orderId: $order['order_id'],
        action: 'amend',
        expectedOrderVersion: (int) DB::table('orders')->where('id', $order['order_id'])->value('version'),
        idempotencyKey: 'held-obligation-amend-offer-'.Str::uuid7(),
        correlationId: $order['correlation_id'],
        input: ['amount_minor' => 27000],
    );
    $this->actingAs($order['buyer'])->postJson(
        '/orders/'.$order['order_id'].'/proposals/'.$amendment['proposal_id'].'/accept',
        ['expected_order_version' => $amendment['version'], 'idempotency_key' => 'held-obligation-amend-accept-'.Str::uuid7()],
    )->assertStatus(409)->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe($obligation->status)
        ->and(DB::table('payment_obligations')->where('id', $obligation->id)->value('amount_minor'))->toBe($obligation->amount_minor)
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->exists())->toBeFalse()
        ->and(DB::table('order_terms_snapshots')->where('order_id', $order['order_id'])->count())->toBe(1)
        ->and(DB::table('order_proposals')->where('id', $amendment['proposal_id'])->value('status'))->toBe('proposed');
});

it('preserves a payer claim but blocks exact held-obligation settlement until approved release', function (): void {
    $nodes = [
        [
            'id' => 'hold-payment-intake',
            'ordinal' => 1,
            'title' => 'Inspect service site',
            'description' => 'Begin the agreed repair.',
            'node_kind' => 'checkin_intake',
            'evidence_type' => 'none',
            'control_mode' => 'provider_advance',
            'mandatory' => true,
            'required_proofs' => [],
            'approval_method' => 'none',
        ],
        [
            'id' => 'hold-payment-gate',
            'ordinal' => 2,
            'title' => 'Confirm repair scope',
            'description' => 'Confirm the next agreed service step.',
            'node_kind' => 'decision_gate',
            'evidence_type' => 'dual_sign',
            'control_mode' => 'customer_confirm',
            'mandatory' => true,
            'required_proofs' => [],
            'approval_method' => 'app_confirm',
        ],
        [
            'id' => 'hold-payment-signoff',
            'ordinal' => 3,
            'title' => 'Review completed service',
            'description' => 'The customer confirms the completed service.',
            'node_kind' => 'final_signoff',
            'evidence_type' => 'dual_sign',
            'control_mode' => 'customer_confirm',
            'mandatory' => true,
            'required_proofs' => [],
            'approval_method' => 'app_confirm',
        ],
    ];
    $order = $this->createAcceptedWorkOrder('A1', $nodes);
    $caseId = holdEffectsOpenCase($this, $order);
    $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[0]['id'], ['action' => 'complete_step'])->assertOk();
    $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[1]['id'], ['action' => 'request_confirmation'])->assertOk();
    $this->actingAs($order['buyer'])->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[1]['id'], ['action' => 'confirm_gate'])->assertOk();
    $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[2]['id'], ['action' => 'propose_completion'])->assertOk();
    $this->actingAs($order['buyer'])->post('/orders/'.$order['order_id'].'/work/signoff')->assertRedirect();

    $obligation = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    expect($obligation->status)->toBe('due')
        ->and($obligation->settled_at)->toBeNull();
    [$maker, $checker] = holdEffectsStaffPair();
    $hold = holdEffectsPlace(
        $caseId,
        'payment_obligation',
        (string) $obligation->id,
        (int) $obligation->version,
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect(app(AdministrativeHoldReaderPort::class)->hasActiveHold('payment_obligation', (string) $obligation->id))->toBeTrue()
        ->and(app(AdministrativeHoldReaderPort::class)->hasActiveHold('work_instance', $order['work_id']))->toBeFalse();

    $this->actingAs($order['buyer'])
        ->postJson(route('orders.payment-obligations.cash.report', [$order['order_id'], $obligation->id]), [
            'idempotency_key' => 'held-payment-cash-report-'.Str::uuid7(),
        ])
        ->assertOk();
    $this->actingAs($order['provider'])
        ->postJson(route('orders.payment-obligations.cash.acknowledge', [$order['order_id'], $obligation->id]), [
            'idempotency_key' => 'held-payment-cash-ack-'.Str::uuid7(),
        ])
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');

    $reported = DB::table('payment_obligations')->where('id', $obligation->id)->firstOrFail();
    expect($reported->status)->toBe('payer_reported_cash')
        ->and($reported->settled_at)->toBeNull()
        ->and(DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.reported')->count())->toBe(1)
        ->and(DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->exists())->toBeFalse()
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('completed');

    $release = holdEffectsRelease(
        $hold,
        $caseId,
        'payment_obligation',
        (string) $obligation->id,
        (int) $reported->version,
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($release['status'])->toBe('released');
    $this->actingAs($order['provider'])
        ->postJson(route('orders.payment-obligations.cash.acknowledge', [$order['order_id'], $obligation->id]), [
            'idempotency_key' => 'held-payment-cash-ack-after-release-'.Str::uuid7(),
        ])
        ->assertOk();
    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('settled')
        ->and(DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->count())->toBe(1)
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('completed');
});

it('blocks verified native clearance under a Work hold and permits the same evidence after release', function (): void {
    $nodes = [
        [
            'id' => 'hold-clearance-intake',
            'ordinal' => 1,
            'title' => 'Begin service',
            'description' => 'Begin the agreed repair.',
            'node_kind' => 'checkin_intake',
            'evidence_type' => 'none',
            'control_mode' => 'provider_advance',
            'mandatory' => true,
            'required_proofs' => [],
            'approval_method' => 'none',
        ],
        [
            'id' => 'hold-clearance-signoff',
            'ordinal' => 2,
            'title' => 'Confirm completed service',
            'description' => 'Confirm the service is complete.',
            'node_kind' => 'final_signoff',
            'evidence_type' => 'dual_sign',
            'control_mode' => 'customer_confirm',
            'mandatory' => true,
            'required_proofs' => [],
            'approval_method' => 'presence_otp',
        ],
    ];
    $order = $this->createAcceptedWorkOrder('A1', $nodes);
    $caseId = holdEffectsOpenCase($this, $order);
    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[0]['id'], ['action' => 'complete_step'])
        ->assertOk();
    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/work-nodes/'.$nodes[1]['id'], ['action' => 'propose_completion'])
        ->assertOk();
    $issueUrl = '/orders/'.$order['order_id'].'/work-nodes/'.$nodes[1]['id'].'/clearance-challenges';
    $challenge = $this->actingAs($order['buyer'])->postJson($issueUrl)->assertCreated()->json('data');
    [$maker, $checker] = holdEffectsStaffPair();
    $workVersion = holdEffectsWorkVersion($order['work_id']);
    $hold = holdEffectsPlace($caseId, 'work_instance', $order['work_id'], $workVersion, $order['correlation_id'], $maker, $checker);
    $verifyUrl = $issueUrl.'/'.$challenge['challenge_id'].'/verify';

    $this->actingAs($order['provider'])->postJson($verifyUrl, [
        'code' => $challenge['code'],
        'work_version' => $challenge['work_version'],
    ])->assertStatus(409)->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('work_clearance_challenges')->where('id', $challenge['challenge_id'])->value('consumed_at'))->toBeNull()
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('awaiting_signoff')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();

    $release = holdEffectsRelease(
        $hold,
        $caseId,
        'work_instance',
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($release['status'])->toBe('released');
    $this->actingAs($order['provider'])->postJson($verifyUrl, [
        'code' => $challenge['code'],
        'work_version' => $challenge['work_version'],
    ])->assertOk();
    expect(DB::table('work_clearance_challenges')->where('id', $challenge['challenge_id'])->value('consumed_at'))->not->toBeNull()
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('completed')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('status'))->toBe('due')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();
});

it('blocks A9 draft execution under a Work hold and starts the same delivery after release', function (): void {
    $order = $this->createAcceptedWorkOrder('A9', []);
    $caseId = holdEffectsOpenCase($this, $order);
    [$maker, $checker] = holdEffectsStaffPair();
    $workVersion = holdEffectsWorkVersion($order['work_id']);
    $hold = holdEffectsPlace($caseId, 'work_instance', $order['work_id'], $workVersion, $order['correlation_id'], $maker, $checker);

    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/deliveries')
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('work_deliveries')->where('work_instance_id', $order['work_id'])->exists())->toBeFalse()
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('not_started')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();

    $release = holdEffectsRelease(
        $hold,
        $caseId,
        'work_instance',
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($release['status'])->toBe('released');
    $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/deliveries')
        ->assertCreated();
    expect(DB::table('work_deliveries')->where('work_instance_id', $order['work_id'])->value('status'))->toBe('draft')
        ->and(DB::table('work_instances')->where('id', $order['work_id'])->value('status'))->toBe('in_progress')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->value('settled_at'))->toBeNull();
});

it('blocks A4 preparation and custody while the exact Work is held, preserving stock until approved release', function (): void {
    Storage::fake('private');
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $order = holdEffectsCreateA4ProductOrder($this, $provider, $buyer);
    $caseId = holdEffectsOpenCase($this, $order);
    [$maker, $checker] = holdEffectsStaffPair();
    $workVersion = holdEffectsWorkVersion($order['work_id']);
    $hold = holdEffectsPlace($caseId, 'work_instance', $order['work_id'], $workVersion, $order['correlation_id'], $maker, $checker);
    $preparedPhoto = holdEffectsA4UploadPhoto($this, $provider, $order, $order['nodes'][0]['id']);
    $workVersionBeforePreparation = (int) DB::table('work_instances')->where('id', $order['work_id'])->value('version');
    $prepareCommand = [
        'evidence_file_id' => $preparedPhoto,
        'expected_order_version' => (int) DB::table('orders')->where('id', $order['order_id'])->value('version'),
        'work_version' => $workVersionBeforePreparation,
        'node_id' => $order['nodes'][0]['id'],
        'idempotency_key' => 'held-a4-prepare-'.Str::uuid7(),
    ];
    $stockQuantityBefore = (int) DB::table('listing_capacity')->where('id', $order['capacity_id'])->value('quantity');
    $stockMovementsBefore = DB::table('stock_movements')->where('order_id', $order['order_id'])->count();

    $this->actingAs($provider)
        ->postJson(route('orders.handoff.prepared', $order['order_id']), $prepareCommand)
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('order_handoff_transfers')->where('order_id', $order['order_id'])->exists())->toBeFalse()
        ->and((int) DB::table('work_instances')->where('id', $order['work_id'])->value('version'))->toBe($workVersionBeforePreparation)
        ->and((int) DB::table('listing_capacity')->where('id', $order['capacity_id'])->value('quantity'))->toBe($stockQuantityBefore)
        ->and(DB::table('stock_movements')->where('order_id', $order['order_id'])->count())->toBe($stockMovementsBefore);

    $release = holdEffectsRelease(
        $hold,
        $caseId,
        'work_instance',
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($release['status'])->toBe('released');
    $this->actingAs($provider)
        ->postJson(route('orders.handoff.prepared', $order['order_id']), $prepareCommand)
        ->assertOk()
        ->assertJsonPath('data.status', 'prepared');
    $transferId = (string) DB::table('order_handoff_transfers')->where('order_id', $order['order_id'])->value('id');
    $this->actingAs($provider)->postJson(route('orders.handoff.custody', $order['order_id']), [
        'transfer_mode' => 'counter_pickup',
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-custody-offer-'.Str::uuid7(),
    ])->assertOk();
    $custodyPhoto = holdEffectsA4UploadPhoto($this, $buyer, $order, $order['nodes'][1]['id']);
    $workVersionAfterPreparation = (int) DB::table('work_instances')->where('id', $order['work_id'])->value('version');
    $secondHold = holdEffectsPlace($caseId, 'work_instance', $order['work_id'], holdEffectsWorkVersion($order['work_id']), $order['correlation_id'], $maker, $checker);
    $custodyCommand = [
        'evidence_file_id' => $custodyPhoto,
        'expected_transfer_version' => 2,
        'work_version' => $workVersionAfterPreparation,
        'node_id' => $order['nodes'][1]['id'],
        'idempotency_key' => 'held-a4-custody-accept-'.Str::uuid7(),
    ];
    $this->actingAs($buyer)
        ->postJson(route('orders.handoff.custody.accept', [$order['order_id'], $transferId]), $custodyCommand)
        ->assertStatus(409)
        ->assertJsonPath('code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('offered')
        ->and((int) DB::table('work_instances')->where('id', $order['work_id'])->value('version'))->toBe($workVersionAfterPreparation)
        ->and((int) DB::table('listing_capacity')->where('id', $order['capacity_id'])->value('quantity'))->toBe($stockQuantityBefore)
        ->and(DB::table('stock_movements')->where('order_id', $order['order_id'])->where('movement_type', 'fulfillment')->count())->toBe(0);

    $custodyRelease = holdEffectsRelease(
        $secondHold,
        $caseId,
        'work_instance',
        $order['work_id'],
        $workVersionAfterPreparation,
        $order['correlation_id'],
        $maker,
        $checker,
    );
    expect($custodyRelease['status'])->toBe('released');
    $this->actingAs($buyer)
        ->postJson(route('orders.handoff.custody.accept', [$order['order_id'], $transferId]), $custodyCommand)
        ->assertOk()
        ->assertJsonPath('data.status', 'departed');
    expect((int) DB::table('listing_capacity')->where('id', $order['capacity_id'])->value('quantity'))->toBe($stockQuantityBefore - 2)
        ->and(DB::table('stock_movements')->where('order_id', $order['order_id'])->where('movement_type', 'fulfillment')->count())->toBe(1);
});

/** @return array{order_id:string,work_id:string,provider:User,buyer:User,capacity_id:string,correlation_id:string,nodes:list<array<string,mixed>>} */
function holdEffectsCreateA4ProductOrder(Tests\TestCase $test, User $provider, User $buyer): array
{
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        [
            'title' => 'Governed A4 hold-effect test product',
            'description' => 'Product fixture for a real A4 custody transaction.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'price_amount_minor' => 5000,
            'currency' => 'PHP',
            'variants' => [[
                'id' => 'held-a4-variant',
                'name' => 'Hold-effect test item',
                'price' => 50,
                'stock' => 5,
                'is_default' => true,
            ]],
        ],
        $correlationId,
    );
    $submittedListing = app(SubmitListing::class)->handle(
        listingId: (string) $listing['id'],
        actor: new ResourceActor((string) $provider->id, (string) $provider->id),
        expectedVersion: (int) $listing['expected_version'],
        idempotencyKey: 'held-a4-submit-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $test->actingAs($reviewer)->post(route('admin.listings.approve', $listing['id']), [
        'expected_version' => $submittedListing['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));
    $listingVersion = DB::table('listing_versions')
        ->where('listing_id', $listing['id'])
        ->where('version_number', (int) DB::table('listings')->where('id', $listing['id'])->value('current_version'))
        ->firstOrFail();
    $capacity = DB::table('listing_capacity')
        ->where('listing_id', $listing['id'])
        ->where('listing_version_id', $listingVersion->id)
        ->where('resource_key', 'held-a4-variant')
        ->firstOrFail();
    $capacityId = (string) $capacity->id;
    $proposal = $test->actingAs($buyer)->postJson(route('orders.propose', $listing['id']), [
        'expected_listing_version' => (int) DB::table('listings')->where('id', $listing['id'])->value('current_version'),
        'listing_version_id' => (string) $listingVersion->id,
        'variant_id' => 'held-a4-variant',
        'quantity' => 2,
        'idempotency_key' => 'held-a4-proposal-'.Str::uuid7(),
        'amount_minor' => 10000,
        'currency' => 'PHP',
    ])->assertCreated();
    $orderId = (string) $proposal->json('data.order_id');
    $reservationId = (string) $proposal->json('data.capacity_reservation_id');
    $capacityId = (string) DB::table('listing_capacity_reservations')->where('id', $reservationId)->value('listing_capacity_id');
    $test->actingAs($provider)->postJson(route('orders.accept', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'held-a4-accept-'.$orderId,
    ])->assertOk();

    $work = DB::table('work_instances')->where('order_id', $orderId)->firstOrFail();
    $structure = is_array($work->structure) ? $work->structure : json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    return [
        'order_id' => $orderId,
        'work_id' => (string) $work->id,
        'provider' => $provider,
        'buyer' => $buyer,
        'capacity_id' => $capacityId,
        'correlation_id' => $correlationId,
        'nodes' => $structure['nodes'],
    ];
}

/** @param array{order_id:string,nodes:list<array<string,mixed>>} $order */
function holdEffectsA4UploadPhoto(Tests\TestCase $test, User $actor, array $order, string $nodeId): string
{
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    if (! is_string($bytes)) {
        throw new RuntimeException('The A4 proof image fixture could not be decoded.');
    }
    $response = $test->actingAs($actor)
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('a4-hold-proof.png', $bytes),
            'tool_key' => 'photo_proof',
        ])
        ->assertCreated();
    $evidenceId = (string) $response->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);

    return $evidenceId;
}


it('invalidates a pending Work approval after an A3 schedule mutation', function (): void {
    $fixture = holdEffectsCreateA3Proposal($this);
    $caseId = holdEffectsOpenCase($this, ['order_id' => $fixture['order_id'], 'buyer' => $fixture['customer']]);
    [$maker, $checker] = holdEffectsStaffPair();
    $approvalId = holdEffectsRequestWorkApproval(
        $caseId,
        $fixture['work_id'],
        holdEffectsWorkVersion($fixture['work_id']),
        $fixture['correlation_id'],
        $maker,
        $checker,
    );
    $reschedule = $this->actingAs($fixture['customer'])->postJson(route('orders.schedule-change-requests.store', $fixture['order_id']), [
        'starts_at' => now()->addDays(6)->setTime(11, 0)->setSecond(0)->toIso8601String(),
        'reason' => 'Move the agreed appointment to a later slot.',
    ])->assertOk()->json('data');
    $this->actingAs($fixture['provider'])->postJson(route('orders.schedule-change-requests.respond', [
        $fixture['order_id'],
        $reschedule['id'],
        'accept',
    ]))->assertOk()->assertJsonPath('data.status', 'accepted');

    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approvalId.'/approve', [])
        ->assertStatus(409)->assertJsonPath('code', 'TARGET_VERSION_CONFLICT');
});

it('invalidates stale A9 Work approvals without invalidating submitted manifest proof', function (): void {
    Storage::fake('private');
    $order = $this->createAcceptedWorkOrder('A9', [[
        'id' => 'a9-quality-check',
        'title' => 'Digital quality check',
        'description' => 'Review the final print against its authored quality measures.',
        'node_kind' => 'execution_proof',
        'control_mode' => 'provider_advance',
        'evidence_type' => 'none',
        'evidence_description' => '',
        'required_proofs' => ['checklist_steps', 'metric_reading'],
        'checklist_items' => [['id' => 'seal-intact', 'label' => 'Seal is intact', 'required' => true]],
        'metric_requirements' => [['id' => 'temperature', 'name' => 'Water temperature', 'unit' => '°C', 'required' => true, 'min' => 0, 'max' => 100]],
    ]]);
    $caseId = holdEffectsOpenCase($this, $order);
    [$maker, $checker] = holdEffectsStaffPair();
    $approvalId = holdEffectsRequestWorkApproval(
        $caseId,
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    $draft = $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/deliveries')
        ->assertCreated()->json('data');
    $fileId = (string) $this->actingAs($order['provider'])->post('/orders/'.$order['order_id'].'/deliveries/'.$draft['id'].'/files', [
        'files' => [UploadedFile::fake()->createWithContent('approval-proof.pdf', "%PDF-1.7\nsubmitted proof\n%%EOF")],
    ])->assertCreated()->json('data.files.0.id');
    app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileId]]);
    $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/deliveries/'.$draft['id'].'/submit', [
        'node_proofs' => ['a9-quality-check' => [
            'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
            'metric_readings' => [['id' => 'temperature', 'value' => 21.5, 'unit' => '°C']],
        ]],
    ])->assertOk();

    $work = DB::table('work_instances')->where('id', $order['work_id'])->firstOrFail();
    $manifest = json_decode((string) DB::table('work_deliveries')->where('id', $draft['id'])->value('manifest'), true, 512, JSON_THROW_ON_ERROR);
    expect((int) $work->row_version)->toBeGreaterThan((int) $work->version)
        ->and($manifest['work_version'])->toBe((int) $work->version);
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approvalId.'/approve', [])
        ->assertStatus(409)->assertJsonPath('code', 'TARGET_VERSION_CONFLICT');
    $revisionApprovalId = holdEffectsRequestWorkApproval(
        $caseId,
        $order['work_id'],
        holdEffectsWorkVersion($order['work_id']),
        $order['correlation_id'],
        $maker,
        $checker,
    );
    $this->actingAs($order['buyer'])->postJson('/orders/'.$order['order_id'].'/revision-requests', [
        'delivery_id' => $draft['id'],
        'message' => 'Please revise the authored temperature check.',
    ])->assertOk();
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$revisionApprovalId.'/approve', [])
        ->assertStatus(409)->assertJsonPath('code', 'TARGET_VERSION_CONFLICT');
    $revision = $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/deliveries')
        ->assertCreated()->json('data');
    $revisionFileId = (string) $this->actingAs($order['provider'])->post('/orders/'.$order['order_id'].'/deliveries/'.$revision['id'].'/files', [
        'files' => [UploadedFile::fake()->createWithContent('approval-proof-v2.pdf', "%PDF-1.7\nrevised submitted proof\n%%EOF")],
    ])->assertCreated()->json('data.files.0.id');
    app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $revisionFileId]]);
    $this->actingAs($order['provider'])->postJson('/orders/'.$order['order_id'].'/deliveries/'.$revision['id'].'/submit', [
        'node_proofs' => ['a9-quality-check' => [
            'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
            'metric_readings' => [['id' => 'temperature', 'value' => 22, 'unit' => '°C']],
        ]],
    ])->assertOk();
    $this->actingAs($order['buyer'])->postJson('/orders/'.$order['order_id'].'/deliveries/'.$revision['id'].'/accept')
        ->assertOk()->assertJsonPath('data.work_status', 'completed');
});

it('blocks an A3 reschedule swap only for its exact held Work and permits release recovery', function (): void {
    $fixture = holdEffectsCreateA3Proposal($this);
    $caseId = holdEffectsOpenCase($this, [
        'order_id' => $fixture['order_id'],
        'buyer' => $fixture['customer'],
    ]);
    [$maker, $checker] = holdEffectsStaffPair();
    $activeAppointment = DB::table('appointment_reservations')
        ->where('order_id', $fixture['order_id'])
        ->where('status', 'committed')
        ->firstOrFail();
    $reschedule = $this->actingAs($fixture['customer'])->postJson(route('orders.schedule-change-requests.store', $fixture['order_id']), [
        'starts_at' => now()->addDays(5)->setTime(10, 0)->setSecond(0)->toIso8601String(),
        'reason' => 'The provider needs a different agreed appointment time.',
    ])->assertOk()->json('data');
    $workVersion = holdEffectsWorkVersion($fixture['work_id']);
    $hold = holdEffectsPlace($caseId, 'work_instance', $fixture['work_id'], $workVersion, $fixture['correlation_id'], $maker, $checker);
    $historyBefore = DB::table('work_schedule_history')->where('order_id', $fixture['order_id'])->count();

    $this->actingAs($fixture['provider'])
        ->postJson(route('orders.schedule-change-requests.respond', [
            $fixture['order_id'],
            $reschedule['id'],
            'accept',
        ]))
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'ADMINISTRATIVE_HOLD_ACTIVE');
    expect(DB::table('appointment_reservations')->where('id', $activeAppointment->id)->value('status'))->toBe('committed')
        ->and(DB::table('work_schedule_change_requests')->where('id', $reschedule['id'])->value('status'))->toBe('pending')
        ->and(DB::table('work_schedule_history')->where('order_id', $fixture['order_id'])->count())->toBe($historyBefore);

    expect(holdEffectsRelease($hold, $caseId, 'work_instance', $fixture['work_id'], $workVersion, $fixture['correlation_id'], $maker, $checker)['status'])->toBe('released');
    $this->actingAs($fixture['provider'])
        ->postJson(route('orders.schedule-change-requests.respond', [
            $fixture['order_id'],
            $reschedule['id'],
            'accept',
        ]))
        ->assertOk()
        ->assertJsonPath('data.status', 'accepted');
    expect(DB::table('appointment_reservations')->where('id', $activeAppointment->id)->value('status'))->toBe('released')
        ->and(\Illuminate\Support\Carbon::parse(DB::table('appointment_reservations')->where('order_id', $fixture['order_id'])->where('status', 'committed')->value('starts_at'))->equalTo($reschedule['starts_at']))
        ->toBeTrue()
        ->and(DB::table('work_schedule_history')->where('order_id', $fixture['order_id'])->count())->toBe($historyBefore + 1);
});

/** @return array{order_id:string,work_id:string,reservation_id:string,provider:User,customer:User,correlation_id:string} */
function holdEffectsCreateA3Proposal(Tests\TestCase $test): array
{
    $provider = User::factory()->create();
    $customer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(new ResourceActor((string) $provider->id, (string) $provider->id), [
        'title' => 'Held A3 appointment test service',
        'description' => 'A real scheduled A3 repair service.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A3',
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'milestone_stages' => [
            [
                'id' => 'held-a3-arrival',
                'title' => 'Arrival check-in',
                'description' => 'Confirm access and agreed scope.',
                'dur' => '45m',
                'evidence_type' => 'none',
                'required_proofs' => [],
                'control_mode' => 'provider_advance',
                'approval_method' => 'none',
            ],
            [
                'id' => 'held-a3-signoff',
                'title' => 'Customer service sign-off',
                'description' => 'Review completed scheduled service.',
                'dur' => '45m',
                'evidence_type' => 'dual_sign',
                'required_proofs' => [],
                'control_mode' => 'customer_confirm',
                'approval_method' => 'app_confirm',
            ],
        ],
    ], $correlationId);
    $submitted = app(SubmitListing::class)->handle(
        listingId: (string) $listing['id'],
        actor: new ResourceActor((string) $provider->id, (string) $provider->id),
        expectedVersion: (int) $listing['expected_version'],
        idempotencyKey: 'held-a3-listing-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $test->actingAs($reviewer)->post(route('admin.listings.approve', $listing['id']), [
        'expected_version' => $submitted['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));
    $listingVersion = (int) DB::table('listings')->where('id', $listing['id'])->value('current_version');
    $listingVersionId = (string) DB::table('listing_versions')->where('listing_id', $listing['id'])->where('version_number', $listingVersion)->value('id');
    $appointments = app(AppointmentSchedulingService::class);
    $details = $appointments->details((string) $listing['id']);
    $startsAt = now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String();
    $reservation = $appointments->holdAppointment(
        listingId: (string) $listing['id'],
        listingVersionId: $listingVersionId,
        providerUserId: (string) $provider->id,
        customerUserId: (string) $customer->id,
        startsAt: $startsAt,
        durationMinutes: $details['duration_minutes'],
        ttlMinutes: 10,
        idempotencyKey: 'held-a3-appointment-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $proposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: (string) $customer->id,
        listingId: (string) $listing['id'],
        expectedListingVersion: $listingVersion,
        idempotencyKey: 'held-a3-proposal-'.Str::uuid7(),
        correlationId: $correlationId,
        input: ['appointment_reservation_id' => $reservation['id']],
    );
    $test->actingAs($provider)->postJson(route('orders.accept', $proposal['order_id']), [
        'expected_order_version' => 1,
        'idempotency_key' => 'held-a3-finalize-'.Str::uuid7(),
    ])->assertOk();

    return [
        'order_id' => (string) $proposal['order_id'],
        'work_id' => (string) DB::table('work_instances')->where('order_id', $proposal['order_id'])->value('id'),
        'reservation_id' => (string) $reservation['id'],
        'provider' => $provider,
        'customer' => $customer,
        'correlation_id' => $correlationId,
    ];
}

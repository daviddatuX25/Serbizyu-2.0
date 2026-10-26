<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

function openGovernanceCase(array $order): string
{
    return test()->actingAs($order['buyer'])->postJson('/support-cases', [
        'order_id' => $order['order_id'], 'category' => 'fulfillment',
        'content' => 'Please review the current agreement status.', 'idempotency_key' => 'governance-case-'.Str::uuid7(),
    ])->assertCreated()->json('data.id');
}

it('requires a different designated live checker and places one exact target hold idempotently', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $orderRow = DB::table('orders')->where('id', $order['order_id'])->first(['version']);
    $beforeObligations = DB::table('payment_obligations')->where('order_id', $order['order_id'])->orderBy('id')->get(['id', 'status', 'version', 'amount_minor'])->toArray();
    $input = [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.place', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'], 'expected_target_version' => (int) $orderRow->version,
        'reason_class' => 'dispute', 'reason' => 'Review the case-linked agreement state.', 'idempotency_key' => 'hold-'.Str::uuid7(),
    ];

    $approval = $this->actingAs($maker)->postJson('/admin/command-approvals', $input)->assertCreated()->json('data');
    expect($approval['command_payload']['checker_user_id'])->toBe((string) $checker->id);
    $this->actingAs($maker)->postJson('/admin/command-approvals/'.$approval['id'].'/approve', [])->assertForbidden();
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approval['id'].'/approve', [])->assertOk();
    $first = $this->postJson('/admin/command-approvals/'.$approval['id'].'/execute', [])->assertOk()->json('data');
    $replay = $this->postJson('/admin/command-approvals/'.$approval['id'].'/execute', [])->assertOk()->json('data');

    expect($first['hold_id'])->toBe($replay['hold_id'])
        ->and(DB::table('administrative_holds')->where('order_id', $order['order_id'])->whereIn('status', ['active', 'reviewing'])->count())->toBe(1)
        ->and(DB::table('administrative_holds')->where('work_instance_id', $order['work_id'])->whereIn('status', ['active', 'reviewing'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->orderBy('id')->get(['id', 'status', 'version', 'amount_minor'])->toArray())->toEqual($beforeObligations);
});

it('rejects a stale target version before creating an approval or hold', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.place', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'], 'expected_target_version' => 987654,
        'reason_class' => 'operational', 'reason' => 'Check stale version handling.', 'idempotency_key' => 'stale-'.Str::uuid7(),
    ])->assertConflict()->assertJsonPath('code', 'TARGET_VERSION_CONFLICT');

    expect(DB::table('command_approvals')->where('support_case_id', $caseId)->count())->toBe(0)
        ->and(DB::table('administrative_holds')->where('order_id', $order['order_id'])->where('source_kind', 'manual')->count())->toBe(0);
});

it('assigns and resolves a real case without mutating the financial rail', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $assignee = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $initialCase = DB::table('support_cases')->where('id', $caseId)->first(['version']);
    $financialBefore = DB::table('payment_obligations')->where('order_id', $order['order_id'])->orderBy('id')->get(['id', 'status', 'version', 'amount_minor'])->toArray();

    $assigned = $this->actingAs($maker)->postJson('/admin/support-cases/'.$caseId.'/assign', [
        'expected_version' => (int) $initialCase->version,
        'assignee_user_id' => $assignee->id,
        'idempotency_key' => 'case-assign-'.Str::uuid7(),
    ])->assertOk()->json('data');
    expect($assigned['assigned_user_id'])->toBe((string) $assignee->id);
    expect($assigned['version'])->toBe((int) $initialCase->version + 1);

    $resolved = $this->postJson('/admin/support-cases/'.$caseId.'/resolve', [
        'expected_version' => $assigned['version'],
        'resolution' => 'The case facts were reviewed; financial state is unchanged.',
        'idempotency_key' => 'case-resolve-'.Str::uuid7(),
    ])->assertOk()->json('data');

    expect($resolved['status'])->toBe('resolved')
        ->and($resolved['financial_rail_changed'])->toBeFalse()
        ->and(DB::table('support_cases')->where('id', $caseId)->value('owner_user_id'))->toBe($assignee->id)
        ->and(DB::table('support_cases')->where('id', $caseId)->value('current_responsibility_party'))->toBe('none')
        ->and(DB::table('payment_obligations')->where('order_id', $order['order_id'])->orderBy('id')->get(['id', 'status', 'version', 'amount_minor'])->toArray())->toEqual($financialBefore);
});
it('keeps exact hold release available after case-only closure and audits the designated checker', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $version = (int) DB::table('orders')->where('id', $order['order_id'])->value('version');
    $placement = $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.place', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'], 'expected_target_version' => $version,
        'reason_class' => 'dispute', 'reason' => 'Preserve release reachability after case closure.',
        'idempotency_key' => 'closed-case-place-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$placement['id'].'/approve', [])->assertOk();
    $hold = $this->postJson('/admin/command-approvals/'.$placement['id'].'/execute', [])->assertOk()->json('data');

    $caseVersion = (int) DB::table('support_cases')->where('id', $caseId)->value('version');
    $this->actingAs($maker)->postJson('/admin/support-cases/'.$caseId.'/resolve', [
        'expected_version' => $caseVersion, 'resolution' => 'Case review completed; hold remains pending release.',
        'idempotency_key' => 'closed-case-resolve-'.Str::uuid7(),
    ])->assertOk();

    $release = $this->postJson('/admin/command-approvals', [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.release', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'], 'expected_target_version' => $version,
        'hold_id' => $hold['hold_id'], 'expected_hold_version' => $hold['hold_version'],
        'reason_class' => 'dispute', 'reason' => 'Release exact hold after case-only closure.',
        'idempotency_key' => 'closed-case-release-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$release['id'].'/approve', [])->assertOk();
    $this->postJson('/admin/command-approvals/'.$release['id'].'/execute', [])->assertOk();

    $checkerAudit = DB::table('audit_events')->where('target_type', 'command_approval')->where('target_id', $release['id'])
        ->where('action', 'administrative_hold.approval_approved')->first();
    expect($checkerAudit)->not->toBeNull()
        ->and(json_decode((string) $checkerAudit->new_value_summary, true)['support_case_id'])->toBe($caseId)
        ->and(DB::table('administrative_holds')->where('id', $hold['hold_id'])->value('status'))->toBe('released');
});

it('returns the same approval for a repeated idempotent request', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $input = [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.place', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'],
        'expected_target_version' => (int) DB::table('orders')->where('id', $order['order_id'])->value('version'),
        'reason_class' => 'operational', 'reason' => 'Replay the original approval.',
        'idempotency_key' => 'approval-replay-'.Str::uuid7(),
    ];
    $first = $this->actingAs($maker)->postJson('/admin/command-approvals', $input)->assertCreated()->json('data');
    $replay = $this->postJson('/admin/command-approvals', $input)->assertCreated()->json('data');
    expect($replay['id'])->toBe($first['id'])->and($replay['replayed'])->toBeTrue()
        ->and(DB::table('command_approvals')->where('support_case_id', $caseId)->count())->toBe(1);
});
it('allows native payment mismatch resolution after independent case-only closure', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $obligation = DB::table('payment_obligations')->where('order_id', $order['order_id'])->firstOrFail();
    DB::table('payment_obligations')->where('id', $obligation->id)->update([
        'status' => 'disputed_mismatch',
        'lane' => 'external_cash',
        'due_at' => now(),
    ]);
    $reporter = User::factory()->create();
    $caseId = app(\App\Modules\TrustSupport\Application\TrustSupportCaseAdapter::class)->openPaymentMismatch([
        'obligation_id' => (string) $obligation->id,
        'order_id' => (string) $order['order_id'],
        'work_instance_id' => (string) $order['work_id'],
        'lane' => 'external_cash',
        'amount_minor' => (int) $obligation->amount_minor,
        'currency' => (string) $obligation->currency,
        'reported_amount_minor' => (int) $obligation->amount_minor - 1,
    ], (int) $obligation->amount_minor, (string) $reporter->id, (string) Str::uuid7());
    $disputeId = (string) DB::table('dispute_events')->where('event_type', 'payment_mismatch.opened')
        ->whereRaw("payload->>'support_case_id' = ?", [$caseId])->value('dispute_id');
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $this->actingAs($staff)->postJson('/admin/support-cases/'.$caseId.'/resolve', [
        'expected_version' => (int) DB::table('support_cases')->where('id', $caseId)->value('version'),
        'resolution' => 'Case-only closure; financial dispute remains unresolved.',
        'idempotency_key' => 'case-only-mismatch-close-'.Str::uuid7(),
    ])->assertOk();

    $this->postJson('/admin/payment-mismatches/'.$caseId.'/resolve', ['resolution' => 'release'])
        ->assertOk()->assertJsonPath('data.status', 'due');
    expect(DB::table('disputes')->where('id', $disputeId)->value('status'))->toBe('resolved')
        ->and(DB::table('support_cases')->where('id', $caseId)->value('status'))->toBe('resolved');
});


it('denies expired approval without placing a hold', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $caseId = openGovernanceCase($order);
    $maker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $orderVersion = (int) DB::table('orders')->where('id', $order['order_id'])->value('version');
    $approval = $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $caseId, 'command_type' => 'administrative_hold.place', 'checker_user_id' => $checker->id,
        'target_kind' => 'order', 'target_id' => $order['order_id'], 'expected_target_version' => $orderVersion,
        'reason_class' => 'operational', 'reason' => 'Review expiry handling.', 'idempotency_key' => 'expired-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    Carbon::setTestNow(Carbon::parse($approval['expires_at'])->addSecond());
    try {
        $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approval['id'].'/approve', [])
            ->assertConflict()->assertJsonPath('code', 'APPROVAL_EXPIRED');
    } finally {
        Carbon::setTestNow();
    }
    expect(DB::table('administrative_holds')->where('order_id', $order['order_id'])->where('source_kind', 'manual')->count())->toBe(0);
});

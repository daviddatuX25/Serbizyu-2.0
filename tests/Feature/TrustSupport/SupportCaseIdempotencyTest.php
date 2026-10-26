<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('replays participant case creation by principal even after staff assignment and rejects key conflicts', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $buyer = $order['buyer'];
    $assignedStaff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $input = [
        'order_id' => $order['order_id'],
        'category' => 'fulfillment',
        'content' => 'The delivery window needs clarification.',
        'idempotency_key' => 'participant-case-idempotency',
    ];

    $first = $this->actingAs($buyer)->postJson('/support-cases', $input)
        ->assertCreated()
        ->json('data');
    DB::table('support_cases')->where('id', $first['id'])->update(['owner_user_id' => $assignedStaff->id]);

    $replay = $this->postJson('/support-cases', $input)
        ->assertCreated()
        ->json('data');
    expect($replay['id'])->toBe($first['id'])
        ->and($replay['conversation_id'])->toBe($first['conversation_id']);

    $this->postJson('/support-cases', [
        ...$input,
        'content' => 'Different initial report under the same case key.',
    ])->assertConflict()
        ->assertJsonPath('error.code', 'IDEMPOTENCY_CONFLICT');

    expect(DB::table('support_cases')
        ->where('opened_by_user_id', $buyer->id)
        ->where('principal_user_id', $buyer->id)
        ->where('idempotency_key', $input['idempotency_key'])
        ->count())->toBe(1);
});

it('rejects a whitespace-only initial participant report without creating a case', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $this->actingAs($order['buyer'])
        ->postJson('/support-cases', [
            'order_id' => $order['order_id'],
            'category' => 'fulfillment',
            'content' => '   ',
            'idempotency_key' => 'blank-participant-case',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors('content');

    expect(DB::table('support_cases')->where('order_id', $order['order_id'])->count())->toBe(0);
});

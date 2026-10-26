<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('keeps staff-internal case messages out of participant reads and notifications', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $buyer = $order['buyer'];
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);

    $case = $this->actingAs($buyer)
        ->postJson('/support-cases', [
            'order_id' => $order['order_id'],
            'category' => 'fulfillment',
            'content' => 'Please help coordinate the agreed delivery.',
            'idempotency_key' => 'participant-support-case',
        ])->assertCreated()
        ->json('data');
    $conversationId = $this->actingAs($staff)
        ->postJson('/support-cases/'.$case['id'].'/conversation')
        ->assertCreated()
        ->json('data.id');
    $notificationsBefore = DB::table('notifications')->count();

    $this->postJson('/conversations/'.$conversationId.'/messages', [
        'idempotency_key' => 'staff-private-case-note',
        'content' => 'Internal review must not be exposed to the reporter.',
        'audience' => 'staff_internal',
    ])->assertCreated();

    expect(DB::table('notifications')->count())->toBe($notificationsBefore);
    $participantMessages = $this->actingAs($buyer)
        ->getJson('/conversations/'.$conversationId.'/messages')
        ->assertOk()
        ->assertJsonCount(1, 'data');
    $participantMessages->assertJsonMissing(['content' => 'Internal review must not be exposed to the reporter.']);
});

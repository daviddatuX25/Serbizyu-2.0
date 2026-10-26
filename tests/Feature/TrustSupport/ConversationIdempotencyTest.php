<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;
uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('replays identical actor-principal messages, rejects changed payloads, and isolates different principals', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $conversation = $this->actingAs($order['buyer'])
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');
    $message = [
        'idempotency_key' => 'same-communication-key',
        'content' => 'Please confirm the appointment window.',
        'audience' => 'participants',
    ];

    $first = $this->postJson('/conversations/'.$conversation.'/messages', $message)
        ->assertCreated()
        ->json('data');
    $retry = $this->postJson('/conversations/'.$conversation.'/messages', $message)
        ->assertCreated()
        ->json('data');
    expect($retry['id'])->toBe($first['id'])
        ->and($retry['sequence'])->toBe(1);

    $notification = DB::table('notifications')->where('event_source_id', $first['id'])->firstOrFail();
    $notificationPayload = json_decode((string) $notification->payload, true, flags: JSON_THROW_ON_ERROR);
    expect((string) $notification->recipient_user_id)->toBe((string) $order['provider']->id)
        ->and((string) $notification->event_source_type)->toBe('conversation_message')
        ->and($notificationPayload['action_url'])->toBe(route('conversations.show', ['conversation' => $conversation], false))
        ->and(array_keys($notificationPayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);
    $outbox = DB::table('outbox_messages')
        ->where('event_type', 'trust_support.conversation.message_recorded')
        ->where('aggregate_id', $conversation)
        ->firstOrFail();
    $outboxPayload = json_decode((string) $outbox->payload, true, flags: JSON_THROW_ON_ERROR);
    expect($outboxPayload['message_id'])->toBe($first['id'])
        ->and(DB::table('audit_events')->where('action', 'conversation.message.sent')->where('target_id', $conversation)->count())->toBe(1);

    $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$message,
        'content' => 'A different payload under the same key.',
    ])->assertConflict()
        ->assertJsonPath('error.code', 'IDEMPOTENCY_CONFLICT');

    $providerMessage = $this->actingAs($order['provider'])
        ->postJson('/conversations/'.$conversation.'/messages', [
            ...$message,
            'content' => 'Provider response under that same key.',
        ])
        ->assertCreated()
        ->json('data');

    expect($providerMessage['id'])->not->toBe($first['id'])
        ->and($providerMessage['sequence'])->toBe(2)
        ->and($providerMessage['actor_user_id'])->toBe((string) $order['provider']->id)
        ->and($providerMessage['owner_user_id'])->toBe((string) $order['provider']->id);
});

<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('notifies the other Order principal about the real initial case report', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $buyer = $order['buyer'];
    $provider = $order['provider'];
    $case = $this->actingAs($buyer)->postJson('/support-cases', [
        'order_id' => $order['order_id'],
        'category' => 'fulfillment',
        'content' => 'Please help coordinate the delivery.',
        'idempotency_key' => 'initial-case-report-notification',
    ])->assertCreated()
        ->json('data');
    $report = DB::table('messages')->where('conversation_id', $case['conversation_id'])->firstOrFail();
    $notification = DB::table('notifications')
        ->where('event_source_type', 'conversation_message')
        ->where('event_source_id', $report->id)
        ->firstOrFail();

    expect((string) $report->content)->toBe('Please help coordinate the delivery.')
        ->and((string) $report->actor_user_id)->toBe((string) $buyer->id)
        ->and((string) $report->owner_user_id)->toBe((string) $buyer->id)
        ->and((string) $notification->recipient_user_id)->toBe((string) $provider->id)
        ->and((string) $notification->event_type)->toBe('conversation.message')
        ->and(json_decode((string) $notification->payload, true, flags: JSON_THROW_ON_ERROR)['action_url'])
        ->toBe(route('conversations.show', ['conversation' => $case['conversation_id']], false));
});

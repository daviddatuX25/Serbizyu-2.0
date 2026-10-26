<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('pages sequenced messages in ascending order without gaps or overlap', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $buyer = $order['buyer'];
    $conversation = $this->actingAs($buyer)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');

    foreach (range(1, 51) as $sequence) {
        $this->postJson('/conversations/'.$conversation.'/messages', [
            'idempotency_key' => 'pagination-message-'.$sequence,
            'content' => 'Message '.$sequence,
            'audience' => 'participants',
        ])->assertCreated()
            ->assertJsonPath('data.sequence', $sequence);
    }

    $latest = $this->getJson('/conversations/'.$conversation.'/messages')
        ->assertOk()
        ->assertJsonCount(50, 'data')
        ->assertJsonPath('data.0.sequence', 2)
        ->assertJsonPath('data.49.sequence', 51)
        ->assertJsonPath('next_before_sequence', 2)
        ->assertJsonPath('next_after_sequence', 51)
        ->assertJsonPath('has_more_before', true)
        ->assertJsonPath('has_more_after', false);

    $older = $this->getJson('/conversations/'.$conversation.'/messages?before_sequence=2')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sequence', 1)
        ->assertJsonPath('has_more_before', false)
        ->assertJsonPath('has_more_after', true);

    $newer = $this->getJson('/conversations/'.$conversation.'/messages?after_sequence=48')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.sequence', 49)
        ->assertJsonPath('data.2.sequence', 51)
        ->assertJsonPath('has_more_after', false);

    expect($latest->json('data.*.sequence'))->toBe(range(2, 51))
        ->and($older->json('data.*.sequence'))->toBe([1])
        ->and($newer->json('data.*.sequence'))->toBe([49, 50, 51]);
});

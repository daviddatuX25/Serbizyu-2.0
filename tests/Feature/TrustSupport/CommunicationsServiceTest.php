<?php

declare(strict_types=1);

use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('opens an order conversation and records an attributed participant message', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $buyer = $order['buyer'];
    $buyerName = (string) DB::table('user_profiles')->where('user_id', $buyer->id)->value('display_name');
    $response = $this->actingAs($buyer)->postJson('/orders/'.$order['order_id'].'/conversation');

    $response->assertCreated()
        ->assertJsonPath('data.scope_type', 'order')
        ->assertJsonPath('data.scope_id', $order['order_id'])
        ->assertJsonPath('data.viewer.actor_user_id', (string) $buyer->id)
        ->assertJsonPath('data.viewer.owner_user_id', (string) $buyer->id)
        ->assertJsonPath('data.can_send', true);

    $conversationId = $response->json('data.id');
    $this->postJson('/conversations/'.$conversationId.'/messages', [
        'idempotency_key' => 'communications-first-message',
        'content' => 'The accepted order needs a delivery update.',
        'audience' => 'participants',
    ])->assertCreated()
        ->assertJsonPath('data.sequence', 1)
        ->assertJsonPath('data.actor_user_id', (string) $buyer->id)
        ->assertJsonPath('data.owner_user_id', (string) $buyer->id)
        ->assertJsonPath('data.actor_display_name', $buyerName)
        ->assertJsonPath('data.owner_display_name', $buyerName);
});
it('downloads the exact related attachment when two clean Work files share an owner', function (): void {
    Storage::fake('private');
    $nodeId = 'communications-photo-proof';
    $order = $this->createAcceptedWorkOrder('A1', [[
        'id' => $nodeId,
        'ordinal' => 1,
        'title' => 'Capture service evidence',
        'description' => 'Upload a real Work photo proof.',
        'node_kind' => 'execution_proof',
        'evidence_type' => 'photo_required',
        'evidence_description' => 'A current photo.',
        'control_mode' => 'provider_advance',
        'mandatory' => true,
        'duration_label' => null,
        'required_proofs' => ['photo_proof'],
        'approval_method' => 'none',
        'handoff_party' => null,
        'metric_requirements' => [],
    ]]);
    $provider = $order['provider'];
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($png)->toBeString();
    $annotate = static function (string $label) use ($png): string {
        $payload = "Description\0".$label;
        $data = 'tEXt'.$payload;
        $chunk = pack('N', strlen($payload)).$data.pack('N', crc32($data));
        return substr($png, 0, -12).$chunk.substr($png, -12);
    };
    $upload = function (string $label) use ($annotate, $nodeId, $order): string {
        $bytes = $annotate($label);
        $response = $this->actingAs($order['provider'])
            ->withHeader('Accept', 'application/json')
            ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
                'file' => UploadedFile::fake()->createWithContent($label.'.png', $bytes),
                'tool_key' => 'photo_proof',
            ])->assertCreated();
        $id = (string) $response->json('data.id');
        app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $id);
        expect(DB::table('evidence_files')->where('id', $id)->value('scan_status'))->toBe('clean');
        return $id;
    };

    $upload('first-photo');
    $requestedId = $upload('requested-photo');
    $requestedBytes = $annotate('requested-photo');
    $conversation = $this->actingAs($provider)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');
    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'related-attachment-message',
        'content' => 'Please review the attached photo.',
        'attachment_evidence_file_id' => $requestedId,
        'audience' => 'participants',
    ])->assertCreated();

    $this->actingAs($order['buyer'])
        ->get('/conversations/'.$conversation.'/attachments/'.$requestedId)
        ->assertOk()
        ->assertContent($requestedBytes);
});

it('returns an authorization error response when a nonparticipant opens an order conversation', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $outsider = \App\Models\User::factory()->create();

    $this->actingAs($outsider)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');
});

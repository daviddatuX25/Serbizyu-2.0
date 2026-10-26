<?php

declare(strict_types=1);

use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('records a clean attachment-only participant message over HTTP', function (): void {
    Storage::fake('private');
    $nodeId = 'attachment-only-proof';
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
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($bytes)->toBeString();
    $upload = $this->actingAs($order['provider'])
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('attachment-only.png', $bytes),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
    $evidenceId = (string) $upload->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);

    $conversationId = $this->actingAs($order['provider'])
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');
    $this->postJson('/conversations/'.$conversationId.'/messages', [
        'idempotency_key' => 'attachment-only-message',
        'content' => '',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'participants',
    ])->assertCreated()
        ->assertJsonPath('data.content', '')
        ->assertJsonPath('data.attachment.id', $evidenceId);
});

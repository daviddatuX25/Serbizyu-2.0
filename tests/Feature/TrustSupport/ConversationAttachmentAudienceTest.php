<?php

declare(strict_types=1);

use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('selects a participant-audience reference when the same clean evidence also appears in an internal note', function (): void {
    Storage::fake('private');
    $nodeId = 'shared-case-audience-proof';
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
    DB::table('users')->where('id', $provider->id)->update(['primary_access_tier' => 'L4']);
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($bytes)->toBeString();
    $upload = $this->actingAs($provider)
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('shared-case-proof.png', $bytes),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
    $evidenceId = (string) $upload->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);

    $case = $this->actingAs($order['buyer'])
        ->postJson('/support-cases', [
            'order_id' => $order['order_id'],
            'category' => 'fulfillment',
            'content' => 'Please review the service handoff.',
            'idempotency_key' => 'shared-audience-case',
        ])->assertCreated()->json('data');
    $conversation = $this->actingAs($provider)
        ->postJson('/support-cases/'.$case['id'].'/conversation')
        ->assertCreated()
        ->json('data.id');

    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'same-file-internal-reference',
        'content' => 'Internal review note.',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'staff_internal',
    ])->assertCreated();
    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'same-file-participant-reference',
        'content' => 'The related proof is available to case participants.',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'participants',
    ])->assertCreated();

    $this->actingAs($order['buyer'])
        ->get('/conversations/'.$conversation.'/attachments/'.$evidenceId)
        ->assertOk()
        ->assertContent($bytes);
});

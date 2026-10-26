<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Application\IdentityVerificationService;
use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('rejects a clean private identity file that is unrelated to the Order', function (): void {
    Storage::fake('private');
    $order = $this->createAcceptedWorkOrder('A1', []);
    $provider = $order['provider'];
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($bytes)->toBeString();
    $evidence = app(IdentityVerificationService::class)->submitEvidence(
        (string) $provider->id,
        'barangay_certificate',
        UploadedFile::fake()->createWithContent('private-identity.png', $bytes),
        (string) Str::uuid7(),
    );
    $conversation = $this->actingAs($provider)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');

    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'unrelated-private-evidence',
        'content' => 'This unrelated clean file must not attach.',
        'attachment_evidence_file_id' => $evidence['evidence_id'],
        'audience' => 'participants',
    ])->assertUnprocessable()
        ->assertJsonPath('error.code', 'ATTACHMENT_UNAVAILABLE');
});

it('rejects Work evidence whose real safety scan marked it infected', function (): void {
    Storage::fake('private');
    $nodeId = 'infected-communications-proof';
    $order = $this->createAcceptedWorkOrder('A1', [[
        'id' => $nodeId,
        'ordinal' => 1,
        'title' => 'Capture service evidence',
        'description' => 'Upload a Work photo proof.',
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
    $upload = $this->actingAs($provider)
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('infected.svg', '<svg><script>alert(1)</script></svg>'),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
    $evidenceId = (string) $upload->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
    expect(\Illuminate\Support\Facades\DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('infected');

    $conversation = $this->actingAs($provider)
        ->postJson('/orders/'.$order['order_id'].'/conversation')
        ->assertCreated()
        ->json('data.id');
    $messagesBefore = DB::table('messages')->where('conversation_id', $conversation)->count();
    $notificationsBefore = DB::table('notifications')->count();
    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'infected-work-evidence',
        'content' => 'This infected file must not attach.',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'participants',
    ])->assertUnprocessable()
        ->assertJsonPath('error.code', 'ATTACHMENT_UNAVAILABLE');
    expect(DB::table('messages')->where('conversation_id', $conversation)->count())->toBe($messagesBefore)
        ->and(DB::table('outbox_messages')->where('aggregate_type', 'conversation')->where('aggregate_id', $conversation)->where('event_type', 'trust_support.conversation.message_recorded')->count())->toBe(0)
        ->and(DB::table('audit_events')->where('action', 'conversation.message.sent')->where('target_id', $conversation)->count())->toBe(0)
        ->and(DB::table('notifications')->count())->toBe($notificationsBefore);
});

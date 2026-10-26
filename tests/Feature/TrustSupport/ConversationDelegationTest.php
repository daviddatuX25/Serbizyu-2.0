<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Application\ConsentGrantService;
use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('preserves agent attribution and immediately revokes delegated read send and download access', function (): void {
    Storage::fake('private');
    $nodeId = 'delegated-message-photo';
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
    $owner = $order['provider'];
    $agent = \App\Models\User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $grantId = (string) Str::uuid7();
    DB::table('consent_grants')->insert([
        'id' => $grantId,
        'grantor_user_id' => $owner->id,
        'grantee_user_id' => $agent->id,
        'resource_type' => 'order',
        'resource_id' => $order['order_id'],
        'permission_scope' => json_encode(['actions' => ['order.conversation.read', 'order.conversation.write']], JSON_THROW_ON_ERROR),
        'status' => 'active',
        'starts_at' => now()->subMinute(),
        'expires_at' => now()->addHour(),
        'revoked_at' => null,
        'suspended_at' => null,
        'consent_evidence_file_id' => null,
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($png)->toBeString();
    $upload = $this->actingAs($owner)
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $order['order_id'], 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('delegated-proof.png', $png),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
    $evidenceId = (string) $upload->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
    expect(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('clean');

    $context = ['owner_user_id' => (string) $owner->id, 'consent_grant_id' => $grantId];
    $conversation = $this->actingAs($agent)
        ->postJson('/orders/'.$order['order_id'].'/conversation', $context)
        ->assertCreated()
        ->assertJsonPath('data.viewer.actor_user_id', (string) $agent->id)
        ->assertJsonPath('data.viewer.owner_user_id', (string) $owner->id)
        ->json('data.id');
    $message = $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$context,
        'idempotency_key' => 'delegated-conversation-message',
        'content' => 'The photo is ready for review.',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'participants',
    ])->assertCreated()
        ->assertJsonPath('data.actor_user_id', (string) $agent->id)
        ->assertJsonPath('data.owner_user_id', (string) $owner->id)
        ->assertJsonPath('data.consent_grant_id', $grantId);

    $buyerGrantId = (string) Str::uuid7();
    DB::table('consent_grants')->insert([
        'id' => $buyerGrantId,
        'grantor_user_id' => $order['buyer']->id,
        'grantee_user_id' => $agent->id,
        'resource_type' => 'order',
        'resource_id' => $order['order_id'],
        'permission_scope' => json_encode(['actions' => ['order.conversation.read', 'order.conversation.write']], JSON_THROW_ON_ERROR),
        'status' => 'active',
        'starts_at' => now()->subMinute(),
        'expires_at' => now()->addHour(),
        'revoked_at' => null,
        'suspended_at' => null,
        'consent_evidence_file_id' => null,
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $buyerContext = ['owner_user_id' => (string) $order['buyer']->id, 'consent_grant_id' => $buyerGrantId];
    $buyerPrincipalMessage = $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$buyerContext,
        'idempotency_key' => 'same-agent-key-different-principal',
        'content' => 'The buyer principal has a distinct message identity.',
        'audience' => 'participants',
    ])->assertCreated()->json('data');
    $providerPrincipalMessage = $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$context,
        'idempotency_key' => 'same-agent-key-different-principal',
        'content' => 'The provider principal has a distinct message identity.',
        'audience' => 'participants',
    ])->assertCreated()->json('data');
    expect($buyerPrincipalMessage['id'])->not->toBe($providerPrincipalMessage['id'])
        ->and($buyerPrincipalMessage['actor_user_id'])->toBe((string) $agent->id)
        ->and($providerPrincipalMessage['actor_user_id'])->toBe((string) $agent->id)
        ->and($buyerPrincipalMessage['owner_user_id'])->toBe((string) $order['buyer']->id)
        ->and($providerPrincipalMessage['owner_user_id'])->toBe((string) $owner->id);

    app(ConsentGrantService::class)->revoke($grantId, (string) $owner->id, (string) Str::uuid7());

    $query = http_build_query($context);
    $this->actingAs($agent)
        ->getJson('/conversations/'.$conversation.'/messages?'.$query)
        ->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');
    $this->postJson('/conversations/'.$conversation.'/messages', [
        ...$context,
        'idempotency_key' => 'delegated-after-revocation',
        'content' => 'This must not be recorded.',
        'audience' => 'participants',
    ])->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');
    $this->get('/conversations/'.$conversation.'/attachments/'.$evidenceId.'?'.$query)
        ->assertForbidden();
});

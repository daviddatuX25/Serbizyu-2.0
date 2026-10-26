<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

it('lets an agent open the new Order-related case under its exact Order grant', function (): void {
    $order = $this->createAcceptedWorkOrder('A1', []);
    $principal = $order['buyer'];
    $agent = User::factory()->create();
    $grantId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    DB::table('consent_grants')->insert([
        'id' => $grantId,
        'grantor_user_id' => $principal->id,
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
    $context = [
        'owner_user_id' => (string) $principal->id,
        'consent_grant_id' => $grantId,
    ];
    $case = $this->actingAs($agent)->postJson('/support-cases', [
        ...$context,
        'order_id' => $order['order_id'],
        'category' => 'fulfillment',
        'content' => 'Please help coordinate the delivery.',
        'idempotency_key' => 'delegated-order-case',
    ])->assertCreated()
        ->json('data');

    $conversation = $this->postJson('/support-cases/'.$case['id'].'/conversation', $context)
        ->assertCreated()
        ->assertJsonPath('data.scope_type', 'support_case')
        ->assertJsonPath('data.viewer.actor_user_id', (string) $agent->id)
        ->assertJsonPath('data.viewer.owner_user_id', (string) $principal->id)
        ->assertJsonPath('data.viewer.consent_grant_id', $grantId)
        ->json('data.id');

    $unrelatedGrantId = (string) Str::uuid7();
    DB::table('consent_grants')->insert([
        'id' => $unrelatedGrantId,
        'grantor_user_id' => $principal->id,
        'grantee_user_id' => $agent->id,
        'resource_type' => 'order',
        'resource_id' => (string) Str::uuid7(),
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
    $this->postJson('/support-cases/'.$case['id'].'/conversation', [
        'owner_user_id' => (string) $principal->id,
        'consent_grant_id' => $unrelatedGrantId,
    ])->assertForbidden()
        ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');
    $this->getJson('/conversations/'.$conversation.'/messages?'.http_build_query($context))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.actor_user_id', (string) $agent->id)
        ->assertJsonPath('data.0.owner_user_id', (string) $principal->id)
        ->assertJsonPath('data.0.consent_grant_id', $grantId);
});

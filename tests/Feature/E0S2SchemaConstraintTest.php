<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function e0s2PgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('E0-S2 constraint proofs are PostgreSQL-only.');
    }
}

function e0s2ExpectQueryException(callable $callback): void
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected a QueryException to be thrown.');
    } catch (QueryException $exception) {
        expect($exception)->toBeInstanceOf(QueryException::class);
    }
}

it('rejects inbox duplicate consumer event identity', function (): void {
    e0s2PgsqlOrSkip();

    $payload = [
        'id' => (string) Str::uuid7(),
        'consumer' => 'orders.projection',
        'source_event_id' => (string) Str::uuid7(),
        'aggregate_type' => 'order',
        'aggregate_id' => (string) Str::uuid7(),
        'aggregate_version' => 1,
        'aggregate_sequence' => 1,
        'event_contract_version' => 1,
        'payload_contract_version' => 1,
        'payload_hash' => str_repeat('a', 64),
        'payload' => json_encode(['ok' => true], JSON_THROW_ON_ERROR),
        'status' => 'received',
        'attempts' => 0,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ];

    DB::table('inbox_messages')->insert($payload);

    $duplicate = $payload;
    $duplicate['id'] = (string) Str::uuid7();
    $duplicate['aggregate_sequence'] = 2;

    e0s2ExpectQueryException(fn () => DB::table('inbox_messages')->insert($duplicate));
});

it('rejects listing capacity reservation with non-positive quantity', function (): void {
    e0s2PgsqlOrSkip();

    e0s2ExpectQueryException(fn () => DB::statement(<<<'SQL'
        INSERT INTO listing_capacity_reservations (
            id, listing_capacity_id, listing_version_id, source_mechanism, quantity, status,
            command_scope, idempotency_key, row_version, correlation_id, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'direct', 0, 'held',
            'test', 'k1', 1, gen_random_uuid(), now(), now()
        )
        SQL));
});

it('rejects command approval where initiator equals approver', function (): void {
    e0s2PgsqlOrSkip();

    $userId = (string) Str::uuid7();

    DB::table('users')->insert([
        'id' => $userId,
        'phone_e164' => '+639171111111',
        'status' => 'active',
        'primary_access_tier' => 'L1',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    e0s2ExpectQueryException(fn () => DB::table('command_approvals')->insert([
        'id' => (string) Str::uuid7(),
        'approval_set_id' => (string) Str::uuid7(),
        'initiator_user_id' => $userId,
        'approver_user_id' => $userId,
        'required_approver_role' => 'security',
        'approver_role' => 'security',
        'command_type' => 'ActivateCapability',
        'command_fingerprint' => hash('sha256', 'cmd'),
        'payload_hash' => hash('sha256', 'payload'),
        'target_ids' => json_encode([]),
        'target_versions' => json_encode(new stdClass),
        'scopes' => json_encode([]),
        'policy_version' => 1,
        'reason' => 'test',
        'status' => 'pending',
        'issued_at' => now(),
        'expires_at' => now()->addHour(),
        'idempotency_scope' => 'test',
        'idempotency_key' => 'one',
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ]));
});

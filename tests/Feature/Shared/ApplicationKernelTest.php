<?php

declare(strict_types=1);

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\InboxConsumer;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function kernelPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('Application kernel proofs are PostgreSQL-only.');
    }
}

it('replays an identical idempotent command payload', function (): void {
    kernelPgsqlOrSkip();

    $guard = app(IdempotencyGuard::class);
    $correlationId = (string) Str::uuid7();
    $scope = 'kernel.test.replay';
    $key = 'replay-key-0001';
    $fingerprint = ['op' => 'ping', 'n' => 1];

    $first = DB::transaction(function () use ($guard, $scope, $key, $fingerprint, $correlationId) {
        $reservation = $guard->begin($scope, $key, $fingerprint, $correlationId, actorUserId: null);
        expect($reservation->isReplay)->toBeFalse();
        $payload = ['ok' => true, 'value' => 42];
        $guard->succeed($reservation->row, $payload, responseReference: 'ref-1');

        return $payload;
    });

    $second = DB::transaction(function () use ($guard, $scope, $key, $fingerprint, $correlationId, $first) {
        $reservation = $guard->begin($scope, $key, $fingerprint, $correlationId, actorUserId: null);
        expect($reservation->isReplay)->toBeTrue();
        expect($reservation->replayPayload)->toBe($first);

        return $reservation->replayPayload;
    });

    expect($second)->toBe($first);
    expect(DB::table('idempotency_keys')->where('scope', $scope)->where('key', $key)->count())->toBe(1);
});

it('rejects a conflicting idempotency payload hash', function (): void {
    kernelPgsqlOrSkip();

    $guard = app(IdempotencyGuard::class);
    $correlationId = (string) Str::uuid7();
    $scope = 'kernel.test.conflict';
    $key = 'conflict-key-0001';

    DB::transaction(function () use ($guard, $scope, $key, $correlationId): void {
        $reservation = $guard->begin($scope, $key, ['op' => 'a'], $correlationId, actorUserId: null);
        $guard->succeed($reservation->row, ['ok' => true]);
    });

    $caught = null;
    try {
        DB::transaction(function () use ($guard, $scope, $key, $correlationId): void {
            $guard->begin($scope, $key, ['op' => 'b'], $correlationId, actorUserId: null);
        });
    } catch (KernelException $exception) {
        $caught = $exception;
    }

    expect($caught)->toBeInstanceOf(KernelException::class)
        ->and($caught?->envelope->code)->toBe('IDEMPOTENCY_KEY_REUSED');
});

it('writes audit and pending outbox in one transaction', function (): void {
    kernelPgsqlOrSkip();

    $audits = app(AuditRecorder::class);
    $outbox = app(OutboxWriter::class);
    $correlationId = (string) Str::uuid7();
    $aggregateId = (string) Str::uuid7();
    $userId = (string) Str::uuid7();

    DB::table('users')->insert([
        'id' => $userId,
        'phone_e164' => '+639172222222',
        'status' => 'active',
        'primary_access_tier' => 'L1',
        'correlation_id' => $correlationId,
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::transaction(function () use ($audits, $outbox, $correlationId, $aggregateId, $userId): void {
        $auditId = $audits->record(
            action: 'kernel.smoke',
            targetType: 'kernel_test',
            targetId: $aggregateId,
            correlationId: $correlationId,
            actor: ActorContext::human($userId),
            commandName: 'KernelSmoke',
            next: ['status' => 'ok'],
        );

        $outbox->enqueue(
            eventType: 'kernel.smoked',
            aggregateType: 'kernel_test',
            aggregateId: $aggregateId,
            payload: ['ok' => true],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    });

    expect(DB::table('audit_events')->where('correlation_id', $correlationId)->count())->toBe(1);
    expect(DB::table('outbox_messages')->where('correlation_id', $correlationId)->where('status', 'pending')->count())->toBe(1);
});

it('treats duplicate inbox source events as duplicates', function (): void {
    kernelPgsqlOrSkip();

    $inbox = app(InboxConsumer::class);
    $correlationId = (string) Str::uuid7();
    $eventId = (string) Str::uuid7();
    $aggregateId = (string) Str::uuid7();

    $first = $inbox->record(
        consumer: 'kernel.test',
        sourceEventId: $eventId,
        aggregateType: 'kernel_test',
        aggregateId: $aggregateId,
        aggregateVersion: 1,
        aggregateSequence: 1,
        payload: ['n' => 1],
        correlationId: $correlationId,
    );
    $second = $inbox->record(
        consumer: 'kernel.test',
        sourceEventId: $eventId,
        aggregateType: 'kernel_test',
        aggregateId: $aggregateId,
        aggregateVersion: 1,
        aggregateSequence: 1,
        payload: ['n' => 1],
        correlationId: $correlationId,
    );

    expect($first)->toBe('recorded');
    expect($second)->toBe('duplicate');
});

<?php

declare(strict_types=1);

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\InboxConsumer;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxConsumerHandler;
use App\Shared\Application\OutboxDispatcher;
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

it('dispatches outbox events to registered consumers with durable inbox acknowledgement', function (): void {
    kernelPgsqlOrSkip();

    $aggregateId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    $eventId = (string) Str::uuid7();
    $outboxId = app(OutboxWriter::class)->enqueue(
        eventType: 'kernel.dispatch.test',
        aggregateType: 'kernel_test',
        aggregateId: $aggregateId,
        payload: ['value' => 'golden'],
        correlationId: $correlationId,
        eventId: $eventId,
    );
    $handler = new class implements OutboxConsumerHandler
    {
        public array $received = [];

        public function consumerName(): string
        {
            return 'kernel.dispatch.test';
        }

        public function eventType(): string
        {
            return 'kernel.dispatch.test';
        }

        public function supportedContractVersion(): int
        {
            return 1;
        }

        public function handle(array $envelope): void
        {
            $this->received[] = $envelope;
        }
    };
    $dispatcher = new OutboxDispatcher([$handler], app(InboxConsumer::class));

    $result = $dispatcher->dispatch();
    $duplicateResult = $dispatcher->dispatch();

    expect($result->published)->toBe(1)
        ->and($duplicateResult->published)->toBe(0)
        ->and($handler->received)->toHaveCount(1)
        ->and($handler->received[0]['aggregate_sequence'])->toBe(1)
        ->and(DB::table('outbox_messages')->where('id', $outboxId)->value('status'))->toBe('published')
        ->and(DB::table('inbox_messages')->where('consumer', 'kernel.dispatch.test')->where('source_event_id', $eventId)->value('status'))->toBe('processed');
});

it('parks unsupported outbox contract versions explicitly', function (): void {
    kernelPgsqlOrSkip();

    $id = app(OutboxWriter::class)->enqueue(
        eventType: 'kernel.unsupported.test',
        aggregateType: 'kernel_test',
        aggregateId: (string) Str::uuid7(),
        payload: [],
        correlationId: (string) Str::uuid7(),
        payloadVersion: 2,
    );
    $handler = new class implements OutboxConsumerHandler
    {
        public function consumerName(): string
        {
            return 'kernel.unsupported.test';
        }

        public function eventType(): string
        {
            return 'kernel.unsupported.test';
        }

        public function supportedContractVersion(): int
        {
            return 1;
        }

        public function handle(array $envelope): void
        {
            throw new RuntimeException('Must not execute unsupported payload.');
        }
    };
    $result = (new OutboxDispatcher([$handler], app(InboxConsumer::class)))->dispatch();

    expect($result->parked)->toBe(1)
        ->and(DB::table('outbox_messages')->where('id', $id)->value('status'))->toBe('dead_letter')
        ->and(DB::table('outbox_messages')->where('id', $id)->value('last_error'))->toBe('UNSUPPORTED_CONTRACT_VERSION');
});

it('retries failed deliveries and dead-letters after the configured attempt limit', function (): void {
    kernelPgsqlOrSkip();

    $id = app(OutboxWriter::class)->enqueue('kernel.retry.test', 'kernel_test', (string) Str::uuid7(), [], (string) Str::uuid7());
    $handler = new class implements OutboxConsumerHandler
    {
        public int $calls = 0;

        public function consumerName(): string
        {
            return 'kernel.retry.test';
        }

        public function eventType(): string
        {
            return 'kernel.retry.test';
        }

        public function supportedContractVersion(): int
        {
            return 1;
        }

        public function handle(array $envelope): void
        {
            $this->calls++;
            throw new RuntimeException('temporary consumer failure');
        }
    };
    $dispatcher = new OutboxDispatcher([$handler], app(InboxConsumer::class), maxAttempts: 2);

    expect($dispatcher->dispatch()->failed)->toBe(1);
    DB::table('outbox_messages')->where('id', $id)->update(['next_attempt_at' => now()]);
    $result = $dispatcher->dispatch();

    expect($result->failed)->toBe(1)
        ->and($handler->calls)->toBe(2)
        ->and(DB::table('outbox_messages')->where('id', $id)->value('attempt_count'))->toBe(2)
        ->and(DB::table('outbox_messages')->where('id', $id)->value('status'))->toBe('dead_letter');
});

it('does not retry later subscribed stream events while an earlier callback is backed off', function (): void {
    kernelPgsqlOrSkip();
    $writer = app(OutboxWriter::class);
    $aggregateId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    $firstId = $writer->enqueue('kernel.ordered.test', 'kernel_test', $aggregateId, ['n' => 1], $correlationId);
    $secondId = $writer->enqueue('kernel.ordered.test', 'kernel_test', $aggregateId, ['n' => 2], $correlationId);
    $handler = new class implements OutboxConsumerHandler
    {
        public function consumerName(): string
        {
            return 'kernel.ordered.test';
        }

        public function eventType(): string
        {
            return 'kernel.ordered.test';
        }

        public function supportedContractVersion(): int
        {
            return 1;
        }

        public function handle(array $envelope): void
        {
            throw new RuntimeException('temporary failure');
        }
    };

    $result = (new OutboxDispatcher([$handler], app(InboxConsumer::class)))->dispatch();

    expect($result->failed)->toBe(1)
        ->and(DB::table('outbox_messages')->where('id', $firstId)->value('attempt_count'))->toBe(1)
        ->and(DB::table('outbox_messages')->where('id', $secondId)->value('attempt_count'))->toBe(0)
        ->and(DB::table('outbox_messages')->where('id', $secondId)->value('status'))->toBe('pending');
});

it('delivers a later subscription event while preserving its raw stream sequence', function (): void {
    kernelPgsqlOrSkip();
    $writer = app(OutboxWriter::class);
    $aggregateId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    $writer->enqueue('kernel.unrelated.test', 'kernel_test', $aggregateId, ['n' => 1], $correlationId);
    $writer->enqueue('kernel.subscribed.test', 'kernel_test', $aggregateId, ['n' => 2], $correlationId);
    $handler = new class implements OutboxConsumerHandler
    {
        public array $received = [];

        public function consumerName(): string
        {
            return 'kernel.topic.consumer';
        }

        public function eventType(): string
        {
            return 'kernel.subscribed.test';
        }

        public function supportedContractVersion(): int
        {
            return 1;
        }

        public function handle(array $envelope): void
        {
            $this->received[] = $envelope;
        }
    };

    $result = (new OutboxDispatcher([$handler], app(InboxConsumer::class)))->dispatch();

    expect($result->published)->toBe(1)
        ->and($handler->received[0]['aggregate_sequence'])->toBe(2)
        ->and(DB::table('inbox_messages')->where('consumer', 'kernel.topic.consumer')->where('aggregate_id', $aggregateId)->value('aggregate_sequence'))->toBe(1);
});

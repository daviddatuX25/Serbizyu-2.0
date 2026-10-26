<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;
use Throwable;

final class OutboxDispatcher
{
    /** @param iterable<OutboxConsumerHandler> $handlers */
    public function __construct(
        private readonly iterable $handlers,
        private readonly InboxConsumer $inbox,
        private readonly int $maxAttempts = 5,
    ) {}

    public function dispatch(int $limit = 100, ?string $eventType = null, ?string $aggregateId = null): OutboxDispatchResult
    {
        $published = $failed = $parked = 0;
        $handlers = [];
        $subscriptions = [];
        foreach ($this->handlers as $handler) {
            $handlers[$handler->eventType()][] = $handler;
            $subscriptions[$handler->consumerName()][] = $handler->eventType();
        }
        foreach ($subscriptions as &$eventTypes) {
            $eventTypes = array_values(array_unique($eventTypes));
        }
        unset($eventTypes);

        $ids = DB::table('outbox_messages')
            ->whereIn('event_type', array_keys($handlers))
            ->whereIn('status', ['pending', 'failed'])
            ->when($eventType !== null, fn ($query) => $query->where('event_type', $eventType))
            ->when($aggregateId !== null, fn ($query) => $query->where('aggregate_id', $aggregateId))
            ->where(fn ($query) => $query->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', now()))
            ->orderBy('created_at')->orderBy('aggregate_type')->orderBy('aggregate_id')->orderBy('aggregate_sequence')
            ->limit($limit)->pluck('id');

        foreach ($ids as $id) {
            try {
                $result = DB::transaction(function () use ($id, $handlers, $subscriptions): string {
                    $row = DB::table('outbox_messages')->where('id', $id)->lockForUpdate()->first();
                    if ($row === null || ! in_array($row->status, ['pending', 'failed'], true)) {
                        return 'skipped';
                    }
                    $consumers = $handlers[$row->event_type] ?? [];
                    if ($consumers === []) {
                        throw new \RuntimeException('NO_REGISTERED_CONSUMER');
                    }
                    $payload = json_decode((string) $row->payload, true, 512, JSON_THROW_ON_ERROR);
                    foreach ($consumers as $handler) {
                        $consumerName = $handler->consumerName();
                        $eventTypes = $subscriptions[$consumerName] ?? [$handler->eventType()];
                        if ($this->hasUnacknowledgedPrevious($consumerName, $eventTypes, $row)) {
                            return 'blocked';
                        }
                        $deliverySequence = $this->deliverySequence($eventTypes, $row);
                        if ((int) $row->payload_version > $handler->supportedContractVersion()) {
                            $this->inbox->parkUnsupported($consumerName, (string) $row->event_id, (string) $row->aggregate_type, (string) $row->aggregate_id, (int) $row->aggregate_version, $deliverySequence, $payload, (string) $row->correlation_id, (int) $row->payload_version);
                            $this->park((string) $id, 'UNSUPPORTED_CONTRACT_VERSION');

                            return 'parked';
                        }
                        $ack = $this->inbox->record(
                            consumer: $consumerName,
                            sourceEventId: (string) $row->event_id,
                            aggregateType: (string) $row->aggregate_type,
                            aggregateId: (string) $row->aggregate_id,
                            aggregateVersion: (int) $row->aggregate_version,
                            aggregateSequence: $deliverySequence,
                            payload: $payload,
                            correlationId: (string) $row->correlation_id,
                            eventContractVersion: (int) $row->payload_version,
                            payloadContractVersion: (int) $row->payload_version,
                            supportedEventContractVersion: $handler->supportedContractVersion(),
                        );
                        if ($ack === 'gap') {
                            throw new \RuntimeException('INBOX_STREAM_GAP');
                        }
                        if ($ack !== 'duplicate') {
                            $handler->handle([
                                'event_id' => (string) $row->event_id,
                                'event_type' => (string) $row->event_type,
                                'aggregate_type' => (string) $row->aggregate_type,
                                'aggregate_id' => (string) $row->aggregate_id,
                                'aggregate_version' => (int) $row->aggregate_version,
                                'aggregate_sequence' => (int) $row->aggregate_sequence,
                                'payload_version' => (int) $row->payload_version,
                                'payload' => $payload,
                                'correlation_id' => (string) $row->correlation_id,
                            ]);
                            $this->inbox->acknowledge($consumerName, (string) $row->event_id);
                        }
                    }
                    DB::table('outbox_messages')->where('id', $id)->update([
                        'status' => 'published', 'published_at' => now(), 'last_error' => null, 'updated_at' => now(),
                    ]);

                    return 'published';
                });
                match ($result) {
                    'published' => $published++,
                    'parked' => $parked++,
                    'skipped', 'blocked' => null,
                    default => null,
                };
            } catch (Throwable $error) {
                $row = DB::table('outbox_messages')->where('id', $id)->first();
                if ($row !== null && in_array($row->status, ['pending', 'failed'], true)) {
                    $this->fail((string) $id, $error->getMessage(), (int) $row->attempt_count);
                    $failed++;
                }
            }
        }

        return new OutboxDispatchResult($published, $failed, $parked);
    }

    /**
     * @param  list<string>  $eventTypes
     */
    private function hasUnacknowledgedPrevious(string $consumer, array $eventTypes, object $row): bool
    {
        return DB::table('outbox_messages as previous')
            ->leftJoin('inbox_messages as inbox', function (JoinClause $join) use ($consumer): void {
                $join->on('inbox.source_event_id', '=', 'previous.event_id')
                    ->where('inbox.consumer', '=', $consumer);
            })
            ->where('previous.aggregate_type', $row->aggregate_type)
            ->where('previous.aggregate_id', $row->aggregate_id)
            ->where('previous.aggregate_sequence', '<', $row->aggregate_sequence)
            ->whereIn('previous.event_type', $eventTypes)
            ->where(fn ($query) => $query->whereNull('inbox.id')->orWhereNotIn('inbox.status', ['processed', 'unsupported']))
            ->exists();
    }

    /**
     * @param  list<string>  $eventTypes
     */
    private function deliverySequence(array $eventTypes, object $row): int
    {
        return (int) DB::table('outbox_messages')
            ->where('aggregate_type', $row->aggregate_type)
            ->where('aggregate_id', $row->aggregate_id)
            ->where('aggregate_sequence', '<=', $row->aggregate_sequence)
            ->whereIn('event_type', $eventTypes)
            ->count();
    }

    private function fail(string $id, string $error, int $attempts): void
    {
        $attempts++;
        DB::table('outbox_messages')->where('id', $id)->update([
            'attempt_count' => $attempts,
            'status' => $attempts >= $this->maxAttempts ? 'dead_letter' : 'failed',
            'last_error' => $error,
            'next_attempt_at' => now()->addSeconds(min(3600, 2 ** min($attempts, 10))),
            'updated_at' => now(),
        ]);
    }

    private function park(string $id, string $reason): void
    {
        DB::table('outbox_messages')->where('id', $id)->update([
            'status' => 'dead_letter',
            'last_error' => $reason,
            'updated_at' => now(),
        ]);
    }
}

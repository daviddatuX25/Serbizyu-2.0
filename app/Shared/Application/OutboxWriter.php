<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

final class OutboxWriter
{
    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws JsonException
     */
    public function enqueue(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        array $payload,
        string $correlationId,
        ?string $auditEventId = null,
        ?string $eventId = null,
        int $payloadVersion = 1,
    ): string {
        return DB::transaction(function () use ($eventType, $aggregateType, $aggregateId, $payload, $correlationId, $auditEventId, $eventId, $payloadVersion): string {
            $id = (string) Str::uuid7();
            $now = now();
            DB::table('outbox_streams')->insertOrIgnore([
                'aggregate_type' => $aggregateType,
                'aggregate_id' => $aggregateId,
                'last_sequence' => 0,
            ]);
            $stream = DB::table('outbox_streams')
                ->where('aggregate_type', $aggregateType)
                ->where('aggregate_id', $aggregateId)
                ->lockForUpdate()
                ->first();
            $sequence = (int) $stream->last_sequence + 1;
            DB::table('outbox_streams')
                ->where('aggregate_type', $aggregateType)
                ->where('aggregate_id', $aggregateId)
                ->update(['last_sequence' => $sequence]);
            DB::table('outbox_messages')->insert([
                'id' => $id,
                'aggregate_sequence' => $sequence,
                'aggregate_version' => $sequence,
                'event_id' => $eventId ?? $auditEventId ?? $id,
                'event_type' => $eventType,
                'aggregate_type' => $aggregateType,
                'aggregate_id' => $aggregateId,
                'audit_event_id' => $auditEventId,
                'payload_version' => $payloadVersion,
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
                'status' => 'pending',
                'attempt_count' => 0,
                'next_attempt_at' => $now,
                'last_error' => null,
                'published_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return $id;
        });
    }
}

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
        $id = (string) Str::uuid7();
        $now = now();

        DB::table('outbox_messages')->insert([
            'id' => $id,
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
    }
}

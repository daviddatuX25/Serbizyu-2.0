<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

final class InboxConsumer
{
    /**
     * Record an inbound event for ordered consumption.
     *
     * @param  array<string, mixed>  $payload
     * @return 'duplicate'|'gap'|'recorded'
     *
     * @throws JsonException
     * @throws KernelException
     */
    public function record(
        string $consumer,
        string $sourceEventId,
        string $aggregateType,
        string $aggregateId,
        int $aggregateVersion,
        int $aggregateSequence,
        array $payload,
        string $correlationId,
        int $eventContractVersion = 1,
        int $payloadContractVersion = 1,
        int $supportedEventContractVersion = 1,
    ): string {
        if ($eventContractVersion > $supportedEventContractVersion) {
            $this->insert(
                consumer: $consumer,
                sourceEventId: $sourceEventId,
                aggregateType: $aggregateType,
                aggregateId: $aggregateId,
                aggregateVersion: $aggregateVersion,
                aggregateSequence: $aggregateSequence,
                payload: $payload,
                correlationId: $correlationId,
                eventContractVersion: $eventContractVersion,
                payloadContractVersion: $payloadContractVersion,
                status: 'unsupported',
                errorCode: 'UNSUPPORTED_EVENT_VERSION',
            );

            throw new KernelException(
                'UNSUPPORTED_EVENT_VERSION',
                'The event contract version is not supported by this consumer.',
                $correlationId,
                status: 422,
            );
        }

        $maxProcessed = (int) (DB::table('inbox_messages')
            ->where('consumer', $consumer)
            ->where('aggregate_type', $aggregateType)
            ->where('aggregate_id', $aggregateId)
            ->whereIn('status', ['processed', 'processing', 'received'])
            ->max('aggregate_sequence') ?? 0);

        $expectedNext = $maxProcessed + 1;
        $status = $aggregateSequence > $expectedNext ? 'gap' : 'received';
        $prior = $aggregateSequence > 0 ? $aggregateSequence - 1 : null;

        if ($this->isDuplicate($consumer, $sourceEventId)) {
            return 'duplicate';
        }

        $this->insert(
            consumer: $consumer,
            sourceEventId: $sourceEventId,
            aggregateType: $aggregateType,
            aggregateId: $aggregateId,
            aggregateVersion: $aggregateVersion,
            aggregateSequence: $aggregateSequence,
            payload: $payload,
            correlationId: $correlationId,
            eventContractVersion: $eventContractVersion,
            payloadContractVersion: $payloadContractVersion,
            status: $status,
            priorSequence: $prior,
        );

        return $status === 'gap' ? 'gap' : 'recorded';
    }

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws JsonException
     */
    private function insert(
        string $consumer,
        string $sourceEventId,
        string $aggregateType,
        string $aggregateId,
        int $aggregateVersion,
        int $aggregateSequence,
        array $payload,
        string $correlationId,
        int $eventContractVersion,
        int $payloadContractVersion,
        string $status,
        ?string $errorCode = null,
        ?int $priorSequence = null,
    ): void {
        $encoded = json_encode($payload, JSON_THROW_ON_ERROR);

        DB::table('inbox_messages')->insert([
            'id' => (string) Str::uuid7(),
            'consumer' => $consumer,
            'source_event_id' => $sourceEventId,
            'aggregate_type' => $aggregateType,
            'aggregate_id' => $aggregateId,
            'aggregate_version' => $aggregateVersion,
            'aggregate_sequence' => $aggregateSequence,
            'event_contract_version' => $eventContractVersion,
            'payload_contract_version' => $payloadContractVersion,
            'payload_hash' => hash('sha256', $encoded),
            'payload' => $encoded,
            'status' => $status,
            'attempts' => 0,
            'prior_sequence' => $priorSequence,
            'processed_at' => null,
            'next_attempt_at' => null,
            'error_code' => $errorCode,
            'correlation_id' => $correlationId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function isDuplicate(string $consumer, string $sourceEventId): bool
    {
        return DB::table('inbox_messages')
            ->where('consumer', $consumer)
            ->where('source_event_id', $sourceEventId)
            ->exists();
    }
}

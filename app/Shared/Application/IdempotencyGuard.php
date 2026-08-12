<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

final class IdempotencyGuard
{
    /**
     * Begin or replay an idempotent command. Caller MUST already be inside a DB transaction.
     *
     * @param  array<string, mixed>  $fingerprint
     *
     * @throws KernelException
     * @throws JsonException
     */
    public function begin(
        string $scope,
        string $key,
        array $fingerprint,
        string $correlationId,
        ?string $actorUserId,
        int $ttlHours = 24,
    ): IdempotencyReservation {
        $requestHash = hash('sha256', json_encode($fingerprint, JSON_THROW_ON_ERROR));

        $existing = DB::table('idempotency_keys')
            ->where('scope', $scope)
            ->where('key', $key)
            ->lockForUpdate()
            ->first();

        if ($existing !== null) {
            if ((string) $existing->request_hash !== $requestHash) {
                throw new KernelException(
                    'IDEMPOTENCY_KEY_REUSED',
                    'That idempotency key was already used for a different request.',
                    $correlationId,
                    status: 409,
                );
            }

            if ((string) $existing->status === 'succeeded' && $existing->response_payload !== null) {
                $replayed = json_decode((string) $existing->response_payload, true);
                if (is_array($replayed)) {
                    ksort($replayed);

                    return new IdempotencyReservation($existing, isReplay: true, replayPayload: $replayed);
                }
            }

            if ((string) $existing->status === 'succeeded') {
                return new IdempotencyReservation($existing, isReplay: true, replayPayload: null);
            }

            return new IdempotencyReservation($existing, isReplay: false);
        }

        $id = (string) Str::uuid7();
        DB::table('idempotency_keys')->insert([
            'id' => $id,
            'scope' => $scope,
            'key' => $key,
            'actor_user_id' => $actorUserId,
            'request_hash' => $requestHash,
            'response_event_id' => null,
            'response_reference' => null,
            'status' => 'in_progress',
            'expires_at' => now()->addHours($ttlHours),
            'correlation_id' => $correlationId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('idempotency_keys')->where('id', $id)->lockForUpdate()->first();

        return new IdempotencyReservation($row, isReplay: false);
    }

    /**
     * @param  array<string, mixed>  $responsePayload
     *
     * @throws JsonException
     */
    public function succeed(
        object $row,
        array $responsePayload,
        ?string $responseEventId = null,
        ?string $responseReference = null,
        int $responseStatus = 200,
    ): void {
        ksort($responsePayload);

        DB::table('idempotency_keys')->where('id', $row->id)->update([
            'status' => 'succeeded',
            'response_event_id' => $responseEventId,
            'response_reference' => $responseReference,
            'response_status' => $responseStatus,
            'response_payload' => json_encode($responsePayload, JSON_THROW_ON_ERROR),
            'fingerprint_version' => 1,
            'updated_at' => now(),
        ]);
    }

    public function fail(object $row): void
    {
        DB::table('idempotency_keys')->where('id', $row->id)->update([
            'status' => 'failed',
            'updated_at' => now(),
        ]);
    }
}

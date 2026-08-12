<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

final class AuditRecorder
{
    /**
     * @param  array<string, mixed>|null  $previous
     * @param  array<string, mixed>|null  $next
     *
     * @throws JsonException
     */
    public function record(
        string $action,
        string $targetType,
        string $targetId,
        string $correlationId,
        ActorContext $actor,
        ?string $idempotencyKeyId = null,
        ?string $commandName = null,
        ?int $expectedVersion = null,
        ?array $previous = null,
        ?array $next = null,
        ?string $reason = null,
        ?string $orderId = null,
        ?string $paymentObligationId = null,
    ): string {
        $id = (string) Str::uuid7();
        $now = now();

        DB::table('audit_events')->insert([
            'id' => $id,
            'actor_user_id' => $actor->actorUserId,
            'acting_for_user_id' => $actor->actingForUserId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'order_id' => $orderId,
            'payment_obligation_id' => $paymentObligationId,
            'idempotency_key_id' => $idempotencyKeyId,
            'migration_checkpoint_id' => null,
            'previous_value_summary' => $previous === null ? null : json_encode($previous, JSON_THROW_ON_ERROR),
            'new_value_summary' => $next === null ? null : json_encode($next, JSON_THROW_ON_ERROR),
            'reason' => $reason,
            'command_name' => $commandName,
            'expected_version' => $expectedVersion,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'created_at' => $now,
        ]);

        return $id;
    }
}

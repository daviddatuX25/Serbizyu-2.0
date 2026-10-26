<?php

declare(strict_types=1);

namespace App\Modules\Operations\Infrastructure;

use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class DatabaseNotificationsAdapter implements NotificationsPort
{
    public function __construct(private readonly OutboxWriter $outbox) {}

    public function recordIntent(NotificationIntent $intent): string
    {
        if (DB::transactionLevel() < 1) {
            throw new RuntimeException('Notification intents must be recorded inside their source transaction.');
        }

        $id = (string) Str::uuid7();
        $now = now();
        $payload = [
            'attention' => $intent->attention->value,
            'title' => $intent->title,
            'body' => $intent->body,
            'action_url' => $intent->actionUrl,
        ];
        DB::selectOne(
            'SELECT pg_advisory_xact_lock(hashtext(?))',
            [$intent->recipientUserId.'|'.$intent->idempotencyKey],
        );
        $existing = DB::table('notifications')
            ->where('recipient_user_id', $intent->recipientUserId)
            ->where('idempotency_key', $intent->idempotencyKey)
            ->first();

        if ($existing !== null) {
            $existingPayload = is_string($existing->payload) ? json_decode($existing->payload, true) : (array) $existing->payload;
            $expectedPayload = $payload;
            ksort($existingPayload);
            ksort($expectedPayload);
            $sameIntent = (string) $existing->event_source_type === $intent->eventSourceType
                && (string) $existing->event_source_id === $intent->eventSourceId
                && (string) $existing->event_type === $intent->eventType
                && (string) $existing->correlation_id === $intent->correlationId
                && $existingPayload === $expectedPayload;

            if (! $sameIntent) {
                throw new RuntimeException('Notification idempotency key was reused with different intent content.');
            }

            return (string) $existing->id;
        }
        DB::table('notifications')->insert([
            'id' => $id,
            'recipient_user_id' => $intent->recipientUserId,
            'event_source_type' => $intent->eventSourceType,
            'attention' => $intent->attention->value,
            'event_source_id' => $intent->eventSourceId,
            'event_type' => $intent->eventType,
            'priority' => $intent->attention->value,
            'status' => 'pending',
            'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => $intent->idempotencyKey,
            'correlation_id' => $intent->correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->outbox->enqueue(
            'notification.intent.recorded',
            'notification',
            $id,
            ['notification_id' => $id],
            $intent->correlationId,
            eventId: $id,
        );

        return $id;
    }
}

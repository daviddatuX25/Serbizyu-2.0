<?php

declare(strict_types=1);

namespace App\Modules\Operations\Application;

use App\Shared\Application\OutboxConsumerHandler;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class InAppNotificationHandler implements OutboxConsumerHandler
{
    public function consumerName(): string
    {
        return 'operations.in_app_notifications';
    }

    public function eventType(): string
    {
        return 'notification.intent.recorded';
    }

    public function supportedContractVersion(): int
    {
        return 1;
    }

    public function handle(array $envelope): void
    {
        $notificationId = $envelope['payload']['notification_id'] ?? null;
        if (! is_string($notificationId) || ! is_string($envelope['correlation_id'] ?? null)) {
            throw new RuntimeException('INVALID_NOTIFICATION_EVENT');
        }

        $notification = DB::table('notifications')->where('id', $notificationId)->first();
        if ($notification === null) {
            throw new RuntimeException('NOTIFICATION_NOT_FOUND');
        }

        $existing = DB::table('notification_deliveries')
            ->where('notification_id', $notificationId)
            ->where('channel', 'in_app')
            ->where('attempt_number', 1)
            ->first();

        if ($existing !== null) {
            if ($existing->status !== 'delivered') {
                throw new RuntimeException('IN_APP_DELIVERY_ALREADY_FAILED');
            }

            return;
        }

        $now = now();
        DB::table('notification_deliveries')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'notification_id' => $notificationId,
            'channel' => 'in_app',
            'provider_reference' => null,
            'status' => 'delivered',
            'retry_count' => 0,
            'attempt_number' => 1,
            'failure_reason' => null,
            'delivered_at' => $now,
            'next_attempt_at' => null,
            'correlation_id' => (string) $envelope['correlation_id'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('notifications')->where('id', $notificationId)->update([
            'status' => 'delivered',
            'updated_at' => $now,
        ]);
    }
}

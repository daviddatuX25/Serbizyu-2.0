<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\NotificationAttention;

final readonly class NotificationIntent
{
    public function __construct(
        public string $recipientUserId,
        public string $eventSourceType,
        public string $eventSourceId,
        public string $eventType,
        public NotificationAttention $attention,
        public string $title,
        public string $body,
        public string $actionUrl,
        public string $idempotencyKey,
        public string $correlationId,
    ) {}
}

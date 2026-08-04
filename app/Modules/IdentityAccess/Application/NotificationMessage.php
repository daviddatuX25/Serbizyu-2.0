<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

final readonly class NotificationMessage
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public string $channel,
        public string $recipient,
        public string $template,
        public string $correlationId,
        public array $context = [],
    ) {}
}

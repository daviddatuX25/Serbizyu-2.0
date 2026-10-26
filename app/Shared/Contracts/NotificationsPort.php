<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use App\Shared\Application\NotificationIntent;

interface NotificationsPort
{
    /** Records an idempotent intent within its source domain transaction. */
    public function recordIntent(NotificationIntent $intent): string;
}

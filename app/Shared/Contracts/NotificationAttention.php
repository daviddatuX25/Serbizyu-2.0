<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

enum NotificationAttention: string
{
    case NeedsAction = 'needs_action';
    case Updates = 'updates';
}

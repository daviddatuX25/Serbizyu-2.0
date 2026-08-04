<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Infrastructure\Notifications;

use App\Modules\IdentityAccess\Application\Contracts\NotificationChannel;
use App\Modules\IdentityAccess\Application\DeliveryResult;
use App\Modules\IdentityAccess\Application\NotificationMessage;
use Illuminate\Support\Facades\Mail;

/**
 * Routes non-SMS notification messages through the local Mailpit SMTP capture path.
 * Not an SMS simulator.
 */
final class MailpitNotificationChannel implements NotificationChannel
{
    public function send(NotificationMessage $message): DeliveryResult
    {
        Mail::raw(
            json_encode([
                'template' => $message->template,
                'context' => $message->context,
                'correlation_id' => $message->correlationId,
            ], JSON_THROW_ON_ERROR),
            static function ($mail) use ($message): void {
                $mail->to($message->recipient)
                    ->subject('[Serbizyu] '.$message->template);
            },
        );

        return new DeliveryResult(
            accepted: true,
            provider: 'mailpit',
            evidenceClass: 'TEAM_TRAINING',
        );
    }
}

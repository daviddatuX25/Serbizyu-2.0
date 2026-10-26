<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use RuntimeException;

final class PaymentObligationError extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 409,
    ) {
        parent::__construct($message);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations;

use App\Shared\Contracts\ModuleContract;

final class Module implements ModuleContract
{
    public static function key(): string
    {
        return 'payment-obligations';
    }
}

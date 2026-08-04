<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application\Contracts;

use App\Modules\IdentityAccess\Application\DeliveryResult;
use App\Modules\IdentityAccess\Application\OtpDelivery;

interface OtpDeliveryChannel
{
    public function deliver(OtpDelivery $delivery): DeliveryResult;
}

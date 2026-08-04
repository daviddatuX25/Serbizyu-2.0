<?php

declare(strict_types=1);

namespace App\Shared\Support;

use App\Shared\Contracts\CorrelationId;

final class Correlation
{
    public static function fromRequest(?string $header): CorrelationId
    {
        try {
            return $header === null ? CorrelationId::generate() : new CorrelationId($header);
        } catch (\InvalidArgumentException) {
            return CorrelationId::generate();
        }
    }
}

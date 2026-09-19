<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

interface WorkContractRegistry
{
    public function resolveForWork(
        string $shapeCode,
        int $shapeContractVersion,
        int $payloadSchemaVersion = 1,
        string $correlationId = '',
    ): WorkContractDefinition;
}

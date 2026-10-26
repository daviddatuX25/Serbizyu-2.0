<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface AdministrativeHoldReaderPort
{
    public function hasActiveHold(string $targetKind, string $targetId): bool;
}

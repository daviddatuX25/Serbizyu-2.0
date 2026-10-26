<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface RoleCapabilityReaderPort
{
    public function hasActive(string $userId, string $roleCode): bool;
}

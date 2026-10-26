<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffAccessPort
{
    public function canAccessStaff(string $userId): bool;
}

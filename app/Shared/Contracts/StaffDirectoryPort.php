<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffDirectoryPort
{
    /** @return list<array{id:string,display_name:string,roles:list<string>}> */
    public function eligibleStaff(): array;
}

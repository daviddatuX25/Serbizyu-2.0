<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffIdentityReaderPort extends StaffDomainReaderPort
{
    /** @return array{operator: array{id:string,display_name:string,roles:list<string>}, environment:string, cohort: array{selected:string|null,options:list<string>}} */
    public function staffContext(string $staffId, ?string $cohort): array;
}

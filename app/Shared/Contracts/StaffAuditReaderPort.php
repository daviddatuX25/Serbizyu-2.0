<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffAuditReaderPort
{
    /** @param list<array{target_type:string,target_id:string}> $targets @return list<array<string,mixed>> */
    public function forTargets(array $targets): array;
}

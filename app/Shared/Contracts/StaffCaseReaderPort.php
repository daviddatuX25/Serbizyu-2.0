<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffCaseReaderPort
{
    /** @param array<string, mixed> $filters @return array<string, mixed> */
    public function inbox(string $staffId, array $filters): array;

    /** @return array<string, mixed>|null */
    public function findCase(string $referenceOrId): ?array;
}

<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffDomainReaderPort
{
    /** @param array<string, mixed> $filters @return array<string, mixed>|null */
    public function registry(string $kind, array $filters): ?array;

    /** @return array<string, mixed>|null */
    public function resolve(string $referenceOrId): ?array;

}

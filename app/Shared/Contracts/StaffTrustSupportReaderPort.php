<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffTrustSupportReaderPort extends StaffDomainReaderPort
{
    /** @param array<string, mixed> $filters @return array<string, mixed> */
    public function inbox(string $staffId, array $filters): array;

    /** @return array<string, mixed> */
    public function safeCaseWorkspace(string $caseId): array;

    /** @return list<array<string, mixed>> */
    public function casesForOrder(string $orderId): array;
}

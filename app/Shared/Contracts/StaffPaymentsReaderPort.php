<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffPaymentsReaderPort extends StaffDomainReaderPort
{
    /** @return array<string, mixed>|null */
    public function primaryRailForOrder(string $orderId): ?array;

    /** @return list<array<string, mixed>> */
    public function evidenceForOrder(string $orderId): array;
}

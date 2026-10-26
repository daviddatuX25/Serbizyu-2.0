<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffDealChainsReaderPort extends StaffDomainReaderPort
{
    /** @return list<string> Current child Order UUIDs, excluding withdrawn and superseded Needs. */
    public function currentChildOrderIds(string $dealChainId): array;
}

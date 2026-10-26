<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface DealChainCurrentChildrenPort
{
    /** @return list<string> confirmed child Order IDs for Needs that remain current */
    public function currentConfirmedOrderIds(string $dealChainId): array;

    /** Serialize review eligibility with current-Need withdrawal/replacement within the caller transaction. */
    public function lockReviewChain(string $dealChainId): bool;
}

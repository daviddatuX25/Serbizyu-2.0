<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface PaymentConversationEvidencePort
{
    /** @param list<string> $orderIds @return list<string> */
    public function relatedEvidenceIds(array $orderIds, string $ownerUserId): array;
}

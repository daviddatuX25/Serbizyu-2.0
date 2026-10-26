<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/** Read-only current primary-obligation snapshot from PaymentObligations. */
interface DealChildFinancialStatePort
{
    /** @return array{obligation_id:string,obligation_status:string,settled_at:string|null,claimed:bool,settled:bool}|null */
    public function forDealChild(string $orderId): ?array;
}

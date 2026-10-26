<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface DealCourierReconciliationPort
{
    /**
     * Open or return the active reconciliation case for this exact old courier child.
     * Caller must already own the withdrawal transaction.
     */
    public function openUncollectedCourierWithdrawalCase(
        string $orderId,
        string $workInstanceId,
        ?string $paymentObligationId,
        string $reporterUserId,
        string $requesterUserId,
        string $correlationId,
    ): string;
}

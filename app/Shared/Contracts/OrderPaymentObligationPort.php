<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Forms the primary payment obligation during the caller-owned Order transaction.
 *
 * PaymentObligations owns the implementation; OrdersWork supplies the immutable
 * Order, Work, amount, and party projection needed for the obligation.
 */
interface OrderPaymentObligationPort
{
    /**
     * Create the primary consideration obligation for an accepted Order.
     *
     * The caller MUST already be inside the outer formation transaction. This
     * method MUST NOT commit independently.
     */
    public function createPrimary(
        string $orderId,
        string $workInstanceId,
        int $amountMinor,
        string $currency,
        string $payerUserId,
        string $recipientUserId,
        string $correlationId,
        string $lane = 'external_cash',
    ): string;
}

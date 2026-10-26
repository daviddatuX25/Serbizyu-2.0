<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface PaymentMismatchCasePort
{
    /**
     * @param array{
     *   obligation_id: string,
     *   order_id: string,
     *   work_instance_id: ?string,
     *   amount_minor: int,
     *   reported_amount_minor: int,
     *   currency: string,
     *   lane: string
     * } $obligation
     */
    public function openPaymentMismatch(
        array $obligation,
        int $reportedAmountMinor,
        string $reporterUserId,
        string $correlationId,
    ): string;

    /** @return array{obligation_id: string, lane: 'external_cash'|'p2p_transfer'} */
    public function resolvePaymentMismatchCase(
        string $caseId,
        string $staffUserId,
        string $resolution,
        string $correlationId,
    ): array;
}

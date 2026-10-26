<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use App\Shared\Application\KernelException;

/**
 * Durable Deal Chain predecessor gates shared by OrdersWork and DealCoordination.
 */
interface DealWorkGatePort
{
    /**
     * Rejects Work advancement while an active confirmed predecessor dependency is blocked.
     *
     * @throws KernelException When a current predecessor milestone has not been received.
     */
    public function assertWorkCanAdvance(string $workInstanceId, string $correlationId): void;

    /**
     * Materializes current active predecessor gates as part of confirmed child Work formation.
     */
    public function registerConfirmedNeedWork(
        string $dealChainId,
        string $dealNeedId,
        string $orderId,
        string $workInstanceId,
        string $correlationId,
    ): void;

    /** Stales gates bound to a Need epoch being withdrawn or replaced. */
    public function invalidateNeedEpoch(string $dealChainId, string $dealNeedId, string $correlationId): void;
}

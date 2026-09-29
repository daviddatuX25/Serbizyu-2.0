<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Transaction-bound collaboration port between OrdersWork and DealCoordination.
 *
 * Allows OrdersWork to lock and validate a Deal Need and mark it in_progress
 * without OrdersWork directly mutating DealCoordination tables.
 */
interface DealNeedOrderLinkPort
{
    /**
     * @return array{deal_chain_id: string, deal_need_id: string, coordinator_user_id: string, status: string, version: int}
     */
    public function lockEligibleNeed(string $dealChainId, string $dealNeedId, string $correlationId): array;

    /**
     * Advances the Need and Chain to in_progress upon successful child order formation.
     */
    public function markChildFormed(string $dealChainId, string $dealNeedId, string $orderId, string $correlationId): void;
}

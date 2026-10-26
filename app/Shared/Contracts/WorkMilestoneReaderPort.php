<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface WorkMilestoneReaderPort
{
    /** @return array{order_id: string, deal_chain_id: string|null, deal_need_id: string|null}|null */
    public function dealNeedWorkForInstance(string $workInstanceId): ?array;

    /** @return array{work_instance_id: string, deal_chain_id: string|null, deal_need_id: string|null}|null */
    public function workForOrder(string $orderId): ?array;

    /**
     * Validates an A4 readiness or authorized recipient receipt against persisted Work records.
     *
     * @param  array<string, mixed>  $payload
     */
    public function isPersistedSourceMilestone(
        string $eventType,
        string $workInstanceId,
        string $orderId,
        string $transferId,
        array $payload,
    ): bool;
}

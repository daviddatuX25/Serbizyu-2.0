<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Forms an atomic child Order agreement for a Deal Chain Need.
 *
 * OrdersWork owns the implementation; DealCoordination or caller-owned formation
 * invokes this port with validated Chain, Need, and acceptance details.
 */
interface ChildOrderFormationPort
{
    /**
     * @param  array{
     *     deal_chain_id: string,
     *     deal_need_id: string,
     *     listing_id: string,
     *     buyer_user_id: string,
     *     provider_user_id: string,
     *     amount_minor: int,
     *     currency?: string,
     *     quantity?: int,
     *     lane?: string,
     *     expected_listing_version?: int,
     * }  $params
     * @return array{
     *     order_id: string,
     *     status: string,
     *     deal_chain_id: string,
     *     deal_need_id: string,
     *     work_instance_id: string|null,
     *     payment_obligation_id: string|null,
     *     version: int,
     * }
     */
    public function formChildOrder(
        string $actorUserId,
        array $params,
        string $idempotencyKey,
        string $correlationId,
    ): array;
}

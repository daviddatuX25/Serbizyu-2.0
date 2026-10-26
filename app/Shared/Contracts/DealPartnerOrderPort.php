<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/** OrdersWork-owned atomic authority for withdrawing one Deal Chain child agreement. */
interface DealPartnerOrderPort
{
    /**
     * Read-only snapshot scoped to a Deal Need.
     *
     * @return array{order_id:string,work_instance_id:string,order_version:int,order_status:string,work_status:string,work_shape:string,provider_user_id:string,buyer_user_id:string,irreversible_custody:bool,financial_state:?string,financial_claimed:?bool,financial_settled:?bool}|null
     */
    public function withdrawalSnapshot(string $dealChainId, string $dealNeedId, array $linkedProductOrderIds = []): ?array;

    /**
     * Cancel only the current child after rechecking work state and linked custody under lock.
     * Started courier Work without transferred custody is preserved for reconciliation; the order and
     * obligation are not split, refunded, or settled. Must run inside the caller's transaction.
     *
     * @param list<string> $linkedProductOrderIds exact product children linked to this courier Need
     */
    public function cancelUnstartedChild(
        string $dealChainId,
        string $dealNeedId,
        array $linkedProductOrderIds,
        bool $allowUncollectedCourierWork,
        string $actorUserId,
        string $requesterUserId,
        int $expectedOrderVersion,
        string $correlationId,
    ): void;
}

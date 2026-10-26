<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/** OrdersWork-owned order facts needed to enforce review eligibility. */
interface ReviewOrderReaderPort
{
    /** @return array{deal_chain_id:string|null}|null order row with immutable chain context; this lookup does not lock */
    public function dealChainIdForOrder(string $orderId): ?array;

    /** @return array{order_id:string,buyer_user_id:string,provider_user_id:string,deal_chain_id:string|null,status:string}|null locked order snapshot */
    public function findOrderForUpdate(string $orderId): ?array;

    /** @param list<string> $orderIds
     * @return list<array{order_id:string,buyer_user_id:string,provider_user_id:string,deal_chain_id:string|null,status:string}> locked completed child order snapshots
     */
    public function completedDealChainChildrenForUpdate(array $orderIds, string $dealChainId, string $buyerUserId): array;
}

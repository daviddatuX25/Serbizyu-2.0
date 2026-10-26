<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface OrderConversationScopePort
{
    /**
     * @return array{order_id:string,buyer_user_id:string,provider_user_id:string,status:string,public_reference:string}|null
     */
    public function findForConversation(string $orderId): ?array;

    /**
     * Current confirmed relay child Orders remain conversation participants through completion.
     *
     * @param list<string> $orderIds
     * @return list<array{order_id:string,buyer_user_id:string,provider_user_id:string,public_reference:string,status:string}>
     */
    public function currentRelayOrderDetails(array $orderIds): array;
}

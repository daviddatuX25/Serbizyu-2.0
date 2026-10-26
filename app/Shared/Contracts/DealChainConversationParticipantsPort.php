<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface DealChainConversationParticipantsPort
{
    /**
     * Current formed relay principals and exact current child Orders.
     *
     * @return array{coordinator_user_id:string,provider_user_ids:list<string>,current_order_ids:list<string>}|null
     */
    public function currentRelayParticipants(string $dealChainId): ?array;
}

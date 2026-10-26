<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\DealChainConversationParticipantsPort;
use App\Shared\Contracts\DealChainCurrentChildrenPort;
use App\Shared\Contracts\OrderConversationScopePort;
use Illuminate\Support\Facades\DB;

final class DealChainConversationParticipantsReader implements DealChainConversationParticipantsPort
{
    public function __construct(
        private readonly DealChainCurrentChildrenPort $currentChildren,
        private readonly OrderConversationScopePort $orders,
    ) {}
    public function currentRelayParticipants(string $dealChainId): ?array
    {
        $chainQuery = DB::table('deal_chains')->where('id', $dealChainId);
        if (DB::transactionLevel() > 0) {
            $chainQuery->lockForUpdate();
        }
        $chain = $chainQuery->first(['coordinator_user_id']);

        if ($chain === null) {
            return null;
        }

        $currentOrderIds = $this->currentChildren->currentConfirmedOrderIds($dealChainId);
        $providerIds = [];
        $formedOrderIds = [];
        if ($currentOrderIds !== []) {
            foreach ($this->orders->currentRelayOrderDetails($currentOrderIds) as $order) {
                $providerIds[] = $order['provider_user_id'];
                $formedOrderIds[] = $order['order_id'];
            }
        }

        return [
            'coordinator_user_id' => (string) $chain->coordinator_user_id,
            'provider_user_ids' => array_values(array_unique($providerIds)),
            'current_order_ids' => array_values(array_unique($formedOrderIds)),
        ];
    }
}

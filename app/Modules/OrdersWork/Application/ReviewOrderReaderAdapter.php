<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\ReviewOrderReaderPort;
use Illuminate\Support\Facades\DB;

final class ReviewOrderReaderAdapter implements ReviewOrderReaderPort
{
    public function dealChainIdForOrder(string $orderId): ?array
    {
        $order = DB::table('orders')->where('id', $orderId)->first(['deal_chain_id']);

        return $order === null
            ? null
            : ['deal_chain_id' => $order->deal_chain_id === null ? null : (string) $order->deal_chain_id];
    }

    public function findOrderForUpdate(string $orderId): ?array
    {
        $query = DB::table('orders')->where('id', $orderId);
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }
        $order = $query->first(['id', 'buyer_user_id', 'provider_user_id', 'deal_chain_id', 'status']);

        return $order === null ? null : $this->snapshot($order);
    }

    public function completedDealChainChildrenForUpdate(array $orderIds, string $dealChainId, string $buyerUserId): array
    {
        if ($orderIds === []) {
            return [];
        }

        $query = DB::table('orders')
            ->whereIn('id', array_values(array_unique($orderIds)))
            ->where('deal_chain_id', $dealChainId)
            ->where('buyer_user_id', $buyerUserId)
            ->where('status', 'completed')
            ->orderBy('id');
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }

        return $query->get(['id', 'buyer_user_id', 'provider_user_id', 'deal_chain_id', 'status'])
            ->map(fn (object $order): array => $this->snapshot($order))
            ->all();
    }

    /** @return array{order_id:string,buyer_user_id:string,provider_user_id:string,deal_chain_id:string|null,status:string} */
    private function snapshot(object $order): array
    {
        return [
            'order_id' => (string) $order->id,
            'buyer_user_id' => (string) $order->buyer_user_id,
            'provider_user_id' => (string) $order->provider_user_id,
            'deal_chain_id' => $order->deal_chain_id === null ? null : (string) $order->deal_chain_id,
            'status' => (string) $order->status,
        ];
    }
}

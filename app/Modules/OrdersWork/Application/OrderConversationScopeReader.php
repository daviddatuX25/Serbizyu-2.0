<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\OrderConversationScopePort;
use Illuminate\Support\Facades\DB;

final class OrderConversationScopeReader implements OrderConversationScopePort
{
    public function findForConversation(string $orderId): ?array
    {
        $query = DB::table('orders')->where('id', $orderId);
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }
        $order = $query->first(['id', 'buyer_user_id', 'provider_user_id', 'status', 'public_reference']);
        if ($order === null) {
            return null;
        }

        return [
            'order_id' => (string) $order->id,
            'buyer_user_id' => (string) $order->buyer_user_id,
            'provider_user_id' => (string) $order->provider_user_id,
            'status' => (string) $order->status,
            'public_reference' => (string) $order->public_reference,
        ];
    }

    public function currentRelayOrderDetails(array $orderIds): array
    {
        if ($orderIds === []) {
            return [];
        }

        $query = DB::table('orders')
            ->whereIn('id', $orderIds)
            ->whereIn('status', ['accepted', 'in_progress', 'scheduled', 'completed'])
            ->orderBy('id');
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }

        return $query->get(['id', 'buyer_user_id', 'provider_user_id', 'public_reference', 'status'])
            ->map(static fn (object $order): array => [
                'order_id' => (string) $order->id,
                'buyer_user_id' => (string) $order->buyer_user_id,
                'provider_user_id' => (string) $order->provider_user_id,
                'public_reference' => (string) $order->public_reference,
                'status' => (string) $order->status,
            ])
            ->all();
    }
}

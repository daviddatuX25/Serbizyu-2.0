<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\OrderReferenceReaderPort;
use Illuminate\Support\Facades\DB;

final class OrderReferenceReaderAdapter implements OrderReferenceReaderPort
{
    public function referencesForOrders(array $orderIds): array
    {
        if ($orderIds === []) {
            return [];
        }

        return DB::table('orders')
            ->whereIn('id', array_values(array_unique($orderIds)))
            ->orderBy('public_reference')
            ->pluck('public_reference', 'id')
            ->map(static fn (mixed $reference): string => (string) $reference)
            ->all();
    }

    public function activeReferencesForOrders(array $orderIds): array
    {
        if ($orderIds === []) {
            return [];
        }

        return DB::table('orders')
            ->whereIn('id', array_values(array_unique($orderIds)))
            ->whereIn('status', ['proposed', 'accepted', 'in_progress'])
            ->orderBy('public_reference')
            ->pluck('public_reference', 'id')
            ->map(static fn (mixed $reference): string => (string) $reference)
            ->all();
    }

    public function activeOrderDetailsForOrders(array $orderIds): array
    {
        if ($orderIds === []) {
            return [];
        }

        return DB::table('orders')
            ->whereIn('id', array_values(array_unique($orderIds)))
            ->whereIn('status', ['accepted', 'in_progress'])
            ->orderBy('public_reference')
            ->get(['id', 'provider_user_id', 'buyer_user_id', 'public_reference'])
            ->map(static fn (object $order): array => [
                'order_id' => (string) $order->id,
                'provider_user_id' => (string) $order->provider_user_id,
                'buyer_user_id' => (string) $order->buyer_user_id,
                'public_reference' => (string) $order->public_reference,
            ])
            ->all();
    }
}

<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface OrderReferenceReaderPort
{
    /** @param list<string> $orderIds
     * @return array<string, string> order id to public reference
     */
    public function referencesForOrders(array $orderIds): array;

    /** @param list<string> $orderIds
     * @return array<string, string> active order id to public reference
     */
    public function activeReferencesForOrders(array $orderIds): array;

    /**
     * @param list<string> $orderIds
     * @return list<array{order_id: string, provider_user_id: string, buyer_user_id: string, public_reference: string}>
     */
    public function activeOrderDetailsForOrders(array $orderIds): array;
}

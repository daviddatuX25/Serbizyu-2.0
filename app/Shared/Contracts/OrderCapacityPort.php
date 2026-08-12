<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Capacity holds for Order formation — implemented by Listings, consumed by OrdersWork.
 */
interface OrderCapacityPort
{
    /**
     * @return array{id: string, listing_id: string, listing_version_id: string, remaining_quantity: int}|null
     */
    public function findOpenQuantityBucket(string $listingId, string $listingVersionId): ?array;

    /**
     * @return array{reservation_id: string, status: string, quantity: int, remaining_quantity: int, replay: bool}
     */
    public function hold(
        string $listingCapacityId,
        int $quantity,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function commit(string $reservationId, string $correlationId): array;

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function release(string $reservationId, string $correlationId): array;
}

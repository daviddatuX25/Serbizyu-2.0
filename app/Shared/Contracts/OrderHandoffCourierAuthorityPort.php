<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/** Narrow authority check for a courier formed as an active Deal Chain participant. */
interface OrderHandoffCourierAuthorityPort
{
    /**
     * @return list<array{user_id: string, order_id: string, public_reference: string}>
     */
    public function activeCourierCandidatesForProductNeed(string $dealChainId, string $productNeedId): array;

    public function isAuthorizedCourier(string $dealChainId, string $productNeedId, string $courierUserId): bool;
}

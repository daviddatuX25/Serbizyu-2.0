<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface AdministrativePaymentVersionPort
{
    /** @return array{version:int,order_id:string}|null */
    public function lockTarget(string $obligationId): ?array;
    /** @return array{version:int,order_id:string}|null */
    public function readTarget(string $obligationId): ?array;

    /** @return list<array{id:string,version:int,order_id:string}> */
    public function targetsForOrder(string $orderId): array;
}

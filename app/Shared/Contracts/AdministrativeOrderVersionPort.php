<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface AdministrativeOrderVersionPort
{
    /** @return array{version:int,order_id:string}|null */
    public function lockTarget(string $orderId): ?array;
    /** @return array{version:int,order_id:string}|null */
    public function readTarget(string $orderId): ?array;
}

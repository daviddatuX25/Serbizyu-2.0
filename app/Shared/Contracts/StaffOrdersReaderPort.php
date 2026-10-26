<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffOrdersReaderPort extends StaffDomainReaderPort
{
    /** @return list<array{id:string,label:string,kind:string,status:string,created_at:string,facts?:list<array{label:string,value:string}>}> */
    public function evidenceForOrder(string $orderId): array;
}

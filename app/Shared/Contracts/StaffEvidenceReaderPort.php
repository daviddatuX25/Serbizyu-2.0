<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface StaffEvidenceReaderPort
{
    /** @param list<string> $evidenceFileIds @return list<array{id:string,label:string,kind:string,status:string,created_at:string,facts?:list<array{label:string,value:string}>}> */
    public function metadataForIds(array $evidenceFileIds): array;
}

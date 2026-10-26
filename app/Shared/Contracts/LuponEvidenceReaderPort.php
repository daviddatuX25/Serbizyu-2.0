<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface LuponEvidenceReaderPort
{
    /** @param list<string> $evidenceFileIds
     *  @return list<array{id:string,owner_user_id:string,name:string,mime_type:string,storage_key:string,size_bytes:int,sha256:string,evidence_type:string,created_at:string}>
     */
    public function cleanPrivateFiles(array $evidenceFileIds): array;

    /** @param list<string> $evidenceFileIds
     *  @return list<array{id:string,reason:?string}>
     */
    public function availabilityFor(array $evidenceFileIds): array;
}

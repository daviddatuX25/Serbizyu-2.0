<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface PrivateEvidenceReaderPort
{
    /** @return array{id:string,name:string,mime_type:string,storage_key:string}|null */
    public function cleanPrivateFileForOwner(string $evidenceFileId, string $ownerUserId): ?array;
}

<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use Illuminate\Http\UploadedFile;

interface LuponReturnedPaperworkPort
{
    /** @return array{id:string,storage_key:string,media_type:string,size_bytes:int,sha256:string,filename:string} */
    public function store(UploadedFile $file, string $packetId, string $correlationId): array;

    /** @param array{id:string,storage_key:string,media_type:string,size_bytes:int,sha256:string,filename:string} $file */
    public function register(array $file, string $ownerUserId, string $correlationId): void;

    /** @return array{id:string,storage_key:string,media_type:string,size_bytes:int,sha256:string,scan_status:string,deleted_at:?string,integrity_ok:bool}|null */
    public function status(string $evidenceFileId): ?array;

    public function deleteStored(string $storageKey): void;
}

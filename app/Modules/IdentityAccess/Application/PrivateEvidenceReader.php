<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\PrivateEvidenceReaderPort;
use Illuminate\Support\Facades\DB;

final class PrivateEvidenceReader implements PrivateEvidenceReaderPort
{
    public function cleanPrivateFileForOwner(string $evidenceFileId, string $ownerUserId): ?array
    {
        $file = DB::table('evidence_files')
            ->where('id', $evidenceFileId)
            ->whereIn('visibility', ['private', 'order_parties'])
            ->where('owner_user_id', $ownerUserId)
            ->where('scan_status', 'clean')
            ->whereNull('deleted_at')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('retention_holds')
                    ->whereColumn('retention_holds.evidence_file_id', 'evidence_files.id')
                    ->where('retention_holds.status', 'active')
                    ->where('retention_holds.starts_at', '<=', now())
                    ->where(fn ($query) => $query->whereNull('retention_holds.expires_at')->orWhere('retention_holds.expires_at', '>', now()));
            })
            ->first(['id', 'storage_key', 'media_type']);
        if ($file === null) {
            return null;
        }

        return [
            'id' => (string) $file->id,
            'name' => basename((string) $file->storage_key),
            'mime_type' => (string) $file->media_type,
            'storage_key' => (string) $file->storage_key,
        ];
    }
}

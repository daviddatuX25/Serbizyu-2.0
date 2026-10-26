<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\LuponEvidenceReaderPort;
use Illuminate\Support\Facades\DB;

final class LuponEvidenceReader implements LuponEvidenceReaderPort
{
    public function cleanPrivateFiles(array $evidenceFileIds): array
    {
        $ids = array_values(array_unique(array_filter(
            $evidenceFileIds,
            static fn (mixed $id): bool => is_string($id) && $id !== '',
        )));
        if ($ids === []) {
            return [];
        }

        $heldIds = DB::table('retention_holds')
            ->whereIn('evidence_file_id', $ids)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->pluck('evidence_file_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();
        if ($heldIds !== []) {
            $held = array_fill_keys($heldIds, true);
        } else {
            $held = [];
        }

        return DB::table('evidence_files')
            ->whereIn('id', $ids)
            ->whereIn('visibility', ['private', 'order_parties'])
            ->where('scan_status', 'clean')
            ->whereNull('deleted_at')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'owner_user_id', 'storage_key', 'media_type', 'size_bytes', 'content_hash', 'evidence_type', 'created_at'])
            ->reject(static fn ($file): bool => isset($held[(string) $file->id]))
            ->map(static fn ($file): array => [
                'id' => (string) $file->id,
                'owner_user_id' => (string) $file->owner_user_id,
                'name' => basename((string) $file->storage_key),
                'mime_type' => (string) $file->media_type,
                'storage_key' => (string) $file->storage_key,
                'size_bytes' => (int) $file->size_bytes,
                'sha256' => (string) $file->content_hash,
                'evidence_type' => (string) $file->evidence_type,
                'created_at' => (string) $file->created_at,
            ])
            ->all();
    }
    public function availabilityFor(array $evidenceFileIds): array
    {
        $ids = array_values(array_unique(array_filter(
            $evidenceFileIds,
            static fn (mixed $id): bool => is_string($id) && $id !== '',
        )));
        if ($ids === []) {
            return [];
        }
        $files = DB::table('evidence_files')->whereIn('id', $ids)
            ->get(['id', 'visibility', 'scan_status', 'deleted_at'])->keyBy('id');
        $held = DB::table('retention_holds')->whereIn('evidence_file_id', $ids)
            ->where('status', 'active')->where('starts_at', '<=', now())
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->pluck('evidence_file_id')->map(static fn ($id): string => (string) $id)->all();
        $heldIds = array_fill_keys($held, true);

        return array_map(static function (string $id) use ($files, $heldIds): array {
            $file = $files->get($id);
            $reason = match (true) {
                $file === null => 'not_found',
                $file->deleted_at !== null => 'deleted',
                isset($heldIds[$id]) => 'active_retention_hold',
                ! in_array((string) $file->visibility, ['private', 'order_parties'], true) => 'not_private',
                $file->scan_status !== 'clean' => 'scan_'.$file->scan_status,
                default => null,
            };

            return ['id' => $id, 'reason' => $reason];
        }, $ids);
    }
}

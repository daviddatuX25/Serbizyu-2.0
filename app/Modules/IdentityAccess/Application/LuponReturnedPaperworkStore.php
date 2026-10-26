<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\LuponReturnedPaperworkPort;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class LuponReturnedPaperworkStore implements LuponReturnedPaperworkPort
{
    public function __construct(private readonly OutboxWriter $outbox) {}

    public function store(UploadedFile $file, string $packetId, string $correlationId): array
    {
        $size = $file->getSize();
        $path = $file->getRealPath();
        $mime = $file->getMimeType();
        $hash = is_string($path) ? hash_file('sha256', $path) : false;
        if (! is_int($size) || $size < 1 || $size > 10 * 1024 * 1024 || ! is_string($mime) || ! is_string($hash)) {
            throw new \RuntimeException('Returned paperwork could not be read safely.');
        }
        $extension = match ($mime) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
            default => throw new \RuntimeException('Unsupported returned paperwork media type.'),
        };
        $id = (string) Str::uuid7();
        $directory = "evidence/lupon/returned/{$packetId}";
        $targetKey = $directory.'/'.$id.'.'.$extension;
        try {
            $storageKey = $file->storeAs($directory, $id.'.'.$extension, 'private');
        } catch (\Throwable $exception) {
            Storage::disk('private')->delete($targetKey);
            throw $exception;
        }
        if (! is_string($storageKey) || $storageKey === '') {
            Storage::disk('private')->delete($targetKey);
            throw new \RuntimeException('Returned paperwork could not be stored privately.');
        }

        return [
            'id' => $id,
            'storage_key' => $storageKey,
            'media_type' => $mime,
            'size_bytes' => $size,
            'sha256' => $hash,
            'filename' => basename($file->getClientOriginalName()),
        ];
    }

    public function register(array $file, string $ownerUserId, string $correlationId): void
    {
        $now = now();
        DB::table('evidence_files')->insert([
            'id' => $file['id'], 'owner_user_id' => $ownerUserId, 'storage_key' => $file['storage_key'],
            'media_type' => $file['media_type'], 'size_bytes' => $file['size_bytes'], 'content_hash' => $file['sha256'],
            'evidence_type' => 'lupon_returned_paperwork', 'data_class' => 'TRUST_SUPPORT', 'scan_status' => 'quarantined',
            'visibility' => 'private', 'retention_policy' => 'case_record', 'deleted_at' => null, 'version' => 1,
            'correlation_id' => $correlationId, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->outbox->enqueue('work.evidence.scan_requested', 'evidence_file', $file['id'], ['evidence_file_id' => $file['id']], $correlationId);
    }

    public function status(string $evidenceFileId): ?array
    {
        $file = DB::table('evidence_files')->where('id', $evidenceFileId)->first(['id', 'storage_key', 'media_type', 'size_bytes', 'content_hash', 'scan_status', 'deleted_at']);
        if ($file === null) {
            return null;
        }

        $path = Storage::disk('private')->path((string) $file->storage_key);
        $actualHash = is_file($path) ? hash_file('sha256', $path) : false;
        $actualSize = is_file($path) ? filesize($path) : false;
        return [
            'id' => (string) $file->id,
            'storage_key' => (string) $file->storage_key,
            'media_type' => (string) $file->media_type,
            'size_bytes' => (int) $file->size_bytes,
            'sha256' => (string) $file->content_hash,
            'scan_status' => (string) $file->scan_status,
            'deleted_at' => $file->deleted_at === null ? null : (string) $file->deleted_at,
            'integrity_ok' => is_string($actualHash) && hash_equals((string) $file->content_hash, $actualHash) && $actualSize === (int) $file->size_bytes,
        ];
    }

    public function deleteStored(string $storageKey): void
    {
        Storage::disk('private')->delete($storageKey);
    }
}

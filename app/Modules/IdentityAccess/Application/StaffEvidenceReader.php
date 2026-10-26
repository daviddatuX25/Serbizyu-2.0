<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\StaffEvidenceReaderPort;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class StaffEvidenceReader implements StaffEvidenceReaderPort
{
    public function metadataForIds(array $evidenceFileIds): array
    {
        $ids = array_values(array_unique(array_filter($evidenceFileIds, static fn ($id): bool => is_string($id) && $id !== '')));
        if ($ids === []) return [];

        $files = DB::table('evidence_files')->whereIn('id', $ids)
            ->orderBy('created_at')->orderBy('id')
            ->get(['id', 'media_type', 'size_bytes', 'content_hash', 'evidence_type', 'data_class', 'scan_status', 'retention_policy', 'created_at']);
        if ($files->isEmpty()) return [];

        $fileIds = $files->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $now = now();
        $holds = DB::table('retention_holds')->whereIn('evidence_file_id', $fileIds)
            ->where('status', 'active')->where('starts_at', '<=', $now)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->orderBy('created_at')->orderBy('id')->get(['evidence_file_id']);
        $heldIds = array_fill_keys($holds->pluck('evidence_file_id')->map(static fn ($id): string => (string) $id)->all(), true);

        return $files->map(static function ($file) use ($heldIds): array {
            $facts = [
                ['label' => 'Evidence type', 'value' => (string) $file->evidence_type],
                ['label' => 'Media type', 'value' => (string) $file->media_type],
                ['label' => 'Size', 'value' => (string) $file->size_bytes.' bytes'],
                ['label' => 'Content hash', 'value' => (string) $file->content_hash],
                ['label' => 'Data class', 'value' => (string) $file->data_class],
                ['label' => 'Retention policy', 'value' => (string) $file->retention_policy],
                ['label' => 'Retention hold', 'value' => isset($heldIds[(string) $file->id]) ? 'Active' : 'None'],
            ];

            return [
                'id' => (string) $file->id,
                'label' => (string) $file->evidence_type,
                'kind' => (string) $file->data_class,
                'status' => (string) $file->scan_status,
                'created_at' => Carbon::parse($file->created_at)->toISOString(),
                'facts' => $facts,
            ];
        })->all();
    }
}

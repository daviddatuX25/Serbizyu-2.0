<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

final class WorkNodeEvidenceService
{
    private const MIME_EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    private const MAX_PHOTOS_PER_NODE = 8;

    /** @return array{id: string, media_type: string, size_bytes: int, scan_status: string} */
    public function uploadPhoto(
        string $orderId,
        string $nodeId,
        string $actorUserId,
        UploadedFile $file,
        string $correlationId,
    ): array {
        $mimeType = $file->getMimeType();
        $extension = is_string($mimeType) ? (self::MIME_EXTENSIONS[$mimeType] ?? null) : null;
        if ($extension === null) {
            throw new OrderError('UNSUPPORTED_MEDIA_TYPE', 'Upload a JPEG, PNG, or WebP image.', $correlationId, status: 422);
        }

        $sizeBytes = $file->getSize();
        if (! is_int($sizeBytes) || $sizeBytes < 1 || $sizeBytes > 10 * 1024 * 1024) {
            throw new OrderError('INVALID_FILE_SIZE', 'Image size must be between 1 byte and 10 MB.', $correlationId, status: 422);
        }

        $realPath = $file->getRealPath();
        $contentHash = is_string($realPath) ? hash_file('sha256', $realPath) : false;
        if (! is_string($contentHash)) {
            throw new OrderError('FILE_READ_FAILED', 'The image could not be read.', $correlationId, status: 422);
        }

        [$work, $node] = $this->activePhotoNode($orderId, $nodeId, $actorUserId, $correlationId);
        $evidenceId = (string) Str::uuid7();
        $nodePath = hash('sha256', (string) $node['id']);
        $directory = "evidence/work/{$work->id}/{$nodePath}";
        $storageKey = null;

        try {
            $storageKey = $file->storeAs($directory, $evidenceId.'.'.$extension, 'private');
            if (! is_string($storageKey) || $storageKey === '') {
                throw new OrderError('EVIDENCE_STORAGE_FAILED', 'The image could not be stored privately.', $correlationId, status: 503);
            }

            DB::transaction(function () use ($orderId, $nodeId, $actorUserId, $correlationId, $evidenceId, $storageKey, $mimeType, $sizeBytes, $contentHash, $work): void {
                [$lockedWork, $lockedNode] = $this->activePhotoNode($orderId, $nodeId, $actorUserId, $correlationId, lock: true);
                if ((string) $lockedWork->id !== (string) $work->id) {
                    throw new OrderError('WORK_NOT_FOUND', 'No Work instance exists for this order.', $correlationId, status: 404);
                }

                $now = now();
                DB::table('evidence_files')->insert([
                    'id' => $evidenceId,
                    'owner_user_id' => $actorUserId,
                    'storage_key' => $storageKey,
                    'media_type' => $mimeType,
                    'size_bytes' => $sizeBytes,
                    'content_hash' => $contentHash,
                    'evidence_type' => 'work_node_photo_proof',
                    'data_class' => 'WORK_EXECUTION',
                    'scan_status' => 'quarantined',
                    'visibility' => 'order_parties',
                    'retention_policy' => 'order_dispute_window',
                    'deleted_at' => null,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('work_events')->insert([
                    'id' => (string) Str::uuid7(),
                    'work_instance_id' => (string) $lockedWork->id,
                    'previous_status' => (string) $lockedWork->status,
                    'new_status' => (string) $lockedWork->status,
                    'event_type' => 'work.evidence.uploaded',
                    'event_version' => 1,
                    'actor_user_id' => $actorUserId,
                    'evidence_file_id' => $evidenceId,
                    'payload' => json_encode([
                        'node_id' => (string) $lockedNode['id'],
                        'tool_key' => 'photo_proof',
                        'scan_status' => 'quarantined',
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'idempotency_key' => 'work_evidence_'.substr($correlationId, 0, 12).'_'.Str::random(8),
                    'correlation_id' => $correlationId,
                    'occurred_at' => $now,
                    'effective_at' => $now,
                    'created_at' => $now,
                ]);
            });
        } catch (Throwable $exception) {
            if (is_string($storageKey)) {
                Storage::disk('private')->delete($storageKey);
            }

            throw $exception;
        }

        return [
            'id' => $evidenceId,
            'media_type' => $mimeType,
            'size_bytes' => $sizeBytes,
            'scan_status' => 'quarantined',
        ];
    }

    /** @param list<string> $evidenceFileIds */
    public function assertAvailablePhotoEvidence(
        string $workInstanceId,
        string $nodeId,
        string $actorUserId,
        array $evidenceFileIds,
        string $correlationId,
    ): void {
        if ($evidenceFileIds === []) {
            throw new OrderError('WORK_EVIDENCE_REQUIRED', 'Attach at least one available photo for this Work node.', $correlationId, status: 422);
        }
        if (count($evidenceFileIds) !== count(array_unique($evidenceFileIds))) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'The same photo cannot be attached more than once.', $correlationId, status: 422);
        }

        $expectedPrefix = 'evidence/work/'.$workInstanceId.'/'.hash('sha256', $nodeId).'/';
        $uploads = $this->uploadedEvidenceEvents($workInstanceId);
        $rows = DB::table('evidence_files')
            ->whereIn('id', $evidenceFileIds)
            ->where('owner_user_id', $actorUserId)
            ->where('evidence_type', 'work_node_photo_proof')
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
        $heldIds = $this->activeHoldIds($evidenceFileIds);

        foreach ($evidenceFileIds as $evidenceFileId) {
            $row = $rows->get($evidenceFileId);
            $upload = $uploads[$evidenceFileId] ?? null;
            if ($row === null || $upload === null || $upload['node_id'] !== $nodeId || $upload['tool_key'] !== 'photo_proof') {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'The photo is not attached to this Work node.', $correlationId, status: 422);
            }
            if (! str_starts_with((string) $row->storage_key, $expectedPrefix)) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'The photo is not attached to this Work node.', $correlationId, status: 422);
            }
            if ($row->scan_status !== 'clean' || in_array($evidenceFileId, $heldIds, true)) {
                throw new OrderError('WORK_EVIDENCE_UNAVAILABLE', 'The photo is not available until its safety review is complete.', $correlationId, status: 409);
            }
        }
    }

    /**
     * @param list<array<string, mixed>> $nodes
     * @return list<array<string, mixed>>
     */
    public function projectNodes(
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        array $nodes,
        bool $canViewSubmittedEvidence,
        bool $canManageEvidence,
    ): array {
        $events = $this->allWorkEvents($workInstanceId);
        $uploads = $this->indexUploadedEvidenceEvents($events);
        $rows = $this->evidenceRows(array_keys($uploads));
        $heldIds = $this->activeHoldIds(array_keys($uploads));
        $submittedNodeByEvidenceId = $this->submittedEvidenceNodes($events);

        foreach ($nodes as $index => $node) {
            $nodeId = (string) ($node['id'] ?? '');
            $expectedPrefix = 'evidence/work/'.$workInstanceId.'/'.hash('sha256', $nodeId).'/';
            $payload = is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [];
            $submittedIds = array_values(array_filter(
                (array) ($payload['evidence_file_ids'] ?? []),
                static fn (mixed $id): bool => is_string($id),
            ));
            $photos = [];
            $pendingCount = 0;

            if ($canViewSubmittedEvidence) {
                foreach ($submittedIds as $evidenceId) {
                    $row = $rows[$evidenceId] ?? null;
                    $upload = $uploads[$evidenceId] ?? null;
                    if (
                        $upload === null
                        || $upload['node_id'] !== $nodeId
                        || $upload['tool_key'] !== 'photo_proof'
                        || ($submittedNodeByEvidenceId[$evidenceId] ?? null) !== $nodeId
                    ) {
                        continue;
                    }
                    if (
                        $row === null
                        || (string) $row->owner_user_id !== $upload['actor_user_id']
                        || (string) $row->evidence_type !== 'work_node_photo_proof'
                        || ! str_starts_with((string) $row->storage_key, $expectedPrefix)
                        || $row->deleted_at !== null
                        || in_array($evidenceId, $heldIds, true)
                        || $row->scan_status !== 'clean'
                    ) {
                        $pendingCount++;
                        continue;
                    }

                    $photos[] = [
                        'id' => (string) $row->id,
                        'url' => route('orders.work-evidence.show', ['order' => $orderId, 'evidence' => (string) $row->id]),
                        'media_type' => (string) $row->media_type,
                    ];
                }
            }

            $node['evidence'] = $payload !== [] || $submittedIds !== [] ? [
                'notes' => is_string($payload['notes'] ?? null) ? $payload['notes'] : '',
                'location' => is_array($payload['location'] ?? null) ? $payload['location'] : null,
                'metric_readings' => is_array($payload['metric_readings'] ?? null) ? $payload['metric_readings'] : [],
                'checklist_completed' => ($payload['checklist_completed'] ?? false) === true,
                'photos' => $photos,
                'pending_photo_count' => $pendingCount,
            ] : null;
            $requiredProofs = (array) ($node['required_proofs'] ?? []);
            $photoProofReady = ! in_array('photo_proof', $requiredProofs, true)
                || (count($photos) > 0 && $pendingCount === 0);
            $node['can_confirm'] = ($node['status'] ?? null) === 'awaiting_customer_confirmation'
                && ($node['approval_method'] ?? 'app_confirm') === 'app_confirm'
                && $photoProofReady;

            unset($node['evidence_payload']);
            if ($canManageEvidence && ($node['status'] ?? null) === 'active') {
                $candidates = [];
                foreach ($uploads as $evidenceId => $upload) {
                    if ($upload['node_id'] !== $nodeId || $upload['tool_key'] !== 'photo_proof' || $upload['actor_user_id'] !== $actorUserId) {
                        continue;
                    }
                    $row = $rows[$evidenceId] ?? null;
                    if (
                        $row === null
                        || (string) $row->owner_user_id !== $actorUserId
                        || (string) $row->evidence_type !== 'work_node_photo_proof'
                        || ! str_starts_with((string) $row->storage_key, $expectedPrefix)
                        || $row->deleted_at !== null
                    ) {
                        continue;
                    }
                    $candidate = [
                        'id' => (string) $row->id,
                        'scan_status' => (string) $row->scan_status,
                        'media_type' => (string) $row->media_type,
                    ];
                    if ($row->scan_status === 'clean' && ! in_array($evidenceId, $heldIds, true)) {
                        $candidate['url'] = route('orders.work-evidence.show', ['order' => $orderId, 'evidence' => (string) $row->id]);
                    }
                    $candidates[] = $candidate;
                }
                $node['candidate_evidence'] = $candidates;
            }

            $nodes[$index] = $node;
        }

        return $nodes;
    }

    /** @return array{storage_key: string, media_type: string, filename: string} */
    public function downloadableEvidence(
        string $orderId,
        string $evidenceFileId,
        string $actorUserId,
        string $correlationId,
    ): array {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null || ((string) $order->buyer_user_id !== $actorUserId && (string) $order->provider_user_id !== $actorUserId)) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }

        $work = DB::table('work_instances')->where('order_id', $orderId)->first();
        if ($work === null) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }

        $upload = $this->uploadedEvidenceEvents((string) $work->id)[$evidenceFileId] ?? null;
        if ($upload === null || $upload['tool_key'] !== 'photo_proof') {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }

        $isProviderUploader = (string) $order->provider_user_id === $actorUserId && $upload['actor_user_id'] === $actorUserId;
        if (! $isProviderUploader && ! $this->wasSubmitted((string) $work->id, $upload['node_id'], $evidenceFileId)) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }

        $evidence = DB::table('evidence_files')
            ->where('id', $evidenceFileId)
            ->where('owner_user_id', $upload['actor_user_id'])
            ->where('evidence_type', 'work_node_photo_proof')
            ->whereNull('deleted_at')
            ->first();
        $expectedPrefix = 'evidence/work/'.(string) $work->id.'/'.hash('sha256', $upload['node_id']).'/';
        if ($evidence === null || $evidence->scan_status !== 'clean' || ! str_starts_with((string) $evidence->storage_key, $expectedPrefix)) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }
        if (in_array($evidenceFileId, $this->activeHoldIds([$evidenceFileId]), true)) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }
        if (! Storage::disk('private')->exists((string) $evidence->storage_key)) {
            throw new OrderError('EVIDENCE_STORAGE_MISSING', 'The evidence file is unavailable.', $correlationId, status: 503);
        }

        $now = now();
        DB::table('audit_events')->insert([
            'id' => (string) Str::uuid7(),
            'actor_user_id' => $actorUserId,
            'acting_for_user_id' => null,
            'action' => 'work.evidence.viewed',
            'target_type' => 'evidence_file',
            'target_id' => $evidenceFileId,
            'order_id' => $orderId,
            'reason' => 'Authorized Work participant viewed submitted evidence.',
            'command_name' => 'ViewWorkEvidence',
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'created_at' => $now,
        ]);

        return [
            'storage_key' => (string) $evidence->storage_key,
            'media_type' => (string) $evidence->media_type,
            'filename' => basename((string) $evidence->storage_key),
        ];
    }

    /** @return array{0: object, 1: array<string, mixed>} */
    private function activePhotoNode(string $orderId, string $nodeId, string $actorUserId, string $correlationId, bool $lock = false): array
    {
        $orderQuery = DB::table('orders')->where('id', $orderId);
        $order = $lock ? $orderQuery->lockForUpdate()->first() : $orderQuery->first();
        if ($order === null) {
            throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
        }
        if ((string) $order->provider_user_id !== $actorUserId) {
            $isBuyer = (string) $order->buyer_user_id === $actorUserId;
            throw new OrderError(
                $isBuyer ? 'AUTHORIZATION_DENIED' : 'ORDER_NOT_FOUND',
                $isBuyer ? 'Only the assigned Work provider can upload proof.' : 'The order could not be found.',
                $correlationId,
                status: $isBuyer ? 403 : 404,
            );
        }

        $workQuery = DB::table('work_instances')->where('order_id', $orderId);
        $work = $lock ? $workQuery->lockForUpdate()->first() : $workQuery->first();
        if ($work === null) {
            throw new OrderError('WORK_NOT_FOUND', 'No Work instance exists for this order.', $correlationId, status: 404);
        }

        $node = $this->resolveNode($this->decodeJson($work->structure), $nodeId);
        if ($node === null) {
            throw new OrderError('NODE_NOT_FOUND', 'The Work node could not be found.', $correlationId, status: 404);
        }
        if (($node['status'] ?? null) !== 'active' || ! in_array('photo_proof', (array) ($node['required_proofs'] ?? []), true)) {
            throw new OrderError('INVALID_STATE', 'Photo proof is not available for this Work node.', $correlationId, status: 409);
        }
        $nodeUploads = array_filter(
            $this->uploadedEvidenceEvents((string) $work->id),
            static fn (array $upload): bool => $upload['node_id'] === (string) $node['id']
                && $upload['tool_key'] === 'photo_proof',
        );
        if (count($nodeUploads) >= self::MAX_PHOTOS_PER_NODE) {
            throw new OrderError('PHOTO_LIMIT_REACHED', 'A Work node can have up to 8 uploaded photos.', $correlationId, status: 422);
        }

        return [$work, $node];
    }

    /** @param array<string, mixed>|null $structure @return array<string, mixed>|null */
    private function resolveNode(?array $structure, string $nodeId): ?array
    {
        foreach ((array) ($structure['nodes'] ?? []) as $node) {
            if (is_array($node) && ((string) ($node['id'] ?? '') === $nodeId || (int) ($node['ordinal'] ?? -1) === (int) $nodeId)) {
                return $node;
            }
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    private function decodeJson(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }
        if (! is_string($value) || $value === '') {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }

    /** @return list<object> */
    private function allWorkEvents(string $workInstanceId): array
    {
        return DB::table('work_events')
            ->where('work_instance_id', $workInstanceId)
            ->orderBy('occurred_at')
            ->get()
            ->all();
    }

    /** @return array<string, array{node_id: string, tool_key: string, actor_user_id: string}> */
    private function uploadedEvidenceEvents(string $workInstanceId): array
    {
        return $this->indexUploadedEvidenceEvents($this->allWorkEvents($workInstanceId));
    }

    /** @param list<object> $events @return array<string, array{node_id: string, tool_key: string, actor_user_id: string}> */
    private function indexUploadedEvidenceEvents(array $events): array
    {
        $uploads = [];
        foreach ($events as $event) {
            if ((string) $event->event_type !== 'work.evidence.uploaded' || $event->evidence_file_id === null) {
                continue;
            }
            $payload = $this->decodeJson($event->payload);
            if (! is_string($payload['node_id'] ?? null) || ! is_string($payload['tool_key'] ?? null)) {
                continue;
            }
            $uploads[(string) $event->evidence_file_id] = [
                'node_id' => $payload['node_id'],
                'tool_key' => $payload['tool_key'],
                'actor_user_id' => (string) ($event->actor_user_id ?? ''),
            ];
        }

        return $uploads;
    }

    /** @param list<string> $evidenceFileIds @return array<string, object> */
    private function evidenceRows(array $evidenceFileIds): array
    {
        if ($evidenceFileIds === []) {
            return [];
        }

        return DB::table('evidence_files')->whereIn('id', $evidenceFileIds)->get()->keyBy('id')->all();
    }

    /** @param list<string> $evidenceFileIds @return list<string> */
    private function activeHoldIds(array $evidenceFileIds): array
    {
        if ($evidenceFileIds === []) {
            return [];
        }

        return DB::table('retention_holds')
            ->whereIn('evidence_file_id', $evidenceFileIds)
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->pluck('evidence_file_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();
    }

    /** @param list<object> $events @return array<string, string> */
    private function submittedEvidenceNodes(array $events): array
    {
        $submitted = [];
        foreach ($events as $event) {
            if (! str_starts_with((string) $event->event_type, 'work.node.')) {
                continue;
            }
            $eventPayload = $this->decodeJson($event->payload);
            $nodeId = $eventPayload['node_id'] ?? null;
            $payload = is_array($eventPayload['payload'] ?? null) ? $eventPayload['payload'] : [];
            if (! is_string($nodeId)) {
                continue;
            }
            foreach ((array) ($payload['evidence_file_ids'] ?? []) as $evidenceId) {
                if (is_string($evidenceId)) {
                    $submitted[$evidenceId] = $nodeId;
                }
            }
        }

        return $submitted;
    }

    private function wasSubmitted(string $workInstanceId, string $nodeId, string $evidenceFileId): bool
    {
        return ($this->submittedEvidenceNodes($this->allWorkEvents($workInstanceId))[$evidenceFileId] ?? null) === $nodeId;
    }
}

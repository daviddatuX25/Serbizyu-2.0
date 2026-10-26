<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    public function __construct(
        private readonly OutboxWriter $outbox,
        private readonly OrderHandoffCourierAuthorityPort $courierAuthority,
    ) {}

    /** @return array{id: string, media_type: string, size_bytes: int, scan_status: string} */
    public function uploadPhoto(
        string $orderId,
        string $nodeId,
        string $actorUserId,
        UploadedFile $file,
        string $correlationId,
    ): array {
        $mimeType = $file->getClientMimeType();
        if (! is_string($mimeType) || $mimeType === '') {
            $mimeType = 'application/octet-stream';
        }
        $extension = self::MIME_EXTENSIONS[$mimeType] ?? 'bin';

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
                $a9Draft = (string) $lockedWork->work_shape === 'A9'
                    ? DB::table('work_deliveries')
                        ->where('work_instance_id', (string) $lockedWork->id)
                        ->where('status', 'draft')
                        ->where('created_by_user_id', $actorUserId)
                        ->first(['id', 'version'])
                    : null;
                if ((string) $lockedWork->work_shape === 'A9' && $a9Draft === null) {
                    throw new OrderError('INVALID_STATE', 'A9 proof uploads require the current provider-authored delivery draft.', $correlationId, status: 409);
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
                        ...($a9Draft === null ? [] : [
                            'delivery_id' => (string) $a9Draft->id,
                            'delivery_version' => (int) $a9Draft->version,
                            'work_version' => (int) $lockedWork->version,
                        ]),
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'idempotency_key' => 'work_evidence_'.substr($correlationId, 0, 12).'_'.Str::random(8),
                    'correlation_id' => $correlationId,
                    'occurred_at' => $now,
                    'effective_at' => $now,
                    'created_at' => $now,
                ]);
                $this->outbox->enqueue(
                    eventType: 'work.evidence.scan_requested',
                    aggregateType: 'evidence_file',
                    aggregateId: $evidenceId,
                    payload: ['evidence_file_id' => $evidenceId],
                    correlationId: $correlationId,
                );
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
     * Verify photo evidence was uploaded for the exact A9 delivery and Work version.
     *
     * @param  list<string>  $evidenceFileIds
     */
    public function assertA9PhotoEvidenceForDelivery(
        string $workInstanceId,
        string $nodeId,
        string $providerUserId,
        array $evidenceFileIds,
        string $deliveryId,
        int $deliveryVersion,
        int $workVersion,
        string $correlationId,
    ): void {
        $delivery = DB::table('work_deliveries')
            ->where('id', $deliveryId)
            ->where('work_instance_id', $workInstanceId)
            ->where('version', $deliveryVersion)
            ->where('created_by_user_id', $providerUserId)
            ->first(['id', 'status']);
        if ($delivery === null) {
            throw new OrderError('DELIVERY_NOT_FOUND', 'The A9 delivery version was not found.', $correlationId, status: 404);
        }
        if (! in_array((string) $delivery->status, ['draft', 'submitted'], true)) {
            throw new OrderError('DELIVERY_NOT_EDITABLE', 'This A9 delivery version no longer accepts proof validation.', $correlationId, status: 409);
        }

        $uploads = $this->uploadedEvidenceEvents($workInstanceId);
        foreach ($evidenceFileIds as $evidenceFileId) {
            $upload = $uploads[$evidenceFileId] ?? null;
            if (
                $upload === null
                || $upload['node_id'] !== $nodeId
                || $upload['tool_key'] !== 'photo_proof'
                || $upload['actor_user_id'] !== $providerUserId
                || $upload['delivery_id'] !== $deliveryId
                || $upload['delivery_version'] !== $deliveryVersion
                || $upload['work_version'] !== $workVersion
            ) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'The photo proof is not bound to this A9 delivery version and authored node.', $correlationId, status: 422);
            }
        }

        $this->assertAvailablePhotoEvidence(
            $workInstanceId,
            $nodeId,
            $providerUserId,
            $evidenceFileIds,
            $correlationId,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $nodes
     * @return list<array<string, mixed>>
     */
    public function projectNodes(
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        array $nodes,
        bool $canViewSubmittedEvidence,
        bool $canManageEvidence,
        bool $allowAwaitingCustomerConfirmation = false,
        bool $allowLockedNodeEvidenceManagement = false,
        bool $allowNativeA4EvidenceManagement = false,
        ?string $currentDeliveryId = null,
        ?int $currentDeliveryVersion = null,
        ?int $currentWorkVersion = null,
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
                'checklist_responses' => is_array($payload['checklist_responses'] ?? null) ? $payload['checklist_responses'] : [],
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
            $canManageNodeEvidence = ($node['status'] ?? null) === 'active'
                || ($allowAwaitingCustomerConfirmation && ($node['status'] ?? null) === 'awaiting_customer_confirmation')
                || ($allowLockedNodeEvidenceManagement
                    && in_array('photo_proof', (array) ($node['required_proofs'] ?? []), true))
                || $allowNativeA4EvidenceManagement;
            if ($canManageEvidence && $canManageNodeEvidence) {
                $candidates = [];
                foreach ($uploads as $evidenceId => $upload) {
                    if ($upload['node_id'] !== $nodeId || $upload['tool_key'] !== 'photo_proof' || $upload['actor_user_id'] !== $actorUserId) {
                        continue;
                    }
                    if (
                        $allowLockedNodeEvidenceManagement
                        && (
                            $currentDeliveryId === null
                            || $currentDeliveryVersion === null
                            || $currentWorkVersion === null
                            || $upload['delivery_id'] !== $currentDeliveryId
                            || $upload['delivery_version'] !== $currentDeliveryVersion
                            || $upload['work_version'] !== $currentWorkVersion
                        )
                    ) {
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
        if ($order === null) {
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

        $isParty = (string) $order->buyer_user_id === $actorUserId || (string) $order->provider_user_id === $actorUserId;
        $node = $this->resolveNode($this->decodeJson($work->structure), $upload['node_id']);
        $isCurrentA4Uploader = (string) $work->work_shape === 'A4'
            && $upload['actor_user_id'] === $actorUserId
            && $node !== null
            && $this->canUploadA4PhaseEvidence($order, $work, $node, $actorUserId, false);
        $isCurrentA9DraftUploader = (string) $work->work_shape === 'A9'
            && $upload['actor_user_id'] === $actorUserId
            && $node !== null
            && in_array('photo_proof', (array) ($node['required_proofs'] ?? []), true)
            && $this->canUploadA9DraftEvidence($order, $work, $actorUserId, false);
        if (! $isParty && ! $isCurrentA4Uploader && ! $isCurrentA9DraftUploader) {
            throw new OrderError('EVIDENCE_NOT_FOUND', 'The evidence file could not be found.', $correlationId, status: 404);
        }

        $isGenericProviderUploader = ! in_array((string) $work->work_shape, ['A4', 'A9'], true)
            && (string) $order->provider_user_id === $actorUserId
            && $upload['actor_user_id'] === $actorUserId;
        $isAuthorizedUploader = $isGenericProviderUploader || $isCurrentA4Uploader || $isCurrentA9DraftUploader;
        if (! $isAuthorizedUploader && ! $this->wasSubmitted((string) $work->id, $upload['node_id'], $evidenceFileId)) {
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
            'reason' => 'An authorized Work actor viewed current-phase evidence.',
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

        $workQuery = DB::table('work_instances')->where('order_id', $orderId);
        $work = $lock ? $workQuery->lockForUpdate()->first() : $workQuery->first();
        if ($work === null) {
            throw new OrderError('WORK_NOT_FOUND', 'No Work instance exists for this order.', $correlationId, status: 404);
        }

        $node = $this->resolveNode($this->decodeJson($work->structure), $nodeId);
        if ($node === null) {
            throw new OrderError('NODE_NOT_FOUND', 'The Work node could not be found.', $correlationId, status: 404);
        }
        $isA4 = (string) $work->work_shape === 'A4';
        $isA4PhaseActor = $isA4
            && $this->canUploadA4PhaseEvidence($order, $work, $node, $actorUserId, $lock);
        $isA9DraftActor = (string) $work->work_shape === 'A9'
            && $this->canUploadA9DraftEvidence($order, $work, $actorUserId, $lock);
        $isProvider = ! in_array((string) $work->work_shape, ['A4', 'A9'], true)
            && (string) $order->provider_user_id === $actorUserId;
        if ((string) $work->work_shape === 'A9' && (string) $order->provider_user_id === $actorUserId && ! $isA9DraftActor) {
            throw new OrderError('DELIVERY_NOT_EDITABLE', 'A9 photo proof is accepted only while the current provider-authored delivery is a draft.', $correlationId, status: 409);
        }
        if (! $isProvider && ! $isA4PhaseActor && ! $isA9DraftActor) {
            $isOrderParty = (string) $order->buyer_user_id === $actorUserId
                || DB::table('order_parties')
                    ->where('order_id', $orderId)
                    ->where('user_id', $actorUserId)
                    ->where('status', 'active')
                    ->exists();
            throw new OrderError(
                $isOrderParty ? 'AUTHORIZATION_DENIED' : 'ORDER_NOT_FOUND',
                $isOrderParty ? 'This actor cannot upload evidence for the current Work phase.' : 'The order could not be found.',
                $correlationId,
                status: $isOrderParty ? 403 : 404,
            );
        }
        $validNodeState = ($node['status'] ?? null) === 'active' || $isA4PhaseActor || $isA9DraftActor;
        $nativeA4Photo = $isA4PhaseActor;
        $authoredPhoto = in_array('photo_proof', (array) ($node['required_proofs'] ?? []), true);
        if (! $validNodeState || (! $nativeA4Photo && ! $authoredPhoto)) {
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

    private function canUploadA4PhaseEvidence(
        object $order,
        object $work,
        array $node,
        string $actorUserId,
        bool $lock,
    ): bool {
        if ((string) $work->work_shape !== 'A4' || ! Schema::hasTable('order_handoff_transfers')) {
            return false;
        }

        $transferQuery = DB::table('order_handoff_transfers')->where('order_id', (string) $order->id);
        $transfer = $lock ? $transferQuery->lockForUpdate()->first() : $transferQuery->first();
        $ordinal = (int) ($node['ordinal'] ?? 0);
        if ($ordinal === 1) {
            return $transfer === null
                && (string) $order->provider_user_id === $actorUserId
                && (string) $order->status === 'accepted'
                && ($node['status'] ?? null) === 'active';
        }
        if ($transfer === null) {
            return false;
        }
        if ($ordinal === 2) {
            if ((string) $transfer->status !== 'offered' || (string) $transfer->offered_to_user_id !== $actorUserId) {
                return false;
            }

            return (string) $transfer->transfer_mode === 'counter_pickup'
                ? $actorUserId === (string) $order->buyer_user_id
                : ((string) $transfer->transfer_mode === 'courier_delivery'
                    && $this->isCurrentA4Courier($order, $actorUserId));
        }
        if ($ordinal !== 3 || (string) $transfer->status !== 'departed') {
            return false;
        }

        $recipients = DB::table('order_parties')
            ->where('order_id', (string) $order->id)
            ->where('status', 'active')
            ->where('party_type', 'recipient')
            ->where('responsibility', 'final_recipient')
            ->distinct()
            ->pluck('user_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->values()
            ->all();
        $isAssignedCourier = (string) $transfer->transfer_mode === 'courier_delivery'
            && (string) $transfer->offered_to_user_id === $actorUserId;
        if (
            count($recipients) > 1
            || (string) $order->provider_user_id === $actorUserId
            || $isAssignedCourier
        ) {
            return false;
        }

        return $actorUserId === ($recipients[0] ?? (string) $order->buyer_user_id);
    }

    private function canUploadA9DraftEvidence(object $order, object $work, string $actorUserId, bool $lock): bool
    {
        if (
            (string) $work->work_shape !== 'A9'
            || (string) $work->status !== 'in_progress'
            || (string) $order->provider_user_id !== $actorUserId
            || $work->current_delivery_id !== null
            || ! Schema::hasTable('work_deliveries')
        ) {
            return false;
        }

        $draftQuery = DB::table('work_deliveries')
            ->where('work_instance_id', (string) $work->id)
            ->where('status', 'draft')
            ->where('created_by_user_id', $actorUserId);
        $draft = $lock ? $draftQuery->lockForUpdate()->first() : $draftQuery->first();
        if ($draft === null) {
            return false;
        }

        return DB::table('work_events')
            ->where('work_instance_id', (string) $work->id)
            ->where('actor_user_id', $actorUserId)
            ->where('event_type', 'work.delivery.draft_created')
            ->whereRaw("payload::jsonb ->> 'delivery_id' = ?", [(string) $draft->id])
            ->whereRaw("payload::jsonb ->> 'version' = ?", [(string) $draft->version])
            ->whereRaw("payload::jsonb ->> 'work_version' = ?", [(string) $work->version])
            ->exists();
    }

    private function isCurrentA4Courier(object $order, string $actorUserId): bool
    {
        $activeParty = DB::table('order_parties')
            ->where('order_id', (string) $order->id)
            ->where('user_id', $actorUserId)
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->where('party_type', 'courier')
                    ->orWhereIn('responsibility', ['courier', 'delivery']);
            })
            ->exists();
        if ($activeParty) {
            return true;
        }

        return is_string($order->deal_chain_id ?? null)
            && is_string($order->deal_need_id ?? null)
            && $order->deal_chain_id !== ''
            && $order->deal_need_id !== ''
            && $this->courierAuthority->isAuthorizedCourier(
                (string) $order->deal_chain_id,
                (string) $order->deal_need_id,
                $actorUserId,
            );
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

    /** @return array<string, array{node_id: string, tool_key: string, actor_user_id: string, delivery_id: string|null, delivery_version: int|null, work_version: int|null}> */
    private function uploadedEvidenceEvents(string $workInstanceId): array
    {
        return $this->indexUploadedEvidenceEvents($this->allWorkEvents($workInstanceId));
    }

    /** @param list<object> $events @return array<string, array{node_id: string, tool_key: string, actor_user_id: string, delivery_id: string|null, delivery_version: int|null, work_version: int|null}> */
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
                'delivery_id' => is_string($payload['delivery_id'] ?? null) ? $payload['delivery_id'] : null,
                'delivery_version' => is_numeric($payload['delivery_version'] ?? null) ? (int) $payload['delivery_version'] : null,
                'work_version' => is_numeric($payload['work_version'] ?? null) ? (int) $payload['work_version'] : null,
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

    private function isSubmittedA9ManifestProof(
        string $workInstanceId,
        string $nodeId,
        string $evidenceFileId,
    ): bool {
        $work = DB::table('work_instances')
            ->where('id', $workInstanceId)
            ->first(['work_shape', 'structure']);
        if ($work === null || (string) $work->work_shape !== 'A9') {
            return false;
        }

        $upload = $this->uploadedEvidenceEvents($workInstanceId)[$evidenceFileId] ?? null;
        if (
            $upload === null
            || $upload['node_id'] !== $nodeId
            || $upload['tool_key'] !== 'photo_proof'
            || $upload['delivery_id'] === null
            || $upload['delivery_version'] === null
            || $upload['work_version'] === null
        ) {
            return false;
        }

        $delivery = DB::table('work_deliveries')
            ->where('id', $upload['delivery_id'])
            ->where('work_instance_id', $workInstanceId)
            ->where('version', $upload['delivery_version'])
            ->whereIn('status', ['submitted', 'accepted', 'superseded'])
            ->first(['id', 'version', 'manifest', 'manifest_hash']);
        if (
            $delivery === null
            || ! is_string($delivery->manifest)
            || ! is_string($delivery->manifest_hash)
        ) {
            return false;
        }

        $manifest = json_decode((string) $delivery->manifest, true);
        if (
            ! is_array($manifest)
            || ! hash_equals((string) $delivery->manifest_hash, hash('sha256', $this->canonicalJson($manifest)))
            || (string) ($manifest['work_instance_id'] ?? '') !== $workInstanceId
            || (int) ($manifest['version'] ?? 0) !== (int) $delivery->version
            || (int) ($manifest['work_version'] ?? 0) !== $upload['work_version']
        ) {
            return false;
        }

        $nodeDefinition = $manifest['node_definitions'][$nodeId] ?? null;
        $proof = $manifest['node_proofs'][$nodeId] ?? null;
        $evidenceIds = is_array($proof) ? ($proof['evidence_file_ids'] ?? null) : null;
        $structure = $this->decodeJson($work->structure);
        $node = $this->resolveNode($structure, $nodeId);

        return is_array($nodeDefinition)
            && in_array('photo_proof', (array) ($nodeDefinition['required_proofs'] ?? []), true)
            && $node !== null
            && in_array('photo_proof', (array) ($node['required_proofs'] ?? []), true)
            && is_array($evidenceIds)
            && in_array($evidenceFileId, $evidenceIds, true);
    }

    /** @param array<string, mixed> $value */
    private function canonicalJson(array $value): string
    {
        $sort = static function (mixed $item) use (&$sort): mixed {
            if (! is_array($item)) {
                return $item;
            }
            if (! array_is_list($item)) {
                uksort($item, static fn (string|int $left, string|int $right): int => strlen((string) $left) <=> strlen((string) $right) ?: strcmp((string) $left, (string) $right));
            }
            foreach ($item as $key => $child) {
                $item[$key] = $sort($child);
            }

            return $item;
        };

        return json_encode($sort($value), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    private function wasSubmitted(string $workInstanceId, string $nodeId, string $evidenceFileId): bool
    {
        $workShape = DB::table('work_instances')->where('id', $workInstanceId)->value('work_shape');
        if ((string) $workShape === 'A9') {
            return $this->isSubmittedA9ManifestProof($workInstanceId, $nodeId, $evidenceFileId);
        }

        return ($this->submittedEvidenceNodes($this->allWorkEvents($workInstanceId))[$evidenceFileId] ?? null) === $nodeId;
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

final class A9DeliveryService
{
    private const MAX_FILES_PER_VERSION = 12;

    private const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

    private const ALLOWED_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        'text/plain' => 'txt',
    ];

    public function __construct(
        private readonly OutboxWriter $outbox,
        private readonly OrderPaymentObligationPort $paymentObligations,
        private readonly WorkExecutionService $workExecution,
        private readonly WorkNodeEvidenceService $nodeEvidence,
        private readonly AuditRecorder $audits,
        private readonly DealWorkGatePort $workGates,
        private readonly NotificationsPort $notifications,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}

    public function createDraft(string $orderId, string $actorId, string $correlationId): array
    {
        return DB::transaction(function () use ($orderId, $actorId, $correlationId): array {
            [$order, $work] = $this->lockedWork($orderId, $actorId, 'provider', $correlationId);
            if ($work->work_shape !== 'A9') {
                throw new OrderError('INVALID_STATE', 'Digital delivery drafts are available only for A9 Work.', $correlationId, status: 409);
            }

            if ($work->current_delivery_id !== null) {
                throw new OrderError('DELIVERY_ALREADY_SUBMITTED', 'A submitted delivery must be reviewed before another version can be created.', $correlationId, status: 409);
            }
            $existingDraft = DB::table('work_deliveries')->where('work_instance_id', $work->id)->where('status', 'draft')->first();
            if ($existingDraft !== null) {
                $this->assertA9InProgress($work, $correlationId);

                return ['id' => (string) $existingDraft->id, 'version' => (int) $existingDraft->version, 'status' => 'draft'];
            }
            $this->assertWorkNotHeld($work, $correlationId);

            $version = ((int) DB::table('work_deliveries')->where('work_instance_id', $work->id)->max('version')) + 1;
            $id = (string) Str::uuid7();
            $now = now();
            $startsWork = $work->status === 'not_started';
            if ($startsWork) {
                if ($order->status !== 'accepted') {
                    throw new OrderError('INVALID_STATE', 'A9 delivery can start only after the Order is accepted.', $correlationId, status: 409);
                }
            } else {
                $this->assertA9InProgress($work, $correlationId);
            }

            DB::table('work_deliveries')->insert([
                'id' => $id,
                'work_instance_id' => (string) $work->id,
                'version' => $version,
                'status' => 'draft',
                'created_by_user_id' => $actorId,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($startsWork) {
                DB::table('work_instances')->where('id', $work->id)->update([
                    'status' => 'in_progress',
                    'started_at' => $now,
                    'version' => DB::raw('version + 1'),
                    'row_version' => DB::raw('row_version + 1'),
                    'updated_at' => $now,
                ]);
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'in_progress',
                    'version' => DB::raw('version + 1'),
                    'updated_at' => $now,
                ]);
            }
            $this->recordWorkEvent(
                (string) $work->id,
                (string) $order->id,
                $actorId,
                'work.delivery.draft_created',
                $startsWork ? 'not_started' : 'in_progress',
                'in_progress',
                [
                    'delivery_id' => $id,
                    'version' => $version,
                    'work_version' => (int) $work->version + ($startsWork ? 1 : 0),
                ],
                $correlationId,
                $now,
            );

            return ['id' => $id, 'version' => $version, 'status' => 'draft'];
        });
    }

    /** @param list<UploadedFile> $files */
    public function uploadFiles(string $orderId, string $deliveryId, string $actorId, array $files, string $correlationId): array
    {
        if ($files === [] || count($files) > self::MAX_FILES_PER_VERSION) {
            throw new OrderError('INVALID_DELIVERY_FILES', 'Attach between 1 and 12 files at a time.', $correlationId, status: 422);
        }

        [$order, $work] = $this->participantWork($orderId, $actorId, $correlationId);
        if ((string) $order->provider_user_id !== $actorId) {
            throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can upload deliverables.', $correlationId, status: 403);
        }
        $this->assertA9InProgress($work, $correlationId);
        $created = [];
        foreach ($files as $file) {
            $mime = $file->getMimeType();
            $extension = is_string($mime) ? (self::ALLOWED_TYPES[$mime] ?? null) : null;
            $size = $file->getSize();
            $path = $file->getRealPath();
            if ($extension === null || ! is_int($size) || $size < 1 || $size > self::MAX_FILE_SIZE_BYTES) {
                throw new OrderError('UNSUPPORTED_DELIVERY_FILE', 'Use a JPEG, PNG, WebP, PDF, or plain text file up to 25 MB.', $correlationId, status: 422);
            }
            $hash = is_string($path) ? hash_file('sha256', $path) : false;
            if (! is_string($hash)) {
                throw new OrderError('FILE_READ_FAILED', 'The deliverable could not be read.', $correlationId, status: 422);
            }
            $filename = $this->safeFilename($file->getClientOriginalName(), $extension);
            $created[] = ['file' => $file, 'mime' => $mime, 'extension' => $extension, 'size' => $size, 'hash' => $hash, 'filename' => $filename];
        }

        $storedKeys = [];
        try {
            foreach ($created as $index => &$item) {
                $item['id'] = (string) Str::uuid7();
                $item['path'] = $item['file']->storeAs(
                    'evidence/work-deliveries/'.hash('sha256', (string) $work->id).'/'.hash('sha256', $deliveryId),
                    $item['id'].'.'.$item['extension'],
                    'private',
                );
                if (! is_string($item['path']) || $item['path'] === '') {
                    throw new OrderError('EVIDENCE_STORAGE_FAILED', 'The deliverable could not be stored privately.', $correlationId, status: 503);
                }
                $storedKeys[] = $item['path'];
            }
            unset($item);

            DB::transaction(function () use ($orderId, $deliveryId, $actorId, $correlationId, $created): void {
                [, $work] = $this->lockedWork($orderId, $actorId, 'provider', $correlationId);
                $this->assertA9InProgress($work, $correlationId);
                $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->where('work_instance_id', $work->id)->lockForUpdate()->first();
                if ($delivery === null || $delivery->status !== 'draft') {
                    throw new OrderError('DELIVERY_NOT_EDITABLE', 'Only a draft delivery can receive files.', $correlationId, status: 409);
                }
                $existingCount = DB::table('work_deliverable_files')->where('work_delivery_id', $deliveryId)->count();
                if ($existingCount + count($created) > self::MAX_FILES_PER_VERSION) {
                    throw new OrderError('DELIVERY_FILE_LIMIT', 'A delivery version can contain at most 12 files.', $correlationId, status: 422);
                }

                $now = now();
                foreach ($created as $offset => $item) {
                    $evidenceId = (string) $item['id'];
                    DB::table('evidence_files')->insert([
                        'id' => $evidenceId,
                        'owner_user_id' => $actorId,
                        'storage_key' => (string) $item['path'],
                        'media_type' => (string) $item['mime'],
                        'size_bytes' => (int) $item['size'],
                        'content_hash' => (string) $item['hash'],
                        'evidence_type' => 'work_delivery_artifact',
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
                    DB::table('work_deliverable_files')->insert([
                        'id' => (string) Str::uuid7(),
                        'work_delivery_id' => $deliveryId,
                        'evidence_file_id' => $evidenceId,
                        'ordinal' => $existingCount + $offset + 1,
                        'filename' => (string) $item['filename'],
                    ]);
                    $this->outbox->enqueue(
                        eventType: 'work.evidence.scan_requested',
                        aggregateType: 'evidence_file',
                        aggregateId: $evidenceId,
                        payload: ['evidence_file_id' => $evidenceId],
                        correlationId: $correlationId,
                    );
                }
            });
        } catch (Throwable $exception) {
            foreach ($storedKeys as $key) {
                Storage::disk('private')->delete($key);
            }
            throw $exception;
        }

        return $this->projectDelivery($deliveryId, $correlationId) ?? [];
    }

    /**
     * @param  array<string, mixed>  $nodeProofs
     */
    public function submit(string $orderId, string $deliveryId, string $actorId, string $correlationId, array $nodeProofs = []): array
    {
        return DB::transaction(function () use ($orderId, $deliveryId, $actorId, $correlationId, $nodeProofs): array {
            [$order, $work] = $this->lockedWork($orderId, $actorId, 'provider', $correlationId);
            $this->assertWorkNotHeld($work, $correlationId);
            $this->assertA9InProgress($work, $correlationId);
            $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->where('work_instance_id', $work->id)->lockForUpdate()->first();
            if ($delivery === null || $delivery->status !== 'draft') {
                throw new OrderError('DELIVERY_NOT_EDITABLE', 'Only a draft delivery can be submitted.', $correlationId, status: 409);
            }
            $previousPhotoEvidenceIds = [];
            $previousManifests = DB::table('work_deliveries')
                ->where('work_instance_id', $work->id)
                ->where('version', '<', $delivery->version)
                ->pluck('manifest');
            foreach ($previousManifests as $previousManifestJson) {
                $previousManifest = is_string($previousManifestJson) ? json_decode($previousManifestJson, true) : null;
                if (! is_array($previousManifest)) {
                    continue;
                }
                foreach ((array) ($previousManifest['node_proofs'] ?? []) as $previousProof) {
                    if (! is_array($previousProof)) {
                        continue;
                    }
                    foreach ((array) ($previousProof['evidence_file_ids'] ?? []) as $evidenceId) {
                        if (is_string($evidenceId)) {
                            $previousPhotoEvidenceIds[$evidenceId] = true;
                        }
                    }
                }
            }
            $structure = json_decode((string) $work->structure, true);
            $nodes = is_array($structure) && is_array($structure['nodes'] ?? null) ? $structure['nodes'] : [];
            $proofNodes = [];
            $proofNodeDefinitions = [];
            $expectedNodeIds = [];
            foreach ($nodes as $node) {
                if (! is_array($node) || ! is_string($node['id'] ?? null)) {
                    continue;
                }
                if (! is_array($node['required_proofs'] ?? null) || $node['required_proofs'] === []) {
                    continue;
                }
                $nodeId = $node['id'];
                $proofNodeDefinitions[$nodeId] = array_intersect_key($node, array_flip([
                    'id',
                    'ordinal',
                    'title',
                    'description',
                    'node_kind',
                    'required_proofs',
                    'checklist_items',
                    'metric_requirements',
                ]));
                $expectedNodeIds[] = $nodeId;
                $proof = $nodeProofs[$nodeId] ?? null;
                if (! is_array($proof)) {
                    $proof = [];
                }
                $proofNodes[$nodeId] = $this->workExecution->validateAuthoredNodeEvidence(
                    $work,
                    $node,
                    $actorId,
                    $proof,
                    $correlationId,
                );
                $photoEvidenceIds = (array) ($proofNodes[$nodeId]['evidence_file_ids'] ?? []);
                if ($photoEvidenceIds !== []) {
                    $this->nodeEvidence->assertA9PhotoEvidenceForDelivery(
                        (string) $work->id,
                        $nodeId,
                        $actorId,
                        $photoEvidenceIds,
                        $deliveryId,
                        (int) $delivery->version,
                        (int) $work->version,
                        $correlationId,
                    );
                }
                if (array_intersect_key(array_fill_keys($photoEvidenceIds, true), $previousPhotoEvidenceIds) !== []) {
                    throw new OrderError('INVALID_WORK_EVIDENCE', 'A revised A9 delivery needs fresh authored photo proof.', $correlationId, status: 422);
                }
            }
            if (array_diff(array_keys($nodeProofs), $expectedNodeIds) !== []) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'Proof was submitted for a node without authored proof requirements.', $correlationId, status: 422);
            }
            $signatureHash = is_array($structure) && is_string($structure['signature_hash'] ?? null)
                ? $structure['signature_hash']
                : hash('sha256', $this->canonicalJson(['nodes' => $nodes]));
            $files = DB::table('work_deliverable_files as df')
                ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
                ->where('df.work_delivery_id', $deliveryId)
                ->whereNull('ef.deleted_at')
                ->orderBy('df.ordinal')
                ->get(['df.evidence_file_id', 'df.ordinal', 'df.filename', 'ef.media_type', 'ef.size_bytes', 'ef.content_hash', 'ef.scan_status']);
            if ($files->isEmpty()) {
                throw new OrderError('DELIVERY_FILES_REQUIRED', 'Add at least one deliverable before submitting.', $correlationId, status: 422);
            }
            foreach ($files as $file) {
                if ($file->scan_status !== 'clean') {
                    throw new OrderError('DELIVERY_SCAN_PENDING', 'Every deliverable must pass its safety scan before submission.', $correlationId, status: 409);
                }
            }

            $manifestFiles = $files->map(static fn (object $file): array => [
                'file_id' => (string) $file->evidence_file_id,
                'ordinal' => (int) $file->ordinal,
                'filename' => (string) $file->filename,
                'media_type' => (string) $file->media_type,
                'size_bytes' => (int) $file->size_bytes,
                'sha256' => (string) $file->content_hash,
            ])->all();
            $manifest = [
                'version' => (int) $delivery->version,
                'work_instance_id' => (string) $work->id,
                'work_version' => (int) $work->version,
                'work_signature_hash' => $signatureHash,
                'files' => $manifestFiles,
                'node_definitions' => $proofNodeDefinitions,
                'node_proofs' => $proofNodes,
            ];
            $manifestJson = $this->canonicalJson($manifest);
            $manifestHash = hash('sha256', $manifestJson);
            $now = now();
            DB::table('work_deliveries')->where('id', $deliveryId)->update([
                'status' => 'submitted',
                'manifest' => $manifestJson,
                'manifest_hash' => $manifestHash,
                'submitted_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'awaiting_signoff',
                'current_delivery_id' => $deliveryId,
                'awaiting_signoff_at' => $now,
                'updated_at' => $now,
                'row_version' => DB::raw('row_version + 1'),
            ]);
            $this->recordWorkEvent((string) $work->id, (string) $order->id, $actorId, 'work.delivery.submitted', 'in_progress', 'awaiting_signoff', [
                'delivery_id' => $deliveryId,
                'version' => (int) $delivery->version,
                'manifest_hash' => $manifestHash,
            ], $correlationId, $now);
            $customerUserId = (string) $order->buyer_user_id;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $customerUserId,
                eventSourceType: 'work_delivery',
                eventSourceId: $deliveryId,
                eventType: 'work.approval_requested',
                attention: NotificationAttention::NeedsAction,
                title: 'A delivery needs your review',
                body: 'Review the submitted delivery for your Order.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'work.delivery.submitted:'.$deliveryId.':v'.(int) $delivery->version.':'.$customerUserId,
                correlationId: $correlationId,
            ));


            return ['id' => $deliveryId, 'version' => (int) $delivery->version, 'status' => 'submitted', 'manifest_hash' => $manifestHash, 'submitted_at' => $now->toIso8601String()];
        });
    }

    public function requestRevision(string $orderId, string $deliveryId, string $actorId, string $message, string $correlationId): array
    {
        return DB::transaction(function () use ($orderId, $deliveryId, $actorId, $message, $correlationId): array {
            [$order, $work] = $this->lockedWork($orderId, $actorId, 'customer', $correlationId);
            if ((string) $order->buyer_user_id !== $actorId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can request a revision.', $correlationId, status: 403);
            }
            if ($work->work_shape !== 'A9' || $work->status !== 'awaiting_signoff' || (string) $work->current_delivery_id !== $deliveryId) {
                throw new OrderError('DELIVERY_SUPERSEDED', 'That delivery is no longer the current version for review.', $correlationId, status: 409);
            }
            if ((int) $work->revisions_used >= (int) $work->revisions_allowed) {
                throw new OrderError('REVISION_LIMIT_REACHED', 'No revision requests remain for this Work.', $correlationId, status: 409);
            }
            $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->where('work_instance_id', $work->id)->lockForUpdate()->first();
            if ($delivery === null || $delivery->status !== 'submitted') {
                throw new OrderError('DELIVERY_SUPERSEDED', 'That delivery is no longer available for review.', $correlationId, status: 409);
            }
            $this->assertWorkNotHeld($work, $correlationId);

            $number = (int) $work->revisions_used + 1;
            $now = now();
            DB::table('work_revision_requests')->insert([
                'id' => (string) Str::uuid7(),
                'work_instance_id' => (string) $work->id,
                'work_delivery_id' => $deliveryId,
                'requested_by_user_id' => $actorId,
                'revision_number' => $number,
                'message' => $message,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);
            DB::table('work_deliveries')->where('id', $deliveryId)->update(['status' => 'superseded', 'superseded_at' => $now, 'updated_at' => $now]);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'in_progress',
                'current_delivery_id' => null,
                'revisions_used' => $number,
                'awaiting_signoff_at' => null,
                'updated_at' => $now,
                'row_version' => DB::raw('row_version + 1'),
            ]);
            $this->recordWorkEvent((string) $work->id, (string) $order->id, $actorId, 'work.delivery.revision_requested', 'awaiting_signoff', 'in_progress', [
                'delivery_id' => $deliveryId,
                'version' => (int) $delivery->version,
                'revision_number' => $number,
            ], $correlationId, $now);

            return ['delivery_id' => $deliveryId, 'revision_number' => $number, 'revisions_used' => $number, 'revisions_allowed' => (int) $work->revisions_allowed, 'work_status' => 'in_progress'];
        });
    }

    public function accept(string $orderId, string $deliveryId, string $actorId, string $correlationId): array
    {
        return DB::transaction(function () use ($orderId, $deliveryId, $actorId, $correlationId): array {
            [$order, $work] = $this->lockedWork($orderId, $actorId, 'customer', $correlationId);
            if ((string) $order->buyer_user_id !== $actorId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can accept a delivery.', $correlationId, status: 403);
            }
            $this->assertWorkNotHeld($work, $correlationId);
            if ($work->work_shape !== 'A9' || $work->status !== 'awaiting_signoff' || (string) $work->current_delivery_id !== $deliveryId) {
                throw new OrderError('DELIVERY_SUPERSEDED', 'Only the current submitted delivery can be accepted.', $correlationId, status: 409);
            }
            $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->where('work_instance_id', $work->id)->lockForUpdate()->first();
            if ($delivery === null || $delivery->status !== 'submitted') {
                throw new OrderError('DELIVERY_SUPERSEDED', 'Only the current submitted delivery can be accepted.', $correlationId, status: 409);
            }
            $manifest = is_string($delivery->manifest) ? json_decode($delivery->manifest, true) : null;
            $structure = json_decode((string) $work->structure, true);
            $signatureHash = is_array($structure) && is_string($structure['signature_hash'] ?? null)
                ? $structure['signature_hash']
                : (is_array($structure) ? hash('sha256', $this->canonicalJson(['nodes' => $structure['nodes'] ?? []])) : '');
            $expectedProofNodeDefinitions = [];
            $expectedProofNodes = [];
            foreach ((array) ($structure['nodes'] ?? []) as $node) {
                if (! is_array($node) || ! is_string($node['id'] ?? null) || ! is_array($node['required_proofs'] ?? null) || $node['required_proofs'] === []) {
                    continue;
                }
                $expectedProofNodeDefinitions[$node['id']] = array_intersect_key($node, array_flip([
                    'id',
                    'ordinal',
                    'title',
                    'description',
                    'node_kind',
                    'required_proofs',
                    'checklist_items',
                    'metric_requirements',
                ]));
                $expectedProofNodes[$node['id']] = $node;
            }
            $expectedProofNodeIds = array_keys($expectedProofNodeDefinitions);
            sort($expectedProofNodeIds, SORT_STRING);
            $manifestProofNodeIds = is_array($manifest['node_proofs'] ?? null) ? array_keys($manifest['node_proofs']) : [];
            sort($manifestProofNodeIds, SORT_STRING);
            if (
                ! is_array($manifest)
                || ! is_string($delivery->manifest_hash)
                || ! hash_equals((string) $delivery->manifest_hash, hash('sha256', $this->canonicalJson($manifest)))
                || (int) ($manifest['version'] ?? 0) !== (int) $delivery->version
                || (string) ($manifest['work_instance_id'] ?? '') !== (string) $work->id
                || (int) ($manifest['work_version'] ?? 0) !== (int) $work->version
                || ! is_array($manifest['node_definitions'] ?? null)
                || $this->canonicalJson($manifest['node_definitions']) !== $this->canonicalJson($expectedProofNodeDefinitions)
                || ! is_array($manifest['node_proofs'] ?? null)
                || $manifestProofNodeIds !== $expectedProofNodeIds
                || ! hash_equals($signatureHash, (string) ($manifest['work_signature_hash'] ?? ''))
            ) {
                throw new OrderError('DELIVERY_MANIFEST_INVALID', 'The submitted delivery proof manifest is not valid for the current Work version.', $correlationId, status: 409);
            }
            foreach ($expectedProofNodes as $nodeId => $node) {
                $storedProof = $manifest['node_proofs'][$nodeId] ?? null;
                if (! is_array($storedProof)) {
                    throw new OrderError('DELIVERY_MANIFEST_INVALID', 'The submitted delivery proof does not match its authored Work node.', $correlationId, status: 409);
                }
                try {
                    $validatedProof = $this->workExecution->revalidatePersistedAuthoredNodeEvidence(
                        $work,
                        $node,
                        (string) $order->provider_user_id,
                        $storedProof,
                        $correlationId,
                    );
                    $photoEvidenceIds = (array) ($storedProof['evidence_file_ids'] ?? []);
                    if ($photoEvidenceIds !== []) {
                        $this->nodeEvidence->assertA9PhotoEvidenceForDelivery(
                            (string) $work->id,
                            $nodeId,
                            (string) $order->provider_user_id,
                            $photoEvidenceIds,
                            $deliveryId,
                            (int) $delivery->version,
                            (int) $manifest['work_version'],
                            $correlationId,
                        );
                    }
                } catch (OrderError) {
                    throw new OrderError('DELIVERY_MANIFEST_INVALID', 'The submitted delivery proof is no longer valid for its authored Work node.', $correlationId, status: 409);
                }
                if ($this->canonicalJson($validatedProof) !== $this->canonicalJson($storedProof)) {
                    throw new OrderError('DELIVERY_MANIFEST_INVALID', 'The submitted delivery proof has changed since submission.', $correlationId, status: 409);
                }
            }
            $currentFiles = DB::table('work_deliverable_files as df')
                ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
                ->where('df.work_delivery_id', $deliveryId)
                ->orderBy('df.ordinal')
                ->get(['df.evidence_file_id', 'df.ordinal', 'df.filename', 'ef.media_type', 'ef.size_bytes', 'ef.content_hash', 'ef.scan_status', 'ef.deleted_at']);
            $currentManifestFiles = $currentFiles->map(static fn (object $file): array => [
                'file_id' => (string) $file->evidence_file_id,
                'ordinal' => (int) $file->ordinal,
                'filename' => (string) $file->filename,
                'media_type' => (string) $file->media_type,
                'size_bytes' => (int) $file->size_bytes,
                'sha256' => (string) $file->content_hash,
            ])->all();
            if (
                $currentFiles->isEmpty()
                || count($currentFiles) !== DB::table('work_deliverable_files')->where('work_delivery_id', $deliveryId)->count()
                || $currentFiles->contains(static fn (object $file): bool => $file->scan_status !== 'clean' || $file->deleted_at !== null)
                || ! is_array($manifest['files'] ?? null)
                || $this->canonicalJson($manifest['files']) !== $this->canonicalJson($currentManifestFiles)
            ) {
                throw new OrderError('DELIVERY_SCAN_PENDING', 'The submitted clean artifact manifest no longer matches its deliverables.', $correlationId, status: 409);
            }

            $now = now();
            DB::table('work_deliveries')->where('id', $deliveryId)->update(['status' => 'accepted', 'accepted_at' => $now, 'updated_at' => $now]);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'completed',
                'completed_at' => $now,
                'current_delivery_id' => $deliveryId,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
                'row_version' => DB::raw('row_version + 1'),
            ]);
            DB::table('orders')->where('id', $order->id)->update(['status' => 'completed', 'completed_at' => $now, 'version' => DB::raw('version + 1'), 'updated_at' => $now]);
            $this->recordWorkEvent((string) $work->id, (string) $order->id, $actorId, 'work.delivery.accepted', 'awaiting_signoff', 'completed', [
                'delivery_id' => $deliveryId,
                'version' => (int) $delivery->version,
                'manifest_hash' => (string) $delivery->manifest_hash,
            ], $correlationId, $now);
            $this->outbox->enqueue(
                eventType: 'work.completed',
                aggregateType: 'work_instance',
                aggregateId: (string) $work->id,
                payload: [
                    'order_id' => (string) $order->id,
                    'work_instance_id' => (string) $work->id,
                    'delivery_id' => $deliveryId,
                    'delivery_version' => (int) $delivery->version,
                    'manifest_hash' => (string) $delivery->manifest_hash,
                    'completion_actor_user_id' => $actorId,
                    'acceptance_kind' => 'digital_delivery',
                    'work_version' => (int) $work->version + 1,
                ],
                correlationId: $correlationId,
                payloadVersion: 1,
            );
            $this->paymentObligations->markDueFromWorkFact((string) $order->id, (string) $work->id, $correlationId);

            return ['delivery_id' => $deliveryId, 'version' => (int) $delivery->version, 'work_status' => 'completed', 'order_status' => 'completed', 'payment_settlement_status' => 'unchanged'];
        });
    }

    /** @return array{storage_key:string,media_type:string,filename:string,order_id:string} */
    public function downloadableFile(string $orderId, string $deliveryId, string $fileId, string $actorId, string $correlationId): array
    {
        [$order, $work] = $this->participantWork($orderId, $actorId, $correlationId);
        $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->where('work_instance_id', $work->id)->first();
        if ($delivery === null || $delivery->status === 'draft' || (string) $order->buyer_user_id !== $actorId && (string) $order->provider_user_id !== $actorId) {
            throw new OrderError('DELIVERY_FILE_NOT_FOUND', 'The deliverable was not found.', $correlationId, status: 404);
        }
        $file = DB::table('work_deliverable_files as df')
            ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
            ->where('df.work_delivery_id', $deliveryId)
            ->where('ef.id', $fileId)
            ->where('ef.evidence_type', 'work_delivery_artifact')
            ->where('ef.scan_status', 'clean')
            ->whereNull('ef.deleted_at')
            ->first(['ef.storage_key', 'ef.media_type', 'df.filename']);
        if ($file === null) {
            throw new OrderError('DELIVERY_FILE_UNAVAILABLE', 'This deliverable is not available for download until its safety scan is clean.', $correlationId, status: 409);
        }

        return ['storage_key' => (string) $file->storage_key, 'media_type' => (string) $file->media_type, 'filename' => (string) $file->filename, 'order_id' => (string) $order->id];
    }

    /** @return array<string,mixed>|null */
    public function projectForOrder(string $orderId, string $actorId): ?array
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null || ((string) $order->buyer_user_id !== $actorId && (string) $order->provider_user_id !== $actorId)) {
            return null;
        }
        $work = DB::table('work_instances')->where('order_id', $orderId)->first();
        if ($work === null || $work->work_shape !== 'A9') {
            return null;
        }
        $structure = json_decode((string) $work->structure, true);
        $deliveries = DB::table('work_deliveries')->where('work_instance_id', $work->id)->whereIn('status', ['draft', 'submitted', 'accepted', 'superseded'])->orderBy('version')->get();
        $draft = $deliveries->first(static fn (object $delivery): bool => $delivery->status === 'draft');
        $draftEvent = $draft !== null && (string) $order->provider_user_id === $actorId && $work->status === 'in_progress'
            ? DB::table('work_events')
                ->where('work_instance_id', $work->id)
                ->where('event_type', 'work.delivery.draft_created')
                ->where('actor_user_id', $actorId)
                ->whereRaw("payload::jsonb ->> 'delivery_id' = ?", [(string) $draft->id])
                ->orderByDesc('occurred_at')
                ->first()
            : null;
        $draftEventPayload = $draftEvent === null ? null : json_decode((string) $draftEvent->payload, true);
        $canManageCurrentDraftProof = $draft !== null
            && $draftEvent !== null
            && is_array($draftEventPayload)
            && (string) $draft->created_by_user_id === $actorId
            && (string) $work->current_delivery_id === ''
            && (int) ($draftEventPayload['version'] ?? 0) === (int) $draft->version
            && (int) ($draftEventPayload['work_version'] ?? 0) === (int) $work->version;
        $authoredNodes = is_array($structure) && is_array($structure['nodes'] ?? null) ? $structure['nodes'] : [];
        $nodes = $this->nodeEvidence->projectNodes(
            $orderId,
            (string) $work->id,
            $actorId,
            $authoredNodes,
            canViewSubmittedEvidence: true,
            canManageEvidence: $canManageCurrentDraftProof,
            allowLockedNodeEvidenceManagement: $canManageCurrentDraftProof,
            currentDeliveryId: $canManageCurrentDraftProof ? (string) $draft->id : null,
            currentDeliveryVersion: $canManageCurrentDraftProof ? (int) $draft->version : null,
            currentWorkVersion: $canManageCurrentDraftProof ? (int) $work->version : null,
        );
        $filesByDelivery = DB::table('work_deliverable_files as df')
            ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
            ->whereIn('df.work_delivery_id', $deliveries->pluck('id'))
            ->whereNull('ef.deleted_at')
            ->orderBy('df.ordinal')
            ->get(['df.work_delivery_id', 'ef.id', 'df.filename', 'ef.media_type', 'ef.size_bytes', 'ef.scan_status'])
            ->groupBy('work_delivery_id');
        $projected = [];
        foreach ($deliveries as $delivery) {
            $files = $filesByDelivery->get((string) $delivery->id, collect());
            $manifest = is_string($delivery->manifest) ? json_decode($delivery->manifest, true) : null;
            $nodeProofs = is_array($manifest) && is_array($manifest['node_proofs'] ?? null) ? $manifest['node_proofs'] : [];
            foreach ($nodeProofs as $nodeId => &$proof) {
                if (! is_array($proof) || ! is_array($proof['evidence_file_ids'] ?? null)) {
                    continue;
                }
                $proof['photoUrls'] = array_values(array_map(
                    fn (string $evidenceId): string => route('orders.work-evidence.show', ['order' => $orderId, 'evidence' => $evidenceId]),
                    array_filter($proof['evidence_file_ids'], 'is_string'),
                ));
            }
            unset($proof);
            $projected[] = [
                'id' => (string) $delivery->id,
                'version' => (int) $delivery->version,
                'status' => (string) $delivery->status,
                'submittedAt' => $delivery->submitted_at !== null ? (string) $delivery->submitted_at : null,
                'nodeProofs' => $nodeProofs,
                'files' => $files->map(fn (object $file): array => [
                    'id' => (string) $file->id,
                    'name' => (string) $file->filename,
                    'mediaType' => (string) $file->media_type,
                    'sizeBytes' => (int) $file->size_bytes,
                    'scanStatus' => (string) $file->scan_status,
                    'downloadUrl' => $delivery->status !== 'draft' && $file->scan_status === 'clean'
                        ? route('orders.deliveries.files.show', [$orderId, $delivery->id, $file->id])
                        : null,
                ])->all(),
            ];
        }

        $current = null;
        foreach ($projected as $item) {
            if ($item['id'] === (string) $work->current_delivery_id) {
                $current = $item;
                break;
            }
        }

        return [
            'enabled' => true,
            'viewer' => (string) $order->provider_user_id === $actorId ? 'provider' : 'customer',
            'workStatus' => (string) $work->status,
            'revisionsAllowed' => (int) $work->revisions_allowed,
            'revisionsUsed' => (int) $work->revisions_used,
            'nodes' => $nodes,
            'currentDelivery' => $current,
            'deliveries' => $projected,
        ];
    }

    /** @return array<string,mixed>|null */
    private function projectDelivery(string $deliveryId, string $correlationId): ?array
    {
        $delivery = DB::table('work_deliveries')->where('id', $deliveryId)->first();
        if ($delivery === null) {
            return null;
        }

        $files = DB::table('work_deliverable_files as df')
            ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
            ->where('df.work_delivery_id', $deliveryId)
            ->whereNull('ef.deleted_at')
            ->orderBy('df.ordinal')
            ->get(['ef.id', 'df.filename', 'ef.media_type', 'ef.size_bytes', 'ef.scan_status']);

        return [
            'id' => $deliveryId,
            'version' => (int) $delivery->version,
            'status' => (string) $delivery->status,
            'files' => $files->map(static fn (object $file): array => [
                'id' => (string) $file->id,
                'name' => (string) $file->filename,
                'media_type' => (string) $file->media_type,
                'size_bytes' => (int) $file->size_bytes,
                'scan_status' => (string) $file->scan_status,
            ])->all(),
        ];
    }

    private function assertWorkNotHeld(object $work, string $correlationId): void
    {
        if ($this->administrativeHolds->hasActiveHold('work_instance', (string) $work->id)) {
            throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Work instance has an active administrative hold.', $correlationId, status: 409);
        }
    }

    /** @return array{0:object,1:object} */
    private function lockedWork(string $orderId, string $actorId, string $role, string $correlationId): array
    {
        $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
        if ($order === null) {
            throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
        }
        $expectedUser = $role === 'provider' ? (string) $order->provider_user_id : (string) $order->buyer_user_id;
        if ($expectedUser !== $actorId) {
            throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to perform this delivery action.', $correlationId, status: 403);
        }
        $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
        if ($work === null) {
            throw new OrderError('WORK_NOT_FOUND', 'No Work instance exists for this order.', $correlationId, status: 404);
        }

        try {
            $this->workGates->assertWorkCanAdvance((string) $work->id, $correlationId);
        } catch (KernelException $error) {
            throw new OrderError(
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                status: $error->status,
            );
        }

        return [$order, $work];
    }

    /** @return array{0:object,1:object} */
    private function participantWork(string $orderId, string $actorId, string $correlationId): array
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null) {
            throw new OrderError('ORDER_NOT_FOUND', 'Order not found.', $correlationId, status: 404);
        }
        if ((string) $order->provider_user_id !== $actorId && (string) $order->buyer_user_id !== $actorId) {
            throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to access this delivery.', $correlationId, status: 403);
        }
        $work = DB::table('work_instances')->where('order_id', $orderId)->first();
        if ($work === null) {
            throw new OrderError('WORK_NOT_FOUND', 'No Work instance exists for this order.', $correlationId, status: 404);
        }

        return [$order, $work];
    }

    private function assertA9InProgress(object $work, string $correlationId): void
    {
        if ($work->work_shape !== 'A9' || $work->status !== 'in_progress') {
            throw new OrderError('INVALID_STATE', 'A9 delivery can be changed only while Work is in progress.', $correlationId, status: 409);
        }
    }

    private function safeFilename(string $filename, string $extension): string
    {
        $filename = basename(str_replace('\\', '/', $filename));
        $filename = preg_replace('/[^A-Za-z0-9._ -]/u', '_', $filename) ?? '';
        $stem = trim(substr(pathinfo($filename, PATHINFO_FILENAME), 0, 175), '. ');
        if ($stem === '') {
            $stem = 'deliverable';
        }

        return $stem.'.'.$extension;
    }

    /** @param array<string, mixed> $manifest */
    private function canonicalJson(array $manifest): string
    {
        $sort = static function (mixed $value) use (&$sort): mixed {
            if (! is_array($value)) {
                return $value;
            }
            if (! array_is_list($value)) {
                uksort($value, static fn (string|int $left, string|int $right): int => strlen((string) $left) <=> strlen((string) $right) ?: strcmp((string) $left, (string) $right));
            }
            foreach ($value as $key => $item) {
                $value[$key] = $sort($item);
            }

            return $value;
        };

        return json_encode($sort($manifest), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    /** @param array<string,mixed> $payload */
    private function recordWorkEvent(string $workId, string $orderId, string $actorId, string $eventType, string $previousStatus, string $newStatus, array $payload, string $correlationId, mixed $now): void
    {
        $eventId = (string) Str::uuid7();
        DB::table('work_events')->insert([
            'id' => $eventId,
            'work_instance_id' => $workId,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'event_type' => $eventType,
            'event_version' => 1,
            'actor_user_id' => $actorId,
            'evidence_file_id' => null,
            'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'a9_delivery_'.substr(hash('sha256', $eventType.$workId.(string) $payload['delivery_id']), 0, 32),
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        $safeFacts = array_intersect_key($payload, array_flip(['delivery_id', 'version', 'manifest_hash', 'revision_number', 'work_version']));
        $workVersion = (int) DB::table('work_instances')->where('id', $workId)->value('version');
        $orderStatus = (string) DB::table('orders')->where('id', $orderId)->value('status');
        $auditId = $this->audits->record(
            action: $eventType,
            targetType: 'work_instance',
            targetId: $workId,
            correlationId: $correlationId,
            actor: ActorContext::human($actorId),
            commandName: 'A9DeliveryService',
            previous: ['work_status' => $previousStatus],
            next: [
                'work_status' => $newStatus,
                'order_status' => $orderStatus,
                'work_version' => $workVersion,
                ...$safeFacts,
            ],
            reason: 'A9 delivery advanced through its authorized delivery protocol.',
            orderId: $orderId,
        );
        $outboxPayload = [
            'order_id' => $orderId,
            'work_instance_id' => $workId,
            'delivery_id' => (string) $payload['delivery_id'],
            'delivery_version' => (int) ($payload['version'] ?? 0),
            'work_version' => $workVersion,
        ];
        foreach (['manifest_hash', 'revision_number'] as $key) {
            if (array_key_exists($key, $safeFacts)) {
                $outboxPayload[$key] = $safeFacts[$key];
            }
        }
        $outboxEventType = $eventType === 'work.delivery.draft_created' && $previousStatus === 'not_started'
            ? 'work.started'
            : $eventType;
        $this->outbox->enqueue(
            eventType: $outboxEventType,
            aggregateType: 'work_instance',
            aggregateId: $workId,
            payload: $outboxPayload,
            correlationId: $correlationId,
            auditEventId: $auditId,
            eventId: $eventId,
        );

    }
}

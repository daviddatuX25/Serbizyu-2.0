<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

final class LuponHandoffService
{
    private const MAX_RETURN_BYTES = 10 * 1024 * 1024;
    private const ARTIFACTS = [
        'transmittal_letter' => ['filename' => 'lupon-transmittal-letter.html', 'media_type' => 'text/html; charset=utf-8'],
        'exhibit_manifest' => ['filename' => 'lupon-exhibit-manifest.json', 'media_type' => 'application/json'],
        'kasunduan_worksheet' => ['filename' => 'unsigned-kasunduan-worksheet.html', 'media_type' => 'text/html; charset=utf-8'],
    ];

    public function __construct(
        private readonly LuponCaseExhibitReader $exhibits,
        private readonly BoundedImageMetadataParser $metadataParser,
        private readonly \App\Shared\Contracts\LuponReturnedPaperworkPort $returnedPaperwork,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /** @return array{packets:list<array<string, mixed>>,available_exhibits:list<array<string, mixed>>} */
    public function casePackets(string $caseId): array
    {
        $case = DB::table('support_cases')->where('id', $caseId)->first(['id']);
        if ($case === null) {
            return ['packets' => [], 'available_exhibits' => [], 'excluded_exhibits' => []];
        }
        $caseExhibits = $this->exhibits->forCase($caseId);
        $availableExhibits = array_map(static fn (array $file): array => [
            'id' => $file['id'],
            'name' => $file['name'],
            'media_type' => $file['mime_type'],
            'size_bytes' => $file['size_bytes'],
            'sha256' => $file['sha256'],
            'evidence_type' => $file['evidence_type'],
            'created_at' => $file['created_at'],
        ], $caseExhibits['available']);
        $packets = DB::table('lupon_packets')->where('case_id', $caseId)->orderByDesc('created_at')->orderByDesc('id')->get();
        $result = [];
        foreach ($packets as $packet) {
            $artifacts = DB::table('lupon_packet_artifacts')
                ->where('packet_id', $packet->id)
                ->orderBy('created_at')->orderBy('id')->get();
            $artifactItems = $artifacts->map(fn ($artifact): array => [
                'id' => (string) $artifact->id,
                'kind' => (string) $artifact->kind,
                'filename' => (string) $artifact->filename,
                'media_type' => (string) $artifact->media_type,
                'size_bytes' => (int) $artifact->size_bytes,
                'sha256' => (string) $artifact->sha256,
                'metadata' => $this->jsonArray($artifact->metadata),
                'download_url' => '/admin/lupon-packets/'.rawurlencode((string) $packet->id).'/artifacts/'.rawurlencode((string) $artifact->id),
            ])->all();
            $manifest = collect($artifactItems)->firstWhere('kind', 'exhibit_manifest');
            $returnFile = $packet->returned_evidence_file_id === null
                ? null
                : $this->returnedPaperwork->status((string) $packet->returned_evidence_file_id);
            $activeCaseHolds = DB::table('administrative_holds')->where('support_case_id', $caseId)
                ->whereIn('status', ['active', 'reviewing'])->where('effective_at', '<=', now())->count();
            $result[] = [
                'id' => (string) $packet->id,
                'case_id' => (string) $packet->case_id,
                'version' => (int) $packet->version,
                'status' => (string) $packet->status,
                'recipient' => (string) $packet->recipient,
                'transmitted_at' => $this->iso($packet->transmitted_at),
                'return_kind' => $packet->return_kind === null ? null : (string) $packet->return_kind,
                'returned_at' => $this->iso($packet->returned_at),
                'returned_evidence_file_id' => $packet->returned_evidence_file_id === null ? null : (string) $packet->returned_evidence_file_id,
                'returned_paper_scan_status' => $returnFile === null || $returnFile['deleted_at'] !== null ? null : $returnFile['scan_status'],
                'returned_paper_integrity_ok' => $returnFile['integrity_ok'] ?? false,
                'returned_paper_download_url' => $returnFile !== null && $returnFile['deleted_at'] === null
                    && $returnFile['scan_status'] === 'clean' && $returnFile['integrity_ok']
                    ? '/admin/lupon-packets/'.rawurlencode((string) $packet->id).'/returned-paperwork'
                    : null,
                'cabinet_code' => $packet->cabinet_code === null ? null : (string) $packet->cabinet_code,
                'archived_at' => $this->iso($packet->archived_at),
                'active_case_holds' => (int) $activeCaseHolds,
                'archive_eligible' => $packet->status === 'returned'
                    && $returnFile !== null && $returnFile['deleted_at'] === null && $returnFile['scan_status'] === 'clean'
                    && $returnFile['integrity_ok'] && is_string($packet->cabinet_code) && $packet->cabinet_code !== ''
                    && $activeCaseHolds === 0,
                'exhibits' => $manifest === null ? [] : ($manifest['metadata']['exhibits'] ?? []),
                'excluded_exhibits' => $manifest === null ? [] : ($manifest['metadata']['source_exclusions'] ?? []),
                'artifacts' => $artifactItems,
                'events' => DB::table('lupon_packet_events')->where('packet_id', $packet->id)->orderBy('occurred_at')->orderBy('id')
                    ->get(['event_type', 'actor_user_id', 'payload', 'occurred_at'])
                    ->map(fn ($event): array => [
                        'event_type' => (string) $event->event_type,
                        'actor_user_id' => $event->actor_user_id === null ? null : (string) $event->actor_user_id,
                        'payload' => $this->jsonArray($event->payload),
                        'occurred_at' => $this->iso($event->occurred_at),
                    ])->all(),
            ];
        }

        return ['packets' => $result, 'available_exhibits' => $availableExhibits, 'excluded_exhibits' => $caseExhibits['excluded']];
    }

    /** @param list<string> $exhibitFileIds @return array<string, mixed> */
    public function create(
        string $caseId,
        string $actorId,
        int $expectedCaseVersion,
        string $recipient,
        array $exhibitFileIds,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        $this->assertInputText($recipient, 160, 'recipient', $correlationId);
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);
        if ($expectedCaseVersion < 1 || count($exhibitFileIds) > 100 || count($exhibitFileIds) !== count(array_unique($exhibitFileIds))) {
            throw $this->error('LUpon_PACKET_INPUT_INVALID', 'The case version or exhibit selection is invalid.', $correlationId, 422);
        }
        foreach ($exhibitFileIds as $id) {
            if (! is_string($id) || ! Str::isUuid($id)) {
                throw $this->error('LUpon_PACKET_EXHIBIT_INVALID', 'Choose exhibits attached to this case.', $correlationId, 422);
            }
        }
        $scope = 'lupon.create:'.$actorId.':'.$caseId;
        $requestHash = hash('sha256', json_encode([$caseId, $expectedCaseVersion, $recipient, array_values($exhibitFileIds)], JSON_THROW_ON_ERROR));
        $existing = DB::table('lupon_packets')->where('idempotency_scope', $scope)->where('idempotency_key', $idempotencyKey)->first();
        if ($existing !== null) {
            if (! hash_equals((string) $existing->request_hash, $requestHash)) {
                throw $this->error('IDEMPOTENCY_CONFLICT', 'This idempotency key was used with a different packet request.', $correlationId, 409);
            }

            return $this->packet((string) $existing->id);
        }

        $case = DB::table('support_cases')->where('id', $caseId)->first();
        if ($case === null) {
            throw $this->error('SUPPORT_CASE_NOT_FOUND', 'The support case is unavailable.', $correlationId, 404);
        }
        if ((int) $case->version !== $expectedCaseVersion) {
            throw $this->error('STALE_CASE_VERSION', 'The case changed. Refresh before preparing the packet.', $correlationId, 409);
        }
        $caseExhibits = $this->exhibits->forCase($caseId);
        $availableById = [];
        foreach ($caseExhibits['available'] as $file) {
            $availableById[$file['id']] = $file;
        }
        $excludedById = [];
        foreach ($caseExhibits['excluded'] as $excluded) {
            $excludedById[$excluded['id']] = $excluded['reason'];
        }
        foreach ($exhibitFileIds as $evidenceId) {
            if (! isset($availableById[$evidenceId])) {
                $reason = $excludedById[$evidenceId] ?? 'not_attached_to_this_case';
                throw $this->error('LUPON_PACKET_EXHIBIT_INVALID', 'The selected exhibit is unavailable: '.$reason.'.', $correlationId, 422);
            }
        }

        $exhibitFacts = [];
        foreach ($exhibitFileIds as $evidenceId) {
            $source = $availableById[$evidenceId];
            $path = Storage::disk('private')->path($source['storage_key']);
            $actualHash = is_file($path) ? hash_file('sha256', $path) : false;
            $actualSize = is_file($path) ? filesize($path) : false;
            if (! is_string($actualHash) || ! hash_equals($source['sha256'], $actualHash) || $actualSize !== $source['size_bytes']) {
                throw $this->error('LUpon_PACKET_EXHIBIT_CORRUPT', 'An exhibit could not be verified against its stored hash and size.', $correlationId, 409);
            }
            $metadata = $this->metadataParser->inspect($path, $source['mime_type']);
            $exhibitFacts[] = [
                'evidence_file_id' => $source['id'],
                'filename' => $source['name'],
                'media_type' => $source['mime_type'],
                'size_bytes' => $actualSize,
                'sha256' => $actualHash,
                'evidence_type' => $source['evidence_type'],
                'created_at' => $source['created_at'],
                'exif' => $metadata,
            ];
        }

        $packetId = (string) Str::uuid7();
        $now = now();
        $artifacts = $this->renderArtifacts($packetId, $case, $recipient, $exhibitFacts, $caseExhibits['excluded'], $now->toISOString());
        $written = [];
        try {
            foreach ($artifacts as $index => $artifact) {
                $storageKey = "evidence/lupon/{$caseId}/{$packetId}/{$artifact['id']}.".$artifact['extension'];
                $written[] = $storageKey;
                if (! Storage::disk('private')->put($storageKey, $artifact['bytes'])) {
                    throw $this->error('LUPON_PACKET_STORAGE_FAILED', 'The private packet could not be stored.', $correlationId, 503);
                }
                $artifact['storage_key'] = $storageKey;
                $artifact['size_bytes'] = strlen($artifact['bytes']);
                $artifact['sha256'] = hash('sha256', $artifact['bytes']);
                $artifact['created_at'] = $now;
                unset($artifact['bytes'], $artifact['extension']);
                $artifact['metadata'] = json_encode($artifact['metadata'], JSON_THROW_ON_ERROR);
                $artifacts[$index] = $artifact;
            }
            $createdPacketId = DB::transaction(function () use ($caseId, $actorId, $expectedCaseVersion, $recipient, $scope, $idempotencyKey, $requestHash, $correlationId, $packetId, $now, $artifacts, $exhibitFacts): string {
                $lockedCase = DB::table('support_cases')->where('id', $caseId)->lockForUpdate()->first(['id', 'version']);
                if ($lockedCase === null) {
                    throw $this->error('SUPPORT_CASE_NOT_FOUND', 'The support case is unavailable.', $correlationId, 404);
                }
                $existing = DB::table('lupon_packets')->where('idempotency_scope', $scope)->where('idempotency_key', $idempotencyKey)->first(['id', 'request_hash']);
                if ($existing !== null) {
                    if (! hash_equals((string) $existing->request_hash, $requestHash)) {
                        throw $this->error('IDEMPOTENCY_CONFLICT', 'This idempotency key was used with a different packet request.', $correlationId, 409);
                    }

                    return (string) $existing->id;
                }
                if ((int) $lockedCase->version !== $expectedCaseVersion) {
                    throw $this->error('STALE_CASE_VERSION', 'The case changed. Refresh before preparing the packet.', $correlationId, 409);
                }
                DB::table('lupon_packets')->insert([
                    'id' => $packetId, 'case_id' => $caseId, 'version' => 1, 'status' => 'prepared', 'recipient' => $recipient,
                    'idempotency_scope' => $scope, 'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash,
                    'correlation_id' => $correlationId, 'created_at' => $now, 'updated_at' => $now,
                ]);
                foreach ($artifacts as $artifact) {
                    DB::table('lupon_packet_artifacts')->insert([
                        'id' => $artifact['id'], 'packet_id' => $packetId, 'kind' => $artifact['kind'], 'filename' => $artifact['filename'],
                        'media_type' => $artifact['media_type'], 'storage_key' => $artifact['storage_key'], 'size_bytes' => $artifact['size_bytes'],
                        'sha256' => $artifact['sha256'], 'metadata' => $artifact['metadata'], 'created_at' => $now,
                    ]);
                }
                $this->event($packetId, 'packet.prepared', $actorId, ['case_version' => $expectedCaseVersion, 'recipient' => $recipient, 'exhibit_count' => count($exhibitFacts)], 'create:'.hash('sha256', $idempotencyKey), $correlationId, $now);

                return $packetId;
            });
            if ($createdPacketId !== $packetId) {
                foreach ($written as $key) {
                    Storage::disk('private')->delete($key);
                }
                return $this->packet($createdPacketId);
            }
        } catch (Throwable $exception) {
            foreach ($written as $key) {
                Storage::disk('private')->delete($key);
            }
            throw $exception;
        }

        return $this->packet($packetId);
    }

    /** @return array<string, mixed> */
    public function transmit(string $packetId, string $actorId, int $expectedVersion, string $recipient, string $transmittedAt, string $idempotencyKey, string $correlationId): array
    {
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);
        return $this->mutate($packetId, $expectedVersion, 'transmission:'.hash('sha256', $idempotencyKey), $correlationId, function ($packet) use ($actorId, $recipient, $transmittedAt, $idempotencyKey, $correlationId): void {
            if ($packet->status !== 'prepared' || ! hash_equals((string) $packet->recipient, $recipient)) {
                throw $this->error('LUPON_PACKET_STATE_CONFLICT', 'Transmission must match the prepared recipient and packet state.', $correlationId, 409);
            }
            $date = $this->parseEnteredDate($transmittedAt, $correlationId, 'transmitted_at');
            $now = now();
            DB::table('lupon_packets')->where('id', $packet->id)->update([
                'status' => 'transmitted', 'transmitted_at' => $date, 'transmitted_by_user_id' => $actorId,
                'version' => DB::raw('version + 1'), 'updated_at' => $now,
            ]);
            $this->event((string) $packet->id, 'packet.transmitted', $actorId, ['recipient' => $recipient, 'transmitted_at' => $date->format(\DateTimeInterface::ATOM)], 'transmission:'.hash('sha256', $idempotencyKey), $correlationId, $now);
        });
    }

    /** @return array<string, mixed> */
    public function returnedPaperwork(string $packetId, string $actorId, int $expectedVersion, string $returnKind, string $receivedAt, string $cabinetCode, UploadedFile $paperwork, string $idempotencyKey, string $correlationId): array
    {
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);
        $eventKey = 'return:'.hash('sha256', $idempotencyKey);
        if (DB::table('lupon_packet_events')->where('packet_id', $packetId)->where('idempotency_key', $eventKey)->exists()) {
            return $this->packet($packetId);
        }
        if (! in_array($returnKind, ['signed_kasunduan', 'katibayan'], true)) {
            throw $this->error('LUPON_RETURN_KIND_INVALID', 'Choose the actual returned paperwork type.', $correlationId, 422);
        }
        $this->assertInputText($cabinetCode, 80, 'cabinet_code', $correlationId);
        $date = $this->parseEnteredDate($receivedAt, $correlationId, 'received_at');
        $size = $paperwork->getSize();
        $mime = $paperwork->getMimeType();
        if (! is_int($size) || $size < 1 || $size > self::MAX_RETURN_BYTES || ! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw $this->error('LUPON_RETURN_FILE_INVALID', 'Returned paperwork must be a readable JPEG, PNG, or WebP image no larger than 10 MB.', $correlationId, 422);
        }
        $packet = DB::table('lupon_packets')->where('id', $packetId)->first();
        if ($packet === null) {
            throw $this->error('LUPON_PACKET_NOT_FOUND', 'The handoff packet is unavailable.', $correlationId, 404);
        }
        if ((int) $packet->version !== $expectedVersion || $packet->status !== 'transmitted') {
            throw $this->error('LUPON_PACKET_STATE_CONFLICT', 'Only the current transmitted packet can accept returned paperwork.', $correlationId, 409);
        }

        try {
            $stored = $this->returnedPaperwork->store($paperwork, $packetId, $correlationId);
        } catch (Throwable $exception) {
            throw $this->error('LUPON_RETURN_STORAGE_FAILED', 'The returned paperwork could not be stored privately.', $correlationId, 503);
        }
        try {
            $replayed = DB::transaction(function () use ($packetId, $actorId, $expectedVersion, $returnKind, $date, $cabinetCode, $paperwork, $stored, $eventKey, $correlationId): bool {
                $packet = DB::table('lupon_packets')->where('id', $packetId)->lockForUpdate()->first();
                if ($packet === null) {
                    throw $this->error('LUPON_PACKET_NOT_FOUND', 'The handoff packet is unavailable.', $correlationId, 404);
                }
                if (DB::table('lupon_packet_events')->where('packet_id', $packetId)->where('idempotency_key', $eventKey)->exists()) {
                    return true;
                }
                if ((int) $packet->version !== $expectedVersion || $packet->status !== 'transmitted') {
                    throw $this->error('LUPON_PACKET_STATE_CONFLICT', 'Only the current transmitted packet can accept returned paperwork.', $correlationId, 409);
                }
                $now = now();
                $this->returnedPaperwork->register($stored, $actorId, $correlationId);
                DB::table('lupon_packets')->where('id', $packetId)->update([
                    'status' => 'returned', 'return_kind' => $returnKind, 'returned_at' => $date,
                    'returned_evidence_file_id' => $stored['id'], 'cabinet_code' => $cabinetCode,
                    'version' => DB::raw('version + 1'), 'updated_at' => $now,
                ]);
                $this->event($packetId, 'paperwork.returned', $actorId, [
                    'return_kind' => $returnKind, 'received_at' => $date->format(DATE_ATOM),
                    'cabinet_code' => $cabinetCode, 'evidence_file_id' => $stored['id'],
                    'sha256' => $stored['sha256'], 'size_bytes' => $stored['size_bytes'], 'filename' => $stored['filename'],
                ], $eventKey, $correlationId, $now);

                return false;
            });
        } catch (Throwable $exception) {
            $this->returnedPaperwork->deleteStored($stored['storage_key']);
            throw $exception;
        }
        if ($replayed) {
            $this->returnedPaperwork->deleteStored($stored['storage_key']);
        }

        return $this->packet($packetId);
    }

    /** @return array{path:string,filename:string,media_type:string,sha256:string,size_bytes:int} */
    public function returnedPaperworkDownload(string $packetId, string $correlationId): array
    {
        $packet = DB::table('lupon_packets')->where('id', $packetId)->first(['returned_evidence_file_id']);
        if ($packet === null || $packet->returned_evidence_file_id === null) {
            throw $this->error('LUPON_RETURNED_PAPER_NOT_FOUND', 'Returned paperwork is unavailable.', $correlationId, 404);
        }
        $file = $this->returnedPaperwork->status((string) $packet->returned_evidence_file_id);
        if ($file === null || $file['deleted_at'] !== null || $file['scan_status'] !== 'clean' || ! $file['integrity_ok']) {
            throw $this->error('LUPON_RETURNED_PAPER_UNAVAILABLE', 'Returned paperwork must be present, scanner-clean, and hash-verified before download.', $correlationId, 409);
        }
        $event = DB::table('lupon_packet_events')->where('packet_id', $packetId)->where('event_type', 'paperwork.returned')->first(['payload']);
        $payload = $event === null ? [] : $this->jsonArray($event->payload);
        $filename = is_string($payload['filename'] ?? null) ? basename($payload['filename']) : basename($file['storage_key']);

        return [
            'path' => Storage::disk('private')->path($file['storage_key']),
            'filename' => $filename,
            'media_type' => $file['media_type'],
            'sha256' => $file['sha256'],
            'size_bytes' => $file['size_bytes'],
        ];
    }

    /** @return array<string, mixed> */
    public function archive(string $packetId, string $actorId, int $expectedVersion, string $idempotencyKey, string $correlationId): array
    {
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);
        return $this->mutate($packetId, $expectedVersion, 'archive:'.hash('sha256', $idempotencyKey), $correlationId, function ($packet) use ($actorId, $idempotencyKey, $correlationId): void {
            if ($packet->status !== 'returned' || $packet->returned_evidence_file_id === null || $packet->cabinet_code === null) {
                throw $this->error('LUPON_ARCHIVE_REQUIREMENTS_UNMET', 'Archive requires actual returned paperwork and a recorded cabinet code.', $correlationId, 409);
            }
            $paper = $this->returnedPaperwork->status((string) $packet->returned_evidence_file_id);
            if ($paper === null || $paper['deleted_at'] !== null || $paper['scan_status'] !== 'clean' || ! $paper['integrity_ok']) {
                throw $this->error('LUPON_ARCHIVE_SCAN_PENDING', 'Returned paperwork must be present, hash-verified, and pass the existing safety scan before archive.', $correlationId, 409);
            }
            if (DB::table('administrative_holds')->where('support_case_id', (string) $packet->case_id)
                ->whereIn('status', ['active', 'reviewing'])->where('effective_at', '<=', now())
                ->exists()) {
                throw $this->error('LUPON_ARCHIVE_HOLDS_ACTIVE', 'The case cannot be archived until its exact administrative holds have been approved and released.', $correlationId, 409);
            }
            $now = now();
            DB::table('lupon_packets')->where('id', $packet->id)->update([
                'status' => 'archived', 'archived_at' => $now, 'archived_by_user_id' => $actorId,
                'version' => DB::raw('version + 1'), 'updated_at' => $now,
            ]);
            $this->event((string) $packet->id, 'packet.archived', $actorId, ['cabinet_code' => (string) $packet->cabinet_code, 'returned_evidence_file_id' => (string) $packet->returned_evidence_file_id], 'archive:'.hash('sha256', $idempotencyKey), $correlationId, $now);
        });
    }

    /** @return array{path:string,filename:string,media_type:string,sha256:string,size_bytes:int} */
    public function artifact(string $packetId, string $artifactId, string $correlationId): array
    {
        $artifact = DB::table('lupon_packet_artifacts')->where('packet_id', $packetId)->where('id', $artifactId)->first();
        if ($artifact === null) {
            throw $this->error('LUpon_ARTIFACT_NOT_FOUND', 'The packet artifact is unavailable.', $correlationId, 404);
        }
        $path = Storage::disk('private')->path((string) $artifact->storage_key);
        $actualHash = is_file($path) ? hash_file('sha256', $path) : false;
        $actualSize = is_file($path) ? filesize($path) : false;
        if (! is_string($actualHash) || ! hash_equals((string) $artifact->sha256, $actualHash) || $actualSize !== (int) $artifact->size_bytes) {
            throw $this->error('LUpon_ARTIFACT_INTEGRITY_FAILED', 'The private artifact failed its stored hash or size check.', $correlationId, 409);
        }

        return ['path' => $path, 'filename' => (string) $artifact->filename, 'media_type' => (string) $artifact->media_type, 'sha256' => $actualHash, 'size_bytes' => (int) $actualSize];
    }

    /** @return array<string, mixed> */
    private function mutate(string $packetId, int $expectedVersion, string $eventKey, string $correlationId, callable $change): array
    {
        DB::transaction(function () use ($packetId, $expectedVersion, $eventKey, $correlationId, $change): void {
            $packet = DB::table('lupon_packets')->where('id', $packetId)->lockForUpdate()->first();
            if ($packet === null) {
                throw $this->error('LUPON_PACKET_NOT_FOUND', 'The handoff packet is unavailable.', $correlationId, 404);
            }
            if (DB::table('lupon_packet_events')->where('packet_id', $packetId)->where('idempotency_key', $eventKey)->exists()) {
                return;
            }
            if ((int) $packet->version !== $expectedVersion) {
                throw $this->error('STALE_PACKET_VERSION', 'The packet changed. Refresh before continuing.', $correlationId, 409);
            }
            $change($packet);
        });

        return $this->packet($packetId);
    }

    /** @return array<string, mixed> */
    private function packet(string $packetId): array
    {
        $caseId = DB::table('lupon_packets')->where('id', $packetId)->value('case_id');
        if (! is_string($caseId)) {
            return [];
        }
        $workspace = $this->casePackets($caseId);
        foreach ($workspace['packets'] as $packet) {
            if ($packet['id'] === $packetId) {
                return $packet;
            }
        }

        return [];
    }

    /** @param array<string, mixed> $payload */
    private function event(string $packetId, string $eventType, ?string $actorId, array $payload, string $key, string $correlationId, mixed $occurredAt): void
    {
        DB::table('lupon_packet_events')->insert([
            'id' => (string) Str::uuid7(), 'packet_id' => $packetId, 'event_type' => $eventType,
            'actor_user_id' => $actorId, 'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'idempotency_key' => $key, 'correlation_id' => $correlationId, 'occurred_at' => $occurredAt,
        ]);

        $packet = DB::table('lupon_packets')->where('id', $packetId)->first(['case_id', 'version']);
        if ($packet === null) {
            throw new \LogicException('The packet must exist before its governance event is recorded.');
        }
        $caseId = (string) $packet->case_id;
        $version = (int) $packet->version;
        $action = match ($eventType) {
            'packet.prepared' => 'lupon.packet.prepared',
            'packet.transmitted' => 'lupon.packet.transmitted',
            'paperwork.returned' => 'lupon.packet.returned',
            'packet.archived' => 'lupon.packet.archived',
        };
        $facts = [
            'packet_id' => $packetId,
            'packet_version' => $version,
            'event_type' => $eventType,
            ...$payload,
        ];
        $auditId = $this->audits->record(
            action: $action,
            targetType: 'support_case',
            targetId: $caseId,
            correlationId: $correlationId,
            actor: $actorId === null ? ActorContext::system('LuponHandoffService') : ActorContext::human($actorId),
            commandName: 'LuponHandoffService::'.$eventType,
            previous: ['packet_id' => $packetId, 'packet_version' => max(0, $version - 1)],
            next: $facts,
        );
        $this->outbox->enqueue(
            eventType: $action,
            aggregateType: 'support_case',
            aggregateId: $caseId,
            payload: $facts,
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }

    /** @param list<array<string, mixed>> $exhibits @param list<array{id:string,reason:string}> $excludedExhibits @return list<array<string, mixed>> */
    private function renderArtifacts(string $packetId, object $case, string $recipient, array $exhibits, array $excludedExhibits, string $preparedAt): array
    {
        $esc = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $caseReference = (string) ($case->public_reference ?? $case->id);
        $letter = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Case evidence transmittal</title><body><h1>Serbizyu case evidence transmittal</h1><p>Recipient recorded by staff: '.$esc($recipient).'</p><p>Support case reference: '.$esc($caseReference).'</p><p>Prepared at: '.$esc($preparedAt).'</p><p>This packet is an evidentiary record supplied by the platform. Serbizyu is not a judicial authority and makes no finding about the dispute.</p><p>No physical transmission is recorded until staff records that event.</p></body></html>';
        $manifest = json_encode([
            'format' => 'serbizyu-lupon-exhibit-manifest-v1', 'case_reference' => $caseReference, 'prepared_at' => $preparedAt,
            'platform_role' => 'evidentiary_custodian_not_judicial_authority', 'exhibits' => $exhibits,
            'source_exclusions' => $excludedExhibits,
            'selection_scope_note' => 'This manifest contains the exhibits explicitly selected by staff; it is not a complete inventory of every case attachment.',
            'integrity_note' => 'This manifest lists selected source exhibits only; its own hash is stored separately and is not included here.',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $worksheet = '<!doctype html><html lang="tl"><meta charset="utf-8"><title>Unsigned Kasunduan worksheet</title><body><h1>Unsigned Kasunduan worksheet</h1><p>Blank worksheet for completion by the actual participants and authorized barangay officials.</p><p>Case reference: '.$esc($caseReference).'</p><p>No settlement, terms, signature, or judicial finding has been entered by this platform.</p><h2>Terms written by the parties</h2><p>____________________________________________________________________________</p><p>____________________________________________________________________________</p><p>____________________________________________________________________________</p><h2>Signatures</h2><p>Complainant: ______________________________ Date: __________</p><p>Respondent: ______________________________ Date: __________</p><p>Presiding official: _________________________ Date: __________</p><p>Witness: __________________________________ Date: __________</p></body></html>';
        $contents = [
            ['kind' => 'transmittal_letter', 'bytes' => $letter, 'extension' => 'html', 'metadata' => ['format' => 'printable_html', 'recipient' => $recipient]],
            ['kind' => 'exhibit_manifest', 'bytes' => $manifest, 'extension' => 'json', 'metadata' => ['format' => 'json', 'exhibits' => $exhibits, 'source_exclusions' => $excludedExhibits]],
            ['kind' => 'kasunduan_worksheet', 'bytes' => $worksheet, 'extension' => 'html', 'metadata' => ['format' => 'printable_html', 'unsigned' => true]],
        ];

        $artifacts = [];
        foreach ($contents as $content) {
            $id = (string) Str::uuid7();
            $definition = self::ARTIFACTS[$content['kind']];
            $artifacts[] = [
                'id' => $id, 'kind' => $content['kind'], 'filename' => $definition['filename'],
                'media_type' => $definition['media_type'], 'extension' => $content['extension'],
                'bytes' => $content['bytes'], 'metadata' => $content['metadata'],
            ];
        }

        return $artifacts;
    }

    private function assertInputText(string $value, int $maxLength, string $field, string $correlationId): void
    {
        $trimmed = trim($value);
        if ($trimmed === '' || mb_strlen($trimmed) > $maxLength || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', $trimmed) === 1) {
            throw $this->error('LUpon_PACKET_INPUT_INVALID', 'Enter a valid '.$field.'.', $correlationId, 422);
        }
    }

    private function assertIdempotencyKey(string $key, string $correlationId): void
    {
        if ($key === '' || strlen($key) > 120 || preg_match('/^[A-Za-z0-9._:-]+$/D', $key) !== 1) {
            throw $this->error('IDEMPOTENCY_KEY_INVALID', 'The idempotency key is invalid.', $correlationId, 422);
        }
    }

    private function parseEnteredDate(string $value, string $correlationId, string $field): \DateTimeImmutable
    {
        try {
            $date = new \DateTimeImmutable($value);
        } catch (\Throwable) {
            throw $this->error('LUpon_PACKET_DATE_INVALID', 'Enter the actual '.$field.' date and time.', $correlationId, 422);
        }
        if ($date > new \DateTimeImmutable('+5 minutes')) {
            throw $this->error('LUpon_PACKET_DATE_INVALID', 'The entered event time cannot be in the future.', $correlationId, 422);
        }

        return $date;
    }

    private function extensionForMime(string $mime): string
    {
        return match ($mime) {
            'application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
            default => throw new \LogicException('Unsupported return MIME'),
        };
    }

    private function iso(mixed $value): ?string
    {
        return $value === null ? null : \Illuminate\Support\Carbon::parse((string) $value)->toISOString();
    }

    /** @return array<string, mixed> */
    private function jsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (! is_string($value)) {
            return [];
        }
        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function error(string $code, string $message, string $correlationId, int $status): TrustSupportError
    {
        return new TrustSupportError($code, $message, $correlationId, $status);
    }
}

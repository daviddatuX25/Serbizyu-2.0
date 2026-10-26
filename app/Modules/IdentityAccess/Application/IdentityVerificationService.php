<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Contracts\StaffAccessPort;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class IdentityVerificationService
{
    /** @var array<string, array{ladder_level: int, prerequisite_level: int, code: string, label: string, requires_gate: bool}> */
    public const DOCUMENT_TYPES = [
        'barangay_certificate' => [
            'ladder_level' => 2,
            'prerequisite_level' => 1,
            'code' => 'barangay_endorsed',
            'label' => 'Level 2: Barangay Endorsed',
            'requires_gate' => false,
        ],
        'government_id' => [
            'ladder_level' => 3,
            'prerequisite_level' => 2,
            'code' => 'formally_verified',
            'label' => 'Level 3: Formally Verified',
            'requires_gate' => true,
        ],
        'trade_license' => [
            'ladder_level' => 3,
            'prerequisite_level' => 2,
            'code' => 'formally_verified',
            'label' => 'Level 3: Formally Verified',
            'requires_gate' => true,
        ],
    ];

    /** @var array<string, string> */
    public const NON_DISCLOSING_REASONS = [
        'DOCUMENT_UNREADABLE' => 'The submitted document is unreadable, blurry, or low quality.',
        'NAME_MISMATCH' => 'The name on the document does not match the account profile.',
        'DOCUMENT_EXPIRED' => 'The submitted document has expired.',
        'INVALID_DOCUMENT_TYPE' => 'The document provided is not an accepted document type.',
        'INCOMPLETE_DOCUMENT' => 'The document is incomplete, cropped, or missing required pages.',
        'SUSPECTED_ALTERATION' => 'The document cannot be verified in its current state.',
    ];

    /** @var list<string> */
    public const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public function __construct(
        private readonly IdentityVerificationGate $gate,
        private readonly StaffAccessPort $staffAccess,
        private readonly AuditRecorder $auditRecorder,
    ) {}

    /**
     * Submit identity evidence document for verification.
     *
     * @return array<string, mixed>
     *
     * @throws IdentityAccessError
     */
    public function submitEvidence(
        string $userId,
        string $documentType,
        UploadedFile $file,
        string $correlationId,
        ?string $idempotencyKey = null,
    ): array {
        $user = DB::table('users')->where('id', $userId)->first();
        if ($user === null || $user->phone_verified_at === null) {
            throw new IdentityAccessError(
                'PHONE_VERIFICATION_REQUIRED',
                'Mobile phone verification is required before submitting identity evidence.',
                $correlationId,
                status: 422,
            );
        }

        if (! array_key_exists($documentType, self::DOCUMENT_TYPES)) {
            throw new IdentityAccessError(
                'INVALID_DOCUMENT_TYPE',
                "Document type '{$documentType}' is not supported.",
                $correlationId,
                status: 422,
            );
        }

        $docConfig = self::DOCUMENT_TYPES[$documentType];

        // Fail-closed gate for live government-ID collection
        if ($docConfig['requires_gate']) {
            $this->gate->assertLiveCollectionAllowed($correlationId);
        }

        // Monotonic ladder prerequisite check
        $currentTrust = $this->currentTrustLevel($userId);
        if ($currentTrust['level'] < $docConfig['prerequisite_level']) {
            throw new IdentityAccessError(
                'PREREQUISITE_NOT_MET',
                "Level {$docConfig['prerequisite_level']} verification is required before submitting {$documentType}.",
                $correlationId,
                status: 422,
            );
        }

        // MIME validation
        $mime = $file->getMimeType() ?: $file->getClientMimeType() ?: '';
        if (! in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            throw new IdentityAccessError(
                'UNSUPPORTED_MEDIA_TYPE',
                "File type '{$mime}' is not supported. Please upload a PDF or image (JPEG, PNG, WebP).",
                $correlationId,
                status: 422,
            );
        }

        $rawBytes = $file->get();
        $contentHash = hash('sha256', $rawBytes);

        // Idempotency: duplicate submission of identical content while pending
        $existingEvidence = DB::table('evidence_files')
            ->where('owner_user_id', $userId)
            ->where('content_hash', $contentHash)
            ->whereNull('deleted_at')
            ->first();

        if ($existingEvidence !== null) {
            $existingVerification = DB::table('identity_verifications')
                ->where('user_id', $userId)
                ->where('evidence_file_id', $existingEvidence->id)
                ->where('status', 'pending')
                ->first();

            if ($existingVerification !== null) {
                return [
                    'verification_id' => $existingVerification->id,
                    'evidence_id' => $existingEvidence->id,
                    'document_type' => $existingVerification->verification_type,
                    'status' => $existingVerification->status,
                    'created_at' => $existingVerification->created_at,
                    'idempotent_reused' => true,
                ];
            }
        }

        $evidenceId = (string) Str::uuid7();
        $verificationId = (string) Str::uuid7();
        $extension = $file->getClientOriginalExtension() ?: 'pdf';
        $storageKey = "evidence/identity/{$userId}/{$evidenceId}.{$extension}";

        // Persist raw document strictly in private storage
        Storage::disk('private')->put($storageKey, $rawBytes);

        $now = now();

        DB::table('evidence_files')->insert([
            'id' => $evidenceId,
            'owner_user_id' => $userId,
            'storage_key' => $storageKey,
            'media_type' => $mime,
            'size_bytes' => strlen($rawBytes),
            'content_hash' => $contentHash,
            'evidence_type' => $documentType,
            'data_class' => 'RESTRICTED_PII',
            'scan_status' => 'clean',
            'visibility' => 'private',
            'retention_policy' => 'standard_7y',
            'deleted_at' => null,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('identity_verifications')->insert([
            'id' => $verificationId,
            'user_id' => $userId,
            'verification_type' => $documentType,
            'status' => 'pending',
            'provider' => 'manual_review',
            'reviewed_by_user_id' => null,
            'evidence_file_id' => $evidenceId,
            'reason' => null,
            'reviewed_at' => null,
            'retention_class' => 'identity_evidence_p1',
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->auditRecorder->record(
            action: 'identity_evidence.submitted',
            targetType: 'identity_verification',
            targetId: $verificationId,
            correlationId: $correlationId,
            actor: ActorContext::human($userId),
            commandName: 'submit_identity_evidence',
            next: [
                'verification_id' => $verificationId,
                'evidence_id' => $evidenceId,
                'document_type' => $documentType,
            ],
        );

        return [
            'verification_id' => $verificationId,
            'evidence_id' => $evidenceId,
            'document_type' => $documentType,
            'status' => 'pending',
            'created_at' => $now->toISOString(),
        ];
    }

    /**
     * Admin review decisioning (approve or reject with non-disclosing reasons).
     *
     * @return array<string, mixed>
     *
     * @throws IdentityAccessError
     */
    public function reviewVerification(
        string $verificationId,
        string $reviewerUserId,
        string $decision,
        ?string $reasonCode,
        string $correlationId,
    ): array {
        // Enforce administrator role
        if (! $this->staffAccess->canAccessStaff($reviewerUserId)) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'Reviewing verifications requires administrator authorization.',
                $correlationId,
                status: 403,
            );
        }

        $verification = DB::table('identity_verifications')->where('id', $verificationId)->first();
        if ($verification === null) {
            throw new IdentityAccessError(
                'VERIFICATION_NOT_FOUND',
                'Identity verification request not found.',
                $correlationId,
                status: 404,
            );
        }

        // Maker-Checker separation: cannot review own evidence
        if ($verification->user_id === $reviewerUserId) {
            throw new IdentityAccessError(
                'CANNOT_REVIEW_OWN_EVIDENCE',
                'Participants cannot review or approve their own identity verifications.',
                $correlationId,
                status: 403,
            );
        }

        if (! in_array($decision, ['approve', 'reject'], true)) {
            throw new IdentityAccessError(
                'INVALID_DECISION',
                "Review decision must be 'approve' or 'reject'.",
                $correlationId,
                status: 422,
            );
        }

        $newStatus = $decision === 'approve' ? 'approved' : 'rejected';
        $storedReason = null;

        if ($decision === 'reject') {
            if ($reasonCode === null || ! array_key_exists($reasonCode, self::NON_DISCLOSING_REASONS)) {
                throw new IdentityAccessError(
                    'INVALID_REJECTION_REASON',
                    'Rejection reason must be an authorized non-disclosing reason code.',
                    $correlationId,
                    status: 422,
                );
            }
            $storedReason = $reasonCode;
        }

        $now = now();

        DB::table('identity_verifications')
            ->where('id', $verificationId)
            ->update([
                'status' => $newStatus,
                'reviewed_by_user_id' => $reviewerUserId,
                'reviewed_at' => $now,
                'reason' => $storedReason,
                'updated_at' => $now,
                'version' => DB::raw('version + 1'),
            ]);

        $this->auditRecorder->record(
            action: $decision === 'approve' ? 'identity_verification.approved' : 'identity_verification.rejected',
            targetType: 'identity_verification',
            targetId: $verificationId,
            correlationId: $correlationId,
            actor: ActorContext::human($reviewerUserId),
            commandName: 'review_identity_verification',
            previous: ['status' => $verification->status],
            next: ['status' => $newStatus, 'reason' => $storedReason],
            reason: $storedReason,
        );

        return [
            'verification_id' => $verificationId,
            'status' => $newStatus,
            'reviewed_by_user_id' => $reviewerUserId,
            'reviewed_at' => $now->toISOString(),
            'reason' => $storedReason,
        ];
    }

    /**
     * Calculate monotonic verification trust level for a participant.
     *
     * @return array{user_id: string, level: int, code: string, label: string}
     */
    public function currentTrustLevel(string $userId): array
    {
        $user = DB::table('users')->where('id', $userId)->first();
        if ($user === null || $user->phone_verified_at === null) {
            return [
                'user_id' => $userId,
                'level' => 0,
                'code' => 'unverified',
                'label' => 'Level 0: Unverified',
            ];
        }

        // Baseline: Phone verified
        $level = 1;
        $code = 'phone_verified';
        $label = 'Level 1: Phone Verified';

        // Level 2: Barangay Endorsed
        $hasBarangay = DB::table('identity_verifications')
            ->where('user_id', $userId)
            ->whereIn('verification_type', ['barangay_certificate', 'barangay_endorsement'])
            ->where('status', 'approved')
            ->exists();

        if ($hasBarangay) {
            $level = 2;
            $code = 'barangay_endorsed';
            $label = 'Level 2: Barangay Endorsed';

            // Level 3: Formally Verified (requires Level 2 prerequisite)
            $hasFormal = DB::table('identity_verifications')
                ->where('user_id', $userId)
                ->whereIn('verification_type', ['government_id', 'trade_license'])
                ->where('status', 'approved')
                ->exists();

            if ($hasFormal) {
                $level = 3;
                $code = 'formally_verified';
                $label = 'Level 3: Formally Verified';
            }
        }

        return [
            'user_id' => $userId,
            'level' => $level,
            'code' => $code,
            'label' => $label,
        ];
    }

    /**
     * Public trust projection exposing only legitimate trust badge and level.
     *
     * @return array{user_id: string, trust_level: int, trust_badge: string, trust_label: string}
     */
    public function publicTrustProjection(string $userId): array
    {
        $trust = $this->currentTrustLevel($userId);

        return [
            'user_id' => $userId,
            'trust_level' => $trust['level'],
            'trust_badge' => $trust['code'],
            'trust_label' => $trust['label'],
        ];
    }

    /**
     * Owner's purpose-scoped projection of evidence and verifications.
     *
     * @return array<string, mixed>
     */
    public function evidenceProjectionForOwner(string $userId): array
    {
        $items = DB::table('identity_verifications')
            ->leftJoin('evidence_files', 'identity_verifications.evidence_file_id', '=', 'evidence_files.id')
            ->where('identity_verifications.user_id', $userId)
            ->orderByDesc('identity_verifications.created_at')
            ->select([
                'identity_verifications.id as verification_id',
                'identity_verifications.verification_type',
                'identity_verifications.status',
                'identity_verifications.reason as rejection_reason_code',
                'identity_verifications.created_at',
                'identity_verifications.reviewed_at',
                'evidence_files.id as evidence_id',
                'evidence_files.evidence_type',
                'evidence_files.media_type',
                'evidence_files.size_bytes',
                'evidence_files.scan_status',
            ])
            ->get()
            ->map(function ($row): array {
                $displayReason = null;
                if ($row->status === 'rejected' && $row->rejection_reason_code !== null) {
                    $displayReason = self::NON_DISCLOSING_REASONS[$row->rejection_reason_code]
                        ?? 'The submitted document could not be verified.';
                }

                return [
                    'verification_id' => $row->verification_id,
                    'document_type' => $row->verification_type,
                    'status' => $row->status,
                    'rejection_reason_code' => $row->rejection_reason_code,
                    'rejection_reason_display' => $displayReason,
                    'created_at' => $row->created_at,
                    'reviewed_at' => $row->reviewed_at,
                    'evidence' => $row->evidence_id !== null ? [
                        'id' => $row->evidence_id,
                        'media_type' => $row->media_type,
                        'size_bytes' => (int) $row->size_bytes,
                        'scan_status' => $row->scan_status,
                    ] : null,
                ];
            })
            ->all();

        return [
            'trust_level' => $this->currentTrustLevel($userId),
            'items' => $items,
        ];
    }

    /**
     * Retrieve raw evidence file with strict authorization and quarantine check.
     *
     * @return array{content: string, media_type: string, filename: string}
     *
     * @throws IdentityAccessError
     */
    public function downloadRawEvidence(
        string $evidenceFileId,
        string $requestingUserId,
        string $correlationId,
    ): array {
        $evidence = DB::table('evidence_files')->where('id', $evidenceFileId)->first();
        if ($evidence === null || $evidence->deleted_at !== null) {
            throw new IdentityAccessError(
                'EVIDENCE_NOT_FOUND',
                'Evidence file not found or has been deleted.',
                $correlationId,
                status: 404,
            );
        }

        $isOwner = $evidence->owner_user_id === $requestingUserId;
        $isAdmin = $this->staffAccess->canAccessStaff($requestingUserId);

        if (! $isOwner && ! $isAdmin) {
            throw new IdentityAccessError(
                'UNAUTHORIZED_EVIDENCE_ACCESS',
                'You do not have authorization to access this raw evidence file.',
                $correlationId,
                status: 403,
            );
        }

        if ($evidence->scan_status === 'quarantined' || $evidence->scan_status === 'infected') {
            throw new IdentityAccessError(
                'EVIDENCE_QUARANTINED',
                'Evidence file is quarantined and cannot be downloaded.',
                $correlationId,
                status: 403,
            );
        }

        if (! Storage::disk('private')->exists($evidence->storage_key)) {
            throw new IdentityAccessError(
                'EVIDENCE_STORAGE_MISSING',
                'Evidence file is missing from private storage.',
                $correlationId,
                status: 500,
            );
        }

        $content = (string) Storage::disk('private')->get($evidence->storage_key);

        return [
            'content' => $content,
            'media_type' => $evidence->media_type,
            'filename' => basename($evidence->storage_key),
        ];
    }

    /**
     * Purge evidence file adhering to retention schedules and active holds.
     *
     * @throws IdentityAccessError
     */
    public function deleteEvidence(
        string $evidenceFileId,
        string $requestingUserId,
        string $correlationId,
    ): void {
        $evidence = DB::table('evidence_files')->where('id', $evidenceFileId)->first();
        if ($evidence === null || $evidence->deleted_at !== null) {
            throw new IdentityAccessError(
                'EVIDENCE_NOT_FOUND',
                'Evidence file not found or has already been deleted.',
                $correlationId,
                status: 404,
            );
        }

        $isOwner = $evidence->owner_user_id === $requestingUserId;
        $isAdmin = $this->staffAccess->canAccessStaff($requestingUserId);

        if (! $isOwner && ! $isAdmin) {
            throw new IdentityAccessError(
                'UNAUTHORIZED_EVIDENCE_ACCESS',
                'You do not have authorization to delete this evidence file.',
                $correlationId,
                status: 403,
            );
        }

        // Active retention hold check
        $now = now();
        $hasHold = DB::table('retention_holds')
            ->where('evidence_file_id', $evidenceFileId)
            ->where('status', 'active')
            ->where(function ($query) use ($now): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->exists();

        if ($hasHold) {
            throw new IdentityAccessError(
                'RETENTION_HOLD_ACTIVE',
                'Evidence file is protected by an active retention hold and cannot be deleted.',
                $correlationId,
                status: 409,
            );
        }

        // Delete from private disk
        if (Storage::disk('private')->exists($evidence->storage_key)) {
            Storage::disk('private')->delete($evidence->storage_key);
        }

        // Soft delete marker
        DB::table('evidence_files')
            ->where('id', $evidenceFileId)
            ->update([
                'deleted_at' => $now,
                'updated_at' => $now,
                'version' => DB::raw('version + 1'),
            ]);
    }

    /**
     * Place a retention hold on an evidence file.
     *
     * @throws IdentityAccessError
     */
    public function placeRetentionHold(
        string $evidenceFileId,
        string $holdType,
        string $reason,
        string $placedByUserId,
        string $correlationId,
    ): string {
        if (! $this->staffAccess->canAccessStaff($placedByUserId)) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'Placing retention holds requires administrator authorization.',
                $correlationId,
                status: 403,
            );
        }

        $evidence = DB::table('evidence_files')->where('id', $evidenceFileId)->first();
        if ($evidence === null) {
            throw new IdentityAccessError(
                'EVIDENCE_NOT_FOUND',
                'Evidence file not found.',
                $correlationId,
                status: 404,
            );
        }

        $holdId = (string) Str::uuid7();
        $now = now();

        DB::table('retention_holds')->insert([
            'id' => $holdId,
            'evidence_file_id' => $evidenceFileId,
            'target_type' => 'evidence_file',
            'target_id' => $evidenceFileId,
            'hold_type' => $holdType,
            'status' => 'active',
            'reason' => $reason,
            'placed_by_user_id' => $placedByUserId,
            'released_by_user_id' => null,
            'starts_at' => $now,
            'expires_at' => null,
            'released_at' => null,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $holdId;
    }

    /**
     * Release an active retention hold.
     *
     * @throws IdentityAccessError
     */
    public function releaseRetentionHold(
        string $holdId,
        string $releasedByUserId,
        string $correlationId,
    ): void {
        if (! $this->staffAccess->canAccessStaff($releasedByUserId)) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'Releasing retention holds requires administrator authorization.',
                $correlationId,
                status: 403,
            );
        }

        $hold = DB::table('retention_holds')->where('id', $holdId)->first();
        if ($hold === null) {
            throw new IdentityAccessError(
                'HOLD_NOT_FOUND',
                'Retention hold not found.',
                $correlationId,
                status: 404,
            );
        }

        $now = now();

        DB::table('retention_holds')
            ->where('id', $holdId)
            ->where('status', 'active')
            ->update([
                'status' => 'released',
                'released_by_user_id' => $releasedByUserId,
                'released_at' => $now,
                'updated_at' => $now,
            ]);
    }
}

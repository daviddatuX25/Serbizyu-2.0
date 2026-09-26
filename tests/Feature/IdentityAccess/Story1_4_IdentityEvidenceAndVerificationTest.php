<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Models\User;
use App\Modules\IdentityAccess\Application\IdentityVerificationGate;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PDOException;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * Story 1.4 Acceptance Criteria Test Suite:
 * Submit and Review Identity Evidence Safely (PRD-002, PRD-003, PRD-037, PRD-071, PRD-075; UX-DR14)
 *
 * Given an authenticated participant submitting identity documents (Barangay certificate, Government ID)
 * When the evidence is uploaded and reviewed
 * Then raw documents are stored in private storage, purpose-scoped redacted projections are created,
 *      verification level updates monotonically (Level 1 -> Level 2 -> Level 3), and audit events record reviewer attribution
 * And unauthorized viewers cannot access raw evidence, rejection records explicit non-disclosing reasons,
 *     and retention schedules are enforced.
 */
final class Story1_4_IdentityEvidenceAndVerificationTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    private RoleAssignmentService $roleService;

    private IdentityVerificationGate $verificationGate;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Story 1.4 tests require PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
        $this->roleService = app(RoleAssignmentService::class);
        $this->verificationGate = app(IdentityVerificationGate::class);

        Storage::fake('private');
        Storage::fake('local');
    }

    private function createParticipant(
        bool $phoneVerified = true,
        string $status = 'active',
        ?string $displayName = 'Maria Dela Cruz',
        string $serviceArea = 'Tagudin',
    ): User {
        $now = now();
        $user = User::factory()->create([
            'status' => $status,
            'phone_verified_at' => $phoneVerified ? $now : null,
            'password' => Hash::make('Password123!'),
        ]);

        DB::table('user_profiles')->where('user_id', $user->id)->update([
            'display_name' => $displayName ?? '',
            'service_area_display' => $serviceArea,
            'updated_at' => $now,
        ]);

        return $user;
    }

    private function createAdmin(string $displayName = 'Officer Reyes'): User
    {
        $admin = $this->createParticipant(phoneVerified: true, displayName: $displayName);
        $correlationId = (string) Str::uuid7();
        $now = now();

        DB::table('role_assignments')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => $admin->id,
            'role_code' => 'admin',
            'status' => 'active',
            'granted_by_user_id' => $admin->id,
            'effective_at' => $now,
            'expires_at' => null,
            'scope' => json_encode(['access' => 'compliance_reviewer']),
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $admin;
    }

    public function test_submission_of_identity_evidence_with_private_disk_storage(): void
    {
        $participant = $this->createParticipant(phoneVerified: true);

        $fileContent = 'BARANGAY CLEARANCE CERTIFICATE CONTENT - OFFICIAL DOCUMENT 2026';
        $file = UploadedFile::fake()->createWithContent('barangay_clearance.pdf', $fileContent);

        $response = $this->actingAs($participant)
            ->post('/account/identity/evidence', [
                'document_type' => 'barangay_certificate',
                'file' => $file,
            ], [
                'Accept' => 'application/json',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('data.document_type', 'barangay_certificate');
        $response->assertJsonStructure([
            'data' => [
                'verification_id',
                'evidence_id',
                'document_type',
                'status',
                'created_at',
            ],
        ]);

        // Assert that the raw storage key is NOT exposed in the client response
        self::assertArrayNotHasKey('storage_key', $response->json('data'));

        $evidenceId = $response->json('data.evidence_id');
        $verificationId = $response->json('data.verification_id');

        // Check evidence_files table
        $evidence = DB::table('evidence_files')->where('id', $evidenceId)->first();
        self::assertNotNull($evidence);
        self::assertSame($participant->id, $evidence->owner_user_id);
        self::assertSame('barangay_certificate', $evidence->evidence_type);
        self::assertSame('RESTRICTED_PII', $evidence->data_class);
        self::assertSame('private', $evidence->visibility);
        self::assertSame('clean', $evidence->scan_status);
        self::assertSame(hash('sha256', $fileContent), $evidence->content_hash);

        // Check identity_verifications table
        $verification = DB::table('identity_verifications')->where('id', $verificationId)->first();
        self::assertNotNull($verification);
        self::assertSame($participant->id, $verification->user_id);
        self::assertSame('barangay_certificate', $verification->verification_type);
        self::assertSame('pending', $verification->status);
        self::assertSame($evidenceId, $verification->evidence_file_id);

        // Verify storage on private disk, missing on public disk
        Storage::disk('private')->assertExists($evidence->storage_key);
        Storage::disk('public')->assertMissing($evidence->storage_key);
    }

    public function test_government_id_submission_fail_closed_under_privacy_gate(): void
    {
        $participant = $this->createParticipant(phoneVerified: true);

        // First grant Level 2 so participant satisfies prerequisite
        $admin = $this->createAdmin();
        $file = UploadedFile::fake()->createWithContent('barangay.pdf', 'Barangay Cert');
        $subResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertCreated();

        $verId = $subResp->json('data.verification_id');
        $this->actingAs($admin)->postJson("/admin/identity-verifications/{$verId}/review", [
            'decision' => 'approve',
        ])->assertOk();

        // When live government ID collection is disabled
        config()->set('serbizyu.identity.live_government_id_collection', false);

        $govIdFile = UploadedFile::fake()->createWithContent('gov_id.pdf', 'National ID Content');
        $deniedResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'government_id',
            'file' => $govIdFile,
        ], ['Accept' => 'application/json']);

        $deniedResp->assertStatus(403);
        $deniedResp->assertJsonPath('code', 'CAPABILITY_DISABLED');

        // When live collection is enabled
        config()->set('serbizyu.identity.live_government_id_collection', true);

        $allowedResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'government_id',
            'file' => $govIdFile,
        ], ['Accept' => 'application/json']);

        $allowedResp->assertCreated();
        $allowedResp->assertJsonPath('data.status', 'pending');
        $allowedResp->assertJsonPath('data.document_type', 'government_id');
    }

    public function test_monotonic_advancement_enforces_prerequisites_and_ladder(): void
    {
        // 1. Unverified user (no verified phone) cannot submit evidence
        $unverified = $this->createParticipant(phoneVerified: false);
        $certFile = UploadedFile::fake()->createWithContent('cert.pdf', 'Sample Certificate');

        $blockedResp = $this->actingAs($unverified)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $certFile,
        ], ['Accept' => 'application/json']);

        $blockedResp->assertStatus(422);
        $blockedResp->assertJsonPath('code', 'PHONE_VERIFICATION_REQUIRED');

        // 2. Phone verified user is baseline Level 1
        $participant = $this->createParticipant(phoneVerified: true);
        $lvlResp = $this->actingAs($participant)->getJson('/account/identity/trust-level');
        $lvlResp->assertOk();
        $lvlResp->assertJsonPath('data.level', 1);
        $lvlResp->assertJsonPath('data.code', 'phone_verified');
        $lvlResp->assertJsonPath('data.label', 'Level 1: Phone Verified');

        // 3. Level 1 user attempts Level 3 directly (submitting government_id without Level 2)
        config()->set('serbizyu.identity.live_government_id_collection', true);
        $govFile = UploadedFile::fake()->createWithContent('id.pdf', 'ID bytes');
        $prereqResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'government_id',
            'file' => $govFile,
        ], ['Accept' => 'application/json']);

        $prereqResp->assertStatus(422);
        $prereqResp->assertJsonPath('code', 'PREREQUISITE_NOT_MET');

        // 4. Submitting Barangay certificate and receiving approval advances to Level 2
        $bgyResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $certFile,
        ], ['Accept' => 'application/json'])->assertCreated();

        $bgyVerId = $bgyResp->json('data.verification_id');
        $admin = $this->createAdmin();

        $this->actingAs($admin)->postJson("/admin/identity-verifications/{$bgyVerId}/review", [
            'decision' => 'approve',
        ])->assertOk();

        $lvl2Resp = $this->actingAs($participant)->getJson('/account/identity/trust-level');
        $lvl2Resp->assertOk();
        $lvl2Resp->assertJsonPath('data.level', 2);
        $lvl2Resp->assertJsonPath('data.code', 'barangay_endorsed');
        $lvl2Resp->assertJsonPath('data.label', 'Level 2: Barangay Endorsed');

        // 5. Level 2 user submits Government ID and receives approval -> advances to Level 3
        $govResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'government_id',
            'file' => $govFile,
        ], ['Accept' => 'application/json'])->assertCreated();

        $govVerId = $govResp->json('data.verification_id');
        $this->actingAs($admin)->postJson("/admin/identity-verifications/{$govVerId}/review", [
            'decision' => 'approve',
        ])->assertOk();

        $lvl3Resp = $this->actingAs($participant)->getJson('/account/identity/trust-level');
        $lvl3Resp->assertOk();
        $lvl3Resp->assertJsonPath('data.level', 3);
        $lvl3Resp->assertJsonPath('data.code', 'formally_verified');
        $lvl3Resp->assertJsonPath('data.label', 'Level 3: Formally Verified');
    }

    public function test_rejection_records_explicit_non_disclosing_reasons_and_preserves_monotonic_level(): void
    {
        config()->set('serbizyu.identity.live_government_id_collection', true);
        $participant = $this->createParticipant(phoneVerified: true);
        $admin = $this->createAdmin();

        // Advance participant to Level 2
        $bgyFile = UploadedFile::fake()->createWithContent('bgy.pdf', 'Barangay clearance');
        $bgyResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $bgyFile,
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->actingAs($admin)->postJson('/admin/identity-verifications/'.$bgyResp->json('data.verification_id').'/review', [
            'decision' => 'approve',
        ])->assertOk();

        // Level 2 verified
        self::assertSame(2, $this->actingAs($participant)->getJson('/account/identity/trust-level')->json('data.level'));

        // Participant submits Government ID for Level 3
        $govFile = UploadedFile::fake()->createWithContent('gov.pdf', 'Unreadable blurred ID scan');
        $govResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'government_id',
            'file' => $govFile,
        ], ['Accept' => 'application/json'])->assertCreated();

        $govVerId = $govResp->json('data.verification_id');

        // Reviewer attempts to submit an arbitrary / disclosing rejection reason
        $disclosingResp = $this->actingAs($admin)->postJson("/admin/identity-verifications/{$govVerId}/review", [
            'decision' => 'reject',
            'reason' => 'DISCLOSING_POLICE_DATABASE_HIT_FLAG_44',
        ]);
        $disclosingResp->assertStatus(422);
        $disclosingResp->assertJsonPath('code', 'INVALID_REJECTION_REASON');

        // Reviewer submits an authorized non-disclosing reason code
        $validReject = $this->actingAs($admin)->postJson("/admin/identity-verifications/{$govVerId}/review", [
            'decision' => 'reject',
            'reason' => 'DOCUMENT_UNREADABLE',
        ]);
        $validReject->assertOk();
        $validReject->assertJsonPath('data.status', 'rejected');

        // Check verification in DB
        $verRow = DB::table('identity_verifications')->where('id', $govVerId)->first();
        self::assertNotNull($verRow);
        self::assertSame('rejected', $verRow->status);
        self::assertSame('DOCUMENT_UNREADABLE', $verRow->reason);

        // Check owner's purpose-scoped projection receives sanitized safe explanation
        $ownerProjection = $this->actingAs($participant)->getJson('/account/identity/evidence');
        $ownerProjection->assertOk();
        $items = $ownerProjection->json('data.items');
        $rejectedItem = collect($items)->firstWhere('verification_id', $govVerId);
        self::assertNotNull($rejectedItem);
        self::assertSame('rejected', $rejectedItem['status']);
        self::assertSame('DOCUMENT_UNREADABLE', $rejectedItem['rejection_reason_code']);
        self::assertSame(
            'The submitted document is unreadable, blurry, or low quality.',
            $rejectedItem['rejection_reason_display']
        );

        // Monotonic preservation: rejection of Level 3 attempt DOES NOT demote the user below Level 2!
        $trustResp = $this->actingAs($participant)->getJson('/account/identity/trust-level');
        $trustResp->assertOk();
        $trustResp->assertJsonPath('data.level', 2);
        $trustResp->assertJsonPath('data.code', 'barangay_endorsed');
    }

    public function test_reviewer_decisioning_with_immutable_reviewer_attribution_and_maker_checker(): void
    {
        $participant = $this->createParticipant(phoneVerified: true);
        $otherParticipant = $this->createParticipant(phoneVerified: true, displayName: 'Regular Buyer');
        $admin = $this->createAdmin(displayName: 'Compliance Admin');

        $file = UploadedFile::fake()->createWithContent('bgy.pdf', 'Document text');
        $subResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertCreated();

        $verId = $subResp->json('data.verification_id');

        // 1. Regular participant without admin role cannot review verifications
        $unauthorizedReview = $this->actingAs($otherParticipant)->postJson("/admin/identity-verifications/{$verId}/review", [
            'decision' => 'approve',
        ]);
        $unauthorizedReview->assertStatus(403);
        $unauthorizedReview->assertJsonPath('code', 'AUTHORIZATION_DENIED');

        // 2. Maker-Checker Separation: Admin participant cannot approve their own verification
        $adminFile = UploadedFile::fake()->createWithContent('admin_bgy.pdf', 'Admin personal cert');
        $adminSelfSub = $this->actingAs($admin)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $adminFile,
        ], ['Accept' => 'application/json'])->assertCreated();

        $adminSelfVerId = $adminSelfSub->json('data.verification_id');

        $selfReviewResp = $this->actingAs($admin)->postJson("/admin/identity-verifications/{$adminSelfVerId}/review", [
            'decision' => 'approve',
        ]);
        $selfReviewResp->assertStatus(403);
        $selfReviewResp->assertJsonPath('code', 'CANNOT_REVIEW_OWN_EVIDENCE');

        // 3. Authorized independent admin review succeeds with immutable attribution
        $correlationHeader = (string) Str::uuid7();
        $approveResp = $this->actingAs($admin)->withHeader('X-Correlation-Id', $correlationHeader)
            ->postJson("/admin/identity-verifications/{$verId}/review", [
                'decision' => 'approve',
            ]);

        $approveResp->assertOk();

        $verDb = DB::table('identity_verifications')->where('id', $verId)->first();
        self::assertSame('approved', $verDb->status);
        self::assertSame($admin->id, $verDb->reviewed_by_user_id);
        self::assertNotNull($verDb->reviewed_at);

        // Audit event record exists with reviewer attribution
        $auditEvent = DB::table('audit_events')
            ->where('target_type', 'identity_verification')
            ->where('target_id', $verId)
            ->where('action', 'identity_verification.approved')
            ->first();

        self::assertNotNull($auditEvent);
        self::assertSame($admin->id, $auditEvent->actor_user_id);
        self::assertNotNull($auditEvent->occurred_at);

        // Verify PostgreSQL append-only guard protects audit event from updates/deletes
        $this->expectException(PDOException::class);
        DB::table('audit_events')->where('id', $auditEvent->id)->update(['action' => 'tampered_action']);
    }

    public function test_privacy_protection_unauthorized_viewers_cannot_access_raw_evidence(): void
    {
        $owner = $this->createParticipant(phoneVerified: true, displayName: 'Sita Cruz');
        $stranger = $this->createParticipant(phoneVerified: true, displayName: 'Curious Buyer');
        $admin = $this->createAdmin();

        $rawSecret = 'SENSITIVE DOCUMENT CONTENT WITH BARANGAY OFFICIAL STAMP 2026';
        $file = UploadedFile::fake()->createWithContent('clearance.pdf', $rawSecret);

        $subResp = $this->actingAs($owner)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertCreated();

        $evidenceId = $subResp->json('data.evidence_id');
        $verId = $subResp->json('data.verification_id');

        // 1. Stranger participant is denied raw document access
        $strangerAccess = $this->actingAs($stranger)->get("/account/identity/evidence/{$evidenceId}/file");
        $strangerAccess->assertStatus(403);
        $strangerAccess->assertJsonPath('code', 'UNAUTHORIZED_EVIDENCE_ACCESS');

        // 2. Unauthenticated guest is denied
        $guestAccess = $this->get("/account/identity/evidence/{$evidenceId}/file");
        self::assertTrue($guestAccess->isRedirect() || $guestAccess->status() === 401 || $guestAccess->status() === 403);

        // 3. Document owner can download raw evidence
        $ownerAccess = $this->actingAs($owner)->get("/account/identity/evidence/{$evidenceId}/file");
        $ownerAccess->assertOk();
        self::assertSame($rawSecret, $ownerAccess->streamedContent());

        // 4. Authorized admin reviewer can download raw evidence
        $adminAccess = $this->actingAs($admin)->get("/account/identity/evidence/{$evidenceId}/file");
        $adminAccess->assertOk();
        self::assertSame($rawSecret, $adminAccess->streamedContent());

        // 5. Quarantined evidence is blocked even for owner
        DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'quarantined']);
        $quarantinedResp = $this->actingAs($owner)->get("/account/identity/evidence/{$evidenceId}/file");
        $quarantinedResp->assertStatus(403);
        $quarantinedResp->assertJsonPath('code', 'EVIDENCE_QUARANTINED');

        // Reset to clean and approve
        DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'clean']);
        $this->actingAs($admin)->postJson("/admin/identity-verifications/{$verId}/review", ['decision' => 'approve'])->assertOk();

        // 6. Public trust profile contains strictly non-sensitive level/badge and no file IDs or paths
        $publicProfile = $this->getJson("/users/{$owner->id}/trust-profile");
        $publicProfile->assertOk();
        $publicProfile->assertJsonPath('data.trust_level', 2);
        $publicProfile->assertJsonPath('data.trust_badge', 'barangay_endorsed');
        $publicProfile->assertJsonPath('data.trust_label', 'Level 2: Barangay Endorsed');

        $publicData = $publicProfile->json('data');
        self::assertArrayNotHasKey('evidence_file_id', $publicData);
        self::assertArrayNotHasKey('storage_key', $publicData);
        self::assertArrayNotHasKey('raw_url', $publicData);
    }

    public function test_idempotency_and_anti_tamper_safeguards(): void
    {
        $participant = $this->createParticipant(phoneVerified: true);

        $fileContent = 'IDENTICAL FILE CONTENT FOR IDEMPOTENCY CHECK';
        $fileA = UploadedFile::fake()->createWithContent('bgy.pdf', $fileContent);
        $fileB = UploadedFile::fake()->createWithContent('bgy_duplicate.pdf', $fileContent);

        // 1. Initial submission
        $firstResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $fileA,
        ], ['Accept' => 'application/json'])->assertCreated();

        $initialVerId = $firstResp->json('data.verification_id');
        $initialEvidenceId = $firstResp->json('data.evidence_id');

        // 2. Resubmitting identical file while verification is still pending reuses the existing record idempotently
        $secondResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $fileB,
        ], ['Accept' => 'application/json']);

        $secondResp->assertOk();
        $secondResp->assertJsonPath('data.verification_id', $initialVerId);
        $secondResp->assertJsonPath('data.evidence_id', $initialEvidenceId);
        $secondResp->assertJsonPath('data.idempotent_reused', true);

        // Assert database count did not duplicate
        $count = DB::table('evidence_files')->where('owner_user_id', $participant->id)->count();
        self::assertSame(1, $count);

        // 3. Reject unsupported media type / malicious executable
        $badFile = UploadedFile::fake()->createWithContent('script.sh', '#!/bin/bash\nrm -rf /');
        $badResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $badFile,
        ], ['Accept' => 'application/json']);

        $badResp->assertStatus(422);
        $badResp->assertJsonPath('code', 'UNSUPPORTED_MEDIA_TYPE');
    }

    public function test_retention_schedules_and_retention_holds_enforcement(): void
    {
        $participant = $this->createParticipant(phoneVerified: true);
        $admin = $this->createAdmin();

        $file = UploadedFile::fake()->createWithContent('cert.pdf', 'Retained certificate bytes');
        $subResp = $this->actingAs($participant)->post('/account/identity/evidence', [
            'document_type' => 'barangay_certificate',
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertCreated();

        $evidenceId = $subResp->json('data.evidence_id');
        $evidence = DB::table('evidence_files')->where('id', $evidenceId)->first();
        self::assertNotNull($evidence);
        self::assertSame('standard_7y', $evidence->retention_policy);

        // 1. Admin places an active retention hold on the evidence file
        $holdResp = $this->actingAs($admin)->postJson('/admin/identity/retention-holds', [
            'evidence_file_id' => $evidenceId,
            'hold_type' => 'legal_compliance',
            'reason' => 'Audit requirement under BSP compliance verification',
        ]);
        $holdResp->assertCreated();
        $holdId = $holdResp->json('data.id');

        // 2. Deletion attempt while retention hold is active is blocked with 409
        $deleteBlocked = $this->actingAs($participant)->deleteJson("/account/identity/evidence/{$evidenceId}");
        $deleteBlocked->assertStatus(409);
        $deleteBlocked->assertJsonPath('code', 'RETENTION_HOLD_ACTIVE');

        // 3. Direct PostgreSQL delete is blocked by database trigger
        $triggerBlocked = false;
        DB::beginTransaction();
        try {
            DB::table('evidence_files')->where('id', $evidenceId)->delete();
        } catch (PDOException $e) {
            $triggerBlocked = str_contains($e->getMessage(), 'protected by an active retention hold');
        } finally {
            DB::rollBack();
        }
        self::assertTrue($triggerBlocked, 'Expected PostgreSQL trigger prevent_evidence_delete_under_retention_hold to throw 55000');
        // 4. Admin releases the retention hold
        $releaseResp = $this->actingAs($admin)->deleteJson("/admin/identity/retention-holds/{$holdId}");
        $releaseResp->assertOk();
        $releaseResp->assertJsonPath('data.status', 'released');

        // 5. Deletion now succeeds
        $deleteAllowed = $this->actingAs($participant)->deleteJson("/account/identity/evidence/{$evidenceId}");
        $deleteAllowed->assertOk();
        $deleteAllowed->assertJsonPath('data.status', 'deleted');

        // Verify storage file is removed and deleted_at is recorded
        Storage::disk('private')->assertMissing($evidence->storage_key);
        $deletedRow = DB::table('evidence_files')->where('id', $evidenceId)->first();
        self::assertNotNull($deletedRow->deleted_at);
    }
}

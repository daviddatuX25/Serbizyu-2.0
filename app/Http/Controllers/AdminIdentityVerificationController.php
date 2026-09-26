<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\IdentityVerificationService;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AdminIdentityVerificationController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly RoleAssignmentService $roles,
        private readonly IdentityVerificationService $verificationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $reviewerId = $this->session->requireUser($request, $correlationId);
            if (! $this->roles->hasActive($reviewerId, 'admin')) {
                throw new IdentityAccessError(
                    'AUTHORIZATION_DENIED',
                    'Reviewing verifications requires administrator authorization.',
                    $correlationId,
                    status: 403,
                );
            }

            $verifications = DB::table('identity_verifications')
                ->where('status', 'pending')
                ->orderBy('created_at')
                ->limit(50)
                ->get();

            return response()->json([
                'data' => [
                    'items' => $verifications,
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function review(Request $request, string $id): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $reviewerId = $this->session->requireUser($request, $correlationId);
            $decision = (string) $request->input('decision', '');
            $reason = $request->input('reason');
            if (is_array($reason)) {
                $reason = null;
            }

            $result = $this->verificationService->reviewVerification(
                verificationId: $id,
                reviewerUserId: $reviewerId,
                decision: $decision,
                reasonCode: $reason !== null ? (string) $reason : null,
                correlationId: $correlationId,
            );

            return response()->json([
                'data' => $result,
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function createRetentionHold(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $adminId = $this->session->requireUser($request, $correlationId);
            $evidenceFileId = (string) $request->input('evidence_file_id', '');
            $holdType = (string) $request->input('hold_type', 'legal_compliance');
            $reason = (string) $request->input('reason', '');

            if ($evidenceFileId === '') {
                throw new IdentityAccessError(
                    'VALIDATION_FAILED',
                    'Evidence file ID is required.',
                    $correlationId,
                    status: 422,
                );
            }

            $holdId = $this->verificationService->placeRetentionHold(
                evidenceFileId: $evidenceFileId,
                holdType: $holdType,
                reason: $reason,
                placedByUserId: $adminId,
                correlationId: $correlationId,
            );

            return response()->json([
                'data' => [
                    'id' => $holdId,
                    'evidence_file_id' => $evidenceFileId,
                    'status' => 'active',
                ],
            ], 201, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function releaseRetentionHold(Request $request, string $id): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $adminId = $this->session->requireUser($request, $correlationId);
            $this->verificationService->releaseRetentionHold($id, $adminId, $correlationId);

            return response()->json([
                'data' => [
                    'id' => $id,
                    'status' => 'released',
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    private function correlationId(Request $request): string
    {
        $header = $request->header('X-Correlation-Id');
        if (is_string($header) && $header !== '') {
            return $header;
        }

        $attr = $request->attributes->get('correlation_id');
        if (is_string($attr) && $attr !== '') {
            return $attr;
        }

        return (string) Str::uuid7();
    }
}

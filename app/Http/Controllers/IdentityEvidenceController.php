<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\IdentityVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class IdentityEvidenceController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly IdentityVerificationService $verificationService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);

            $documentType = trim((string) $request->input('document_type', ''));
            $file = $request->file('file');

            if ($documentType === '') {
                throw new IdentityAccessError(
                    'VALIDATION_FAILED',
                    'Document type is required.',
                    $correlationId,
                    status: 422,
                );
            }

            if ($file === null || ! $file->isValid()) {
                throw new IdentityAccessError(
                    'VALIDATION_FAILED',
                    'A valid file must be uploaded.',
                    $correlationId,
                    status: 422,
                );
            }

            $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
            if (is_array($idempotencyKey)) {
                $idempotencyKey = null;
            }

            $result = $this->verificationService->submitEvidence(
                userId: $userId,
                documentType: $documentType,
                file: $file,
                correlationId: $correlationId,
                idempotencyKey: $idempotencyKey !== null ? (string) $idempotencyKey : null,
            );

            $statusCode = ! empty($result['idempotent_reused']) ? 200 : 201;

            return response()->json([
                'data' => $result,
            ], $statusCode, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $projection = $this->verificationService->evidenceProjectionForOwner($userId);

            return response()->json([
                'data' => $projection,
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function download(Request $request, string $id): Response
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $fileData = $this->verificationService->downloadRawEvidence($id, $userId, $correlationId);

            return response()->stream(static function () use ($fileData): void {
                echo $fileData['content'];
            }, 200, [
                'Content-Type' => $fileData['media_type'],
                'Content-Disposition' => "attachment; filename=\"{$fileData['filename']}\"",
                'X-Correlation-Id' => $correlationId,
            ]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $this->verificationService->deleteEvidence($id, $userId, $correlationId);

            return response()->json([
                'data' => [
                    'evidence_id' => $id,
                    'status' => 'deleted',
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function trustLevel(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $trust = $this->verificationService->currentTrustLevel($userId);

            return response()->json([
                'data' => $trust,
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    public function publicTrustProfile(Request $request, string $userId): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $projection = $this->verificationService->publicTrustProjection($userId);

        return response()->json([
            'data' => $projection,
        ], 200, ['X-Correlation-Id' => $correlationId]);
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

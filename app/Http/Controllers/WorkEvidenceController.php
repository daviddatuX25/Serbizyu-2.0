<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\WorkNodeEvidenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class WorkEvidenceController extends Controller
{
    public function store(
        Request $request,
        string $order,
        string $node,
        CurrentSession $session,
        WorkNodeEvidenceService $evidence,
    ): JsonResponse {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'file' => ['required', 'file', 'max:10240'],
                'tool_key' => ['required', 'string', 'in:photo_proof'],
            ]);

            $uploaded = $evidence->uploadPhoto(
                orderId: $order,
                nodeId: $node,
                actorUserId: $actorUserId,
                file: $validated['file'],
                correlationId: $correlationId,
            );

            return response()->json(['data' => $uploaded], 201, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function show(
        Request $request,
        string $order,
        string $evidence,
        CurrentSession $session,
        WorkNodeEvidenceService $evidenceService,
    ): StreamedResponse|JsonResponse {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $session->requireUser($request, $correlationId);
            $file = $evidenceService->downloadableEvidence(
                orderId: $order,
                evidenceFileId: $evidence,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
            );
            $stream = Storage::disk('private')->readStream($file['storage_key']);
            if (! is_resource($stream)) {
                throw new OrderError('EVIDENCE_STORAGE_MISSING', 'The evidence file is unavailable.', $correlationId, status: 503);
            }

            return response()->stream(static function () use ($stream): void {
                try {
                    fpassthru($stream);
                } finally {
                    fclose($stream);
                }
            }, 200, [
                'Content-Type' => $file['media_type'],
                'Content-Disposition' => 'inline; filename="'.$file['filename'].'"',
                'Cache-Control' => 'private, no-store, max-age=0',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'X-Content-Type-Options' => 'nosniff',
                'Cross-Origin-Resource-Policy' => 'same-origin',
                'Referrer-Policy' => 'no-referrer',
                'X-Correlation-Id' => $correlationId,
            ]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    private function correlationId(Request $request): string
    {
        $correlationId = $request->attributes->get('correlation_id');

        return is_string($correlationId) && $correlationId !== '' ? $correlationId : (string) Str::uuid7();
    }

    private function failure(IdentityAccessError|OrderError $error): JsonResponse
    {
        return response()->json(
            $error->envelope->toArray(),
            $error->status,
            ['X-Correlation-Id' => (string) $error->envelope->correlationId],
        );
    }
}

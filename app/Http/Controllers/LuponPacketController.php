<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\TrustSupport\Application\LuponHandoffService;
use App\Modules\TrustSupport\Application\TrustSupportError;
use App\Shared\Contracts\StaffAccessPort;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class LuponPacketController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly StaffAccessPort $staffAccess,
        private readonly LuponHandoffService $packets,
    ) {}

    public function create(Request $request, string $case): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $this->staffActor($request, $correlationId);
            $validated = $request->validate([
                'expected_case_version' => ['required', 'integer', 'min:1'],
                'recipient' => ['required', 'string', 'max:160'],
                'exhibit_file_ids' => ['sometimes', 'array', 'max:100'],
                'exhibit_file_ids.*' => ['required', 'uuid', 'distinct'],
                'idempotency_key' => ['required', 'string', 'max:120'],
            ]);
            $packet = $this->packets->create(
                $case,
                $actorId,
                (int) $validated['expected_case_version'],
                (string) $validated['recipient'],
                $validated['exhibit_file_ids'] ?? [],
                (string) $validated['idempotency_key'],
                $correlationId,
            );

            return response()->json(['data' => ['packet' => $packet]], 201, ['X-Correlation-Id' => $correlationId]);
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    public function artifact(Request $request, string $packet, string $artifact): BinaryFileResponse|JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $this->staffActor($request, $correlationId);
            $download = $this->packets->artifact($packet, $artifact, $correlationId);

            $response = response()->download($download['path'], $download['filename'], [
                'Content-Type' => $download['media_type'],
                'X-Content-SHA256' => $download['sha256'],
                'X-Content-Length' => (string) $download['size_bytes'],
                'X-Correlation-Id' => $correlationId,
                'X-Content-Type-Options' => 'nosniff',
            ]);
            $response->setPrivate();
            $response->headers->set('Cache-Control', 'private, no-store');

            return $response;
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    public function returnedPaperworkFile(Request $request, string $packet): BinaryFileResponse|JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $this->staffActor($request, $correlationId);
            $download = $this->packets->returnedPaperworkDownload($packet, $correlationId);

            $response = response()->download($download['path'], $download['filename'], [
                'Content-Type' => $download['media_type'],
                'X-Content-SHA256' => $download['sha256'],
                'X-Content-Length' => (string) $download['size_bytes'],
                'X-Correlation-Id' => $correlationId,
                'X-Content-Type-Options' => 'nosniff',
            ]);
            $response->setPrivate();
            $response->headers->set('Cache-Control', 'private, no-store');

            return $response;
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    public function transmit(Request $request, string $packet): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $this->staffActor($request, $correlationId);
            $validated = $request->validate([
                'expected_version' => ['required', 'integer', 'min:1'],
                'recipient' => ['required', 'string', 'max:160'],
                'transmitted_at' => ['required', 'date'],
                'idempotency_key' => ['required', 'string', 'max:120'],
            ]);
            $result = $this->packets->transmit(
                $packet,
                $actorId,
                (int) $validated['expected_version'],
                (string) $validated['recipient'],
                (string) $validated['transmitted_at'],
                (string) $validated['idempotency_key'],
                $correlationId,
            );

            return response()->json(['data' => ['packet' => $result]], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    public function returnedPaperwork(Request $request, string $packet): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $this->staffActor($request, $correlationId);
            $validated = $request->validate([
                'expected_version' => ['required', 'integer', 'min:1'],
                'return_kind' => ['required', 'in:signed_kasunduan,katibayan'],
                'received_at' => ['required', 'date'],
                'cabinet_code' => ['required', 'string', 'max:80'],
                'paperwork' => ['required', 'file', 'max:10240', 'mimetypes:image/jpeg,image/png,image/webp'],
                'idempotency_key' => ['required', 'string', 'max:120'],
            ]);
            $result = $this->packets->returnedPaperwork(
                $packet,
                $actorId,
                (int) $validated['expected_version'],
                (string) $validated['return_kind'],
                (string) $validated['received_at'],
                (string) $validated['cabinet_code'],
                $validated['paperwork'],
                (string) $validated['idempotency_key'],
                $correlationId,
            );

            return response()->json(['data' => ['packet' => $result]], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    public function archive(Request $request, string $packet): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $this->staffActor($request, $correlationId);
            $validated = $request->validate([
                'expected_version' => ['required', 'integer', 'min:1'],
                'idempotency_key' => ['required', 'string', 'max:120'],
            ]);
            $result = $this->packets->archive(
                $packet,
                $actorId,
                (int) $validated['expected_version'],
                (string) $validated['idempotency_key'],
                $correlationId,
            );

            return response()->json(['data' => ['packet' => $result]], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (TrustSupportError $error) {
            return $this->errorResponse($error, $correlationId);
        }
    }

    private function staffActor(Request $request, string $correlationId): string
    {
        $actorId = $this->session->requireUser($request, $correlationId);
        if (! $this->staffAccess->canAccessStaff($actorId)) {
            throw new TrustSupportError('AUTHORIZATION_DENIED', 'Lupon packet access requires active staff authorization.', $correlationId, 403);
        }

        return $actorId;
    }

    private function correlationId(Request $request): string
    {
        $header = $request->header('X-Correlation-Id');
        if (is_string($header) && $header !== '') {
            return $header;
        }
        $attribute = $request->attributes->get('correlation_id');

        return is_string($attribute) && $attribute !== '' ? $attribute : (string) Str::uuid7();
    }

    private function errorResponse(TrustSupportError $error, string $correlationId): JsonResponse
    {
        return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
    }
}

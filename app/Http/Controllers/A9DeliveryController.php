<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\OrdersWork\Application\A9DeliveryService;
use App\Modules\OrdersWork\Application\OrderError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class A9DeliveryController extends Controller
{
    public function create(Request $request, string $order, CurrentSession $session, A9DeliveryService $deliveries): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);

            return response()->json(['data' => $deliveries->createDraft($order, $actorId, $correlationId)], 201, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function upload(Request $request, string $order, string $delivery, CurrentSession $session, A9DeliveryService $deliveries): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'files' => ['required', 'array', 'min:1', 'max:12'],
                'files.*' => ['required', 'file', 'max:25600', 'mimes:jpg,jpeg,png,webp,pdf,txt'],
            ]);
            $uploaded = $deliveries->uploadFiles($order, $delivery, $actorId, array_values($validated['files']), $correlationId);

            return response()->json(['data' => $uploaded], 201, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function submit(Request $request, string $order, string $delivery, CurrentSession $session, A9DeliveryService $deliveries): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);
            $nodeProofs = $request->input('node_proofs', []);
            if (! is_array($nodeProofs)) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'Node proofs must be submitted as an object keyed by authored node ID.', $correlationId, status: 422);
            }

            return response()->json(['data' => $deliveries->submit($order, $delivery, $actorId, $correlationId, $nodeProofs)], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function requestRevision(Request $request, string $order, CurrentSession $session, A9DeliveryService $deliveries): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'delivery_id' => ['required', 'uuid'],
                'message' => ['required', 'string', 'min:1', 'max:2000'],
            ]);
            $result = $deliveries->requestRevision($order, $validated['delivery_id'], $actorId, trim($validated['message']), $correlationId);

            return response()->json(['data' => $result], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function accept(Request $request, string $order, string $delivery, CurrentSession $session, A9DeliveryService $deliveries): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);

            return response()->json(['data' => $deliveries->accept($order, $delivery, $actorId, $correlationId)], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function download(Request $request, string $order, string $delivery, string $file, CurrentSession $session, A9DeliveryService $deliveries): StreamedResponse|JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $session->requireUser($request, $correlationId);
            $artifact = $deliveries->downloadableFile($order, $delivery, $file, $actorId, $correlationId);
            $stream = Storage::disk('private')->readStream($artifact['storage_key']);
            if (! is_resource($stream)) {
                throw new OrderError('DELIVERY_STORAGE_MISSING', 'The deliverable is unavailable.', $correlationId, status: 503);
            }

            return response()->stream(static function () use ($stream): void {
                try {
                    fpassthru($stream);
                } finally {
                    fclose($stream);
                }
            }, 200, [
                'Content-Type' => $artifact['media_type'],
                'Content-Disposition' => 'attachment; filename="'.addcslashes($artifact['filename'], '"\\').'"',
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
        return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => (string) $error->envelope->correlationId]);
    }
}

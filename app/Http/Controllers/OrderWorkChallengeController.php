<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\WorkClearanceChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class OrderWorkChallengeController extends Controller
{
    public function issue(
        Request $request,
        string $order,
        string $node,
        CurrentSession $session,
        WorkClearanceChallengeService $challenges,
    ): JsonResponse {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $session->requireUser($request, $correlationId);
            if ($request->all() !== []) {
                throw new OrderError('INVALID_CHALLENGE_REQUEST', 'Challenge type and participants are derived from the accepted Work node.', $correlationId, status: 422);
            }

            return response()->json([
                'data' => $challenges->issue($order, $actorUserId, $node, $correlationId),
            ], 201, $this->privateHeaders($correlationId));
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    public function verify(
        Request $request,
        string $order,
        string $node,
        string $challenge,
        CurrentSession $session,
        WorkClearanceChallengeService $challenges,
    ): JsonResponse {
        $correlationId = $this->correlationId($request);

        try {
            $actorUserId = $session->requireUser($request, $correlationId);
            $validated = $request->validate([
                'code' => ['required', 'string', 'regex:/\A[0-9]{4,6}\z/'],
                'work_version' => ['required', 'integer', 'min:1'],
            ]);
            $result = $challenges->verify(
                orderId: $order,
                actorUserId: $actorUserId,
                nodeId: $node,
                challengeId: $challenge,
                code: $validated['code'],
                expectedWorkVersion: (int) $validated['work_version'],
                correlationId: $correlationId,
            );

            return response()->json(['data' => $result], 200, $this->privateHeaders($correlationId));
        } catch (IdentityAccessError|OrderError $error) {
            return $this->failure($error);
        }
    }

    private function correlationId(Request $request): string
    {
        $candidate = $request->header('X-Correlation-Id') ?? $request->attributes->get('correlation_id');

        return is_string($candidate) && $candidate !== '' ? $candidate : (string) Str::uuid7();
    }

    /** @return array<string, string> */
    private function privateHeaders(string $correlationId): array
    {
        return [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'X-Correlation-Id' => $correlationId,
        ];
    }

    private function failure(IdentityAccessError|OrderError $error): JsonResponse
    {
        return response()->json(
            $error->envelope->toArray(),
            $error->status,
            $this->privateHeaders((string) $error->envelope->correlationId),
        );
    }
}

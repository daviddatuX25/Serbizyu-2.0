<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class CapabilityController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly RoleAssignmentService $roles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        return response()->json([
            'data' => [
                'user_id' => $userId,
                'active_roles' => $this->roles->activeRoleCodes($userId),
                'capabilities' => $this->roles->activeCapabilities($userId),
                'readiness' => $this->roles->readinessState($userId),
                'purpose_specific_actions' => $this->roles->purposeSpecificActions($userId),
            ],
        ], 200, ['X-Correlation-Id' => $correlationId]);
    }

    public function store(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        $role = trim((string) ($request->input('role') ?? $request->input('capability') ?? ''));
        if ($role === '') {
            return response()->json([
                'code' => 'VALIDATION_FAILED',
                'message' => 'A valid capability role is required.',
                'correlation_id' => $correlationId,
                'retryable' => false,
                'field_errors' => ['role' => ['The role field is required.']],
            ], 422, ['X-Correlation-Id' => $correlationId]);
        }

        $scope = is_array($request->input('scope')) ? $request->input('scope') : [];

        try {
            $this->roles->ensureActive($userId, $role, $correlationId, $scope);

            return response()->json([
                'data' => [
                    'user_id' => $userId,
                    'active_roles' => $this->roles->activeRoleCodes($userId),
                    'capabilities' => $this->roles->activeCapabilities($userId),
                    'readiness' => $this->roles->readinessState($userId),
                    'purpose_specific_actions' => $this->roles->purposeSpecificActions($userId),
                ],
            ], 200, ['X-Correlation-Id' => $correlationId]);
        } catch (IdentityAccessError $error) {
            return response()->json(
                $error->envelope->toArray(),
                $error->status,
                ['X-Correlation-Id' => (string) $error->envelope->correlationId],
            );
        }
    }

    public function destroy(Request $request, string $role): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        $this->roles->revoke($userId, $role, $correlationId);

        return response()->json([
            'data' => [
                'user_id' => $userId,
                'active_roles' => $this->roles->activeRoleCodes($userId),
                'capabilities' => $this->roles->activeCapabilities($userId),
                'readiness' => $this->roles->readinessState($userId),
                'purpose_specific_actions' => $this->roles->purposeSpecificActions($userId),
            ],
        ], 200, ['X-Correlation-Id' => $correlationId]);
    }

    public function readiness(Request $request): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        $userId = $this->session->requireUser($request, $correlationId);

        $readiness = $this->roles->readinessState($userId);

        return response()->json([
            'data' => array_merge($readiness, [
                'user_id' => $userId,
                'capabilities' => $this->roles->activeCapabilities($userId),
                'purpose_specific_actions' => $this->roles->purposeSpecificActions($userId),
            ]),
        ], 200, ['X-Correlation-Id' => $correlationId]);
    }

    private function correlationId(Request $request): string
    {
        $id = $request->attributes->get('correlation_id');
        if (is_string($id) && $id !== '') {
            return $id;
        }

        $header = $request->header('X-Correlation-Id');
        if (is_string($header) && $header !== '') {
            return $header;
        }

        $id = (string) Str::uuid7();
        $request->attributes->set('correlation_id', $id);

        return $id;
    }
}

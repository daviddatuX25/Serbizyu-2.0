<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\TrustSupport\Application\AdministrativeHoldService;
use App\Modules\TrustSupport\Application\SupportCaseService;
use App\Modules\TrustSupport\Application\TrustSupportError;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Application\KernelException;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class StaffGovernanceController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly StaffAccessPort $staffAccess,
    ) {}

    public function assign(Request $request, string $case, SupportCaseService $cases): JsonResponse
    {
        $input = $request->validate(['expected_version' => 'required|integer|min:1', 'assignee_user_id' => 'required|uuid', 'idempotency_key' => 'required|string|max:255']);
        return $this->respond($request, fn (string $actor, string $correlation) => $cases->assign($case, $actor, $input['assignee_user_id'], (int) $input['expected_version'], $input['idempotency_key'], $correlation));
    }

    public function resolve(Request $request, string $case, SupportCaseService $cases): JsonResponse
    {
        $input = $request->validate(['expected_version' => 'required|integer|min:1', 'resolution' => 'required|string|max:2000', 'idempotency_key' => 'required|string|max:255']);
        return $this->respond($request, fn (string $actor, string $correlation) => $cases->resolve($case, $actor, $input['resolution'], (int) $input['expected_version'], $input['idempotency_key'], $correlation));
    }

    public function requestApproval(Request $request, AdministrativeHoldService $holds): JsonResponse
    {
        $input = $request->validate([
            'case_id' => 'required|uuid', 'command_type' => 'required|in:administrative_hold.place,administrative_hold.release', 'checker_user_id' => 'required|uuid',
            'target_kind' => 'required|in:order,work_instance,payment_obligation', 'target_id' => 'required|uuid', 'expected_target_version' => 'required|integer|min:1',
            'reason_class' => 'required|in:dispute,fraud,safety,legal,provider,operational', 'reason' => 'required|string|max:2000', 'idempotency_key' => 'required|string|max:255',
            'hold_id' => 'required_if:command_type,administrative_hold.release|nullable|uuid', 'expected_hold_version' => 'required_if:command_type,administrative_hold.release|nullable|integer|min:1',
            'release_conditions' => 'sometimes|array|max:10', 'release_conditions.*' => 'string|max:500',
        ]);
        return $this->respond($request, fn (string $actor, string $correlation) => $holds->requestApproval($input, $actor, $correlation), 201);
    }

    public function approve(Request $request, string $approval, AdministrativeHoldService $holds): JsonResponse
    {
        return $this->respond($request, fn (string $actor, string $correlation) => $holds->approve($approval, $actor, $correlation));
    }

    public function execute(Request $request, string $approval, AdministrativeHoldService $holds): JsonResponse
    {
        return $this->respond($request, fn (string $actor, string $correlation) => $holds->execute($approval, $actor, $correlation));
    }

    /** @param Closure(string,string):array<string,mixed> $operation */
    private function respond(Request $request, Closure $operation, int $status = 200): JsonResponse
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorId = $this->session->requireUser($request, $correlationId);
            if (! $this->staffAccess->canAccessStaff($actorId)) {
                throw new TrustSupportError('AUTHORIZATION_DENIED', 'Governance commands require active staff authorization.', $correlationId, 403);
            }
            return response()->json(['data' => $operation($actorId, $correlationId)], $status, ['X-Correlation-Id' => $correlationId]);
        } catch (TrustSupportError $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        } catch (KernelException $error) {
            return response()->json($error->envelope->toArray(), $error->status, ['X-Correlation-Id' => $correlationId]);
        }
    }

    private function correlationId(Request $request): string
    {
        $header = $request->header('X-Correlation-Id');
        if (is_string($header) && $header !== '') return $header;
        $attribute = $request->attributes->get('correlation_id');
        return is_string($attribute) && $attribute !== '' ? $attribute : (string) Str::uuid7();
    }
}

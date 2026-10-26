<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\TrustSupport\Application\CommunicationsService;
use App\Shared\Application\KernelException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

final class CommunicationsController extends Controller
{
    public function __construct(private readonly CommunicationsService $communications) {}

    public function openOrder(Request $request, string $order): JsonResponse
    {
        $context = $this->actingContext($request);
        return $this->jsonResponse(fn (): array => ['data' => $this->communications->openOrder(
            $order, $this->actorId(), $context['owner_user_id'] ?? null, $context['consent_grant_id'] ?? null, $this->correlationId($request),
        )], 201);
    }

    public function openRelay(Request $request, string $dealChain): JsonResponse
    {
        $context = $this->actingContext($request);
        return $this->jsonResponse(fn (): array => ['data' => $this->communications->openRelay(
            $dealChain, $this->actorId(), $context['owner_user_id'] ?? null, $context['consent_grant_id'] ?? null, $this->correlationId($request),
        )], 201);
    }

    public function openCase(Request $request, string $case): JsonResponse
    {
        $context = $this->actingContext($request);
        return $this->jsonResponse(fn (): array => ['data' => $this->communications->openCase(
            $case, $this->actorId(), $context['owner_user_id'] ?? null, $context['consent_grant_id'] ?? null, $this->correlationId($request),
        )], 201);
    }

    public function createCase(Request $request): JsonResponse
    {
        $input = $request->validate([
            'order_id' => ['required', 'uuid'],
            'category' => ['required', 'in:fulfillment,payment,cancellation,other'],
            'content' => ['required', 'string', 'min:1', 'max:10000'],
            'idempotency_key' => ['required', 'string', 'max:200'],
            'owner_user_id' => ['nullable', 'uuid'],
            'consent_grant_id' => ['nullable', 'uuid'],
        ]);
        return $this->jsonResponse(fn (): array => ['data' => $this->communications->createCase(
            $input, $this->actorId(), $input['owner_user_id'] ?? null,
            $input['consent_grant_id'] ?? null, $this->correlationId($request),
        )], 201);
    }

    public function show(Request $request, string $conversation): Response
    {
        $context = $this->actingContext($request);
        try {
            $meta = $this->communications->show(
                $conversation, $this->actorId(), $context['owner_user_id'] ?? null,
                $context['consent_grant_id'] ?? null, $this->correlationId($request),
            );
        } catch (KernelException $error) {
            abort($error->status, $error->getMessage());
        }

        return Inertia::render('Conversations/Show', ['conversation' => $meta]);
    }

    public function messages(Request $request, string $conversation): JsonResponse
    {
        $input = $request->validate([
            'owner_user_id' => ['nullable', 'uuid'],
            'consent_grant_id' => ['nullable', 'uuid'],
            'before_sequence' => ['nullable', 'integer', 'min:1'],
            'after_sequence' => ['nullable', 'integer', 'min:0'],
        ]);
        $beforeSequence = isset($input['before_sequence']) ? (int) $input['before_sequence'] : null;
        $afterSequence = isset($input['after_sequence']) ? (int) $input['after_sequence'] : null;
        return $this->jsonResponse(fn (): array => $this->communications->messages(
            $conversation, $this->actorId(), $input['owner_user_id'] ?? null, $input['consent_grant_id'] ?? null,
            $beforeSequence, $afterSequence, $this->correlationId($request),
        ));
    }

    public function storeMessage(Request $request, string $conversation): JsonResponse
    {
        $input = $request->validate([
            'idempotency_key' => ['required', 'string', 'max:200'],
            'content' => ['present', 'nullable', 'string', 'max:10000'],
            'attachment_evidence_file_id' => ['nullable', 'uuid'],
            'audience' => ['required', 'in:participants,staff_internal'],
            'owner_user_id' => ['nullable', 'uuid'],
            'consent_grant_id' => ['nullable', 'uuid'],
        ]);
        return $this->jsonResponse(fn (): array => $this->communications->sendMessage(
            $conversation, $this->actorId(), $input, $input['owner_user_id'] ?? null,
            $input['consent_grant_id'] ?? null, $this->correlationId($request),
        ), 201);
    }

    public function downloadAttachment(Request $request, string $conversation, string $evidence): JsonResponse|\Illuminate\Http\Response
    {
        $context = $this->actingContext($request);
        try {
            $file = $this->communications->downloadAttachment(
                $conversation, $evidence, $this->actorId(), $context['owner_user_id'] ?? null,
                $context['consent_grant_id'] ?? null, $this->correlationId($request),
            );
        } catch (KernelException $error) {
            return $this->errorResponse($error);
        }

        return response($file['content'], 200, [
            'Content-Type' => $file['mime_type'],
            'Content-Disposition' => 'attachment; filename="'.addslashes($file['name']).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** @return array{owner_user_id?:string,consent_grant_id?:string} */
    private function actingContext(Request $request): array
    {
        return $request->validate([
            'owner_user_id' => ['nullable', 'uuid'],
            'consent_grant_id' => ['nullable', 'uuid'],
        ]);
    }

    private function jsonResponse(callable $operation, int $status = 200): JsonResponse
    {
        try {
            return response()->json($operation(), $status);
        } catch (KernelException $error) {
            return $this->errorResponse($error);
        }
    }

    private function errorResponse(KernelException $error): JsonResponse
    {
        return response()->json(['error' => $error->envelope->toArray()], $error->status);
    }

    private function actorId(): string
    {
        return (string) Auth::id();
    }

    private function correlationId(Request $request): string
    {
        $candidate = $request->header('X-Correlation-Id');
        return is_string($candidate) && Str::isUuid($candidate) ? $candidate : (string) Str::uuid7();
    }
}

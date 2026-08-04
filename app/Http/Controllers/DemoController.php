<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\DemoFixtureRequest;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\MockAuthService;
use Illuminate\Http\Request;

final class DemoController
{
    public function __construct(private readonly MockAuthService $auth) {}

    public function login(DemoFixtureRequest $request): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $this->auth->begin((string) $validated['fixture_identifier'], $correlationId, $request);

            return $this->success($request, [
                'data' => [
                    'status' => 'challenge_pending',
                    'fixture_identifier' => (string) $validated['fixture_identifier'],
                    'demoNotice' => 'Demo only — no SMS was sent',
                ],
            ], $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure($request, $error);
        }
    }

    public function challenge(DemoFixtureRequest $request): mixed
    {
        $validated = $request->validated();
        $correlationId = $this->correlationId($request);

        try {
            $this->auth->complete(
                (string) $validated['fixture_identifier'],
                isset($validated['challenge_code']) ? (string) $validated['challenge_code'] : null,
                $correlationId,
                $request,
            );

            return $this->success($request, [
                'data' => [
                    'status' => 'authenticated',
                    'fixture_identifier' => (string) $validated['fixture_identifier'],
                    'demoNotice' => 'Demo only — no SMS was sent',
                ],
            ], $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure($request, $error);
        }
    }

    public function logout(Request $request): mixed
    {
        $request->session()->forget(['mock_auth', 'acting_for']);
        $request->session()->regenerateToken();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['data' => ['status' => 'signed_out']], 200);
        }

        return redirect()->route('home');
    }

    private function correlationId(Request $request): string
    {
        return (string) $request->attributes->get('correlation_id');
    }

    /** @param array<string, mixed> $payload */
    private function success(Request $request, array $payload, string $correlationId): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($payload, 200, ['X-Correlation-Id' => $correlationId]);
        }

        return back();
    }

    private function failure(Request $request, IdentityAccessError $error): mixed
    {
        $correlationId = (string) $error->envelope->correlationId;
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(
                $error->envelope->toArray(),
                $error->status,
                ['X-Correlation-Id' => $correlationId],
            );
        }

        $errors = $error->envelope->fieldErrors ?: ['form' => [$error->envelope->message]];
        $errors['correlation_id'] = [$correlationId];

        return back()
            ->withInput()
            ->withErrors($errors)
            ->with('correlation_id', $correlationId);
    }
}

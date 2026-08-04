<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\PhoneOtpRequest;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\PhoneOtpAuthService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;

final class AuthController
{
    public function __construct(private readonly PhoneOtpAuthService $auth) {}

    public function requestCode(PhoneOtpRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $data = $this->auth->requestCode((string) $request->validated('phone'), $correlationId);
            $request->session()->put('auth_phone_pending', $data['phone_e164']);

            return $this->success($request, $data, $correlationId);
        } catch (RuntimeException $error) {
            return $this->failure($request, 'PHONE_INVALID', $error->getMessage(), $correlationId);
        }
    }

    public function verifyCode(PhoneOtpRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $user = $this->auth->verifyCode(
                (string) $request->validated('phone'),
                (string) $request->validated('code'),
                $request,
                $correlationId,
            );
            $request->session()->forget('auth_phone_pending');

            if ($request->expectsJson() || $request->wantsJson()) {
                return $this->success($request, [
                    'status' => 'authenticated',
                    'user_id' => (string) $user->id,
                ], $correlationId);
            }

            $returnTo = $request->session()->pull('auth_return_to', route('home'));

            return redirect()->to(is_string($returnTo) && $returnTo !== '' ? $returnTo : route('home'));
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        } catch (RuntimeException $error) {
            return $this->failure($request, 'PHONE_INVALID', $error->getMessage(), $correlationId);
        }
    }

    public function logout(Request $request): mixed
    {
        $this->auth->logout($request);

        return redirect()->route('home');
    }

    public function show(Request $request): InertiaResponse
    {
        return Inertia::render('Auth/Phone', [
            'session' => [
                'status' => $request->session()->has('auth_phone_pending') ? 'challenge_pending' : 'phone_required',
                'phone' => $request->session()->get('auth_phone_pending'),
            ],
        ]);
    }

    /** @param array<string, mixed> $data */
    private function success(Request $request, array $data, string $correlationId): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['data' => $data], 200, ['X-Correlation-Id' => $correlationId]);
        }

        return back();
    }

    private function failure(Request $request, string $code, string $message, string $correlationId, int $status = 422): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'code' => $code,
                'message' => $message,
                'correlation_id' => $correlationId,
            ], $status, ['X-Correlation-Id' => $correlationId]);
        }

        return back()->withErrors(['form' => [$message]]);
    }
}

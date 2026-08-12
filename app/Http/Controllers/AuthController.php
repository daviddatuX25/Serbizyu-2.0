<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LinkEmailRequest;
use App\Http\Requests\LoginWithEmailRequest;
use App\Http\Requests\LoginWithPhonePasswordRequest;
use App\Http\Requests\PhoneOtpRequest;
use App\Http\Requests\RegisterPhoneRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\ResetPasswordSmsRequest;
use App\Modules\IdentityAccess\Application\CompleteSignupPhoneOtp;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\LinkEmail;
use App\Modules\IdentityAccess\Application\LoginWithEmailPassword;
use App\Modules\IdentityAccess\Application\LoginWithPhonePassword;
use App\Modules\IdentityAccess\Application\PhoneOtpAuthService;
use App\Modules\IdentityAccess\Application\RequestPasswordReset;
use App\Modules\IdentityAccess\Application\RequestResetSmsOtp;
use App\Modules\IdentityAccess\Application\ResetPasswordWithSmsOtp;
use App\Modules\IdentityAccess\Application\ResetPasswordWithToken;
use App\Modules\IdentityAccess\Application\StartSignup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;

final class AuthController
{
    public function __construct(
        private readonly PhoneOtpAuthService $phoneAuth,
        private readonly StartSignup $startSignup,
        private readonly CompleteSignupPhoneOtp $completeSignup,
        private readonly LoginWithEmailPassword $emailLogin,
        private readonly LoginWithPhonePassword $phonePasswordLogin,
        private readonly LinkEmail $linkEmail,
        private readonly RequestPasswordReset $requestPasswordReset,
        private readonly RequestResetSmsOtp $requestResetSmsOtp,
        private readonly ResetPasswordWithToken $resetPasswordWithToken,
        private readonly ResetPasswordWithSmsOtp $resetPasswordWithSmsOtp,
    ) {}

    public function showSignIn(Request $request): InertiaResponse|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/SignIn', [
            'session' => [
                'status' => $request->session()->has('auth_phone_pending') ? 'challenge_pending' : 'method_picker',
                'phone' => $request->session()->get('auth_phone_pending'),
            ],
            'methods' => [
                'phone_password' => true,
                'email' => true,
            ],
        ]);
    }

    public function showRegister(Request $request): InertiaResponse|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/Register', [
            'session' => [
                'status' => $request->session()->has('signup_phone_pending') ? 'challenge_pending' : 'phone_required',
                'phone' => $request->session()->get('signup_phone_pending'),
            ],
        ]);
    }

    public function registerRequest(RegisterPhoneRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $data = $this->startSignup->handle(
                (string) $request->validated('phone'),
                $correlationId,
                $request->validated('display_name'),
            );
            $request->session()->put('signup_phone_pending', $data['phone_e164']);

            return $this->success($request, $data, $correlationId);
        } catch (RuntimeException $error) {
            return $this->failure($request, 'PHONE_INVALID', $error->getMessage(), $correlationId);
        }
    }

    public function registerVerify(RegisterPhoneRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $user = $this->completeSignup->handle(
                (string) $request->validated('phone'),
                (string) $request->validated('code'),
                $request,
                $correlationId,
            );
            $request->session()->forget('signup_phone_pending');

            if ($request->expectsJson() || $request->wantsJson()) {
                return $this->success($request, [
                    'status' => 'authenticated',
                    'user_id' => (string) $user->id,
                ], $correlationId);
            }

            return redirect()->route('home');
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

    public function loginWithPhonePassword(LoginWithPhonePasswordRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $user = $this->phonePasswordLogin->handle(
                (string) $request->validated('phone'),
                (string) $request->validated('password'),
                $request,
                $correlationId,
            );

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

    public function loginWithEmail(LoginWithEmailRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $user = $this->emailLogin->handle(
                (string) $request->validated('email'),
                (string) $request->validated('password'),
                $request,
                $correlationId,
            );

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
        }
    }

    public function linkEmail(LinkEmailRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $user = $this->linkEmail->handle(
                $request->user(),
                (string) $request->validated('email'),
                $correlationId,
            );

            if ($request->expectsJson() || $request->wantsJson()) {
                return $this->success($request, [
                    'status' => 'email_linked',
                    'email' => (string) $user->email,
                ], $correlationId);
            }

            return back();
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        }
    }

    public function showForgot(Request $request): InertiaResponse|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/ForgotPassword');
    }

    public function sendResetLink(ForgotPasswordRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $data = $this->requestPasswordReset->handle(
                (string) $request->validated('email'),
                $correlationId,
            );

            return $this->success($request, $data, $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        }
    }

    public function requestSmsReset(ForgotPasswordRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $data = $this->requestResetSmsOtp->request(
                (string) $request->validated('phone'),
                $correlationId,
            );
            $request->session()->put('auth_reset_phone_pending', $data['phone_e164']);

            return $this->success($request, $data, $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        }
    }

    public function showReset(Request $request): InertiaResponse|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/ResetPassword', [
            'token' => (string) $request->query('token', ''),
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function resetWithToken(ResetPasswordRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $this->resetPasswordWithToken->handle(
                (string) $request->validated('email'),
                (string) $request->validated('token'),
                (string) $request->validated('password'),
                $correlationId,
            );

            return $this->success($request, ['status' => 'password_reset'], $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        }
    }

    public function resetWithSmsOtp(ResetPasswordSmsRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $this->resetPasswordWithSmsOtp->handle(
                (string) $request->validated('phone'),
                (string) $request->validated('code'),
                (string) $request->validated('password'),
                $correlationId,
            );
            $request->session()->forget('auth_reset_phone_pending');

            return $this->success($request, ['status' => 'password_reset'], $correlationId);
        } catch (IdentityAccessError $error) {
            return $this->failure(
                $request,
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                $error->status,
            );
        }
    }

    public function requestCode(PhoneOtpRequest $request): mixed
    {
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $data = $this->phoneAuth->requestCode((string) $request->validated('phone'), $correlationId);
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
            $user = $this->phoneAuth->verifyCode(
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
        $this->phoneAuth->logout($request);

        return redirect()->route('home');
    }

    public function show(Request $request): InertiaResponse|RedirectResponse
    {
        // Single sign-in hub — every return method (incl. the inline SMS
        // challenge) lives on Auth/SignIn. The legacy SMS-only page is gone;
        // deep links to /auth/phone now land on the hub (challenge state is
        // carried in the session).
        return Auth::check()
            ? redirect()->route('home')
            : redirect()->route('auth.sign-in');
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

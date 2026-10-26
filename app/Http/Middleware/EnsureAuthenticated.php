<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Shared\Contracts\StaffAccessPort;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAuthenticated
{
    public function __construct(private readonly StaffAccessPort $staffAccess) {}

    public function handle(Request $request, Closure $next, ?string $requiredTier = null): Response
    {
        $user = $request->user();
        if (! $user) {
            $returnTo = $request->isMethod('GET') ? $request->getRequestUri() : route('home');
            $request->session()->put('auth_return_to', $returnTo);

            return redirect()->route('auth.sign-in');
        }

        if ($requiredTier === 'admin' || $requiredTier === 'L4') {
            if (! $this->staffAccess->canAccessStaff((string) $user->getAuthIdentifier())) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'code' => 'AUTHORIZATION_DENIED',
                        'message' => 'Unauthorized administrative access tier.',
                    ], 403);
                }

                abort(403, 'Unauthorized administrative access tier.');
            }
        }

        return $next($request);
    }
}

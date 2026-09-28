<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAuthenticated
{
    public function handle(Request $request, Closure $next, ?string $requiredTier = null): Response
    {
        $user = $request->user();
        if (! $user) {
            $returnTo = $request->isMethod('GET') ? $request->getRequestUri() : route('home');
            $request->session()->put('auth_return_to', $returnTo);

            return redirect()->route('auth.sign-in');
        }

        if ($requiredTier !== null) {
            $tier = strtoupper((string) ($user->primary_access_tier ?? ''));
            if ($requiredTier === 'admin' || $requiredTier === 'L4') {
                if ($tier !== 'L4') {
                    abort(403, 'Unauthorized administrative access tier.');
                }
            }
        }

        return $next($request);
    }
}

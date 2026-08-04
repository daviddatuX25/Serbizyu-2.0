<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            // Persist across the multi-step OTP flow (flash would be consumed too early).
            $request->session()->put('auth_return_to', $request->getRequestUri());

            return redirect()->route('auth.phone');
        }

        return $next($request);
    }
}

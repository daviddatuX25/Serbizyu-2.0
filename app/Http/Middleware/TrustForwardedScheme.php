<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class TrustForwardedScheme
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            str_contains($request->getHost(), 'ngrok')
            || $request->server->get('HTTP_X_FORWARDED_PROTO') === 'https'
        ) {
            $request->headers->set('X-Forwarded-Proto', 'https');
            $request->server->set('HTTPS', 'on');
        }

        return $next($request);
    }
}

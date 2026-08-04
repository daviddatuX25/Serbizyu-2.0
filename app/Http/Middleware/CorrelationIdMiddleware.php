<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Shared\Support\Correlation;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CorrelationIdMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = Correlation::fromRequest($request->header('X-Correlation-Id'));
        $request->attributes->set('correlation_id', (string) $correlationId);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Correlation-Id', (string) $correlationId);

        return $response;
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\IdentityAccess\Application\CurrentSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureMockAuthenticated
{
    public function __construct(private readonly CurrentSession $session) {}

    public function handle(Request $request, Closure $next): Response
    {
        $current = $this->session->read($request);

        if ($current === null || ! ($current['authenticated'] ?? false)) {
            return redirect()->route('home')->with('auth_return_to', $request->getRequestUri());
        }

        return $next($request);
    }
}

<?php

use App\Http\Middleware\CorrelationIdMiddleware;
use App\Http\Middleware\EnsureAuthenticated;
use App\Http\Middleware\EnsureMockAuthenticated;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\TrustForwardedScheme;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

spl_autoload_register(static function (string $class): void {
    if (str_starts_with($class, 'App\\')) {
        $relativePath = str_replace('\\', '/', substr($class, 4)).'.php';
        $file = __DIR__.'/../app/'.$relativePath;
        if (file_exists($file)) {
            require_once $file;
        }
    } elseif (str_starts_with($class, 'Tests\\')) {
        $relativePath = str_replace('\\', '/', substr($class, 6)).'.php';
        $file = __DIR__.'/../tests/'.$relativePath;
        if (file_exists($file)) {
            require_once $file;
        }
    }
});

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(TrustForwardedScheme::class);
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'mock.auth' => EnsureMockAuthenticated::class,
            'auth.real' => EnsureAuthenticated::class,
        ]);

        $middleware->web(append: [
            CorrelationIdMiddleware::class,
            HandleInertiaRequests::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'auth/phone/login',
            'auth/email/login',
            'auth/phone/request',
            'auth/phone/verify',
            'auth/register/request',
            'auth/register/verify',
            'auth/password/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($response->getStatusCode() === 419) {
                return back()->with([
                    'message' => 'The page expired, please try again.',
                ]);
            }

            return $response;
        });
    })->create();

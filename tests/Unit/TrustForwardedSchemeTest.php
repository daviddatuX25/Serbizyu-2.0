<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Middleware\TrustForwardedScheme;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

final class TrustForwardedSchemeTest extends TestCase
{
    public function test_forces_https_when_host_contains_ngrok(): void
    {
        $request = Request::create('http://my-subdomain.ngrok-free.app/browse', 'GET');
        $middleware = new TrustForwardedScheme;

        $executed = false;
        $response = $middleware->handle($request, function (Request $req) use (&$executed): Response {
            $executed = true;
            self::assertSame('https', $req->headers->get('X-Forwarded-Proto'));
            self::assertSame('on', $req->server->get('HTTPS'));

            return new Response('ok');
        });

        self::assertTrue($executed);
        self::assertSame('ok', $response->getContent());
    }

    public function test_forces_https_when_forwarded_proto_is_https(): void
    {
        $request = Request::create('http://localhost:8080/browse', 'GET', [], [], [], [
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);
        $middleware = new TrustForwardedScheme;

        $executed = false;
        $response = $middleware->handle($request, function (Request $req) use (&$executed): Response {
            $executed = true;
            self::assertSame('https', $req->headers->get('X-Forwarded-Proto'));
            self::assertSame('on', $req->server->get('HTTPS'));

            return new Response('ok');
        });

        self::assertTrue($executed);
        self::assertSame('ok', $response->getContent());
    }

    public function test_leaves_plain_localhost_untouched(): void
    {
        $request = Request::create('http://localhost:8080/browse', 'GET');
        $middleware = new TrustForwardedScheme;

        $executed = false;
        $response = $middleware->handle($request, function (Request $req) use (&$executed): Response {
            $executed = true;
            self::assertNull($req->headers->get('X-Forwarded-Proto'));
            self::assertNull($req->server->get('HTTPS'));

            return new Response('ok');
        });

        self::assertTrue($executed);
        self::assertSame('ok', $response->getContent());
    }
}

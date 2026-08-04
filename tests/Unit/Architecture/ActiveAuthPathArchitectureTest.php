<?php

declare(strict_types=1);

namespace Tests\Unit\Architecture;

use Tests\Support\ArchitectureCheck;
use Tests\TestCase;

final class ActiveAuthPathArchitectureTest extends TestCase
{
    public function test_active_web_routes_do_not_use_mock_auth_middleware(): void
    {
        ArchitectureCheck::activeWebRoutesAvoidDemoAuthMiddleware(base_path());

        $this->assertTrue(true);
    }

    public function test_active_web_routes_do_not_register_demo_auth_endpoints(): void
    {
        $web = (string) file_get_contents(base_path('routes/web.php'));

        $this->assertStringNotContainsString('demo/login', $web);
        $this->assertStringNotContainsString('demo/challenge', $web);
        $this->assertStringNotContainsString('DemoController', $web);
    }

    public function test_auth_phone_page_is_registered_as_named_route(): void
    {
        $this->assertSame(url('/auth/phone'), route('auth.phone'));
        $this->assertSame(url('/auth/phone/request'), route('auth.phone.request'));
        $this->assertSame(url('/auth/phone/verify'), route('auth.phone.verify'));
    }
}

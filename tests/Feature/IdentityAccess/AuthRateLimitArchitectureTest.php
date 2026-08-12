<?php

declare(strict_types=1);

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

it('H2-R01 registers named auth-login limiter and wires password login routes', function (): void {
    expect(RateLimiter::limiter('auth-login'))->not->toBeNull();

    $phoneLogin = collect(Route::getRoutes())->first(
        fn ($route): bool => $route->getName() === 'auth.phone.login'
    );
    $emailLogin = collect(Route::getRoutes())->first(
        fn ($route): bool => $route->getName() === 'auth.email.login'
    );

    expect($phoneLogin)->not->toBeNull();
    expect($emailLogin)->not->toBeNull();
    expect(implode(',', $phoneLogin->gatherMiddleware()))->toContain('throttle:auth-login');
    expect(implode(',', $emailLogin->gatherMiddleware()))->toContain('throttle:auth-login');
});

it('H2-R02 wires OTP, onboarding, and email-link named limiters', function (): void {
    foreach (['auth-otp-request', 'auth-otp-verify', 'auth-onboarding', 'auth-email-link'] as $name) {
        expect(RateLimiter::limiter($name))->not->toBeNull();
    }

    $expected = [
        'auth.register.request' => 'throttle:auth-otp-request',
        'auth.phone.request' => 'throttle:auth-otp-request',
        'auth.register.verify' => 'throttle:auth-otp-verify',
        'auth.phone.verify' => 'throttle:auth-otp-verify',
        'onboarding.store' => 'throttle:auth-onboarding',
        'auth.email.link' => 'throttle:auth-email-link',
    ];

    foreach ($expected as $routeName => $middleware) {
        $route = collect(Route::getRoutes())->first(
            fn ($route): bool => $route->getName() === $routeName
        );
        expect($route)->not->toBeNull();
        expect(implode(',', $route->gatherMiddleware()))->toContain($middleware);
    }
});

<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class HealthEndpointTest extends TestCase
{
    public function test_readiness_is_safe_cache_disabled_and_correlated(): void
    {
        config()->set('serbizyu.health.database_required', false);
        config()->set('serbizyu.health.redis_required', false);

        $response = $this->getJson('/health/ready', ['X-Correlation-Id' => 'corr-health-0001']);

        $response->assertOk()
            ->assertHeader('X-Correlation-Id', 'corr-health-0001')
            ->assertJsonPath('status', 'ready')
            ->assertJsonPath('correlation_id', 'corr-health-0001')
            ->assertJsonPath('checks.configuration', 'ok')
            ->assertJsonPath('checks.database', 'deferred')
            ->assertJsonPath('checks.redis', 'deferred');

        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_invalid_correlation_header_is_replaced_without_echoing_it(): void
    {
        $response = $this->getJson('/health/ready', ['X-Correlation-Id' => '<unsafe>']);

        $response->assertOk();
        self::assertNotSame('<unsafe>', $response->headers->get('X-Correlation-Id'));
        self::assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', (string) $response->headers->get('X-Correlation-Id'));
    }
}

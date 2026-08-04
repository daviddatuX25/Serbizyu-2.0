<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class InertiaShellTest extends TestCase
{
    public function test_laravel_renders_the_foundation_inertia_page_with_safe_props(): void
    {
        config()->set('inertia.pages.paths', [resource_path('js/Pages')]);

        $response = $this->withHeaders([
            'X-Correlation-Id' => '0198a3b1-7c40-7abc-8def-f234567890ab',
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get('/');

        $response->assertOk()
            ->assertHeader('X-Correlation-Id', '0198a3b1-7c40-7abc-8def-f234567890ab')
            ->assertJsonPath('component', 'Home')
            ->assertJsonPath('props.app.name', config('app.name'))
            ->assertJsonPath('props.app.stage', 'foundation_slice')
            ->assertJsonPath('props.correlationId', '0198a3b1-7c40-7abc-8def-f234567890ab')
            ->assertJsonPath('props.scope.productFeatures', false)
            ->assertJsonPath('props.scope.externalProviders', false)
            ->assertJsonPath('props.scope.schemaMigrations', false);
    }
}

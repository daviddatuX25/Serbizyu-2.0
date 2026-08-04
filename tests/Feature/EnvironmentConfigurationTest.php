<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Shared\Support\EnvironmentValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class EnvironmentConfigurationTest extends TestCase
{
    #[DataProvider('disposableEnvironments')]
    public function test_disposable_environments_reject_live_provider_modes(string $environment): void
    {
        $validator = app(EnvironmentValidator::class);
        $violations = $validator->violations($this->configuration($environment, 'live'));

        self::assertNotSame([], $violations);
        self::assertStringNotContainsString('secret-value', implode(' ', $violations));
    }

    public function test_local_provider_configuration_is_accepted_without_credentials(): void
    {
        $validator = app(EnvironmentValidator::class);

        self::assertSame([], $validator->violations($this->configuration('local', 'disabled')));
    }

    /** @return array<string,array{string}> */
    public static function disposableEnvironments(): array
    {
        return [
            'local' => ['local'],
            'test' => ['test'],
            'testing' => ['testing'],
            'capstone' => ['capstone'],
        ];
    }

    /** @return array<string,mixed> */
    private function configuration(string $environment, string $mode): array
    {
        return [
            'environment' => $environment,
            'providers' => ['payment' => ['mode' => $mode, 'credentials' => '']],
            'live_modes' => ['live', 'connected', 'production'],
            'approved_live_environments' => ['pilot', 'production-connected'],
        ];
    }
}

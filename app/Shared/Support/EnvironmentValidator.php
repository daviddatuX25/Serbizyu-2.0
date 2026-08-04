<?php

declare(strict_types=1);

namespace App\Shared\Support;

use RuntimeException;

final class EnvironmentValidator
{
    /** @param array<string,mixed> $configuration */
    public function violations(array $configuration): array
    {
        $environment = (string) ($configuration['environment'] ?? 'local');
        $providers = $configuration['providers'] ?? [];
        $liveModes = $configuration['live_modes'] ?? [];
        $approved = $configuration['approved_live_environments'] ?? [];
        $violations = [];

        foreach ($providers as $name => $provider) {
            $mode = (string) ($provider['mode'] ?? 'disabled');
            $credentials = trim((string) ($provider['credentials'] ?? ''));
            $isLive = in_array($mode, $liveModes, true);

            if ($isLive && ! in_array($environment, $approved, true)) {
                $violations[] = sprintf('Provider [%s] live mode is not allowed in environment [%s].', $name, $environment);
            }

            if ($credentials !== '' && ! $isLive && $mode !== 'sandbox') {
                $violations[] = sprintf('Provider [%s] credentials require an explicit sandbox or approved live mode.', $name);
            }
        }

        if (in_array($environment, ['local', 'test', 'testing', 'capstone'], true)) {
            foreach ($providers as $name => $provider) {
                if (trim((string) ($provider['credentials'] ?? '')) !== '') {
                    $violations[] = sprintf('Provider [%s] credentials are forbidden in disposable environment [%s].', $name, $environment);
                }
            }
        }

        return array_values(array_unique($violations));
    }

    /** @param array<string,mixed> $configuration */
    public function validate(array $configuration): void
    {
        $violations = $this->violations($configuration);

        if ($violations !== []) {
            throw new RuntimeException('Serbizyu environment validation failed: '.implode(' ', $violations));
        }
    }

    /** @param array<string,mixed> $configuration */
    public function safeSummary(array $configuration): array
    {
        return [
            'environment' => (string) ($configuration['public_environment'] ?? $configuration['environment'] ?? 'local'),
            'providers' => collect($configuration['providers'] ?? [])->mapWithKeys(
                static fn (array $provider, string $name): array => [$name => [
                    'mode' => $provider['mode'] ?? 'disabled',
                    'enabled' => in_array($provider['mode'] ?? 'disabled', ['sandbox', 'local'], true),
                ]],
            )->all(),
        ];
    }
}

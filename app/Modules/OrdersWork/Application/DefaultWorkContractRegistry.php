<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use Illuminate\Support\Str;

final class DefaultWorkContractRegistry implements WorkContractRegistry
{
    /** @var array<string, WorkContractDefinition> */
    private array $definitions;

    public function __construct()
    {
        $this->definitions = [
            'A1:1:1' => new WorkContractDefinition('A1', 1, 1),
            'A3:1:1' => new WorkContractDefinition('A3', 1, 1),
            'A4:1:1' => new WorkContractDefinition('A4', 1, 1),
            'A9:1:1' => new WorkContractDefinition('A9', 1, 1),
        ];
    }

    public function resolveForWork(
        string $shapeCode,
        int $shapeContractVersion,
        int $payloadSchemaVersion = 1,
        string $correlationId = '',
    ): WorkContractDefinition {
        $key = $shapeCode.':'.$shapeContractVersion.':'.$payloadSchemaVersion;
        $definition = $this->definitions[$key] ?? null;

        if ($definition === null) {
            throw WorkContractError::unsupported($this->correlationId($correlationId));
        }

        return $definition;
    }

    private function correlationId(string $correlationId): string
    {
        return trim($correlationId) !== '' ? $correlationId : (string) Str::uuid7();
    }
}

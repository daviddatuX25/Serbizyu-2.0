<?php

declare(strict_types=1);

use App\Modules\OrdersWork\Application\DefaultWorkContractRegistry;
use App\Modules\OrdersWork\Application\WorkContractDefinition;
use App\Modules\OrdersWork\Application\WorkContractError;
use App\Modules\OrdersWork\Application\WorkContractRegistry;
use Illuminate\Support\Str;

function t4ExpectWorkContractError(callable $callback, string $code = 'WORK_CONTRACT_VERSION_UNSUPPORTED'): WorkContractError
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected WorkContractError '.$code);
    } catch (WorkContractError $error) {
        expect($error->envelope->code)->toBe($code);

        return $error;
    }

    throw new RuntimeException('unreachable');
}

it('resolves all four canonical shapes A1 A3 A4 A9 at contract v1 and schema v1', function (): void {
    $registry = app(WorkContractRegistry::class);

    $a1 = $registry->resolveForWork('A1', 1, 1);
    $a3 = $registry->resolveForWork('A3', 1, 1);
    $a4 = $registry->resolveForWork('A4', 1, 1);
    $a9 = $registry->resolveForWork('A9', 1, 1);

    expect($a1)->toBeInstanceOf(WorkContractDefinition::class)
        ->and($a1->shapeCode)->toBe('A1')
        ->and($a1->shapeContractVersion)->toBe(1)
        ->and($a1->payloadSchemaVersion)->toBe(1)
        ->and($a1->toArray())->toBe([
            'shape_code' => 'A1',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
        ])
        ->and($a3->shapeCode)->toBe('A3')
        ->and($a3->shapeContractVersion)->toBe(1)
        ->and($a3->payloadSchemaVersion)->toBe(1)
        ->and($a3->toArray())->toBe([
            'shape_code' => 'A3',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
        ])
        ->and($a4->shapeCode)->toBe('A4')
        ->and($a4->shapeContractVersion)->toBe(1)
        ->and($a4->payloadSchemaVersion)->toBe(1)
        ->and($a4->toArray())->toBe([
            'shape_code' => 'A4',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
        ])
        ->and($a9->shapeCode)->toBe('A9')
        ->and($a9->shapeContractVersion)->toBe(1)
        ->and($a9->payloadSchemaVersion)->toBe(1)
        ->and($a9->toArray())->toBe([
            'shape_code' => 'A9',
            'shape_contract_version' => 1,
            'payload_schema_version' => 1,
        ]);
});

it('defaults payload schema version to 1 on pure resolveForWork lookup', function (): void {
    $registry = new DefaultWorkContractRegistry;

    $definition = $registry->resolveForWork('A1', 1);

    expect($definition->shapeCode)->toBe('A1')
        ->and($definition->shapeContractVersion)->toBe(1)
        ->and($definition->payloadSchemaVersion)->toBe(1);
});

it('rejects unsupported legacy shapes, non-canonical names, and unsupported versions', function (string $shape, int $contractVersion, int $schemaVersion): void {
    $registry = new DefaultWorkContractRegistry;
    $correlationId = (string) Str::uuid7();

    $error = t4ExpectWorkContractError(fn () => $registry->resolveForWork($shape, $contractVersion, $schemaVersion, $correlationId));

    expect($error->envelope->code)->toBe('WORK_CONTRACT_VERSION_UNSUPPORTED')
        ->and((string) $error->envelope->correlationId)->toBe($correlationId)
        ->and($error->envelope->retryable)->toBeFalse()
        ->and($error->status)->toBe(422);
})->with([
    ['legacy_local_service', 1, 1],
    ['local_service', 1, 1],
    ['product_handoff', 1, 1],
    ['request_based', 1, 1],
    ['A1', 0, 1],
    ['A1', 2, 1],
    ['A1', 99, 1],
    ['A1', 1, 0],
    ['A1', 1, 2],
    ['A1', 1, 99],
    ['A3', 2, 1],
    ['A4', 1, 2],
    ['A9', 99, 99],
    ['UNKNOWN_SHAPE', 1, 1],
]);

it('generates a valid correlation ID in WorkContractError when none is provided', function (): void {
    $registry = new DefaultWorkContractRegistry;

    $error = t4ExpectWorkContractError(fn () => $registry->resolveForWork('INVALID', 1, 1));

    expect($error->envelope->code)->toBe('WORK_CONTRACT_VERSION_UNSUPPORTED')
        ->and((string) $error->envelope->correlationId)->not->toBeEmpty()
        ->and($error->status)->toBe(422);
});

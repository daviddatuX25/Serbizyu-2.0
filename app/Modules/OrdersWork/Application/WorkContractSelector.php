<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

/** Selects the immutable contract declared by a source Work specification. */
final class WorkContractSelector
{
    /**
     * @param  array<string, mixed>|null  $specification
     * @param  list<array<string, mixed>>  $nodes
     */
    public static function resolve(
        WorkContractRegistry $registry,
        string $shapeCode,
        ?array $specification,
        array $nodes,
        string $correlationId,
    ): WorkContractDefinition {
        $hasShapeVersion = is_array($specification) && array_key_exists('shape_contract_version', $specification);
        $hasPayloadVersion = is_array($specification) && array_key_exists('payload_schema_version', $specification);
        if ($hasShapeVersion !== $hasPayloadVersion) {
            throw WorkContractError::unsupported($correlationId);
        }

        $contractNodes = $nodes !== [] ? $nodes : (array) ($specification['nodes'] ?? []);
        $requiresSchemaTwo = self::requiresSchemaTwo($contractNodes);
        $shapeVersion = $hasShapeVersion ? self::version($specification['shape_contract_version'], $correlationId) : 1;
        $schemaVersion = $hasPayloadVersion
            ? self::version($specification['payload_schema_version'], $correlationId)
            : ($requiresSchemaTwo ? 2 : 1);
        if ($schemaVersion === 1 && $requiresSchemaTwo) {
            throw WorkContractError::unsupported($correlationId);
        }

        $contract = $registry->resolveForWork($shapeCode, $shapeVersion, $schemaVersion, $correlationId);
        foreach ($contractNodes as $node) {
            if (! is_array($node)) {
                throw WorkContractError::unsupported($correlationId);
            }
            $proofs = $node['required_proofs'] ?? $node['requiredProofs'] ?? [];
            if (! is_array($proofs)) {
                throw WorkContractError::unsupported($correlationId);
            }
            foreach ($proofs as $proof) {
                if (! is_string($proof) || ! $contract->supportsTool($proof)) {
                    throw WorkContractError::unsupported($correlationId);
                }
            }
        }

        return $contract;
    }

    private static function version(mixed $value, string $correlationId): int
    {
        if (! is_int($value) || $value < 1) {
            throw WorkContractError::unsupported($correlationId);
        }

        return $value;
    }

    /** @param list<array<string, mixed>> $nodes */
    private static function requiresSchemaTwo(array $nodes): bool
    {
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }
            $proofs = $node['required_proofs'] ?? $node['requiredProofs'] ?? [];
            if (is_array($proofs) && array_intersect($proofs, ['checklist_steps', 'metric_reading']) !== []) {
                return true;
            }
            foreach (['checklist_items', 'checklistItems', 'metric_requirements', 'metricRequirements'] as $field) {
                if (is_array($node[$field] ?? null) && $node[$field] !== []) {
                    return true;
                }
            }
            $approvalMethod = $node['approval_method'] ?? $node['approvalMethod'] ?? null;
            $handoffParty = $node['handoff_party'] ?? $node['handoffParty'] ?? null;
            if (in_array($approvalMethod, ['presence_otp', 'worker_dropoff'], true) || $handoffParty === 'worker_dropoff') {
                return true;
            }
        }

        return false;
    }
}

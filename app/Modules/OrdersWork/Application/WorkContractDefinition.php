<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

final readonly class WorkContractDefinition
{
    public function __construct(
        public string $shapeCode,
        public int $shapeContractVersion,
        public int $payloadSchemaVersion,
        public bool $supportsItemizedChecklists = false,
        public bool $supportsNamedMetrics = false,
        public bool $supportsClearanceChallenges = false,
    ) {}

    public function supportsTool(string $tool): bool
    {
        return match ($tool) {
            'photo_proof', 'gps_checkin', 'metric_reading' => true,
            'checklist_steps' => $this->supportsItemizedChecklists,
            default => false,
        };
    }

    /**
     * @return array{shape_code:string,shape_contract_version:int,payload_schema_version:int}
     */
    public function toArray(): array
    {
        return [
            'shape_code' => $this->shapeCode,
            'shape_contract_version' => $this->shapeContractVersion,
            'payload_schema_version' => $this->payloadSchemaVersion,
        ];
    }
}

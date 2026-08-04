<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\AuthorizationContext;
use App\Shared\Contracts\Command;
use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\EvidenceClass;
use App\Shared\Contracts\IdempotencyKey;

final readonly class CommandEnvelope
{
    public function __construct(
        public string $commandId,
        public Command $command,
        public AuthorizationContext $authorization,
        public CorrelationId $correlationId,
        public IdempotencyKey $idempotencyKey,
        public int $expectedVersion,
        public EvidenceClass $evidenceClass,
        public string $target,
        public array $payload = [],
    ) {}

    public function toArray(): array
    {
        return [
            'command_id' => $this->commandId,
            'command' => $this->command::class,
            'authorization' => $this->authorization->toArray(),
            'correlation_id' => (string) $this->correlationId,
            'idempotency_key' => (string) $this->idempotencyKey,
            'expected_version' => $this->expectedVersion,
            'evidence_class' => $this->evidenceClass->value,
            'target' => $this->target,
            'payload' => $this->payload,
        ];
    }
}

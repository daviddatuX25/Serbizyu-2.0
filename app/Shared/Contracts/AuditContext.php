<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

final readonly class AuditContext
{
    public function __construct(
        public string $action,
        public CorrelationId $correlationId,
        public AuthorizationContext $authorization,
        public string $evidenceClass,
        public ?string $reason = null,
    ) {}

    public function toArray(): array
    {
        return [
            'action' => $this->action,
            'correlation_id' => (string) $this->correlationId,
            'authorization' => $this->authorization->toArray(),
            'evidence_class' => $this->evidenceClass,
            'reason' => $this->reason,
        ];
    }
}

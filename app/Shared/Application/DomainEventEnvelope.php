<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\DomainEvent;
use App\Shared\Contracts\EvidenceClass;

final readonly class DomainEventEnvelope
{
    public function __construct(
        public string $eventId,
        public DomainEvent $event,
        public CorrelationId $correlationId,
        public EvidenceClass $evidenceClass,
        public string $aggregateType,
        public string $aggregateId,
        public int $aggregateVersion,
    ) {}

    public function toArray(): array
    {
        return [
            'event_id' => $this->eventId,
            'event' => $this->event->eventName(),
            'correlation_id' => (string) $this->correlationId,
            'evidence_class' => $this->evidenceClass->value,
            'aggregate_type' => $this->aggregateType,
            'aggregate_id' => $this->aggregateId,
            'aggregate_version' => $this->aggregateVersion,
        ];
    }
}

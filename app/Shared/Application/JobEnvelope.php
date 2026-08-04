<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\EvidenceClass;
use App\Shared\Contracts\Job;

final readonly class JobEnvelope
{
    public function __construct(
        public string $jobId,
        public Job $job,
        public CorrelationId $correlationId,
        public EvidenceClass $evidenceClass,
        public int $attempt = 0,
    ) {}

    public function toArray(): array
    {
        return [
            'job_id' => $this->jobId,
            'job' => $this->job::class,
            'correlation_id' => (string) $this->correlationId,
            'evidence_class' => $this->evidenceClass->value,
            'attempt' => $this->attempt,
        ];
    }
}

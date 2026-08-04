<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;

final readonly class ErrorEnvelope
{
    public function __construct(
        public string $code,
        public string $message,
        public CorrelationId $correlationId,
        public bool $retryable = false,
        public array $fieldErrors = [],
        public array $metadata = [],
    ) {}

    public static function authorizationDenied(CorrelationId $correlationId): self
    {
        return new self(
            code: 'AUTHORIZATION_DENIED',
            message: 'You are not authorized to perform this action.',
            correlationId: $correlationId,
        );
    }

    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'message' => $this->message,
            'correlation_id' => (string) $this->correlationId,
            'retryable' => $this->retryable,
            'field_errors' => $this->fieldErrors,
            'metadata' => $this->metadata,
        ];
    }
}

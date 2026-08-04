<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use RuntimeException;

final class FirstSliceException extends RuntimeException
{
    /**
     * @param  array<string, list<string>>  $fieldErrors
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 422,
        public readonly array $fieldErrors = [],
        public readonly bool $retryable = false,
        public readonly array $metadata = [],
    ) {
        parent::__construct($message);
    }

    /** @return array<string,mixed> */
    public function envelope(CorrelationId $correlationId): array
    {
        return [
            'code' => $this->errorCode,
            'message' => $this->getMessage(),
            'correlation_id' => (string) $correlationId,
            'retryable' => $this->retryable,
            'field_errors' => $this->fieldErrors,
            'metadata' => $this->metadata,
        ];
    }
}

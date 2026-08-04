<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Application\ErrorEnvelope;
use App\Shared\Contracts\CorrelationId;
use RuntimeException;

final class ListingError extends RuntimeException
{
    public readonly ErrorEnvelope $envelope;

    /** @param array<string, list<string>> $fieldErrors */
    public function __construct(
        string $code,
        string $message,
        string $correlationId,
        public readonly int $status = 422,
        array $fieldErrors = [],
        bool $retryable = false,
    ) {
        $this->envelope = new ErrorEnvelope(
            code: $code,
            message: $message,
            correlationId: new CorrelationId($correlationId),
            retryable: $retryable,
            fieldErrors: $fieldErrors,
        );
        parent::__construct($message);
    }
}

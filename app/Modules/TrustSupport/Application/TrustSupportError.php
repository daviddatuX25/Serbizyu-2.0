<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\KernelException;

final class TrustSupportError extends KernelException
{
    /**
     * @param array<string, list<string>> $fieldErrors
     */
    public function __construct(
        string $code,
        string $message,
        string $correlationId,
        int $status = 422,
        array $fieldErrors = [],
    ) {
        parent::__construct(
            module: 'trust-support',
            code: $code,
            message: $message,
            correlationId: $correlationId,
            status: $status,
            fieldErrors: $fieldErrors,
        );
    }
}

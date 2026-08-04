<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use InvalidArgumentException;

final readonly class IdempotencyKey
{
    public function __construct(public string $value)
    {
        if (! preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $value)) {
            throw new InvalidArgumentException('Invalid idempotency key.');
        }
    }

    public function __toString(): string
    {
        return $this->value;
    }
}

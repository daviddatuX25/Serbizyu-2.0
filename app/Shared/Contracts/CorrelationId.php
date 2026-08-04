<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use Illuminate\Support\Str;
use InvalidArgumentException;

final readonly class CorrelationId
{
    public function __construct(public string $value)
    {
        if (! preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $value)) {
            throw new InvalidArgumentException('Invalid correlation ID.');
        }
    }

    public static function generate(): self
    {
        return new self((string) Str::uuid());
    }

    public function __toString(): string
    {
        return $this->value;
    }
}

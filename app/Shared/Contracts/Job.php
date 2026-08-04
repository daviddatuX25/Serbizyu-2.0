<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface Job
{
    public function idempotencyKey(): string;
}

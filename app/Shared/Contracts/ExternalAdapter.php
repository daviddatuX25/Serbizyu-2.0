<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ExternalAdapter
{
    public function name(): string;

    public function enabled(): bool;
}

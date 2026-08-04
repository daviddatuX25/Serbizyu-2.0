<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ModuleContract
{
    public static function key(): string;
}

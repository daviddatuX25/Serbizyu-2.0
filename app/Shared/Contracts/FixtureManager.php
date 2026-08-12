<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface FixtureManager
{
    public function ensure(): void;
}

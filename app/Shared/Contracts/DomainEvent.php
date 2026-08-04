<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface DomainEvent
{
    public function eventName(): string;
}

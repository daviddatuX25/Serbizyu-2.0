<?php

declare(strict_types=1);

namespace App\Shared\Application;

final readonly class OutboxDispatchResult
{
    public function __construct(
        public int $published,
        public int $failed,
        public int $parked,
    ) {}
}

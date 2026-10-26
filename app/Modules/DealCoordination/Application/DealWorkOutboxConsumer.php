<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

final class DealWorkOutboxConsumer
{
    public function __construct(private readonly DealWorkGateAdapter $gates) {}

    /** @param array<string, mixed> $envelope */
    public function handle(array $envelope): void
    {
        $this->gates->consume($envelope);
    }
}

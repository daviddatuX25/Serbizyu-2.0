<?php

declare(strict_types=1);

namespace App\Shared\Application;

interface OutboxConsumerHandler
{
    public function consumerName(): string;

    public function eventType(): string;

    public function supportedContractVersion(): int;

    /** @param array<string, mixed> $envelope */
    public function handle(array $envelope): void;
}

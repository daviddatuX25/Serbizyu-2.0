<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\OutboxConsumerHandler;

final class DealReadyForCollectionHandler implements OutboxConsumerHandler
{
    public function __construct(private readonly DealWorkOutboxConsumer $consumer) {}

    public function consumerName(): string
    {
        return 'deal-coordination';
    }

    public function eventType(): string
    {
        return 'work.ready_for_collection';
    }

    public function supportedContractVersion(): int
    {
        return 1;
    }

    public function handle(array $envelope): void
    {
        $this->consumer->handle($envelope);
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Shared\Application\OutboxDispatcher;
use Illuminate\Console\Command;

final class DispatchOutboxCommand extends Command
{
    protected $signature = 'outbox:dispatch {--limit=100 : Maximum messages to inspect}';

    protected $description = 'Dispatch pending transactional outbox events to registered inbox consumers.';

    public function handle(OutboxDispatcher $dispatcher): int
    {
        $result = $dispatcher->dispatch(max(1, (int) $this->option('limit')));
        $this->info("Published {$result->published}; failed {$result->failed}; parked {$result->parked}.");

        return $result->failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}

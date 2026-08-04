<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\Query;

final readonly class QueryEnvelope
{
    public function __construct(
        public string $queryId,
        public Query $query,
        public CorrelationId $correlationId,
        public array $filters = [],
    ) {}

    public function toArray(): array
    {
        return [
            'query_id' => $this->queryId,
            'query' => $this->query::class,
            'correlation_id' => (string) $this->correlationId,
            'filters' => $this->filters,
        ];
    }
}

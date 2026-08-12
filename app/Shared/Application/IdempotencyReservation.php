<?php

declare(strict_types=1);

namespace App\Shared\Application;

/**
 * @phpstan-type IdempotencyRow object{
 *     id: string,
 *     scope: string,
 *     key: string,
 *     request_hash: string,
 *     status: string,
 *     response_payload: ?string
 * }
 */
final readonly class IdempotencyReservation
{
    /**
     * @param  array<string, mixed>|null  $replayPayload
     */
    public function __construct(
        public object $row,
        public bool $isReplay,
        public ?array $replayPayload = null,
    ) {}
}

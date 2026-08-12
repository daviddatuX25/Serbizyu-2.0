<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application\Contracts;

use App\Shared\Application\ResourceActor;

interface ListingCommandStore
{
    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createDraft(ResourceActor $actor, array $input, string $correlationId): array;

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function updateDraft(
        string $listingId,
        ResourceActor $actor,
        int $expectedVersion,
        array $input,
        string $correlationId,
    ): array;

    /** @return array<string, mixed> */
    public function submit(
        string $listingId,
        ResourceActor $actor,
        int $expectedVersion,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    public function recordDenied(string $listingId, ?string $actorId, string $correlationId): void;
}

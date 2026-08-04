<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Modules\Listings\Application\Contracts\ListingCommandStore;

final class ProtectedEditAttempt
{
    public function __construct(private readonly ListingCommandStore $store) {}

    public function handle(string $listingId, ?string $actorId, string $correlationId): never
    {
        $this->store->recordDenied($listingId, $actorId, $correlationId);
        throw new ListingError('AUTHORIZATION_DENIED', 'You are not authorized to perform this action.', $correlationId, status: 403);
    }
}

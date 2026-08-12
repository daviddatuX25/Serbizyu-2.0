<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Application\KernelException;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class OrderCapacityAdapter implements OrderCapacityPort
{
    public function __construct(private readonly CapacityReservationService $capacity) {}

    public function findOpenQuantityBucket(string $listingId, string $listingVersionId): ?array
    {
        if (! Schema::hasTable('listing_capacity')) {
            return null;
        }

        $row = DB::table('listing_capacity')
            ->where('listing_id', $listingId)
            ->where('listing_version_id', $listingVersionId)
            ->where('capacity_type', 'quantity')
            ->first();

        if ($row === null) {
            return null;
        }

        return [
            'id' => (string) $row->id,
            'listing_id' => (string) $row->listing_id,
            'listing_version_id' => (string) $row->listing_version_id,
            'remaining_quantity' => (int) $row->remaining_quantity,
        ];
    }

    public function hold(
        string $listingCapacityId,
        int $quantity,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        try {
            return $this->capacity->hold(
                listingCapacityId: $listingCapacityId,
                quantity: $quantity,
                commandScope: $commandScope,
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                sourceMechanism: 'direct_booking',
            );
        } catch (ListingError $error) {
            throw new KernelException(
                code: $error->envelope->code,
                message: $error->getMessage(),
                correlationId: $correlationId,
                status: $error->status,
                fieldErrors: $error->envelope->fieldErrors,
                retryable: $error->envelope->retryable,
            );
        }
    }

    public function commit(string $reservationId, string $correlationId): array
    {
        try {
            return $this->capacity->commit($reservationId, $correlationId);
        } catch (ListingError $error) {
            throw new KernelException(
                code: $error->envelope->code,
                message: $error->getMessage(),
                correlationId: $correlationId,
                status: $error->status,
                fieldErrors: $error->envelope->fieldErrors,
                retryable: $error->envelope->retryable,
            );
        }
    }

    public function release(string $reservationId, string $correlationId): array
    {
        try {
            return $this->capacity->release($reservationId, $correlationId);
        } catch (ListingError $error) {
            throw new KernelException(
                code: $error->envelope->code,
                message: $error->getMessage(),
                correlationId: $correlationId,
                status: $error->status,
                fieldErrors: $error->envelope->fieldErrors,
                retryable: $error->envelope->retryable,
            );
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class CapacityReservationService
{
    /**
     * @return array{id: string, listing_id: string, listing_version_id: string, capacity_type: string, quantity: int, remaining_quantity: int}
     */
    public function ensureBucket(
        string $listingId,
        string $listingVersionId,
        string $capacityType,
        int $quantity,
        string $correlationId,
        string $resourceKey = '',
    ): array {
        if ($quantity < 1) {
            throw new ListingError(
                'VALIDATION_FAILED',
                'Capacity quantity must be positive.',
                $correlationId,
                fieldErrors: ['quantity' => ['Enter a quantity of at least 1.']],
            );
        }

        if (! Schema::hasTable('listing_capacity')) {
            throw new ListingError('STORAGE_UNAVAILABLE', 'Capacity storage is unavailable.', $correlationId, status: 503, retryable: true);
        }

        return DB::transaction(function () use ($listingId, $listingVersionId, $capacityType, $quantity, $correlationId, $resourceKey): array {
            $existing = DB::table('listing_capacity')
                ->where('listing_id', $listingId)
                ->where('listing_version_id', $listingVersionId)
                ->where('capacity_type', $capacityType)
                ->where('resource_key', $resourceKey)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return [
                    'id' => (string) $existing->id,
                    'listing_id' => (string) $existing->listing_id,
                    'listing_version_id' => (string) $existing->listing_version_id,
                    'capacity_type' => (string) $existing->capacity_type,
                    'quantity' => (int) $existing->quantity,
                    'remaining_quantity' => (int) $existing->remaining_quantity,
                ];
            }

            $id = (string) Str::uuid7();
            $now = now();
            DB::table('listing_capacity')->insert([
                'id' => $id,
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'capacity_type' => $capacityType,
                'quantity' => $quantity,
                'remaining_quantity' => $quantity,
                'slot_start' => null,
                'slot_end' => null,
                'reservation_status' => 'open',
                'version' => 1,
                'resource_key' => $resourceKey,
                'row_version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'id' => $id,
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'capacity_type' => $capacityType,
                'quantity' => $quantity,
                'remaining_quantity' => $quantity,
            ];
        });
    }

    /**
     * @return array{reservation_id: string, status: string, quantity: int, remaining_quantity: int, replay: bool}
     */
    public function hold(
        string $listingCapacityId,
        int $quantity,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
        string $sourceMechanism = 'direct',
        ?\DateTimeInterface $expiresAt = null,
    ): array {
        if ($quantity < 1) {
            throw new ListingError(
                'VALIDATION_FAILED',
                'Hold quantity must be positive.',
                $correlationId,
                fieldErrors: ['quantity' => ['Enter a quantity of at least 1.']],
            );
        }

        return DB::transaction(function () use (
            $listingCapacityId,
            $quantity,
            $commandScope,
            $idempotencyKey,
            $correlationId,
            $sourceMechanism,
            $expiresAt,
        ): array {
            $existing = DB::table('listing_capacity_reservations')
                ->where('command_scope', $commandScope)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing !== null) {
                $bucket = DB::table('listing_capacity')->where('id', $existing->listing_capacity_id)->first();

                return [
                    'reservation_id' => (string) $existing->id,
                    'status' => (string) $existing->status,
                    'quantity' => (int) $existing->quantity,
                    'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
                    'replay' => true,
                ];
            }

            $bucket = DB::table('listing_capacity')
                ->where('id', $listingCapacityId)
                ->lockForUpdate()
                ->first();

            if ($bucket === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Capacity bucket was not found.', $correlationId, status: 404);
            }

            $remaining = (int) $bucket->remaining_quantity;
            if ($quantity > $remaining) {
                throw new ListingError(
                    'CAPACITY_OVERSELL',
                    'Not enough capacity remains for this hold.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }

            $id = (string) Str::uuid7();
            $now = now();
            $newRemaining = $remaining - $quantity;

            DB::table('listing_capacity_reservations')->insert([
                'id' => $id,
                'listing_capacity_id' => $listingCapacityId,
                'listing_version_id' => (string) $bucket->listing_version_id,
                'order_id' => null,
                'source_mechanism' => $sourceMechanism,
                'source_reference_id' => null,
                'quantity' => $quantity,
                'slot_start' => null,
                'slot_end' => null,
                'status' => 'held',
                'command_scope' => $commandScope,
                'idempotency_key' => $idempotencyKey,
                'row_version' => 1,
                'expires_at' => $expiresAt,
                'committed_at' => null,
                'released_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('listing_capacity')->where('id', $listingCapacityId)->update([
                'remaining_quantity' => $newRemaining,
                'reservation_status' => $newRemaining === 0 ? 'held' : 'open',
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            return [
                'reservation_id' => $id,
                'status' => 'held',
                'quantity' => $quantity,
                'remaining_quantity' => $newRemaining,
                'replay' => false,
            ];
        });
    }

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function release(string $reservationId, string $correlationId): array
    {
        return $this->terminal($reservationId, $correlationId, 'released');
    }

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function commit(string $reservationId, string $correlationId): array
    {
        return DB::transaction(function () use ($reservationId, $correlationId): array {
            $reservation = DB::table('listing_capacity_reservations')
                ->where('id', $reservationId)
                ->lockForUpdate()
                ->first();

            if ($reservation === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Reservation was not found.', $correlationId, status: 404);
            }

            if ((string) $reservation->status === 'committed') {
                $bucket = DB::table('listing_capacity')->where('id', $reservation->listing_capacity_id)->first();

                return [
                    'reservation_id' => $reservationId,
                    'status' => 'committed',
                    'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
                ];
            }

            if ((string) $reservation->status !== 'held') {
                throw new ListingError('INVALID_STATE', 'Only a held reservation can be committed.', $correlationId, status: 409);
            }

            $bucket = DB::table('listing_capacity')
                ->where('id', $reservation->listing_capacity_id)
                ->lockForUpdate()
                ->first();

            $now = now();
            DB::table('listing_capacity_reservations')->where('id', $reservationId)->update([
                'status' => 'committed',
                'committed_at' => $now,
                'row_version' => ((int) $reservation->row_version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            return [
                'reservation_id' => $reservationId,
                'status' => 'committed',
                'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
            ];
        });
    }

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function expire(string $reservationId, string $correlationId): array
    {
        return $this->terminal($reservationId, $correlationId, 'expired');
    }

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    private function terminal(string $reservationId, string $correlationId, string $status): array
    {
        return DB::transaction(function () use ($reservationId, $correlationId, $status): array {
            $reservation = DB::table('listing_capacity_reservations')
                ->where('id', $reservationId)
                ->lockForUpdate()
                ->first();

            if ($reservation === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Reservation was not found.', $correlationId, status: 404);
            }

            if (in_array((string) $reservation->status, ['released', 'expired'], true)) {
                $bucket = DB::table('listing_capacity')->where('id', $reservation->listing_capacity_id)->first();

                return [
                    'reservation_id' => $reservationId,
                    'status' => (string) $reservation->status,
                    'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
                ];
            }

            if (! in_array((string) $reservation->status, ['held', 'committed'], true)) {
                throw new ListingError('INVALID_STATE', 'Reservation cannot be released from this state.', $correlationId, status: 409);
            }

            $bucket = DB::table('listing_capacity')
                ->where('id', $reservation->listing_capacity_id)
                ->lockForUpdate()
                ->first();

            if ($bucket === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Capacity bucket was not found.', $correlationId, status: 404);
            }

            $now = now();
            $restore = in_array((string) $reservation->status, ['held', 'committed'], true);
            $newRemaining = $restore
                ? ((int) $bucket->remaining_quantity) + ((int) $reservation->quantity)
                : (int) $bucket->remaining_quantity;

            // Committed quantity was already removed from remaining at hold time; restore only once on release/expire.
            DB::table('listing_capacity_reservations')->where('id', $reservationId)->update([
                'status' => $status,
                'released_at' => $now,
                'row_version' => ((int) $reservation->row_version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            DB::table('listing_capacity')->where('id', $bucket->id)->update([
                'remaining_quantity' => $newRemaining,
                'reservation_status' => $newRemaining > 0 ? 'open' : 'held',
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            return [
                'reservation_id' => $reservationId,
                'status' => $status,
                'remaining_quantity' => $newRemaining,
            ];
        });
    }
}

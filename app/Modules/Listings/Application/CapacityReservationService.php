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

            if ((string) ($bucket->availability_status ?? '') === 'paused') {
                throw new ListingError('CAPACITY_UNAVAILABLE', 'This stock item is paused and cannot accept new holds.', $correlationId, status: 409);
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
                'availability_status' => $newRemaining < 0 ? 'shortage' : ($newRemaining === 0 ? 'out_of_stock' : 'open'),
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $this->appendReservationMovement(
                (string) $listingCapacityId,
                $id,
                null,
                'hold',
                $quantity,
                0,
                0,
                $commandScope,
                $idempotencyKey,
                $correlationId,
            );

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
     * @return array{reservation_id: string, status: string, remaining_quantity: int, replay: bool}|null
     */
    public function commitForOrder(
        string $listingId,
        string $listingVersionId,
        string $orderId,
        int $quantity,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
        ?string $heldReservationId = null,
        string $resourceKey = '',
    ): ?array {
        if ($quantity < 1) {
            throw new ListingError(
                'VALIDATION_FAILED',
                'Committed capacity quantity must be positive.',
                $correlationId,
                fieldErrors: ['quantity' => ['Enter a quantity of at least 1.']],
            );
        }

        $heldReservationId = is_string($heldReservationId) && trim($heldReservationId) !== ''
            ? trim($heldReservationId)
            : null;

        return DB::transaction(function () use (
            $listingId,
            $listingVersionId,
            $orderId,
            $quantity,
            $commandScope,
            $idempotencyKey,
            $correlationId,
            $heldReservationId,
            $resourceKey,
        ): ?array {
            $existing = DB::table('listing_capacity_reservations')
                ->where('command_scope', $commandScope)
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if ($heldReservationId !== null && (string) $existing->id !== $heldReservationId) {
                    throw new ListingError(
                        'IDEMPOTENCY_CONFLICT',
                        'That capacity command was already used with a different reservation.',
                        $correlationId,
                        status: 409,
                    );
                }

                if (
                    (string) $existing->order_id !== $orderId
                    || (int) $existing->quantity !== $quantity
                    || (string) $existing->listing_version_id !== $listingVersionId
                ) {
                    throw new ListingError(
                        'IDEMPOTENCY_CONFLICT',
                        'That capacity command was already used with different input.',
                        $correlationId,
                        status: 409,
                    );
                }

                if ((string) $existing->status !== 'committed') {
                    throw new ListingError(
                        'INVALID_STATE',
                        'Replayed capacity reservation was not committed.',
                        $correlationId,
                        status: 409,
                    );
                }

                $bucket = DB::table('listing_capacity')
                    ->where('id', $existing->listing_capacity_id)
                    ->first();

                if (
                    $bucket === null
                    || (string) $bucket->listing_id !== $listingId
                    || (string) $bucket->listing_version_id !== $listingVersionId
                ) {
                    throw new ListingError(
                        'IDEMPOTENCY_CONFLICT',
                        'Replayed capacity reservation does not match this listing.',
                        $correlationId,
                        status: 409,
                    );
                }

                return [
                    'reservation_id' => (string) $existing->id,
                    'status' => (string) $existing->status,
                    'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
                    'replay' => true,
                ];
            }
            $bucketQuery = DB::table('listing_capacity')
                ->where('listing_id', $listingId)
                ->where('listing_version_id', $listingVersionId)
                ->where('capacity_type', 'quantity');
            if ($resourceKey !== '') {
                $bucketQuery->where('resource_key', $resourceKey);
            }
            $buckets = $bucketQuery->lockForUpdate()->get();

            if ($buckets->isEmpty()) {
                if ($heldReservationId !== null) {
                    throw new ListingError(
                        'INVALID_STATE',
                        'A capacity reservation cannot be used without a capacity bucket.',
                        $correlationId,
                        status: 409,
                    );
                }

                return null;
            }

            $held = null;
            if ($heldReservationId !== null) {
                $held = DB::table('listing_capacity_reservations')
                    ->where('id', $heldReservationId)
                    ->lockForUpdate()
                    ->first();

                if ($held === null) {
                    throw new ListingError('LISTING_NOT_FOUND', 'Held capacity reservation was not found.', $correlationId, status: 404);
                }

                $heldOrderId = $held->order_id !== null ? (string) $held->order_id : null;
                if ($heldOrderId !== null && $heldOrderId !== $orderId) {
                    throw new ListingError(
                        'INVALID_STATE',
                        'Held capacity reservation belongs to a different order.',
                        $correlationId,
                        status: 409,
                    );
                }

                if ((int) $held->quantity !== $quantity) {
                    throw new ListingError('INVALID_STATE', 'Held capacity reservation quantity does not match order quantity.', $correlationId, status: 409);
                }
            }

            foreach ($buckets as $b) {
                if ((string) $b->capacity_type !== 'quantity') {
                    throw new ListingError(
                        'UNSUPPORTED_CAPACITY_TYPE',
                        'Only quantity capacity is supported for direct order formation.',
                        $correlationId,
                        status: 422,
                    );
                }
            }

            if ($buckets->count() > 1) {
                throw new ListingError(
                    'AMBIGUOUS_CAPACITY_BUCKET',
                    'Multiple capacity buckets found for this listing variant.',
                    $correlationId,
                    status: 409,
                );
            }

            $bucket = $buckets->first();
            if ($bucket === null) {
                throw new ListingError('CAPACITY_BUCKET_NOT_FOUND', 'The selected variant has no stock bucket.', $correlationId, status: 409);
            }
            if ($resourceKey === '' && (string) ($bucket->resource_key ?? '') !== '') {
                throw new ListingError('AMBIGUOUS_CAPACITY_BUCKET', 'The listing requires an explicit variant selection.', $correlationId, status: 409);
            }
            if ($resourceKey !== '' && (string) ($bucket->resource_key ?? '') !== $resourceKey) {
                throw new ListingError('CAPACITY_BUCKET_NOT_FOUND', 'The selected variant has no stock bucket.', $correlationId, status: 409);
            }

            if ($held !== null) {
                if (
                    (string) $held->listing_capacity_id !== (string) $bucket->id
                    || (string) $held->listing_version_id !== $listingVersionId
                ) {
                    throw new ListingError('INVALID_STATE', 'Held capacity reservation does not match listing version.', $correlationId, status: 409);
                }

                if ((string) $held->status === 'committed') {
                    if ($heldOrderId !== $orderId) {
                        throw new ListingError(
                            'INVALID_STATE',
                            'Committed capacity reservation belongs to a different order.',
                            $correlationId,
                            status: 409,
                        );
                    }

                    return [
                        'reservation_id' => (string) $held->id,
                        'status' => 'committed',
                        'remaining_quantity' => (int) $bucket->remaining_quantity,
                        'replay' => true,
                    ];
                }

                if ((string) $held->status !== 'held') {
                    throw new ListingError('INVALID_STATE', 'Only a held reservation can be committed.', $correlationId, status: 409);
                }

                $now = now();
                DB::table('listing_capacity_reservations')->where('id', $heldReservationId)->update([
                    'order_id' => $orderId,
                    'status' => 'committed',
                    'command_scope' => $commandScope,
                    'idempotency_key' => $idempotencyKey,
                    'committed_at' => $now,
                    'row_version' => ((int) $held->row_version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
                DB::table('listing_capacity')->where('id', $bucket->id)->update([
                    'row_version' => ((int) $bucket->row_version) + 1,
                    'version' => ((int) $bucket->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
                $this->appendReservationMovement(
                    (string) $bucket->id,
                    (string) $heldReservationId,
                    $orderId,
                    'commit',
                    -$quantity,
                    $quantity,
                    0,
                    $commandScope,
                    $idempotencyKey,
                    $correlationId,
                );

                return [
                    'reservation_id' => $heldReservationId,
                    'status' => 'committed',
                    'remaining_quantity' => (int) $bucket->remaining_quantity,
                    'replay' => false,
                ];

            }

            $remaining = (int) $bucket->remaining_quantity;
            if ($quantity > $remaining) {
                throw new ListingError(
                    'CAPACITY_OVERSELL',
                    'Not enough capacity remains to finalize this order.',
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
                'listing_capacity_id' => $bucket->id,
                'listing_version_id' => $listingVersionId,
                'order_id' => $orderId,
                'source_mechanism' => 'direct',
                'source_reference_id' => null,
                'quantity' => $quantity,
                'slot_start' => null,
                'slot_end' => null,
                'status' => 'committed',
                'command_scope' => $commandScope,
                'idempotency_key' => $idempotencyKey,
                'row_version' => 1,
                'expires_at' => null,
                'committed_at' => $now,
                'released_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('listing_capacity')->where('id', $bucket->id)->update([
                'remaining_quantity' => $newRemaining,
                'reservation_status' => $newRemaining === 0 ? 'held' : 'open',
                'availability_status' => $newRemaining <= 0 ? 'out_of_stock' : 'open',
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $this->appendReservationMovement(
                (string) $bucket->id,
                $id,
                $orderId,
                'commit',
                0,
                $quantity,
                0,
                $commandScope,
                $idempotencyKey,
                $correlationId,
            );

            return [
                'reservation_id' => $id,
                'status' => 'committed',
                'remaining_quantity' => $newRemaining,
                'replay' => false,
            ];
        });
    }

    /** @return array{reservation_id: string, status: string, fulfilled_quantity: int, remaining_quantity: int, replay: bool} */
    public function fulfillForOrder(
        string $reservationId,
        int $quantity,
        string $actorUserId,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        if ($quantity < 1 || trim($commandScope) === '' || trim($idempotencyKey) === '') {
            throw new ListingError('VALIDATION_FAILED', 'A positive fulfillment quantity and idempotency key are required.', $correlationId, fieldErrors: ['quantity' => ['Enter a quantity of at least 1.']]);
        }

        return DB::transaction(function () use ($reservationId, $quantity, $actorUserId, $commandScope, $idempotencyKey, $correlationId): array {
            $existingMovement = DB::table('stock_movements')
                ->where('command_scope', $commandScope)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existingMovement !== null) {
                if ((string) $existingMovement->movement_type !== 'fulfillment'
                    || (string) $existingMovement->reservation_id !== $reservationId
                    || -((int) $existingMovement->delta_on_hand) !== $quantity) {
                    throw new ListingError('IDEMPOTENCY_CONFLICT', 'That fulfillment key was already used for different input.', $correlationId, status: 409);
                }

                $reservation = DB::table('listing_capacity_reservations')->where('id', $reservationId)->first();
                $bucket = DB::table('listing_capacity')->where('id', $reservation?->listing_capacity_id)->first();

                return [
                    'reservation_id' => $reservationId,
                    'status' => (string) ($reservation->status ?? ''),
                    'fulfilled_quantity' => (int) ($reservation->fulfilled_quantity ?? 0),
                    'remaining_quantity' => (int) ($bucket->remaining_quantity ?? 0),
                    'replay' => true,
                ];
            }

            $reservation = DB::table('listing_capacity_reservations')
                ->where('id', $reservationId)
                ->lockForUpdate()
                ->first();
            if ($reservation === null || $reservation->order_id === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Order capacity reservation was not found.', $correlationId, status: 404);
            }
            if ((string) $reservation->status !== 'committed') {
                throw new ListingError('INVALID_STATE', 'Only committed order capacity can be fulfilled.', $correlationId, status: 409);
            }

            $bucket = DB::table('listing_capacity')
                ->where('id', $reservation->listing_capacity_id)
                ->lockForUpdate()
                ->first();
            if ($bucket === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The order capacity bucket was not found.', $correlationId, status: 404);
            }

            $fulfilledQuantity = (int) $reservation->fulfilled_quantity;
            $releasedQuantity = (int) $reservation->released_quantity;
            if ($quantity > (int) $reservation->quantity - $fulfilledQuantity - $releasedQuantity) {
                throw new ListingError('VALIDATION_FAILED', 'Fulfilled quantity cannot exceed unfulfilled order quantity.', $correlationId, status: 409, fieldErrors: ['quantity' => ['Enter a quantity no greater than the order quantity remaining.']]);
            }
            if ($quantity > (int) $bucket->quantity) {
                throw new ListingError('CAPACITY_SHORTAGE', 'On-hand stock is below this fulfillment quantity.', $correlationId, status: 409);
            }

            $now = now();
            $nextFulfilled = $fulfilledQuantity + $quantity;
            $status = $nextFulfilled + $releasedQuantity === (int) $reservation->quantity ? 'fulfilled' : 'committed';
            DB::table('listing_capacity_reservations')->where('id', $reservationId)->update([
                'fulfilled_quantity' => $nextFulfilled,
                'fulfilled_at' => $status === 'fulfilled' ? $now : $reservation->fulfilled_at,
                'status' => $status,
                'row_version' => ((int) $reservation->row_version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            $onHand = (int) $bucket->quantity - $quantity;
            $balances = DB::table('listing_capacity_reservations')
                ->where('listing_capacity_id', $bucket->id)
                ->selectRaw("COALESCE(SUM(CASE WHEN status = 'held' THEN quantity ELSE 0 END), 0) AS held")
                ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('committed', 'fulfilled') THEN quantity - fulfilled_quantity - released_quantity ELSE 0 END), 0) AS committed")
                ->first();
            $held = (int) ($balances->held ?? 0);
            $committed = (int) ($balances->committed ?? 0);
            $available = $onHand - $held - $committed;
            DB::table('listing_capacity')->where('id', $bucket->id)->update([
                'quantity' => $onHand,
                'remaining_quantity' => $available,
                'availability_status' => $available < 0 ? 'shortage' : ($available === 0 ? 'out_of_stock' : 'open'),
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $ownerId = (string) DB::table('listings')->where('id', $bucket->listing_id)->value('owner_user_id');
            DB::table('stock_movements')->insert([
                'id' => (string) Str::uuid7(),
                'listing_capacity_id' => $bucket->id,
                'source_listing_version_id' => $reservation->listing_version_id,
                'reservation_id' => $reservationId,
                'order_id' => $reservation->order_id,
                'movement_type' => 'fulfillment',
                'delta_on_hand' => -$quantity,
                'delta_held' => 0,
                'delta_committed' => -$quantity,
                'balance_on_hand' => $onHand,
                'balance_held' => $held,
                'balance_committed' => $committed,
                'balance_available' => $available,
                'counted_quantity' => null,
                'reason' => 'Physical stock departed into order custody.',
                'reference' => null,
                'evidence_file_id' => null,
                'actor_user_id' => $actorUserId,
                'owner_user_id' => $ownerId,
                'consent_grant_id' => null,
                'command_scope' => $commandScope,
                'idempotency_key' => $idempotencyKey,
                'correlation_id' => $correlationId,
                'occurred_at' => $now,
                'created_at' => $now,
            ]);

            return [
                'reservation_id' => $reservationId,
                'status' => $status,
                'fulfilled_quantity' => $nextFulfilled,
                'remaining_quantity' => $available,
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
            if ($bucket === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'Capacity bucket was not found.', $correlationId, status: 404);
            }

            $now = now();
            DB::table('listing_capacity_reservations')->where('id', $reservationId)->update([
                'status' => 'committed',
                'committed_at' => $now,
                'row_version' => ((int) $reservation->row_version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            DB::table('listing_capacity')->where('id', $bucket->id)->update([
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $this->appendReservationMovement(
                (string) $bucket->id,
                $reservationId,
                $reservation->order_id === null ? null : (string) $reservation->order_id,
                'commit',
                -((int) $reservation->quantity),
                (int) $reservation->quantity,
                0,
                'capacity-reservation:commit:'.$reservationId,
                'capacity-commit:'.$reservationId,
                $correlationId,
            );

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
            $outstanding = (int) $reservation->quantity
                - (int) $reservation->fulfilled_quantity
                - (int) $reservation->released_quantity;
            $newRemaining = (int) $bucket->remaining_quantity + $outstanding;

            DB::table('listing_capacity_reservations')->where('id', $reservationId)->update([
                'status' => $status,
                'released_quantity' => (int) $reservation->released_quantity + $outstanding,
                'released_at' => $now,
                'row_version' => ((int) $reservation->row_version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            DB::table('listing_capacity')->where('id', $bucket->id)->update([
                'remaining_quantity' => $newRemaining,
                'reservation_status' => $newRemaining > 0 ? 'open' : 'held',
                'availability_status' => $newRemaining < 0 ? 'shortage' : ($newRemaining === 0 ? 'out_of_stock' : 'open'),
                'row_version' => ((int) $bucket->row_version) + 1,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $this->appendReservationMovement(
                (string) $bucket->id,
                $reservationId,
                $reservation->order_id === null ? null : (string) $reservation->order_id,
                'release',
                (string) $reservation->status === 'held' ? -$outstanding : 0,
                (string) $reservation->status === 'committed' ? -$outstanding : 0,
                0,
                'capacity-reservation:'.$status.':'.$reservationId,
                'reservation-terminal:'.$reservationId.':'.$status,
                $correlationId,
            );

            return [
                'reservation_id' => $reservationId,
                'status' => $status,
                'remaining_quantity' => $newRemaining,
            ];
        });
    }

    private function appendReservationMovement(
        string $capacityId,
        string $reservationId,
        ?string $orderId,
        string $movementType,
        int $deltaHeld,
        int $deltaCommitted,
        int $deltaOnHand,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): void {
        $bucket = DB::table('listing_capacity')->where('id', $capacityId)->first();
        if ($bucket === null) {
            throw new ListingError('LISTING_NOT_FOUND', 'Capacity bucket was not found.', $correlationId, status: 404);
        }
        $balances = DB::table('listing_capacity_reservations')
            ->where('listing_capacity_id', $capacityId)
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'held' THEN quantity ELSE 0 END), 0) AS held")
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('committed', 'fulfilled') THEN quantity - fulfilled_quantity - released_quantity ELSE 0 END), 0) AS committed")
            ->first();
        $onHand = (int) $bucket->quantity;
        $held = (int) ($balances->held ?? 0);
        $committed = (int) ($balances->committed ?? 0);
        $available = $onHand - $held - $committed;
        $ownerId = (string) DB::table('listings')->where('id', $bucket->listing_id)->value('owner_user_id');
        $now = now();

        DB::table('stock_movements')->insert([
            'id' => (string) Str::uuid7(),
            'listing_capacity_id' => $capacityId,
            'source_listing_version_id' => $bucket->listing_version_id,
            'reservation_id' => $reservationId,
            'order_id' => $orderId,
            'movement_type' => $movementType,
            'delta_on_hand' => $deltaOnHand,
            'delta_held' => $deltaHeld,
            'delta_committed' => $deltaCommitted,
            'balance_on_hand' => $onHand,
            'balance_held' => $held,
            'balance_committed' => $committed,
            'balance_available' => $available,
            'counted_quantity' => null,
            'reason' => null,
            'reference' => null,
            'evidence_file_id' => null,
            'actor_user_id' => null,
            'owner_user_id' => $ownerId,
            'consent_grant_id' => null,
            'command_scope' => 'capacity-movement:'.$movementType.':'.$commandScope,
            'idempotency_key' => $idempotencyKey,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'created_at' => $now,
        ]);
    }
}

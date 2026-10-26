<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Capacity holds for Order formation — implemented by Listings, consumed by OrdersWork.
 */
interface OrderCapacityPort
{
    /**
     * @return array{id: string, listing_id: string, listing_version_id: string, remaining_quantity: int}|null
     */
    public function findOpenQuantityBucket(string $listingId, string $listingVersionId, string $resourceKey = ''): ?array;

    /**
     * @return array{reservation_id: string, status: string, quantity: int, remaining_quantity: int, replay: bool}
     */
    public function hold(
        string $listingCapacityId,
        int $quantity,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function commit(string $reservationId, string $correlationId): array;

    /**
     * Atomically commits quantity capacity for final Order formation.
     *
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
    ): ?array;

    /**
     * Record physical custody departure once and deduct the fulfilled quantity from on-hand.
     *
     * @return array{reservation_id: string, status: string, fulfilled_quantity: int, remaining_quantity: int, replay: bool}
     */
    public function fulfillForOrder(
        string $reservationId,
        int $quantity,
        string $actorUserId,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    /**
     * @return array{reservation_id: string, status: string, remaining_quantity: int}
     */
    public function release(string $reservationId, string $correlationId): array;

    /**
     * Reserve an A3 full-duration interval on the provider's shared schedule.
     *
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function holdAppointment(
        string $listingId,
        string $listingVersionId,
        string $providerUserId,
        string $customerUserId,
        string $startsAt,
        int $durationMinutes,
        int $ttlMinutes,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    /**
     * Commit an exact A3 hold when its Order becomes accepted.
     *
     * @return array{id: string, starts_at: string, ends_at: string}
     */
    public function commitAppointmentForOrder(
        string $reservationId,
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        string $correlationId,
    ): array;

    /**
     * @return array{listing_version_id: string, provider_user_id: string, duration_minutes: int}
     */
    public function appointmentDetailsForListing(string $listingId, string $correlationId): array;

    /**
     * @return array{duration_minutes: int, slots: list<array{starts_at: string, ends_at: string}>}
     */
    public function appointmentSlotsForProvider(string $providerUserId, string $from, string $to, int $durationMinutes, string $correlationId): array;

    /**
     * Hold an appointment for one immutable quote version on the shared provider resource.
     *
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function holdQuoteAppointment(
        string $quoteId,
        int $quoteVersion,
        string $providerUserId,
        string $customerUserId,
        string $startsAt,
        int $durationMinutes,
        int $ttlMinutes,
        string $idempotencyKey,
        string $correlationId,
    ): array;

    /**
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function claimQuoteAppointmentHold(
        string $reservationId,
        string $quoteId,
        int $quoteVersion,
        string $providerUserId,
        string $customerUserId,
        int $durationMinutes,
        string $correlationId,
    ): array;

    /**
     * Read the current customer's still-live hold for an immutable quote version.
     *
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}|null
     */
    public function currentQuoteAppointmentHold(string $quoteId, int $quoteVersion, string $customerUserId): ?array;

    /**
     * @return array{id: string, schedule_resource_id: string, work_instance_id: string, starts_at: string, ends_at: string, duration_minutes: int}|null
     */
    public function activeAppointmentForOrder(string $orderId): ?array;

    /**
     * Verify that an unexpired A3 hold belongs to this customer and pinned listing version.
     *
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function claimAppointmentHold(
        string $reservationId,
        string $listingId,
        string $listingVersionId,
        string $providerUserId,
        string $customerUserId,
        string $correlationId,
    ): array;

    /**
     * Hold the requested replacement slot while leaving the active booking committed.
     *
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function holdAppointmentChange(
        string $currentReservationId,
        string $actorUserId,
        string $startsAt,
        string $correlationId,
    ): array;

    /**
     * Replace the old booking with a validated hold under the same provider resource lock.
     *
     * @return array{id: string, starts_at: string, ends_at: string}
     */
    public function swapAppointmentForOrder(
        string $currentReservationId,
        string $proposedReservationId,
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        string $correlationId,
    ): array;

    public function releaseAppointmentHold(string $reservationId, string $correlationId, ?string $actorUserId = null): void;

    /** Release exactly the committed A3 slot for one work instance withdrawing before start. */
    public function releaseCommittedAppointmentForWithdrawal(
        string $reservationId,
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        string $correlationId,
    ): void;
}

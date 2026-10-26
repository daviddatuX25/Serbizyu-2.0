<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Application\KernelException;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class OrderCapacityAdapter implements OrderCapacityPort
{
    public function __construct(
        private readonly CapacityReservationService $capacity,
        private readonly AppointmentSchedulingService $appointments,
    ) {}

    public function findOpenQuantityBucket(string $listingId, string $listingVersionId, string $resourceKey = ''): ?array
    {
        if (! Schema::hasTable('listing_capacity')) {
            return null;
        }

        $row = DB::table('listing_capacity')
            ->where('listing_id', $listingId)
            ->where('listing_version_id', $listingVersionId)
            ->where('capacity_type', 'quantity')
            ->where('resource_key', $resourceKey)
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
        try {
            return $this->capacity->commitForOrder(
                listingId: $listingId,
                listingVersionId: $listingVersionId,
                orderId: $orderId,
                quantity: $quantity,
                commandScope: $commandScope,
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
                heldReservationId: $heldReservationId,
                resourceKey: $resourceKey,
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

    public function fulfillForOrder(
        string $reservationId,
        int $quantity,
        string $actorUserId,
        string $commandScope,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        try {
            return $this->capacity->fulfillForOrder(
                reservationId: $reservationId,
                quantity: $quantity,
                actorUserId: $actorUserId,
                commandScope: $commandScope,
                idempotencyKey: $idempotencyKey,
                correlationId: $correlationId,
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
    ): array {
        return $this->appointments->holdAppointment($listingId, $listingVersionId, $providerUserId, $customerUserId, $startsAt, $durationMinutes, $ttlMinutes, $idempotencyKey, $correlationId);
    }

    public function appointmentDetailsForListing(string $listingId, string $correlationId): array
    {
        return $this->appointments->appointmentDetailsForListing($listingId, $correlationId);
    }

    public function appointmentSlotsForProvider(string $providerUserId, string $from, string $to, int $durationMinutes, string $correlationId): array
    {
        return $this->appointments->appointmentSlotsForProvider($providerUserId, $from, $to, $durationMinutes, $correlationId);
    }

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
    ): array {
        return $this->appointments->holdQuoteAppointment($quoteId, $quoteVersion, $providerUserId, $customerUserId, $startsAt, $durationMinutes, $ttlMinutes, $idempotencyKey, $correlationId);
    }

    public function claimQuoteAppointmentHold(
        string $reservationId,
        string $quoteId,
        int $quoteVersion,
        string $providerUserId,
        string $customerUserId,
        int $durationMinutes,
        string $correlationId,
    ): array {
        return $this->appointments->claimQuoteAppointmentHold($reservationId, $quoteId, $quoteVersion, $providerUserId, $customerUserId, $durationMinutes, $correlationId);
    }

    public function currentQuoteAppointmentHold(string $quoteId, int $quoteVersion, string $customerUserId): ?array
    {
        return $this->appointments->currentQuoteAppointmentHold($quoteId, $quoteVersion, $customerUserId);
    }

    public function claimAppointmentHold(
        string $reservationId,
        string $listingId,
        string $listingVersionId,
        string $providerUserId,
        string $customerUserId,
        string $correlationId,
    ): array {
        return $this->appointments->claimAppointmentHold($reservationId, $listingId, $listingVersionId, $providerUserId, $customerUserId, $correlationId);
    }

    public function commitAppointmentForOrder(string $reservationId, string $orderId, string $workInstanceId, string $actorUserId, string $correlationId): array
    {
        return $this->appointments->commitAppointmentForOrder($reservationId, $orderId, $workInstanceId, $actorUserId, $correlationId);
    }

    public function activeAppointmentForOrder(string $orderId): ?array
    {
        return $this->appointments->activeAppointmentForOrder($orderId);
    }

    public function holdAppointmentChange(string $currentReservationId, string $actorUserId, string $startsAt, string $correlationId): array
    {
        return $this->appointments->holdAppointmentChange($currentReservationId, $actorUserId, $startsAt, $correlationId);
    }

    public function swapAppointmentForOrder(string $currentReservationId, string $proposedReservationId, string $orderId, string $workInstanceId, string $actorUserId, string $correlationId): array
    {
        return $this->appointments->swapAppointmentForOrder($currentReservationId, $proposedReservationId, $orderId, $workInstanceId, $actorUserId, $correlationId);
    }

    public function releaseAppointmentHold(string $reservationId, string $correlationId, ?string $actorUserId = null): void
    {
        $this->appointments->releaseAppointmentHold($reservationId, $correlationId, $actorUserId);
    }

    public function releaseCommittedAppointmentForWithdrawal(
        string $reservationId,
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        string $correlationId,
    ): void {
        $this->appointments->releaseCommittedAppointmentForWithdrawal(
            $reservationId, $orderId, $workInstanceId, $actorUserId, $correlationId,
        );
    }
}

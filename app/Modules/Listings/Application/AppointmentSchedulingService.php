<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\AdministrativeWorkVersionPort;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AppointmentSchedulingService
{
    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly AdministrativeWorkVersionPort $workTargets,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}

    public function slots(string $listingId, string $from, string $to, ?string $expectedListingVersionId, string $correlationId): array
    {
        $source = $this->listingSource($listingId);
        if ($expectedListingVersionId !== null && $expectedListingVersionId !== (string) $source['listing_version_id']) {
            throw new KernelException('LISTING_VERSION_CHANGED', 'This listing changed. Refresh the appointment choices.', $correlationId, status: 409);
        }
        $duration = $this->durationMinutes($source['terms']);

        return ['duration_minutes' => $duration, 'slots' => $this->availableSlots((string) $source['provider_user_id'], $from, $to, $duration, $correlationId)];
    }

    /**
     * @return array{listing_version_id: string, provider_user_id: string, duration_minutes: int}
     */
    public function details(string $listingId): array
    {
        $source = $this->listingSource($listingId);

        return [
            'listing_version_id' => $source['listing_version_id'],
            'provider_user_id' => $source['provider_user_id'],
            'duration_minutes' => $this->durationMinutes($source['terms']),
        ];
    }

    /**
     * @return array{listing_version_id: string, provider_user_id: string, duration_minutes: int}
     */
    public function appointmentDetailsForListing(string $listingId, string $correlationId): array
    {
        return $this->details($listingId);
    }

    /**
     * @return array{duration_minutes: int, slots: list<array{starts_at: string, ends_at: string}>}
     */
    public function appointmentSlotsForProvider(string $providerUserId, string $from, string $to, int $durationMinutes, string $correlationId): array
    {
        if ($durationMinutes < 1 || $durationMinutes > 480) {
            throw new KernelException('INVALID_APPOINTMENT_DURATION', 'The appointment duration is invalid.', $correlationId, status: 422);
        }

        return [
            'duration_minutes' => $durationMinutes,
            'slots' => $this->availableSlots($providerUserId, $from, $to, $durationMinutes, $correlationId),
        ];
    }

    /**
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
    ): array {
        $source = $this->listingSource($listingId);
        if ((string) $source['provider_user_id'] !== $providerUserId || (string) $source['listing_version_id'] !== $listingVersionId) {
            throw new KernelException('LISTING_VERSION_CHANGED', 'The appointment listing changed. Refresh and choose a new time.', $correlationId, status: 409);
        }
        if ($durationMinutes !== $this->durationMinutes($source['terms'])) {
            throw new KernelException('INVALID_APPOINTMENT_DURATION', 'The appointment duration must match the listing terms.', $correlationId, status: 422);
        }
        $start = $this->date($startsAt);
        $this->assertSlotStart($start);
        $end = $start->copy()->addMinutes($durationMinutes);
        if ($start->lte(now())) {
            throw ValidationException::withMessages(['starts_at' => ['Choose an appointment time in the future.']]);
        }
        $ttlMinutes = max(1, $ttlMinutes);

        return DB::transaction(function () use ($listingId, $listingVersionId, $providerUserId, $customerUserId, $start, $end, $durationMinutes, $ttlMinutes, $idempotencyKey, $correlationId): array {
            $resource = $this->resource($providerUserId, lock: true);
            $existing = DB::table('appointment_reservations')
                ->where('created_by_user_id', $customerUserId)
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();
            if ($existing !== null) {
                if (
                    (string) $existing->status === 'held'
                    && (string) $existing->schedule_resource_id === (string) $resource->id
                    && (string) $existing->listing_id === $listingId
                    && (string) $existing->listing_version_id === $listingVersionId
                    && (int) $existing->duration_minutes === $durationMinutes
                    && $this->date((string) $existing->starts_at)->equalTo($start)
                    && $this->date((string) $existing->hold_expires_at)->gt(now())
                ) {
                    return ['id' => (string) $existing->id, 'starts_at' => $this->date((string) $existing->starts_at)->toIso8601String(), 'ends_at' => $this->date((string) $existing->ends_at)->toIso8601String(), 'duration_minutes' => (int) $existing->duration_minutes, 'hold_expires_at' => $this->date((string) $existing->hold_expires_at)->toIso8601String()];
                }
                throw new KernelException('APPOINTMENT_HOLD_EXPIRED', 'This hold request has already expired. Choose a new time and try again.', $correlationId, status: 409);
            }
            $this->assertAvailable((string) $resource->id, $start, $end, $correlationId);
            $id = (string) Str::uuid7();
            $expiresAt = now()->addMinutes($ttlMinutes);
            DB::table('appointment_reservations')->insert([
                'id' => $id,
                'schedule_resource_id' => $resource->id,
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'order_id' => null,
                'work_instance_id' => null,
                'created_by_user_id' => $customerUserId,
                'idempotency_key' => $idempotencyKey,
                'starts_at' => $start,
                'ends_at' => $end,
                'duration_minutes' => $durationMinutes,
                'status' => 'held',
                'hold_expires_at' => $expiresAt,
                'correlation_id' => $correlationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.hold_created',
                eventType: 'appointment.hold_created',
                targetType: 'appointment_reservation',
                targetId: $id,
                resourceId: (string) $resource->id,
                actorUserId: $customerUserId,
                correlationId: $correlationId,
                previous: null,
                next: [
                    'appointment_reservation_id' => $id,
                    'provider_user_id' => $providerUserId,
                    'created_by_user_id' => $customerUserId,
                    'listing_id' => $listingId,
                    'listing_version_id' => $listingVersionId,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'duration_minutes' => $durationMinutes,
                    'hold_expires_at' => $expiresAt->toIso8601String(),
                    'status' => 'held',
                ],
            );

            return ['id' => $id, 'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String(), 'duration_minutes' => $durationMinutes, 'hold_expires_at' => $expiresAt->toIso8601String()];
        }, attempts: 3);
    }

    /**
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function holdQuoteAppointment(string $quoteId, int $quoteVersion, string $providerUserId, string $customerUserId, string $startsAt, int $durationMinutes, int $ttlMinutes, string $idempotencyKey, string $correlationId): array
    {
        if ($quoteVersion < 1 || $durationMinutes < 1 || $durationMinutes > 480) {
            throw new KernelException('INVALID_APPOINTMENT_SOURCE', 'The appointment source terms are invalid.', $correlationId, status: 422);
        }
        $start = $this->date($startsAt);
        $this->assertSlotStart($start);
        if ($start->lte(now())) {
            throw ValidationException::withMessages(['starts_at' => ['Choose an appointment time in the future.']]);
        }
        $end = $start->copy()->addMinutes($durationMinutes);
        $ttlMinutes = max(1, $ttlMinutes);

        return DB::transaction(function () use ($quoteId, $quoteVersion, $providerUserId, $customerUserId, $start, $end, $durationMinutes, $ttlMinutes, $idempotencyKey, $correlationId): array {
            $resource = $this->resource($providerUserId, lock: true);
            $existing = DB::table('appointment_reservations')->where('created_by_user_id', $customerUserId)->where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
            if ($existing !== null) {
                if (
                    (string) $existing->status === 'held'
                    && (string) $existing->schedule_resource_id === (string) $resource->id
                    && (string) $existing->source_quote_id === $quoteId
                    && (int) $existing->source_quote_version === $quoteVersion
                    && (int) $existing->duration_minutes === $durationMinutes
                    && $this->date((string) $existing->starts_at)->equalTo($start)
                    && $this->date((string) $existing->hold_expires_at)->gt(now())
                ) {
                    return ['id' => (string) $existing->id, 'starts_at' => $this->date((string) $existing->starts_at)->toIso8601String(), 'ends_at' => $this->date((string) $existing->ends_at)->toIso8601String(), 'duration_minutes' => (int) $existing->duration_minutes, 'hold_expires_at' => $this->date((string) $existing->hold_expires_at)->toIso8601String()];
                }
                throw new KernelException('APPOINTMENT_HOLD_INVALID', 'This hold key has already been used.', $correlationId, status: 409);
            }
            $this->assertAvailable((string) $resource->id, $start, $end, $correlationId);
            $id = (string) Str::uuid7();
            $expiresAt = now()->addMinutes($ttlMinutes);
            DB::table('appointment_reservations')->insert([
                'id' => $id, 'schedule_resource_id' => $resource->id, 'listing_id' => null, 'listing_version_id' => null,
                'source_quote_id' => $quoteId, 'source_quote_version' => $quoteVersion, 'order_id' => null, 'work_instance_id' => null,
                'created_by_user_id' => $customerUserId, 'idempotency_key' => $idempotencyKey,
                'starts_at' => $start, 'ends_at' => $end, 'duration_minutes' => $durationMinutes,
                'status' => 'held', 'hold_expires_at' => $expiresAt, 'correlation_id' => $correlationId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.quote_hold_created',
                eventType: 'appointment.quote_hold_created',
                targetType: 'appointment_reservation',
                targetId: $id,
                resourceId: (string) $resource->id,
                actorUserId: $customerUserId,
                correlationId: $correlationId,
                previous: null,
                next: [
                    'appointment_reservation_id' => $id,
                    'provider_user_id' => $providerUserId,
                    'created_by_user_id' => $customerUserId,
                    'source_quote_id' => $quoteId,
                    'source_quote_version' => $quoteVersion,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'duration_minutes' => $durationMinutes,
                    'hold_expires_at' => $expiresAt->toIso8601String(),
                    'status' => 'held',
                ],
            );

            return ['id' => $id, 'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String(), 'duration_minutes' => $durationMinutes, 'hold_expires_at' => $expiresAt->toIso8601String()];
        }, attempts: 3);
    }

    /**
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function claimAppointmentHold(string $reservationId, string $listingId, string $listingVersionId, string $providerUserId, string $customerUserId, string $correlationId): array
    {
        $snapshot = DB::table('appointment_reservations')->where('id', $reservationId)->first();
        if ($snapshot === null) {
            throw new KernelException('APPOINTMENT_HOLD_NOT_FOUND', 'Choose a valid appointment hold.', $correlationId, status: 409);
        }

        return DB::transaction(function () use ($snapshot, $reservationId, $listingId, $listingVersionId, $providerUserId, $customerUserId, $correlationId): array {
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $hold = DB::table('appointment_reservations')->where('id', $reservationId)->lockForUpdate()->first();
            if (
                $hold === null
                || (string) $hold->status !== 'held'
                || $this->date((string) $hold->hold_expires_at)->lte(now())
                || (string) $hold->listing_id !== $listingId
                || (string) $hold->listing_version_id !== $listingVersionId
                || (string) $hold->created_by_user_id !== $customerUserId
                || (string) $resource->provider_user_id !== $providerUserId
            ) {
                throw new KernelException('APPOINTMENT_HOLD_INVALID', 'The appointment hold expired or does not match this listing and customer.', $correlationId, status: 409);
            }

            return [
                'id' => (string) $hold->id,
                'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                'duration_minutes' => (int) $hold->duration_minutes,
                'hold_expires_at' => $this->date((string) $hold->hold_expires_at)->toIso8601String(),
            ];
        }, attempts: 3);
    }

    /**
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}
     */
    public function claimQuoteAppointmentHold(string $reservationId, string $quoteId, int $quoteVersion, string $providerUserId, string $customerUserId, int $durationMinutes, string $correlationId): array
    {
        $snapshot = DB::table('appointment_reservations')->where('id', $reservationId)->first();
        if ($snapshot === null) {
            throw new KernelException('APPOINTMENT_HOLD_NOT_FOUND', 'Choose a valid appointment hold.', $correlationId, status: 409);
        }

        return DB::transaction(function () use ($snapshot, $reservationId, $quoteId, $quoteVersion, $providerUserId, $customerUserId, $durationMinutes, $correlationId): array {
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $hold = DB::table('appointment_reservations')->where('id', $reservationId)->lockForUpdate()->first();
            if (
                $hold === null
                || (string) $hold->status !== 'held'
                || $this->date((string) $hold->hold_expires_at)->lte(now())
                || (string) $hold->source_quote_id !== $quoteId
                || (int) $hold->source_quote_version !== $quoteVersion
                || (string) $hold->created_by_user_id !== $customerUserId
                || (string) $resource->provider_user_id !== $providerUserId
                || (int) $hold->duration_minutes !== $durationMinutes
            ) {
                throw new KernelException('APPOINTMENT_HOLD_INVALID', 'The appointment hold expired or does not match this quote and customer.', $correlationId, status: 409);
            }

            return [
                'id' => (string) $hold->id,
                'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                'duration_minutes' => (int) $hold->duration_minutes,
                'hold_expires_at' => $this->date((string) $hold->hold_expires_at)->toIso8601String(),
            ];
        }, attempts: 3);
    }

    /**
     * @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, hold_expires_at: string}|null
     */
    public function currentQuoteAppointmentHold(string $quoteId, int $quoteVersion, string $customerUserId): ?array
    {
        $snapshot = DB::table('appointment_reservations')
            ->where('source_quote_id', $quoteId)
            ->where('source_quote_version', $quoteVersion)
            ->where('created_by_user_id', $customerUserId)
            ->where('status', 'held')
            ->where('hold_expires_at', '>', now())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
        if ($snapshot === null) {
            return null;
        }

        return DB::transaction(function () use ($snapshot): ?array {
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $hold = DB::table('appointment_reservations')->where('id', $snapshot->id)->lockForUpdate()->first();
            if ($hold === null || (string) $hold->status !== 'held') {
                return null;
            }
            if ($this->date((string) $hold->hold_expires_at)->lte(now())) {
                $this->expireHolds((string) $resource->id, (string) Str::uuid7());

                return null;
            }

            return [
                'id' => (string) $hold->id,
                'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                'duration_minutes' => (int) $hold->duration_minutes,
                'hold_expires_at' => $this->date((string) $hold->hold_expires_at)->toIso8601String(),
            ];
        }, attempts: 3);
    }

    public function commitAppointmentForOrder(string $reservationId, string $orderId, string $workInstanceId, string $actorUserId, string $correlationId): array
    {
        return DB::transaction(function () use ($reservationId, $orderId, $workInstanceId, $actorUserId, $correlationId): array {
            $snapshot = DB::table('appointment_reservations')->where('id', $reservationId)->first();
            if ($snapshot === null) {
                throw new KernelException('APPOINTMENT_HOLD_NOT_FOUND', 'The appointment hold is no longer available.', $correlationId, status: 409);
            }
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $hold = DB::table('appointment_reservations')->where('id', $reservationId)->lockForUpdate()->first();
            if ($hold === null || (string) $hold->status !== 'held' || $this->date((string) $hold->hold_expires_at)->lte(now())) {
                if ($hold !== null && (string) $hold->status === 'held') {
                    DB::table('appointment_reservations')->where('id', $reservationId)->update(['status' => 'expired', 'updated_at' => now()]);
                }
                throw new KernelException('APPOINTMENT_HOLD_EXPIRED', 'The appointment hold expired. Choose another time.', $correlationId, status: 409, retryable: true);
            }
            if ($this->date((string) $hold->starts_at)->lte(now())) {
                throw new KernelException('APPOINTMENT_UNAVAILABLE', 'The held appointment time has passed. Choose another time.', $correlationId, status: 409);
            }
            $this->assertAvailable(
                (string) $resource->id,
                $this->date((string) $hold->starts_at),
                $this->date((string) $hold->ends_at),
                $correlationId,
                [$reservationId],
            );
            DB::table('appointment_reservations')->where('id', $reservationId)->update([
                'status' => 'committed',
                'hold_expires_at' => null,
                'order_id' => $orderId,
                'work_instance_id' => $workInstanceId,
                'updated_at' => now(),
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.committed',
                eventType: 'appointment.committed',
                targetType: 'appointment_reservation',
                targetId: $reservationId,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: ['status' => 'held'],
                next: [
                    'appointment_reservation_id' => $reservationId,
                    'order_id' => $orderId,
                    'work_instance_id' => $workInstanceId,
                    'provider_user_id' => (string) $resource->provider_user_id,
                    'created_by_user_id' => (string) $hold->created_by_user_id,
                    'listing_id' => $hold->listing_id,
                    'listing_version_id' => $hold->listing_version_id,
                    'source_quote_id' => $hold->source_quote_id,
                    'source_quote_version' => $hold->source_quote_version,
                    'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                    'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                    'duration_minutes' => (int) $hold->duration_minutes,
                    'status' => 'committed',
                ],
            );

            return ['id' => (string) $hold->id, 'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(), 'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String()];
        }, attempts: 3);
    }

    /**
     * @return array{id: string, schedule_resource_id: string, work_instance_id: string, starts_at: string, ends_at: string, duration_minutes: int}|null
     */
    public function activeAppointmentForOrder(string $orderId): ?array
    {
        $row = DB::table('appointment_reservations')
            ->where('order_id', $orderId)
            ->where('status', 'committed')
            ->first();
        if ($row === null) {
            return null;
        }

        return [
            'schedule_resource_id' => (string) $row->schedule_resource_id,
            'id' => (string) $row->id,
            'work_instance_id' => (string) $row->work_instance_id,
            'starts_at' => $this->date((string) $row->starts_at)->toIso8601String(),
            'ends_at' => $this->date((string) $row->ends_at)->toIso8601String(),
            'duration_minutes' => (int) $row->duration_minutes,
        ];
    }

    public function holdAppointmentChange(string $currentReservationId, string $actorUserId, string $startsAt, string $correlationId): array
    {
        return DB::transaction(function () use ($currentReservationId, $actorUserId, $startsAt, $correlationId): array {
            $snapshot = DB::table('appointment_reservations')->where('id', $currentReservationId)->first();
            if ($snapshot === null) {
                throw new KernelException('APPOINTMENT_NOT_FOUND', 'The active appointment could not be found.', $correlationId, status: 404);
            }
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $current = DB::table('appointment_reservations')->where('id', $currentReservationId)->lockForUpdate()->first();
            if ($current === null || (string) $current->status !== 'committed') {
                throw new KernelException('APPOINTMENT_UNAVAILABLE', 'The active appointment has changed.', $correlationId, status: 409);
            }
            $start = $this->date($startsAt);
            $this->assertSlotStart($start);
            if ($start->lte(now())) {
                throw ValidationException::withMessages(['starts_at' => ['Choose an appointment time in the future.']]);
            }
            $end = $start->copy()->addMinutes((int) $current->duration_minutes);
            $this->assertAvailable((string) $resource->id, $start, $end, $correlationId, [(string) $current->id]);
            $id = (string) Str::uuid7();
            $expiresAt = now()->addMinutes(max(1, (int) config('serbizyu.scheduling.slot_hold_minutes', 10)));
            DB::table('appointment_reservations')->insert([
                'id' => $id, 'schedule_resource_id' => $resource->id, 'listing_id' => $current->listing_id,
                'listing_version_id' => $current->listing_version_id, 'source_quote_id' => $current->source_quote_id,
                'source_quote_version' => $current->source_quote_version, 'order_id' => null, 'work_instance_id' => null,
                'created_by_user_id' => $actorUserId, 'starts_at' => $start, 'ends_at' => $end,
                'duration_minutes' => $current->duration_minutes, 'status' => 'held', 'hold_expires_at' => $expiresAt,
                'correlation_id' => $correlationId, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.change_hold_created',
                eventType: 'appointment.change_hold_created',
                targetType: 'appointment_reservation',
                targetId: $id,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: null,
                next: [
                    'appointment_reservation_id' => $id,
                    'current_reservation_id' => (string) $current->id,
                    'order_id' => (string) $current->order_id,
                    'work_instance_id' => (string) $current->work_instance_id,
                    'provider_user_id' => (string) $resource->provider_user_id,
                    'created_by_user_id' => $actorUserId,
                    'listing_id' => $current->listing_id,
                    'listing_version_id' => $current->listing_version_id,
                    'source_quote_id' => $current->source_quote_id,
                    'source_quote_version' => $current->source_quote_version,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'duration_minutes' => (int) $current->duration_minutes,
                    'hold_expires_at' => $expiresAt->toIso8601String(),
                    'status' => 'held',
                ],
            );

            return ['id' => $id, 'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String(), 'duration_minutes' => (int) $current->duration_minutes, 'hold_expires_at' => $expiresAt->toIso8601String()];
        }, attempts: 3);
    }

    public function swapAppointmentForOrder(string $currentReservationId, string $proposedReservationId, string $orderId, string $workInstanceId, string $actorUserId, string $correlationId): array
    {
        return DB::transaction(function () use ($currentReservationId, $proposedReservationId, $orderId, $workInstanceId, $actorUserId, $correlationId): array {
            $currentSnapshot = DB::table('appointment_reservations')->where('id', $currentReservationId)->first();
            $proposedSnapshot = DB::table('appointment_reservations')->where('id', $proposedReservationId)->first();
            if ($currentSnapshot === null || $proposedSnapshot === null || (string) $currentSnapshot->schedule_resource_id !== (string) $proposedSnapshot->schedule_resource_id) {
                throw new KernelException('APPOINTMENT_UNAVAILABLE', 'The proposed appointment is no longer available.', $correlationId, status: 409);
            }
            $this->assertWorkNotHeld($orderId, $workInstanceId, $correlationId);
            $resource = $this->resourceForId((string) $currentSnapshot->schedule_resource_id, lock: true);
            $locked = DB::table('appointment_reservations')->whereIn('id', [$currentReservationId, $proposedReservationId])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $current = $locked->get($currentReservationId);
            $proposed = $locked->get($proposedReservationId);
            if ($current === null || $proposed === null || (string) $current->status !== 'committed' || (string) $current->order_id !== $orderId || (string) $current->work_instance_id !== $workInstanceId || (string) $proposed->status !== 'held' || $this->date((string) $proposed->hold_expires_at)->lte(now())) {
                throw new KernelException('APPOINTMENT_HOLD_EXPIRED', 'The proposed time expired or the active appointment changed.', $correlationId, status: 409);
            }
            $start = $this->date((string) $proposed->starts_at);
            $end = $this->date((string) $proposed->ends_at);
            if ($start->lte(now())) {
                throw new KernelException('APPOINTMENT_UNAVAILABLE', 'The proposed appointment time must be in the future.', $correlationId, status: 409);
            }
            $this->assertAvailable((string) $resource->id, $start, $end, $correlationId, [$currentReservationId, $proposedReservationId]);
            $now = now();
            DB::table('appointment_reservations')->where('id', $currentReservationId)->update(['status' => 'released', 'updated_at' => $now]);
            DB::table('appointment_reservations')->where('id', $proposedReservationId)->update([
                'status' => 'committed', 'hold_expires_at' => null, 'order_id' => $orderId,
                'work_instance_id' => $workInstanceId, 'updated_at' => $now,
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.rescheduled',
                eventType: 'appointment.rescheduled',
                targetType: 'order',
                targetId: $orderId,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: [
                    'appointment_reservation_id' => $currentReservationId,
                    'starts_at' => $this->date((string) $current->starts_at)->toIso8601String(),
                    'ends_at' => $this->date((string) $current->ends_at)->toIso8601String(),
                    'status' => 'committed',
                ],
                next: [
                    'appointment_reservation_id' => $proposedReservationId,
                    'previous_reservation_id' => $currentReservationId,
                    'order_id' => $orderId,
                    'work_instance_id' => $workInstanceId,
                    'provider_user_id' => (string) $resource->provider_user_id,
                    'source_quote_id' => $proposed->source_quote_id,
                    'source_quote_version' => $proposed->source_quote_version,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'duration_minutes' => (int) $proposed->duration_minutes,
                    'status' => 'committed',
                ],
            );

            return ['id' => $proposedReservationId, 'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String()];
        }, attempts: 3);
    }

    public function releaseAppointmentHold(string $reservationId, string $correlationId, ?string $actorUserId = null): void
    {
        DB::transaction(function () use ($reservationId, $correlationId, $actorUserId): void {
            $snapshot = DB::table('appointment_reservations')->where('id', $reservationId)->first();
            if ($snapshot === null) {
                return;
            }
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $hold = DB::table('appointment_reservations')->where('id', $reservationId)->lockForUpdate()->first();
            if ($hold !== null && (string) $hold->status === 'held') {
                $expired = $this->date((string) $hold->hold_expires_at)->lte(now());
                $status = $expired ? 'expired' : 'released';
                DB::table('appointment_reservations')->where('id', $reservationId)->update(['status' => $status, 'updated_at' => now()]);
                $this->recordScheduleEvent(
                    action: $expired ? 'appointment.hold_expired' : 'appointment.hold_released',
                    eventType: $expired ? 'appointment.hold_expired' : 'appointment.hold_released',
                    targetType: 'appointment_reservation',
                    targetId: $reservationId,
                    resourceId: (string) $resource->id,
                    actorUserId: $actorUserId,
                    correlationId: $correlationId,
                    previous: ['status' => 'held'],
                    next: [
                        'appointment_reservation_id' => $reservationId,
                        'provider_user_id' => (string) $resource->provider_user_id,
                        'created_by_user_id' => (string) $hold->created_by_user_id,
                        'listing_id' => $hold->listing_id,
                        'listing_version_id' => $hold->listing_version_id,
                        'source_quote_id' => $hold->source_quote_id,
                        'source_quote_version' => $hold->source_quote_version,
                        'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                        'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                        'duration_minutes' => (int) $hold->duration_minutes,
                        'status' => $status,
                    ],
                );
            }
        }, attempts: 3);
    }

    public function releaseCommittedAppointmentForWithdrawal(
        string $reservationId,
        string $orderId,
        string $workInstanceId,
        string $actorUserId,
        string $correlationId,
    ): void {
        DB::transaction(function () use ($reservationId, $orderId, $workInstanceId, $actorUserId, $correlationId): void {
            $snapshot = DB::table('appointment_reservations')->where('id', $reservationId)->first();
            if ($snapshot === null
                || (string) $snapshot->order_id !== $orderId
                || (string) $snapshot->work_instance_id !== $workInstanceId) {
                throw new KernelException('APPOINTMENT_NOT_FOUND', 'The committed appointment does not belong to this child agreement.', $correlationId, status: 409);
            }
            $resource = $this->resourceForId((string) $snapshot->schedule_resource_id, lock: true);
            $reservation = DB::table('appointment_reservations')->where('id', $reservationId)->lockForUpdate()->first();
            if ($reservation === null || (string) $reservation->order_id !== $orderId || (string) $reservation->work_instance_id !== $workInstanceId) {
                throw new KernelException('APPOINTMENT_CHANGED', 'The committed appointment changed; refresh before withdrawing this partner.', $correlationId, status: 409);
            }
            if ((string) $reservation->status === 'released') {
                return;
            }
            if ((string) $reservation->status !== 'committed') {
                throw new KernelException('APPOINTMENT_UNAVAILABLE', 'Only the exact committed appointment can be released with an unstarted A3 child.', $correlationId, status: 409);
            }
            $now = now();
            DB::table('appointment_reservations')->where('id', $reservationId)->where('status', 'committed')->update([
                'status' => 'released',
                'updated_at' => $now,
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.committed_released_for_deal_withdrawal',
                eventType: 'appointment.committed_released_for_deal_withdrawal',
                targetType: 'appointment_reservation',
                targetId: $reservationId,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: ['status' => 'committed'],
                next: [
                    'appointment_reservation_id' => $reservationId,
                    'order_id' => $orderId,
                    'work_instance_id' => $workInstanceId,
                    'provider_user_id' => (string) $resource->provider_user_id,
                    'starts_at' => $this->date((string) $reservation->starts_at)->toIso8601String(),
                    'ends_at' => $this->date((string) $reservation->ends_at)->toIso8601String(),
                    'status' => 'released',
                ],
            );
        }, attempts: 3);
    }

    public function agenda(string $providerUserId, string $from, string $to, ?string $correlationId = null): array
    {
        $fromAt = $this->date($from);
        $toAt = $this->date($to);
        if ($fromAt >= $toAt || $fromAt->diffInDays($toAt) > 7) {
            throw ValidationException::withMessages(['to' => ['Choose a valid agenda period of seven days or fewer.']]);
        }
        $correlationId ??= (string) Str::uuid7();

        return DB::transaction(function () use ($providerUserId, $fromAt, $toAt, $correlationId): array {
            $resource = $this->resource($providerUserId, lock: true);
            $this->expireHolds((string) $resource->id, $correlationId);
            $bookings = DB::table('appointment_reservations as r')
                ->where('r.schedule_resource_id', $resource->id)
                ->whereIn('r.status', ['held', 'committed'])
                ->where('r.starts_at', '<', $toAt)->where('r.ends_at', '>', $fromAt)
                ->orderBy('r.starts_at')->get(['r.id', 'r.starts_at', 'r.ends_at', 'r.status', 'r.hold_expires_at']);
            $blocks = DB::table('provider_agenda_blocks')->where('schedule_resource_id', $resource->id)
                ->where('starts_at', '<', $toAt)->where('ends_at', '>', $fromAt)->orderBy('starts_at')->get(['id', 'starts_at', 'ends_at', 'reason']);
            $busyIntervals = $bookings->map(fn (object $item): array => ['startsAt' => $this->date((string) $item->starts_at), 'endsAt' => $this->date((string) $item->ends_at)])
                ->concat($blocks->map(fn (object $item): array => ['startsAt' => $this->date((string) $item->starts_at), 'endsAt' => $this->date((string) $item->ends_at)]))
                ->sortBy(fn (array $interval): string => $interval['startsAt']->toIso8601String())
                ->values();
            $open = [];
            $cursor = $fromAt->copy();
            foreach ($busyIntervals as $interval) {
                if ($interval['endsAt']->lte($cursor)) {
                    continue;
                }
                if ($interval['startsAt']->gt($cursor)) {
                    $open[] = ['startsAt' => $cursor->toIso8601String(), 'endsAt' => $interval['startsAt']->toIso8601String()];
                }
                if ($interval['endsAt']->gt($cursor)) {
                    $cursor = $interval['endsAt']->copy();
                }
            }
            if ($cursor->lt($toAt)) {
                $open[] = ['startsAt' => $cursor->toIso8601String(), 'endsAt' => $toAt->toIso8601String()];
            }

            return [
                'bookings' => $bookings->map(fn (object $item): array => ['id' => (string) $item->id, 'startsAt' => $this->date((string) $item->starts_at)->toIso8601String(), 'endsAt' => $this->date((string) $item->ends_at)->toIso8601String(), 'status' => (string) $item->status === 'committed' ? 'booked' : 'held', 'holdExpiresAt' => $item->hold_expires_at === null ? null : $this->date((string) $item->hold_expires_at)->toIso8601String(), 'orderReference' => null, 'customerName' => null])->all(),
                'blocks' => $blocks->map(fn (object $item): array => ['id' => (string) $item->id, 'startsAt' => $this->date((string) $item->starts_at)->toIso8601String(), 'endsAt' => $this->date((string) $item->ends_at)->toIso8601String(), 'reason' => $item->reason])->all(),
                'open' => $open,
                'range' => ['from' => $fromAt->toIso8601String(), 'to' => $toAt->toIso8601String()],
            ];
        }, attempts: 3);
    }

    public function createBlock(string $providerUserId, string $actorUserId, string $startsAt, string $endsAt, string $correlationId, ?string $reason): array
    {
        $start = $this->date($startsAt);
        $end = $this->date($endsAt);
        if ($start >= $end) {
            throw ValidationException::withMessages(['ends_at' => ['The end time must be after the start time.']]);
        }

        return DB::transaction(function () use ($providerUserId, $actorUserId, $start, $end, $correlationId, $reason): array {
            $resource = $this->resource($providerUserId, lock: true);
            $id = (string) Str::uuid7();
            DB::table('provider_agenda_blocks')->insert(['id' => $id, 'schedule_resource_id' => $resource->id, 'created_by_user_id' => $actorUserId, 'starts_at' => $start, 'ends_at' => $end, 'reason' => $reason, 'correlation_id' => $correlationId, 'created_at' => now()]);
            $this->expireHolds((string) $resource->id, $correlationId);

            $this->recordScheduleEvent(
                action: 'agenda.block_created',
                eventType: 'agenda.block_created',
                targetType: 'provider_agenda_block',
                targetId: $id,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: null,
                next: [
                    'block_id' => $id,
                    'provider_user_id' => $providerUserId,
                    'created_by_user_id' => $actorUserId,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'status' => 'blocked',
                ],
            );

            return ['id' => $id, 'starts_at' => $start->toIso8601String(), 'ends_at' => $end->toIso8601String()];
        }, attempts: 3);
    }

    public function deleteBlock(string $providerUserId, string $blockId, string $actorUserId, string $correlationId): void
    {
        DB::transaction(function () use ($providerUserId, $blockId, $actorUserId, $correlationId): void {
            $resource = $this->resource($providerUserId, lock: true);
            $block = DB::table('provider_agenda_blocks')
                ->where('id', $blockId)
                ->where('schedule_resource_id', $resource->id)
                ->lockForUpdate()
                ->first();
            if ($block === null) {
                return;
            }
            DB::table('provider_agenda_blocks')->where('id', $blockId)->delete();
            $this->recordScheduleEvent(
                action: 'agenda.block_removed',
                eventType: 'agenda.block_removed',
                targetType: 'provider_agenda_block',
                targetId: $blockId,
                resourceId: (string) $resource->id,
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: [
                    'block_id' => $blockId,
                    'provider_user_id' => $providerUserId,
                    'starts_at' => $this->date((string) $block->starts_at)->toIso8601String(),
                    'ends_at' => $this->date((string) $block->ends_at)->toIso8601String(),
                    'status' => 'blocked',
                ],
                next: ['block_id' => $blockId, 'status' => 'removed'],
            );
        }, attempts: 3);
    }

    /** @return list<array{starts_at: string, ends_at: string}> */
    private function availableSlots(string $providerUserId, string $from, string $to, int $durationMinutes, string $correlationId): array
    {
        $fromAt = $this->date($from);
        $toAt = $this->date($to);
        if ($fromAt >= $toAt || $fromAt->diffInDays($toAt) > 7) {
            throw ValidationException::withMessages(['to' => ['Choose a valid date range of seven days or fewer.']]);
        }

        return DB::transaction(function () use ($providerUserId, $fromAt, $toAt, $durationMinutes, $correlationId): array {
            $resource = $this->resource($providerUserId, lock: true);
            $this->expireHolds((string) $resource->id, $correlationId);
            $busy = DB::table('appointment_reservations')->where('schedule_resource_id', $resource->id)
                ->whereIn('status', ['held', 'committed'])->where('starts_at', '<', $toAt)->where('ends_at', '>', $fromAt)
                ->get(['starts_at', 'ends_at']);
            $blocks = DB::table('provider_agenda_blocks')->where('schedule_resource_id', $resource->id)
                ->where('starts_at', '<', $toAt)->where('ends_at', '>', $fromAt)->get(['starts_at', 'ends_at']);

            $slots = [];
            $cursor = $fromAt->copy()->startOfMinute();
            $remainder = ((int) $cursor->format('i')) % 30;
            if ($remainder !== 0) {
                $cursor->addMinutes(30 - $remainder)->setSecond(0);
            }
            while ($cursor->copy()->addMinutes($durationMinutes)->lte($toAt)) {
                $end = $cursor->copy()->addMinutes($durationMinutes);
                $overlaps = $busy->contains(fn (object $item): bool => $cursor->lt($this->date((string) $item->ends_at)) && $end->gt($this->date((string) $item->starts_at)))
                    || $blocks->contains(fn (object $item): bool => $cursor->lt($this->date((string) $item->ends_at)) && $end->gt($this->date((string) $item->starts_at)));
                if (! $overlaps && $cursor->gt(now())) {
                    $slots[] = ['starts_at' => $cursor->toIso8601String(), 'ends_at' => $end->toIso8601String()];
                }
                $cursor->addMinutes(30);
            }

            return $slots;
        }, attempts: 3);
    }

    private function listingSource(string $listingId): array
    {
        $row = DB::table('listings')->join('listing_versions', function ($join): void {
            $join->on('listing_versions.listing_id', '=', 'listings.id')->on('listing_versions.version_number', '=', 'listings.current_version');
        })->join('capability_profiles', function ($join): void {
            $join->on('capability_profiles.profile_family_code', '=', 'listing_versions.capability_profile_family_code')->on('capability_profiles.business_version', '=', 'listing_versions.capability_profile_business_version');
        })->where('listings.id', $listingId)->where('listings.status', 'active')->where('listings.review_status', 'approved')
            ->where('capability_profiles.work_shape', 'A3')->first(['listings.owner_user_id as provider_user_id', 'listing_versions.id as listing_version_id', 'listing_versions.terms']);
        if ($row === null) {
            throw new KernelException('LISTING_NOT_FOUND', 'The active A3 listing could not be found.', (string) Str::uuid7(), status: 404);
        }
        $terms = is_array($row->terms) ? $row->terms : json_decode((string) $row->terms, true);

        return ['provider_user_id' => (string) $row->provider_user_id, 'listing_version_id' => (string) $row->listing_version_id, 'terms' => is_array($terms) ? $terms : []];
    }

    private function durationMinutes(array $terms): int
    {
        $minutes = $terms['appointment_duration_minutes'] ?? null;
        $specification = $terms['work_specification'] ?? null;
        if (is_array($specification)) {
            $minutes ??= $specification['target_duration_minutes'] ?? null;
            $label = $specification['target_duration_label'] ?? null;
            if ($minutes === null && is_string($label)) {
                $minutes = $this->minutesFromLabel($label);
            }
            if ($minutes === null) {
                $nodes = $specification['nodes'] ?? $specification['steps'] ?? $terms['milestone_stages'] ?? [];
                if (is_array($nodes) && $nodes !== []) {
                    $total = 0;
                    foreach ($nodes as $node) {
                        if (! is_array($node) || ! is_string($node['duration_label'] ?? null)) {
                            $total = 0;
                            break;
                        }
                        $nodeMinutes = $this->minutesFromLabel($node['duration_label']);
                        if ($nodeMinutes === null) {
                            $total = 0;
                            break;
                        }
                        $total += $nodeMinutes;
                    }
                    $minutes = $total > 0 ? $total : null;
                }
            }
        }
        if (! is_numeric($minutes) || (int) $minutes < 1 || (int) $minutes > 480) {
            throw ValidationException::withMessages(['appointment_duration' => ['The pinned A3 Work specification must include a target duration between 1 and 480 minutes before appointment slots can be reserved.']]);
        }

        return (int) $minutes;
    }

    private function minutesFromLabel(string $label): ?int
    {
        if (preg_match('/^\\s*(\\d+)\\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\\s*$/i', $label, $matches) !== 1) {
            return null;
        }
        $value = (int) $matches[1];
        $unit = strtolower($matches[2]);

        return in_array($unit, ['h', 'hr', 'hrs', 'hour', 'hours'], true) ? $value * 60 : $value;
    }

    private function assertWorkNotHeld(string $orderId, string $workInstanceId, string $correlationId): void
    {
        $target = $this->workTargets->lockTarget($workInstanceId);
        if ($target === null || $target['order_id'] !== $orderId) {
            throw new KernelException('APPOINTMENT_NOT_FOUND', 'The Work instance for this appointment could not be found.', $correlationId, status: 404);
        }
        if ($this->administrativeHolds->hasActiveHold('work_instance', $workInstanceId)) {
            throw new KernelException('ADMINISTRATIVE_HOLD_ACTIVE', 'This Work instance has an active administrative hold.', $correlationId, status: 409);
        }
    }

    private function resource(string $providerUserId, bool $lock = false): object
    {
        $id = (string) Str::uuid7();
        DB::table('provider_schedule_resources')->insertOrIgnore(['id' => $id, 'provider_user_id' => $providerUserId, 'row_version' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $query = DB::table('provider_schedule_resources')->where('provider_user_id', $providerUserId);
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->firstOrFail();
    }

    private function resourceForId(string $resourceId, bool $lock = false): object
    {
        $query = DB::table('provider_schedule_resources')->where('id', $resourceId);
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->firstOrFail();
    }

    private function assertSlotStart(Carbon $start): void
    {
        if ((int) $start->format('i') % 30 !== 0 || (int) $start->format('s') !== 0) {
            throw ValidationException::withMessages(['starts_at' => ['Choose one of the available half-hour start times.']]);
        }
    }

    private function assertAvailable(string $resourceId, object $start, object $end, string $correlationId, array $exceptReservations = []): void
    {
        $this->expireHolds($resourceId, $correlationId);
        $conflict = DB::table('appointment_reservations')->where('schedule_resource_id', $resourceId)->whereIn('status', ['held', 'committed'])
            ->where('starts_at', '<', $end)->where('ends_at', '>', $start)
            ->when($exceptReservations !== [], fn ($query) => $query->whereNotIn('id', $exceptReservations))->exists();
        $blocked = DB::table('provider_agenda_blocks')->where('schedule_resource_id', $resourceId)->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists();
        if ($conflict || $blocked) {
            throw new KernelException('APPOINTMENT_UNAVAILABLE', 'That appointment time is no longer available. Choose another time.', $correlationId, status: 409, retryable: true);
        }
    }

    private function recordScheduleEvent(
        string $action,
        string $eventType,
        string $targetType,
        string $targetId,
        string $resourceId,
        ?string $actorUserId,
        string $correlationId,
        ?array $previous,
        array $next,
    ): void {
        $auditId = $this->audits->record(
            action: $action,
            targetType: $targetType,
            targetId: $targetId,
            correlationId: $correlationId,
            actor: $actorUserId === null ? ActorContext::system('AppointmentSchedulingService') : ActorContext::human($actorUserId),
            commandName: 'AppointmentSchedulingService',
            previous: $previous,
            next: ['schedule_resource_id' => $resourceId, 'actor_user_id' => $actorUserId, ...$next],
        );
        $this->outbox->enqueue(
            eventType: $eventType,
            aggregateType: 'provider_schedule_resource',
            aggregateId: $resourceId,
            payload: ['resource_id' => $resourceId, 'actor_user_id' => $actorUserId, ...$next],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }

    private function expireHolds(string $resourceId, string $correlationId): void
    {
        $holds = DB::table('appointment_reservations')
            ->where('schedule_resource_id', $resourceId)
            ->where('status', 'held')
            ->where('hold_expires_at', '<=', now())
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($holds as $hold) {
            DB::table('appointment_reservations')->where('id', $hold->id)->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);
            $this->recordScheduleEvent(
                action: 'appointment.hold_expired',
                eventType: 'appointment.hold_expired',
                targetType: 'appointment_reservation',
                targetId: (string) $hold->id,
                resourceId: $resourceId,
                actorUserId: null,
                correlationId: $correlationId,
                previous: ['status' => 'held'],
                next: [
                    'appointment_reservation_id' => (string) $hold->id,
                    'resource_id' => $resourceId,
                    'created_by_user_id' => (string) $hold->created_by_user_id,
                    'listing_id' => $hold->listing_id,
                    'listing_version_id' => $hold->listing_version_id,
                    'source_quote_id' => $hold->source_quote_id,
                    'source_quote_version' => $hold->source_quote_version,
                    'starts_at' => $this->date((string) $hold->starts_at)->toIso8601String(),
                    'ends_at' => $this->date((string) $hold->ends_at)->toIso8601String(),
                    'duration_minutes' => (int) $hold->duration_minutes,
                    'status' => 'expired',
                ],
            );
        }
    }

    private function date(string $value): Carbon
    {
        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['starts_at' => ['Enter a valid date and time.']]);
        }
    }
}

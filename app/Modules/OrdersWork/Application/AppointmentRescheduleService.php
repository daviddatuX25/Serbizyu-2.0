<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AppointmentRescheduleService
{
    public function __construct(
        private readonly OrderCapacityPort $capacity,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /** @return array{id: string, starts_at: string, ends_at: string, duration_minutes: int, status: string} */
    public function propose(string $orderId, string $actorUserId, string $startsAt, string $correlationId, ?string $reason = null): array
    {
        return DB::transaction(function () use ($orderId, $actorUserId, $startsAt, $correlationId, $reason): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null || ! in_array($actorUserId, [(string) $order->buyer_user_id, (string) $order->provider_user_id], true)) {
                throw new KernelException('ORDER_NOT_FOUND', 'The Order could not be found.', $correlationId, status: 404);
            }
            if (! in_array((string) $order->status, ['accepted', 'in_progress'], true)) {
                throw new KernelException('INVALID_ORDER_STATE', 'Only an active Order can be rescheduled.', $correlationId, status: 409);
            }
            $work = DB::table('work_instances')->where('order_id', $orderId)->where('work_shape', 'A3')->lockForUpdate()->first();
            $current = $this->capacity->activeAppointmentForOrder($orderId);
            if ($work === null || $current === null || (string) $current['work_instance_id'] !== (string) $work->id) {
                throw new KernelException('APPOINTMENT_NOT_FOUND', 'The active appointment could not be found.', $correlationId, status: 404);
            }
            if (! in_array((string) $work->status, ['not_started', 'scheduled', 'in_progress'], true)) {
                throw new KernelException('INVALID_ORDER_STATE', 'Only active A3 Work can be rescheduled.', $correlationId, status: 409);
            }
            $pending = DB::table('work_schedule_change_requests')->where('order_id', $orderId)->where('status', 'pending')->lockForUpdate()->first();
            if ($pending !== null) {
                $holdMinutes = max(1, (int) config('serbizyu.scheduling.slot_hold_minutes', 10));
                $expired = Carbon::parse((string) $pending->created_at)->addMinutes($holdMinutes)->lte(now());
                if (! $expired) {
                    throw new KernelException('SCHEDULE_CHANGE_PENDING', 'Resolve the current schedule request before proposing another.', $correlationId, status: 409);
                }
                $this->capacity->releaseAppointmentHold((string) $pending->proposed_reservation_id, $correlationId, $actorUserId);
                DB::table('work_schedule_change_requests')->where('id', $pending->id)->update([
                    'status' => 'expired',
                    'responded_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->recordChangeEvent(
                    action: 'schedule_change.expired',
                    eventType: 'schedule_change.expired',
                    orderId: $orderId,
                    requestId: (string) $pending->id,
                    resourceId: (string) $current['schedule_resource_id'],
                    actorUserId: null,
                    correlationId: $correlationId,
                    previous: ['status' => 'pending'],
                    next: [
                        'work_instance_id' => (string) $work->id,
                        'current_reservation_id' => (string) $current['id'],
                        'proposed_reservation_id' => (string) $pending->proposed_reservation_id,
                        'status' => 'expired',
                    ],
                );
            }
            $hold = $this->capacity->holdAppointmentChange((string) $current['id'], $actorUserId, $startsAt, $correlationId);
            $requestId = (string) Str::uuid7();
            $now = now();
            DB::table('work_schedule_change_requests')->insert([
                'id' => $requestId,
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'current_reservation_id' => (string) $current['id'],
                'proposed_reservation_id' => $hold['id'],
                'proposed_by_user_id' => $actorUserId,
                'responded_by_user_id' => null,
                'responded_at' => null,
                'status' => 'pending',
                'reason' => $reason,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->recordChangeEvent(
                action: 'schedule_change.proposed',
                eventType: 'schedule_change.proposed',
                orderId: $orderId,
                requestId: $requestId,
                resourceId: (string) $current['schedule_resource_id'],
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: null,
                next: [
                    'work_instance_id' => (string) $work->id,
                    'current_reservation_id' => (string) $current['id'],
                    'proposed_reservation_id' => (string) $hold['id'],
                    'starts_at' => $hold['starts_at'],
                    'ends_at' => $hold['ends_at'],
                    'duration_minutes' => $hold['duration_minutes'],
                    'status' => 'pending',
                ],
            );

            return ['id' => $requestId, 'starts_at' => $hold['starts_at'], 'ends_at' => $hold['ends_at'], 'duration_minutes' => $hold['duration_minutes'], 'status' => 'pending'];
        }, attempts: 3);
    }

    /** @return array{id: string, status: string} */
    public function respond(string $orderId, string $requestId, string $actorUserId, string $action, string $correlationId): array
    {
        if (! in_array($action, ['accept', 'reject', 'withdraw'], true)) {
            throw new KernelException('INVALID_ACTION', 'Choose a valid schedule response.', $correlationId, status: 422);
        }

        return DB::transaction(function () use ($orderId, $requestId, $actorUserId, $action, $correlationId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null || ! in_array($actorUserId, [(string) $order->buyer_user_id, (string) $order->provider_user_id], true)) {
                throw new KernelException('AUTHORIZATION_DENIED', 'You are not a participant in this Order.', $correlationId, status: 403);
            }
            $work = DB::table('work_instances')->where('order_id', $orderId)->where('work_shape', 'A3')->lockForUpdate()->first();
            $request = DB::table('work_schedule_change_requests')->where('id', $requestId)->where('order_id', $orderId)->lockForUpdate()->first();
            if ($work === null || $request === null || (string) $request->work_instance_id !== (string) $work->id) {
                throw new KernelException('SCHEDULE_CHANGE_NOT_FOUND', 'The schedule request could not be found.', $correlationId, status: 404);
            }
            $activeAppointment = $this->capacity->activeAppointmentForOrder($orderId);
            if ($activeAppointment === null || (string) $activeAppointment['work_instance_id'] !== (string) $work->id) {
                throw new KernelException('APPOINTMENT_NOT_FOUND', 'The active appointment could not be found.', $correlationId, status: 404);
            }
            if ((string) $request->status !== 'pending') {
                throw new KernelException('SCHEDULE_CHANGE_RESOLVED', 'This schedule request has already been resolved.', $correlationId, status: 409);
            }
            $isProposer = (string) $request->proposed_by_user_id === $actorUserId;
            if (in_array($action, ['accept', 'reject'], true) && $isProposer) {
                throw new KernelException('COUNTERPARTY_REQUIRED', 'Only the other Order participant can respond to this request.', $correlationId, status: 403);
            }
            if ($action === 'withdraw' && ! $isProposer) {
                throw new KernelException('PROPOSER_REQUIRED', 'Only the proposer can withdraw this request.', $correlationId, status: 403);
            }
            if ($action === 'accept'
                && (! in_array((string) $order->status, ['accepted', 'in_progress'], true)
                    || ! in_array((string) $work->status, ['not_started', 'scheduled', 'in_progress'], true))) {
                throw new KernelException('INVALID_ORDER_STATE', 'A schedule change cannot be accepted after the Order or Work is no longer active.', $correlationId, status: 409);
            }

            $now = now();
            if ($action === 'accept') {
                try {
                    $replacement = $this->capacity->swapAppointmentForOrder(
                        currentReservationId: (string) $request->current_reservation_id,
                        proposedReservationId: (string) $request->proposed_reservation_id,
                        orderId: $orderId,
                        workInstanceId: (string) $work->id,
                        actorUserId: $actorUserId,
                        correlationId: $correlationId,
                    );
                } catch (KernelException $error) {
                    if ($error->envelope->code !== 'APPOINTMENT_HOLD_EXPIRED') {
                        throw $error;
                    }
                    $this->capacity->releaseAppointmentHold((string) $request->proposed_reservation_id, $correlationId, $actorUserId);
                    DB::table('work_schedule_change_requests')->where('id', $request->id)->update([
                        'status' => 'expired',
                        'responded_by_user_id' => $actorUserId,
                        'responded_at' => $now,
                        'updated_at' => $now,
                    ]);

                    $this->recordChangeEvent(
                        action: 'schedule_change.expired',
                        eventType: 'schedule_change.expired',
                        orderId: $orderId,
                        requestId: (string) $request->id,
                        resourceId: (string) $activeAppointment['schedule_resource_id'],
                        actorUserId: $actorUserId,
                        correlationId: $correlationId,
                        previous: ['status' => 'pending'],
                        next: [
                            'work_instance_id' => (string) $work->id,
                            'current_reservation_id' => (string) $request->current_reservation_id,
                            'proposed_reservation_id' => (string) $request->proposed_reservation_id,
                            'status' => 'expired',
                        ],
                    );

                    return ['id' => (string) $request->id, 'status' => 'expired'];
                }
                DB::table('work_instances')->where('id', $work->id)->update([
                    'scheduled_at' => $replacement['starts_at'],
                    'row_version' => DB::raw('row_version + 1'),
                    'updated_at' => $now,
                ]);
                DB::table('work_schedule_history')->insert([
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'work_instance_id' => (string) $work->id,
                    'schedule_change_request_id' => (string) $request->id,
                    'previous_reservation_id' => (string) $request->current_reservation_id,
                    'new_reservation_id' => (string) $request->proposed_reservation_id,
                    'actor_user_id' => $actorUserId,
                    'changed_at' => $now,
                    'correlation_id' => $correlationId,
                ]);
            } else {
                $this->capacity->releaseAppointmentHold((string) $request->proposed_reservation_id, $correlationId, $actorUserId);
            }
            $status = ['accept' => 'accepted', 'reject' => 'rejected', 'withdraw' => 'withdrawn'][$action];
            DB::table('work_schedule_change_requests')->where('id', $request->id)->update([
                'status' => $status,
                'responded_by_user_id' => $actorUserId,
                'responded_at' => $now,
                'updated_at' => $now,
            ]);
            $this->recordChangeEvent(
                action: 'schedule_change.'.$status,
                eventType: 'schedule_change.'.$status,
                orderId: $orderId,
                requestId: (string) $request->id,
                resourceId: (string) $activeAppointment['schedule_resource_id'],
                actorUserId: $actorUserId,
                correlationId: $correlationId,
                previous: ['status' => 'pending'],
                next: [
                    'work_instance_id' => (string) $work->id,
                    'current_reservation_id' => (string) $request->current_reservation_id,
                    'proposed_reservation_id' => (string) $request->proposed_reservation_id,
                    'starts_at' => $action === 'accept' ? $replacement['starts_at'] : null,
                    'status' => $status,
                ],
            );

            return ['id' => (string) $request->id, 'status' => $status];
        }, attempts: 3);
    }

    /**
     * @param  array<string, mixed>|null  $previous
     * @param  array<string, mixed>  $next
     */
    private function recordChangeEvent(
        string $action,
        string $eventType,
        string $orderId,
        string $requestId,
        string $resourceId,
        ?string $actorUserId,
        string $correlationId,
        ?array $previous,
        array $next,
    ): void {
        $auditId = $this->audits->record(
            action: $action,
            targetType: 'work_schedule_change_request',
            targetId: $requestId,
            correlationId: $correlationId,
            actor: $actorUserId === null ? ActorContext::system('AppointmentRescheduleService') : ActorContext::human($actorUserId),
            commandName: 'AppointmentRescheduleService',
            previous: $previous,
            next: ['order_id' => $orderId, 'schedule_resource_id' => $resourceId, 'actor_user_id' => $actorUserId, ...$next],
            orderId: $orderId,
        );
        $this->outbox->enqueue(
            eventType: $eventType,
            aggregateType: 'order',
            aggregateId: $orderId,
            payload: ['schedule_change_request_id' => $requestId, 'schedule_resource_id' => $resourceId, 'actor_user_id' => $actorUserId, ...$next],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }
}

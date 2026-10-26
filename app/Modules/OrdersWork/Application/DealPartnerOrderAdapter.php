<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\DealChildFinancialStatePort;
use App\Shared\Contracts\DealPartnerOrderPort;
use App\Shared\Contracts\DealCourierReconciliationPort;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** OrdersWork-owned order/work cancellation boundary for Deal partner withdrawal. */
final class DealPartnerOrderAdapter implements DealPartnerOrderPort
{
    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly DealChildFinancialStatePort $financialStates,
        private readonly OrderCapacityPort $capacity,
        private readonly DealCourierReconciliationPort $reconciliationCases,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}


    public function withdrawalSnapshot(string $dealChainId, string $dealNeedId, array $linkedProductOrderIds = []): ?array
    {
        $row = DB::table('orders as agreement')
            ->join('work_instances as work', 'work.order_id', '=', 'agreement.id')
            ->where('agreement.deal_chain_id', $dealChainId)
            ->where('agreement.deal_need_id', $dealNeedId)
            ->orderByDesc('agreement.version')
            ->first([
                'agreement.id as order_id', 'work.id as work_instance_id', 'agreement.version as order_version',
                'agreement.status as order_status', 'work.status as work_status', 'work.work_shape',
                'agreement.provider_user_id', 'agreement.buyer_user_id',
            ]);
        if ($row === null) {
            return null;
        }

        $financial = $this->financialStates->forDealChild((string) $row->order_id);
        return [
            'order_id' => (string) $row->order_id,
            'work_instance_id' => (string) $row->work_instance_id,
            'order_version' => (int) $row->order_version,
            'order_status' => (string) $row->order_status,
            'work_status' => (string) $row->work_status,
            'work_shape' => (string) $row->work_shape,
            'provider_user_id' => (string) $row->provider_user_id,
            'buyer_user_id' => (string) $row->buyer_user_id,
            'irreversible_custody' => $this->hasDepartedCustody((string) $row->order_id, $linkedProductOrderIds, (string) $row->provider_user_id),
            'financial_state' => $financial['obligation_status'] ?? null,
            'financial_claimed' => $financial['claimed'] ?? null,
            'financial_settled' => $financial['settled'] ?? null,
        ];
    }

    public function cancelUnstartedChild(
        string $dealChainId,
        string $dealNeedId,
        array $linkedProductOrderIds,
        bool $allowUncollectedCourierWork,
        string $actorUserId,
        string $requesterUserId,
        int $expectedOrderVersion,
        string $correlationId,
    ): void {
        if (! DB::transactionLevel()) {
            throw new KernelException('TRANSACTION_REQUIRED', 'Deal partner withdrawal must run in its source transaction.', $correlationId, status: 500);
        }
        $row = DB::table('orders as agreement')
            ->join('work_instances as work', 'work.order_id', '=', 'agreement.id')
            ->where('agreement.deal_chain_id', $dealChainId)
            ->where('agreement.deal_need_id', $dealNeedId)
            ->lockForUpdate()
            ->first([
                'agreement.id as order_id', 'agreement.version as order_version', 'agreement.status as order_status',
                'agreement.current_proposal_id', 'agreement.current_terms_snapshot_id', 'agreement.provider_user_id',
                'work.id as work_instance_id', 'work.version as work_version', 'work.status as work_status', 'work.work_shape', 'work.started_at',
            ]);
        if ($row === null) {
            return;
        }
        if ((int) $row->order_version !== $expectedOrderVersion) {
            throw new KernelException('VERSION_CONFLICT', 'The child agreement changed; refresh before withdrawing this partner.', $correlationId, status: 409);
        }
        if ($this->administrativeHolds->hasActiveHold('order', (string) $row->order_id)
            || $this->administrativeHolds->hasActiveHold('work_instance', (string) $row->work_instance_id)) {
            throw new KernelException('ADMINISTRATIVE_HOLD_ACTIVE', 'This Order agreement or Work instance has an active administrative hold.', $correlationId, status: 409);
        }
        $this->lockLinkedProductCustodyState($linkedProductOrderIds, $correlationId);
        if ((string) $row->order_status === 'cancelled' && (string) $row->work_status === 'cancelled') {
            return;
        }
        $financial = $this->financialStates->forDealChild((string) $row->order_id);
        if ($financial === null) {
            $acceptedTerms = DB::table('order_terms_snapshots')
                ->where('id', $row->current_terms_snapshot_id)
                ->where('order_id', $row->order_id)
                ->first(['amount_minor', 'accepted_by_user_id', 'accepted_at']);
            if ($acceptedTerms === null
                || (int) $acceptedTerms->amount_minor !== 0
                || $acceptedTerms->accepted_by_user_id === null
                || $acceptedTerms->accepted_at === null) {
                throw new KernelException('FINANCIAL_STATE_UNAVAILABLE', 'The child financial state could not be verified, so withdrawal was not applied.', $correlationId, status: 409);
            }
            $financial = ['obligation_id' => null, 'obligation_status' => null, 'claimed' => false, 'settled' => false];
        }
        $providerId = (string) $row->provider_user_id;
        $hasCustody = $this->hasDepartedCustody((string) $row->order_id, $linkedProductOrderIds, $providerId);
        $hasNotStarted = (string) $row->work_status === 'not_started' && $row->started_at === null;
        $isUncollectedCourier = $allowUncollectedCourierWork
            && (string) $row->work_shape === 'A1'
            && (string) $row->work_status === 'in_progress';
        $isUnstartedA3 = (string) $row->work_shape === 'A3'
            && in_array((string) $row->work_status, ['not_started', 'scheduled'], true)
            && $row->started_at === null;
        if ($hasCustody
            || (! $hasNotStarted && ! $isUncollectedCourier && ! $isUnstartedA3)
            || ! in_array((string) $row->order_status, ['accepted', 'in_progress'], true)) {
            throw new KernelException('WITHDRAWAL_IRREVERSIBLE', 'This partner has started work or custody has departed, so the agreement cannot be withdrawn.', $correlationId, status: 409);
        }
        if ($hasNotStarted && is_string($row->current_proposal_id)) {
            $capacityReservationId = DB::table('order_proposals')
                ->where('id', $row->current_proposal_id)
                ->where('order_id', $row->order_id)
                ->value('capacity_reservation_id');
            if (is_string($capacityReservationId) && $capacityReservationId !== '') {
                $this->capacity->release($capacityReservationId, $correlationId);
            }
        }
        if ($allowUncollectedCourierWork && $linkedProductOrderIds !== []) {
            $this->revokeUnacceptedCourierOffers($linkedProductOrderIds, $providerId, $actorUserId, $correlationId);
        }
        $caseId = null;
        if ($isUnstartedA3) {
            $appointment = $this->capacity->activeAppointmentForOrder((string) $row->order_id);
            if ($appointment === null || (string) $appointment['work_instance_id'] !== (string) $row->work_instance_id) {
                throw new KernelException('APPOINTMENT_NOT_FOUND', 'The exact committed appointment could not be verified, so the A3 partner was not withdrawn.', $correlationId, status: 409);
            }
            $this->capacity->releaseCommittedAppointmentForWithdrawal(
                (string) $appointment['id'],
                (string) $row->order_id,
                (string) $row->work_instance_id,
                $actorUserId,
                $correlationId,
            );
        }
        if ($isUncollectedCourier) {
            $caseId = $this->reconciliationCases->openUncollectedCourierWithdrawalCase(
                orderId: (string) $row->order_id,
                workInstanceId: (string) $row->work_instance_id,
                paymentObligationId: $financial['obligation_id'],
                reporterUserId: $actorUserId,
                requesterUserId: $requesterUserId,
                correlationId: $correlationId,
            );
        }

        $now = now();
        DB::table('orders')->where('id', $row->order_id)->where('version', $expectedOrderVersion)->update([
            'status' => 'cancelled', 'cancelled_at' => $now, 'version' => DB::raw('version + 1'),
            'correlation_id' => $correlationId, 'updated_at' => $now,
        ]);
        DB::table('work_instances')->where('id', $row->work_instance_id)->where('version', $row->work_version)->update([
            'status' => 'cancelled', 'cancelled_at' => $now, 'version' => DB::raw('version + 1'),
            'row_version' => DB::raw('COALESCE(row_version, 1) + 1'), 'updated_at' => $now,
        ]);
        $eventId = (string) Str::uuid7();
        $eventVersion = (int) DB::table('work_events')->where('work_instance_id', $row->work_instance_id)->max('event_version') + 1;
        DB::table('work_events')->insert([
            'id' => $eventId, 'work_instance_id' => $row->work_instance_id,
            'previous_status' => (string) $row->work_status, 'new_status' => 'cancelled',
            'event_type' => 'work.cancelled', 'event_version' => $eventVersion,
            'actor_user_id' => $actorUserId, 'evidence_file_id' => null,
            'payload' => json_encode(['reason' => 'deal_partner_withdrawal', 'deal_need_id' => $dealNeedId, 'reconciliation_case_id' => $caseId], JSON_THROW_ON_ERROR),
            'payload_version' => 1, 'idempotency_key' => 'deal-partner-withdrawal:'.$dealNeedId.':'.$expectedOrderVersion,
            'correlation_id' => $correlationId, 'occurred_at' => $now, 'effective_at' => $now, 'created_at' => $now,
        ]);

        $auditId = $this->audits->record(
            action: 'deal_partner.child_order_withdrawn', targetType: 'order', targetId: (string) $row->order_id,
            correlationId: $correlationId, actor: ActorContext::human($actorUserId),
            commandName: 'DealPartnerOrderAdapter::cancelUnstartedChild',
            previous: ['order_status' => (string) $row->order_status, 'work_status' => (string) $row->work_status],
            next: ['order_status' => 'cancelled', 'work_status' => 'cancelled', 'financial_obligation_preserved' => true, 'financial_claimed' => $financial['claimed'], 'reconciliation_case_id' => $caseId],
            reason: 'The current Deal Chain partner withdrew before irreversible custody completion; the original obligation remains unchanged.',
            orderId: (string) $row->order_id,
        );
        $this->outbox->enqueue(
            eventType: 'work.cancelled', aggregateType: 'work_instance', aggregateId: (string) $row->work_instance_id,
            payload: ['work_instance_id' => (string) $row->work_instance_id, 'order_id' => (string) $row->order_id, 'deal_need_id' => $dealNeedId, 'reconciliation_case_id' => $caseId],
            correlationId: $correlationId, auditEventId: $auditId,
        );
    }

    /**
     * Serialize with A4HandoffService's order → work → transfer lock order.
     * Locking the product Orders also prevents a prepared transfer from being created
     * between the departure check and this cancellation transaction's commit.
     *
     * @param list<string> $linkedProductOrderIds
     */
    private function lockLinkedProductCustodyState(array $linkedProductOrderIds, string $correlationId): void
    {
        $orderIds = array_values(array_unique(array_map('strval', $linkedProductOrderIds)));
        sort($orderIds, SORT_STRING);
        if ($orderIds === []) {
            return;
        }

        $lockedOrders = DB::table('orders')
            ->whereIn('id', $orderIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->pluck('id')
            ->map(static fn ($id): string => (string) $id)
            ->all();
        if ($lockedOrders !== $orderIds) {
            throw new KernelException('LINKED_PRODUCT_UNAVAILABLE', 'The exact linked product Order could not be locked for courier withdrawal.', $correlationId, status: 409);
        }

        $lockedWorkOrders = DB::table('work_instances')
            ->whereIn('order_id', $orderIds)
            ->orderBy('order_id')
            ->lockForUpdate()
            ->pluck('order_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();
        if ($lockedWorkOrders !== $orderIds) {
            throw new KernelException('LINKED_PRODUCT_WORK_UNAVAILABLE', 'The exact linked product Work could not be locked for courier withdrawal.', $correlationId, status: 409);
        }

        // A4HandoffService takes these locks after the source Order and Work rows.
        DB::table('order_handoff_transfers')
            ->whereIn('order_id', $orderIds)
            ->orderBy('order_id')
            ->lockForUpdate()
            ->get(['id']);
    }

    private function hasDepartedCustody(string $orderId, array $linkedProductOrderIds, string $courierProviderId): bool
    {
        if (DB::table('order_handoff_transfers')->where('order_id', $orderId)->whereIn('status', ['departed', 'received'])->exists()) {
            return true;
        }
        if ($linkedProductOrderIds === []) {
            return false;
        }

        return DB::table('order_handoff_transfers')
            ->whereIn('order_id', $linkedProductOrderIds)
            ->where('transfer_mode', 'courier_delivery')
            ->where('offered_to_user_id', $courierProviderId)
            ->whereIn('status', ['departed', 'received'])
            ->exists();
    }

    /** @param list<string> $linkedProductOrderIds */
    private function revokeUnacceptedCourierOffers(
        array $linkedProductOrderIds,
        string $courierProviderId,
        string $actorUserId,
        string $correlationId,
    ): void {
        $transfers = DB::table('order_handoff_transfers')
            ->whereIn('order_id', $linkedProductOrderIds)
            ->where('transfer_mode', 'courier_delivery')
            ->where('offered_to_user_id', $courierProviderId)
            ->where('status', 'offered')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
        foreach ($transfers as $transfer) {
            $updated = DB::table('order_handoff_transfers')
                ->where('id', $transfer->id)
                ->where('version', (int) $transfer->version)
                ->where('status', 'offered')
                ->where('offered_to_user_id', $courierProviderId)
                ->update([
                    'status' => 'prepared',
                    'transfer_mode' => null,
                    'offered_by_user_id' => null,
                    'offered_to_user_id' => null,
                    'custody_idempotency_key' => null,
                    'offered_at' => null,
                    'version' => DB::raw('version + 1'),
                    'updated_at' => now(),
                ]);
            if ($updated !== 1) {
                throw new KernelException('TRANSFER_VERSION_CONFLICT', 'The unaccepted product custody offer changed during partner withdrawal.', $correlationId, status: 409);
            }
            $auditId = $this->audits->record(
                action: 'order.handoff.custody_offer_revoked',
                targetType: 'order_handoff_transfer',
                targetId: (string) $transfer->id,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                expectedVersion: (int) $transfer->version,
                commandName: 'DealPartnerOrderAdapter::revokeUnacceptedCourierOffers',
                previous: ['status' => 'offered', 'recipient_user_id' => $courierProviderId],
                next: ['status' => 'prepared', 'recipient_user_id' => null],
                reason: 'The current courier partner withdrew before physical custody departed.',
                orderId: (string) $transfer->order_id,
            );
            $this->outbox->enqueue(
                eventType: 'work.custody_offer_revoked',
                aggregateType: 'work_instance',
                aggregateId: (string) $transfer->work_instance_id,
                payload: [
                    'order_id' => (string) $transfer->order_id,
                    'work_instance_id' => (string) $transfer->work_instance_id,
                    'handoff_transfer_id' => (string) $transfer->id,
                ],
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
        }
    }
}

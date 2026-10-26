<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\NotificationIntent;
use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\WorkMilestoneReaderPort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OrderReferenceReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class DealWorkGateAdapter implements DealWorkGatePort
{
    public function __construct(
        private readonly WorkMilestoneReaderPort $workMilestones,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
        private readonly OrderReferenceReaderPort $orderReferences,
    ) {}
    
    public function invalidateNeedEpoch(string $dealChainId, string $dealNeedId, string $correlationId): void
    {
        $gates = DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $dealChainId)
            ->where(function ($query) use ($dealNeedId): void {
                $query->where('predecessor_need_id', $dealNeedId)->orWhere('successor_need_id', $dealNeedId);
            })
            ->whereIn('status', ['blocked', 'cleared'])
            ->pluck('id');
        foreach ($gates as $gateId) {
            $this->markStale((string) $gateId, $correlationId);
        }
    }

    public function assertWorkCanAdvance(string $workInstanceId, string $correlationId): void
    {
        $successor = $this->workMilestones->dealNeedWorkForInstance($workInstanceId);
        if ($successor === null || $successor['deal_chain_id'] === null || $successor['deal_need_id'] === null) {
            return;
        }

        $chainId = $successor['deal_chain_id'];
        $needId = $successor['deal_need_id'];
        $successorConfirmation = DB::table('deal_need_confirmations')
            ->where('deal_chain_id', $chainId)
            ->where('deal_need_id', $needId)
            ->where('order_id', $successor['order_id'])
            ->first();
        $successorWork = $this->workMilestones->workForOrder($successor['order_id']);
        $successorNeed = DB::table('deal_needs')->where('deal_chain_id', $chainId)->where('id', $needId)->first();
        if ($successorConfirmation === null || $successorWork === null
            || $successorWork['work_instance_id'] !== $workInstanceId
            || $successorWork['deal_chain_id'] !== $chainId
            || $successorWork['deal_need_id'] !== $needId
            || $successorNeed === null
            || in_array((string) $successorNeed->status, ['superseded', 'cancelled', 'replacement_needed', 'failed'], true)) {
            $this->rejectBlocked($correlationId);
        }

        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $chainId)
            ->where('successor_need_id', $needId)
            ->where('dependency_type', 'blocks')
            ->where('status', 'active')
            ->whereIn('condition_code', ['part_ready', 'delivery_signed'])
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($dependencies as $dependency) {
            $predecessor = DB::table('deal_needs')
                ->where('deal_chain_id', $chainId)
                ->where('id', $dependency->predecessor_need_id)
                ->first();
            if ($predecessor === null
                || in_array((string) $predecessor->status, ['superseded', 'cancelled', 'replacement_needed', 'failed'], true)) {
                $this->rejectBlocked($correlationId);
            }

            $sourceConfirmation = DB::table('deal_need_confirmations')
                ->where('deal_chain_id', $chainId)
                ->where('deal_need_id', $dependency->predecessor_need_id)
                ->first();
            if ($sourceConfirmation === null) {
                $this->rejectBlocked($correlationId);
            }

            $sourceWork = $this->workMilestones->workForOrder((string) $sourceConfirmation->order_id);
            if ($sourceWork === null
                || $sourceWork['deal_chain_id'] !== $chainId
                || $sourceWork['deal_need_id'] !== (string) $dependency->predecessor_need_id) {
                $this->rejectBlocked($correlationId);
            }

            $gate = DB::table('work_step_dependency_gates')
                ->where('dependency_id', $dependency->id)
                ->where('dependency_version', (int) $dependency->version)
                ->where('condition_code', $dependency->condition_code)
                ->where('source_confirmation_id', $sourceConfirmation->id)
                ->where('predecessor_need_id', $dependency->predecessor_need_id)
                ->where('successor_need_id', $needId)
                ->where('source_order_id', $sourceConfirmation->order_id)
                ->where('source_work_instance_id', $sourceWork['work_instance_id'])
                ->where('successor_confirmation_id', $successorConfirmation->id)
                ->where('successor_order_id', $successorConfirmation->order_id)
                ->where('successor_work_instance_id', $workInstanceId)
                ->lockForUpdate()
                ->first();
            if ($gate === null || $gate->status !== 'cleared' || ! $this->gateIsCurrent($gate)) {
                $this->rejectBlocked($correlationId);
            }
        }
    }

    public function registerConfirmedNeedWork(
        string $dealChainId,
        string $dealNeedId,
        string $orderId,
        string $workInstanceId,
        string $correlationId,
    ): void {
        $confirmed = DB::table('deal_need_confirmations as confirmation')
            ->join('deal_needs as need', function ($join): void {
                $join->on('need.id', '=', 'confirmation.deal_need_id')
                    ->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
            })
            ->where('confirmation.deal_chain_id', $dealChainId)
            ->where('confirmation.deal_need_id', $dealNeedId)
            ->where('confirmation.order_id', $orderId)
            ->whereNotIn('need.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->select(['confirmation.id as confirmation_id', 'need.id as deal_need_id'])
            ->first();
        $work = $this->workMilestones->workForOrder($orderId);
        if ($confirmed === null || $work === null
            || $work['work_instance_id'] !== $workInstanceId
            || $work['deal_chain_id'] !== $dealChainId
            || $work['deal_need_id'] !== $dealNeedId) {
            throw new KernelException(
                'DEAL_WORK_CONFIRMATION_REQUIRED',
                'A Deal Chain Work gate can only be registered for the current confirmed child Order.',
                $correlationId,
                status: 409,
            );
        }

        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $dealChainId)
            ->where('status', 'active')
            ->where('dependency_type', 'blocks')
            ->whereIn('condition_code', ['part_ready', 'delivery_signed'])
            ->where(function ($query) use ($dealNeedId): void {
                $query->where('predecessor_need_id', $dealNeedId)
                    ->orWhere('successor_need_id', $dealNeedId);
            })
            ->orderBy('id')
            ->get();

        foreach ($dependencies as $dependency) {
            $this->materializeDependency($dependency, $correlationId);
        }

        $affected = DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $dealChainId)
            ->where(function ($query) use ($dealNeedId): void {
                $query->where('predecessor_need_id', $dealNeedId)
                    ->orWhere('successor_need_id', $dealNeedId);
            })
            ->whereIn('status', ['blocked', 'cleared'])
            ->get();

        foreach ($affected as $gate) {
            if (! $this->gateIsCurrent($gate)) {
                $this->markStale((string) $gate->id, $correlationId);
            }
        }
    }

    /** @param array<string, mixed> $envelope */
    public function consume(array $envelope): void
    {
        $eventType = $envelope['event_type'] ?? null;
        if (! is_string($eventType) || ! in_array($eventType, ['work.ready_for_collection', 'work.delivered_to_site', 'work.completed'], true)) {
            return;
        }

        $eventId = $envelope['event_id'] ?? null;
        $aggregateId = $envelope['aggregate_id'] ?? null;
        $aggregateType = $envelope['aggregate_type'] ?? null;
        $aggregateVersion = $envelope['aggregate_version'] ?? null;
        $payloadVersion = $envelope['payload_version'] ?? null;
        $correlationId = $envelope['correlation_id'] ?? null;
        $payload = $envelope['payload'] ?? null;
        if (! is_string($eventId) || ! Str::isUuid($eventId) || ! is_string($aggregateId) || ! Str::isUuid($aggregateId)
            || $aggregateType !== 'work_instance'
            || ! is_int($aggregateVersion) || $aggregateVersion < 1 || ! is_int($payloadVersion) || $payloadVersion !== 1
            || ! is_string($correlationId) || ! is_array($payload)
            || ($payload['work_instance_id'] ?? null) !== $aggregateId
            || ! is_string($payload['order_id'] ?? null) || ! Str::isUuid($payload['order_id'])) {
            return;
        }

        $source = DB::table('deal_need_confirmations as confirmation')
            ->join('deal_needs as need', function ($join): void {
                $join->on('need.id', '=', 'confirmation.deal_need_id')
                    ->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
            })
            ->where('confirmation.order_id', $payload['order_id'])
            ->whereNotIn('need.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->select([
                'confirmation.id as confirmation_id',
                'confirmation.deal_chain_id',
                'confirmation.deal_need_id',
                'confirmation.order_id',
            ])
            ->first();
        $sourceWork = $this->workMilestones->workForOrder($payload['order_id']);
        if ($source === null || $sourceWork === null
            || $sourceWork['work_instance_id'] !== $aggregateId
            || $sourceWork['deal_chain_id'] !== (string) $source->deal_chain_id
            || $sourceWork['deal_need_id'] !== (string) $source->deal_need_id) {
            return;
        }

        $condition = $eventType === 'work.ready_for_collection' ? 'part_ready' : 'delivery_signed';
        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $source->deal_chain_id)
            ->where('predecessor_need_id', $source->deal_need_id)
            ->where('condition_code', $condition)
            ->where('dependency_type', 'blocks')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();
        if ($dependencies->isEmpty()) {
            return;
        }

        $transferId = $payload['handoff_transfer_id'] ?? '';
        if (! is_string($transferId)
            || ! $this->workMilestones->isPersistedSourceMilestone(
                $eventType,
                $aggregateId,
                (string) $source->order_id,
                $transferId,
                $payload,
            )) {
            return;
        }

        DB::table('work_dependency_source_facts')->insertOrIgnore([
            'id' => (string) Str::uuid7(),
            'source_event_id' => $eventId,
            'event_type' => $eventType,
            'deal_chain_id' => (string) $source->deal_chain_id,
            'deal_need_id' => (string) $source->deal_need_id,
            'confirmation_id' => (string) $source->confirmation_id,
            'order_id' => (string) $source->order_id,
            'work_instance_id' => $aggregateId,
            'aggregate_version' => $aggregateVersion,
            'payload_version' => $payloadVersion,
            'correlation_id' => $correlationId,
            'occurred_at' => now(),
            'created_at' => now(),
        ]);

        $fact = DB::table('work_dependency_source_facts')->where('source_event_id', $eventId)->first();
        if ($fact === null
            || (string) $fact->event_type !== $eventType
            || (string) $fact->deal_chain_id !== (string) $source->deal_chain_id
            || (string) $fact->deal_need_id !== (string) $source->deal_need_id
            || (string) $fact->confirmation_id !== (string) $source->confirmation_id
            || (string) $fact->order_id !== (string) $source->order_id
            || (string) $fact->work_instance_id !== $aggregateId
            || (int) $fact->aggregate_version !== $aggregateVersion
            || (int) $fact->payload_version !== $payloadVersion
            || (string) $fact->correlation_id !== $correlationId) {
            return;
        }

        foreach ($dependencies as $dependency) {
            $gates = DB::table('work_step_dependency_gates')
                ->where('dependency_id', $dependency->id)
                ->where('dependency_version', (int) $dependency->version)
                ->where('condition_code', $condition)
                ->where('source_confirmation_id', $source->confirmation_id)
                ->where('source_order_id', $source->order_id)
                ->where('source_work_instance_id', $aggregateId)
                ->where('status', 'blocked')
                ->lockForUpdate()
                ->get();

            foreach ($gates as $gate) {
                if (! $this->gateIsCurrent($gate)) {
                    $this->markStale((string) $gate->id, $correlationId);

                    continue;
                }

                $this->clearGate($gate, $fact, $correlationId);
            }
        }
    }

    private function materializeDependency(object $dependency, string $correlationId): void
    {
        $source = $this->confirmedWork((string) $dependency->deal_chain_id, (string) $dependency->predecessor_need_id);
        $successor = $this->confirmedWork((string) $dependency->deal_chain_id, (string) $dependency->successor_need_id);
        if ($source === null || $successor === null) {
            return;
        }

        $gateId = (string) Str::uuid7();
        $inserted = DB::table('work_step_dependency_gates')->insertOrIgnore([
            'id' => $gateId,
            'deal_chain_id' => (string) $dependency->deal_chain_id,
            'dependency_id' => (string) $dependency->id,
            'dependency_version' => (int) $dependency->version,
            'condition_code' => (string) $dependency->condition_code,
            'predecessor_need_id' => (string) $dependency->predecessor_need_id,
            'successor_need_id' => (string) $dependency->successor_need_id,
            'source_confirmation_id' => (string) $source->confirmation_id,
            'source_order_id' => (string) $source->order_id,
            'source_work_instance_id' => (string) $source->work_instance_id,
            'successor_confirmation_id' => (string) $successor->confirmation_id,
            'successor_order_id' => (string) $successor->order_id,
            'successor_work_instance_id' => (string) $successor->work_instance_id,
            'status' => 'blocked',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $gate = DB::table('work_step_dependency_gates')
            ->where('dependency_id', $dependency->id)
            ->where('dependency_version', (int) $dependency->version)
            ->where('successor_work_instance_id', $successor->work_instance_id)
            ->where('source_work_instance_id', $source->work_instance_id)
            ->where('source_confirmation_id', $source->confirmation_id)
            ->where('successor_confirmation_id', $successor->confirmation_id)
            ->where('status', 'blocked')
            ->first();
        if ($gate === null) {
            return;
        }
        if ($inserted > 0) {
            $this->recordGateMaterialized($gate, $correlationId);
        }

        $eventTypes = (string) $dependency->condition_code === 'part_ready'
            ? ['work.ready_for_collection']
            : ['work.delivered_to_site', 'work.completed'];
        $fact = DB::table('work_dependency_source_facts')
            ->whereIn('event_type', $eventTypes)
            ->where('deal_chain_id', $dependency->deal_chain_id)
            ->where('deal_need_id', $dependency->predecessor_need_id)
            ->where('confirmation_id', $source->confirmation_id)
            ->where('order_id', $source->order_id)
            ->where('work_instance_id', $source->work_instance_id)
            ->orderBy('occurred_at')
            ->first();
        if ($fact !== null && $this->gateIsCurrent($gate)) {
            $this->clearGate($gate, $fact, (string) $fact->correlation_id ?: $correlationId);
        }
    }

    private function confirmedWork(string $dealChainId, string $dealNeedId): ?object
    {
        $confirmation = DB::table('deal_need_confirmations as confirmation')
            ->join('deal_needs as need', function ($join): void {
                $join->on('need.id', '=', 'confirmation.deal_need_id')
                    ->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
            })
            ->where('confirmation.deal_chain_id', $dealChainId)
            ->where('confirmation.deal_need_id', $dealNeedId)
            ->whereNotIn('need.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->select([
                'confirmation.id as confirmation_id',
                'confirmation.order_id',
                'confirmation.deal_chain_id',
                'confirmation.deal_need_id',
            ])
            ->first();
        if ($confirmation === null) {
            return null;
        }

        $work = $this->workMilestones->workForOrder((string) $confirmation->order_id);
        if ($work === null
            || $work['deal_chain_id'] !== $dealChainId
            || $work['deal_need_id'] !== $dealNeedId) {
            return null;
        }

        return (object) [
            'confirmation_id' => (string) $confirmation->confirmation_id,
            'order_id' => (string) $confirmation->order_id,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $dealNeedId,
            'work_instance_id' => $work['work_instance_id'],
        ];
    }

    private function gateIsCurrent(object $gate): bool
    {
        $current = DB::table('work_step_dependency_gates as gate')
            ->join('deal_dependencies as dependency', function ($join): void {
                $join->on('dependency.id', '=', 'gate.dependency_id')
                    ->on('dependency.deal_chain_id', '=', 'gate.deal_chain_id')
                    ->on('dependency.version', '=', 'gate.dependency_version')
                    ->on('dependency.condition_code', '=', 'gate.condition_code')
                    ->on('dependency.predecessor_need_id', '=', 'gate.predecessor_need_id')
                    ->on('dependency.successor_need_id', '=', 'gate.successor_need_id');
            })
            ->join('deal_needs as predecessor', function ($join): void {
                $join->on('predecessor.id', '=', 'gate.predecessor_need_id')
                    ->on('predecessor.deal_chain_id', '=', 'gate.deal_chain_id');
            })
            ->join('deal_needs as successor', function ($join): void {
                $join->on('successor.id', '=', 'gate.successor_need_id')
                    ->on('successor.deal_chain_id', '=', 'gate.deal_chain_id');
            })
            ->join('deal_need_confirmations as source_confirmation', function ($join): void {
                $join->on('source_confirmation.id', '=', 'gate.source_confirmation_id')
                    ->on('source_confirmation.deal_chain_id', '=', 'gate.deal_chain_id')
                    ->on('source_confirmation.deal_need_id', '=', 'gate.predecessor_need_id')
                    ->on('source_confirmation.order_id', '=', 'gate.source_order_id');
            })
            ->join('deal_need_confirmations as successor_confirmation', function ($join): void {
                $join->on('successor_confirmation.id', '=', 'gate.successor_confirmation_id')
                    ->on('successor_confirmation.deal_chain_id', '=', 'gate.deal_chain_id')
                    ->on('successor_confirmation.deal_need_id', '=', 'gate.successor_need_id')
                    ->on('successor_confirmation.order_id', '=', 'gate.successor_order_id');
            })
            ->where('gate.id', $gate->id)
            ->where('dependency.status', 'active')
            ->where('dependency.dependency_type', 'blocks')
            ->whereNotIn('predecessor.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->whereNotIn('successor.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->first([
                'gate.deal_chain_id', 'gate.predecessor_need_id', 'gate.successor_need_id',
                'gate.source_order_id', 'gate.source_work_instance_id',
                'gate.successor_order_id', 'gate.successor_work_instance_id',
            ]);
        if ($current === null) {
            return false;
        }

        $source = $this->workMilestones->workForOrder((string) $current->source_order_id);
        $successor = $this->workMilestones->workForOrder((string) $current->successor_order_id);

        return $source !== null
            && $successor !== null
            && $source['work_instance_id'] === (string) $current->source_work_instance_id
            && $source['deal_chain_id'] === (string) $current->deal_chain_id
            && $source['deal_need_id'] === (string) $current->predecessor_need_id
            && $successor['work_instance_id'] === (string) $current->successor_work_instance_id
            && $successor['deal_chain_id'] === (string) $current->deal_chain_id
            && $successor['deal_need_id'] === (string) $current->successor_need_id;
    }

    private function recordGateMaterialized(object $gate, string $correlationId): void
    {
        $auditId = $this->audits->record(
            action: 'deal_work_gate.materialized',
            targetType: 'work_step_dependency_gate',
            targetId: (string) $gate->id,
            correlationId: $correlationId,
            actor: ActorContext::system('deal-coordination.need-confirmation'),
            commandName: 'DealWorkGateAdapter::materializeDependency',
            previous: null,
            next: [
                'status' => 'blocked',
                'dependency_id' => (string) $gate->dependency_id,
                'dependency_version' => (int) $gate->dependency_version,
                'condition_code' => (string) $gate->condition_code,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            reason: 'A confirmed child Work dependency requires its exact predecessor milestone.',
            orderId: (string) $gate->successor_order_id,
        );
        $this->outbox->enqueue(
            eventType: 'deal_work_gate.materialized',
            aggregateType: 'work_step_dependency_gate',
            aggregateId: (string) $gate->id,
            payload: [
                'gate_id' => (string) $gate->id,
                'dependency_id' => (string) $gate->dependency_id,
                'dependency_version' => (int) $gate->dependency_version,
                'condition_code' => (string) $gate->condition_code,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }

    private function clearGate(object $gate, object $fact, string $correlationId): void
    {
        $updated = DB::table('work_step_dependency_gates')
            ->where('id', $gate->id)
            ->where('status', 'blocked')
            ->update([
                'status' => 'cleared',
                'source_fact_id' => (string) $fact->id,
                'cleared_at' => now(),
                'updated_at' => now(),
            ]);
        if ($updated === 0) {
            return;
        }

        $auditId = $this->audits->record(
            action: 'deal_work_gate.cleared',
            targetType: 'work_step_dependency_gate',
            targetId: (string) $gate->id,
            correlationId: $correlationId,
            actor: ActorContext::system('deal-coordination.gate-consumer'),
            commandName: 'DealWorkGateAdapter::clearGate',
            previous: ['status' => 'blocked'],
            next: [
                'status' => 'cleared',
                'condition_code' => (string) $gate->condition_code,
                'source_event_id' => (string) $fact->source_event_id,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            reason: 'The exact confirmed predecessor Work milestone was persisted and consumed.',
            orderId: (string) $gate->successor_order_id,
        );
        $this->outbox->enqueue(
            eventType: 'deal_work_gate.cleared',
            aggregateType: 'work_step_dependency_gate',
            aggregateId: (string) $gate->id,
            payload: [
                'gate_id' => (string) $gate->id,
                'dependency_id' => (string) $gate->dependency_id,
                'condition_code' => (string) $gate->condition_code,
                'source_event_id' => (string) $fact->source_event_id,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
        $successor = null;
        foreach ($this->orderReferences->activeOrderDetailsForOrders([(string) $gate->successor_order_id]) as $order) {
            if ($order['order_id'] === (string) $gate->successor_order_id) {
                $successor = $order;
                break;
            }
        }
        if ($successor !== null) {
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: (string) $successor['provider_user_id'],
                eventSourceType: 'deal_need',
                eventSourceId: (string) $gate->successor_need_id,
                eventType: 'deal.predecessor_unlocked',
                attention: NotificationAttention::NeedsAction,
                title: 'A prerequisite is cleared',
                body: 'An earlier step is complete. Review your current Deal Chain Order.',
                actionUrl: route('orders.show', ['order' => (string) $gate->successor_order_id], false),
                idempotencyKey: 'deal_need:'.$gate->successor_need_id.':predecessor-unlocked:'.$gate->dependency_version.':'.$gate->id.':'.$successor['provider_user_id'],
                correlationId: $correlationId,
            ));
        }
    }

    private function rejectBlocked(string $correlationId): never
    {
        throw new KernelException(
            'PREDECESSOR_GATE_BLOCKED',
            'This Deal Chain Work cannot advance until every current confirmed predecessor milestone is received.',
            $correlationId,
            status: 409,
        );
    }

    private function markStale(string $gateId, string $correlationId): void
    {
        $gate = DB::table('work_step_dependency_gates')
            ->where('id', $gateId)
            ->whereIn('status', ['blocked', 'cleared'])
            ->first();
        if ($gate === null) {
            return;
        }
        $updated = DB::table('work_step_dependency_gates')
            ->where('id', $gateId)
            ->whereIn('status', ['blocked', 'cleared'])
            ->update([
                'status' => 'stale',
                'source_fact_id' => null,
                'cleared_at' => null,
                'updated_at' => now(),
            ]);
        if ($updated === 0) {
            return;
        }

        $auditId = $this->audits->record(
            action: 'deal_work_gate.staled',
            targetType: 'work_step_dependency_gate',
            targetId: $gateId,
            correlationId: $correlationId,
            actor: ActorContext::system('deal-coordination.gate-consumer'),
            commandName: 'DealWorkGateAdapter::markStale',
            previous: ['status' => (string) $gate->status],
            next: [
                'status' => 'stale',
                'dependency_id' => (string) $gate->dependency_id,
                'condition_code' => (string) $gate->condition_code,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            reason: 'The gate no longer matches the current confirmed Deal Need dependency graph.',
            orderId: (string) $gate->successor_order_id,
        );
        $this->outbox->enqueue(
            eventType: 'deal_work_gate.staled',
            aggregateType: 'work_step_dependency_gate',
            aggregateId: $gateId,
            payload: [
                'gate_id' => $gateId,
                'dependency_id' => (string) $gate->dependency_id,
                'condition_code' => (string) $gate->condition_code,
                'source_work_instance_id' => (string) $gate->source_work_instance_id,
                'successor_work_instance_id' => (string) $gate->successor_work_instance_id,
            ],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }
}

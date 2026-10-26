<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\WorkMilestoneReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WorkMilestoneReaderAdapter implements WorkMilestoneReaderPort
{
    public function dealNeedWorkForInstance(string $workInstanceId): ?array
    {
        $row = DB::table('work_instances')
            ->join('orders', 'orders.id', '=', 'work_instances.order_id')
            ->where('work_instances.id', $workInstanceId)
            ->first([
                'orders.id as order_id',
                'orders.deal_chain_id',
                'orders.deal_need_id',
            ]);

        if ($row === null) {
            return null;
        }

        return [
            'order_id' => (string) $row->order_id,
            'deal_chain_id' => is_string($row->deal_chain_id) ? (string) $row->deal_chain_id : null,
            'deal_need_id' => is_string($row->deal_need_id) ? (string) $row->deal_need_id : null,
        ];
    }

    public function workForOrder(string $orderId): ?array
    {
        $row = DB::table('orders')
            ->join('work_instances', 'work_instances.order_id', '=', 'orders.id')
            ->where('orders.id', $orderId)
            ->first([
                'work_instances.id as work_instance_id',
                'orders.deal_chain_id',
                'orders.deal_need_id',
            ]);

        if ($row === null) {
            return null;
        }

        return [
            'work_instance_id' => (string) $row->work_instance_id,
            'deal_chain_id' => is_string($row->deal_chain_id) ? (string) $row->deal_chain_id : null,
            'deal_need_id' => is_string($row->deal_need_id) ? (string) $row->deal_need_id : null,
        ];
    }

    public function isPersistedSourceMilestone(
        string $eventType,
        string $workInstanceId,
        string $orderId,
        string $transferId,
        array $payload,
    ): bool {
        if (! Str::isUuid($workInstanceId) || ! Str::isUuid($orderId)) {
            return false;
        }

        if ($eventType === 'work.completed' && $transferId === '') {
            if (($payload['acceptance_kind'] ?? null) === 'digital_delivery') {
                return $this->isAcceptedDigitalDelivery($workInstanceId, $orderId, $payload);
            }

            return $this->isBuyerSignedWorkCompletion($workInstanceId, $orderId, $payload);
        }
        if (! Str::isUuid($transferId)) {
            return false;
        }

        if ($eventType === 'work.ready_for_collection') {
            return $this->isPersistedPreparation($workInstanceId, $orderId, $transferId, $payload);
        }
        if (in_array($eventType, ['work.delivered_to_site', 'work.completed'], true)) {
            return $this->isPersistedRecipientReceipt($workInstanceId, $orderId, $transferId, $payload);
        }

        return false;
    }

    private function isPersistedPreparation(string $workInstanceId, string $orderId, string $transferId, array $payload): bool
    {
        $transfer = DB::table('order_handoff_transfers')
            ->where('id', $transferId)
            ->where('work_instance_id', $workInstanceId)
            ->where('order_id', $orderId)
            ->first();
        $order = DB::table('orders')->where('id', $orderId)->first(['provider_user_id']);
        if ($transfer === null || $order === null
            || (string) ($payload['transfer_mode'] ?? $transfer->transfer_mode) !== (string) $transfer->transfer_mode) {
            return false;
        }

        return in_array((string) $transfer->status, ['prepared', 'offered', 'departed', 'received'], true)
            && (string) $transfer->prepared_by_user_id === (string) $order->provider_user_id
            && is_string($transfer->prepared_evidence_file_id)
            && DB::table('work_events')
                ->where('work_instance_id', $workInstanceId)
                ->where('event_type', 'work.ready_for_collection')
                ->where('actor_user_id', $transfer->prepared_by_user_id)
                ->where('evidence_file_id', $transfer->prepared_evidence_file_id)
                ->whereRaw("payload::jsonb ->> 'handoff_transfer_id' = ?", [$transferId])
                ->exists();
    }

    private function isPersistedRecipientReceipt(string $workInstanceId, string $orderId, string $transferId, array $payload): bool
    {
        $receiptOrderId = $payload['receipt_order_id'] ?? $orderId;
        $transfer = DB::table('order_handoff_transfers')->where('id', $transferId)->first();
        $receiptOrder = is_string($receiptOrderId)
            ? DB::table('orders')->where('id', $receiptOrderId)->first(['buyer_user_id'])
            : null;
        $sourceOrder = DB::table('orders')->where('id', $orderId)->first(['provider_user_id']);
        if ($transfer === null || $receiptOrder === null || $sourceOrder === null
            || (string) ($payload['transfer_mode'] ?? '') !== (string) $transfer->transfer_mode
            || (string) $transfer->status !== 'received') {
            return false;
        }

        $isDirectWork = (string) $transfer->order_id === $orderId
            && (string) $transfer->work_instance_id === $workInstanceId;
        $isLinkedCourierWork = is_string($payload['receipt_order_id'] ?? null)
            && (string) $transfer->order_id === (string) $payload['receipt_order_id']
            && (string) $transfer->work_instance_id === (string) ($payload['handoff_work_instance_id'] ?? '')
            && (string) $transfer->departed_by_user_id === (string) $sourceOrder->provider_user_id
            && (string) $transfer->offered_to_user_id === (string) $sourceOrder->provider_user_id;
        if (! $isDirectWork && ! $isLinkedCourierWork) {
            return false;
        }

        $finalRecipient = DB::table('order_parties')
            ->where('order_id', $receiptOrderId)
            ->where('status', 'active')
            ->where('party_type', 'recipient')
            ->where('responsibility', 'final_recipient')
            ->value('user_id');
        $finalRecipient = is_string($finalRecipient) ? $finalRecipient : (string) $receiptOrder->buyer_user_id;
        if ((string) $transfer->received_by_user_id !== $finalRecipient
            || (string) $transfer->received_by_user_id !== (string) ($payload['recipient_user_id'] ?? '')
            || (string) ($payload['milestone'] ?? '') !== 'customer_receipt'
            || ! is_string($transfer->receipt_evidence_file_id)) {
            return false;
        }

        $handoffReceiptExists = DB::table('work_events')
            ->where('work_instance_id', $transfer->work_instance_id)
            ->where('event_type', 'work.delivered_to_site')
            ->where('actor_user_id', $transfer->received_by_user_id)
            ->where('evidence_file_id', $transfer->receipt_evidence_file_id)
            ->whereRaw("payload::jsonb ->> 'handoff_transfer_id' = ?", [$transferId])
            ->whereRaw("payload::jsonb ->> 'milestone' = 'customer_receipt'")
            ->whereRaw("payload::jsonb ->> 'recipient_user_id' = ?", [$finalRecipient])
            ->exists();
        if (! $handoffReceiptExists || ! $isLinkedCourierWork) {
            return $handoffReceiptExists;
        }

        return DB::table('work_events')
            ->where('work_instance_id', $workInstanceId)
            ->where('event_type', 'work.delivered_to_site')
            ->where('actor_user_id', $finalRecipient)
            ->where('evidence_file_id', $transfer->receipt_evidence_file_id)
            ->whereRaw("payload::jsonb ->> 'handoff_transfer_id' = ?", [$transferId])
            ->whereRaw("payload::jsonb ->> 'handoff_work_instance_id' = ?", [(string) $transfer->work_instance_id])
            ->whereRaw("payload::jsonb ->> 'receipt_order_id' = ?", [(string) $transfer->order_id])
            ->whereRaw("payload::jsonb ->> 'milestone' = 'customer_receipt'")
            ->whereRaw("payload::jsonb ->> 'recipient_user_id' = ?", [$finalRecipient])
            ->exists();
    }

    /** @param array<string, mixed> $payload */
    private function isAcceptedDigitalDelivery(string $workInstanceId, string $orderId, array $payload): bool
    {
        if (! is_string($payload['delivery_id'] ?? null)
            || ! Str::isUuid($payload['delivery_id'])
            || ! is_int($payload['delivery_version'] ?? null)
            || $payload['delivery_version'] < 1
            || ! is_string($payload['manifest_hash'] ?? null)
            || preg_match('/\A[0-9a-f]{64}\z/', $payload['manifest_hash']) !== 1
            || ! is_string($payload['completion_actor_user_id'] ?? null)
            || ! Str::isUuid($payload['completion_actor_user_id'])) {
            return false;
        }

        $accepted = DB::table('work_instances as work')
            ->join('orders as agreement', 'agreement.id', '=', 'work.order_id')
            ->join('work_deliveries as delivery', 'delivery.id', '=', 'work.current_delivery_id')
            ->where('work.id', $workInstanceId)
            ->where('work.order_id', $orderId)
            ->where('work.work_shape', 'A9')
            ->where('work.status', 'completed')
            ->where('agreement.status', 'completed')
            ->where('agreement.buyer_user_id', $payload['completion_actor_user_id'])
            ->where('delivery.id', $payload['delivery_id'])
            ->where('delivery.work_instance_id', $workInstanceId)
            ->where('delivery.status', 'accepted')
            ->whereNotNull('delivery.accepted_at')
            ->where('delivery.version', $payload['delivery_version'])
            ->where('delivery.manifest_hash', $payload['manifest_hash'])
            ->exists();
        if (! $accepted) {
            return false;
        }

        return DB::table('work_events')
            ->where('work_instance_id', $workInstanceId)
            ->where('event_type', 'work.delivery.accepted')
            ->where('actor_user_id', $payload['completion_actor_user_id'])
            ->where('previous_status', 'awaiting_signoff')
            ->where('new_status', 'completed')
            ->whereRaw("payload::jsonb ->> 'delivery_id' = ?", [$payload['delivery_id']])
            ->whereRaw("payload::jsonb ->> 'version' = ?", [(string) $payload['delivery_version']])
            ->whereRaw("payload::jsonb ->> 'manifest_hash' = ?", [$payload['manifest_hash']])
            ->exists();
    }

    private function isBuyerSignedWorkCompletion(string $workInstanceId, string $orderId, array $payload): bool
    {
        if (($payload['final_signoff'] ?? false) !== true
            || ! is_string($payload['completion_actor_user_id'] ?? null)
            || ! is_string($payload['node_id'] ?? null)) {
            return false;
        }

        $order = DB::table('orders')->where('id', $orderId)->first(['buyer_user_id', 'provider_user_id', 'status']);
        $work = DB::table('work_instances')->where('id', $workInstanceId)->where('order_id', $orderId)->first(['status', 'structure']);
        if ($order === null || $work === null
            || (string) $order->status !== 'completed'
            || (string) $work->status !== 'completed') {
            return false;
        }

        $structure = is_array($work->structure) ? $work->structure : json_decode((string) $work->structure, true);
        $node = collect((array) ($structure['nodes'] ?? []))->first(
            static fn (mixed $candidate): bool => is_array($candidate) && (string) ($candidate['id'] ?? '') === (string) $payload['node_id'],
        );
        if (! is_array($node) || ($node['node_kind'] ?? null) !== 'final_signoff' || ($node['status'] ?? null) !== 'completed') {
            return false;
        }

        $challengeId = $payload['challenge_id'] ?? null;
        if (! is_string($challengeId) || ! Str::isUuid($challengeId)) {
            if (($node['approval_method'] ?? 'app_confirm') !== 'app_confirm'
                || (string) $payload['completion_actor_user_id'] !== (string) $order->buyer_user_id) {
                return false;
            }

            return DB::table('work_events')
                ->where('work_instance_id', $workInstanceId)
                ->where('event_type', 'work.node.signoff_completion')
                ->where('actor_user_id', $order->buyer_user_id)
                ->whereRaw("payload::jsonb ->> 'node_id' = ?", [(string) $payload['node_id']])
                ->whereRaw("payload::jsonb ->> 'action' = 'signoff_completion'")
                ->whereRaw("payload::jsonb ->> 'node_kind' = 'final_signoff'")
                ->exists();
        }

        $challenge = DB::table('work_clearance_challenges')
            ->where('id', $challengeId)
            ->where('order_id', $orderId)
            ->where('work_instance_id', $workInstanceId)
            ->where('node_id', $payload['node_id'])
            ->where('kind', $payload['challenge_kind'] ?? '')
            ->where('work_version', $payload['work_version'] ?? 0)
            ->whereNotNull('consumed_at')
            ->whereNull('invalidated_at')
            ->first();
        if ($challenge === null
            || (string) $challenge->consumed_by_user_id !== (string) ($payload['verified_by_user_id'] ?? '')
            || (string) $challenge->consumed_by_user_id !== (string) $payload['completion_actor_user_id']) {
            return false;
        }

        $workSignature = $structure['signature_hash'] ?? null;
        if (! is_string($workSignature) || trim($workSignature) === ''
            || ! is_string($challenge->work_signature_hash ?? null)
            || ! hash_equals(hash('sha256', $workSignature), $challenge->work_signature_hash)) {
            return false;
        }

        if ((string) $challenge->kind === 'presence_otp') {
            if (
                (string) $challenge->issuer_user_id !== (string) $order->buyer_user_id
                || (string) $challenge->issuer_user_id !== (string) ($payload['authorized_by_user_id'] ?? '')
                || (string) $challenge->verifier_user_id !== (string) $order->provider_user_id
                || ($node['approval_method'] ?? null) !== 'presence_otp'
            ) {
                return false;
            }
        } elseif ((string) $challenge->kind === 'worker_dropoff') {
            $recipient = DB::table('order_parties')
                ->where('order_id', $orderId)
                ->where('status', 'active')
                ->where('party_type', 'recipient')
                ->where('responsibility', 'final_recipient')
                ->value('user_id');
            $recipient = is_string($recipient) ? $recipient : (string) $order->buyer_user_id;
            $assignedWorker = (string) $challenge->issuer_user_id === (string) $order->provider_user_id
                || DB::table('order_parties')
                    ->where('order_id', $orderId)
                    ->where('user_id', $challenge->issuer_user_id)
                    ->where('status', 'active')
                    ->where(function ($query): void {
                        $query->where('party_type', 'courier')
                            ->orWhereIn('responsibility', ['courier', 'delivery']);
                    })
                    ->exists();
            if (
                ! $assignedWorker
                || (string) $challenge->verifier_user_id !== $recipient
                || (string) $challenge->consumed_by_user_id !== $recipient
                || (string) $payload['authorized_by_user_id'] !== $recipient
                || (($node['approval_method'] ?? null) !== 'worker_dropoff' && ($node['handoff_party'] ?? null) !== 'worker_dropoff')
            ) {
                return false;
            }
        } else {
            return false;
        }

        return DB::table('work_events')
            ->where('work_instance_id', $workInstanceId)
            ->where('event_type', 'work.node.challenge_verified')
            ->where('actor_user_id', $challenge->consumed_by_user_id)
            ->whereRaw("payload::jsonb ->> 'node_id' = ?", [(string) $payload['node_id']])
            ->whereRaw("payload::jsonb ->> 'challenge_id' = ?", [$challengeId])
            ->whereRaw("payload::jsonb ->> 'challenge_kind' = ?", [(string) $challenge->kind])
            ->exists();
    }
}

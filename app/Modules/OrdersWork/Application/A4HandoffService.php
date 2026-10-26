<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class A4HandoffService
{
    public function __construct(
        private readonly OrderCapacityPort $capacity,
        private readonly OrderPaymentObligationPort $payments,
        private readonly OutboxWriter $outbox,
        private readonly ParticipantDisplayNameReaderPort $participantNames,
        private readonly OrderHandoffCourierAuthorityPort $courierAuthority,
        private readonly AuditRecorder $audits,
        private readonly DealWorkGatePort $workGates,
        private readonly WorkExecutionService $workExecution,
        private readonly WorkNodeEvidenceService $workEvidence,
        private readonly WorkClearanceChallengeService $clearanceChallenges,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}

    /** @return array<string, mixed> */
    public function markPrepared(
        string $orderId,
        string $actorId,
        string $evidenceId,
        string $idempotencyKey,
        int $expectedOrderVersion,
        string $correlationId,
        ?string $nodeId = null,
        ?int $expectedWorkVersion = null,
        array $proofPayload = [],
    ): array {
        return DB::transaction(function () use ($orderId, $actorId, $evidenceId, $idempotencyKey, $expectedOrderVersion, $correlationId, $nodeId, $expectedWorkVersion, $proofPayload): array {
            $order = $this->lockA4Order($orderId, $correlationId);
            $work = $this->lockA4Work($orderId, $correlationId);
            if ((string) $order->provider_user_id !== $actorId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned order provider can mark this A4 handoff prepared.', $correlationId, status: 403);
            }

            $existing = DB::table('order_handoff_transfers')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($existing !== null && hash_equals((string) $existing->prepared_idempotency_key, $idempotencyKey)) {
                if ((string) $existing->prepared_evidence_file_id !== $evidenceId) {
                    throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for different preparation evidence.', $correlationId, status: 409);
                }
                $this->assertReplayProofMatches($work, 1, $nodeId, $expectedWorkVersion, $evidenceId, $proofPayload, null, $correlationId);

                return $this->result($existing, true);
            }
            $this->assertWorkNotHeld($work, $correlationId);
            if ((int) $order->version !== $expectedOrderVersion || (string) $order->status !== 'accepted') {
                throw new OrderError('VERSION_CONFLICT', 'This order changed or is not ready for preparation.', $correlationId, status: 409);
            }
            if ($existing !== null) {
                throw new OrderError('INVALID_STATE', 'This order has already been prepared for handoff.', $correlationId, status: 409);
            }
            if (in_array((string) $work->status, ['completed', 'cancelled', 'failed'], true)) {
                throw new OrderError('INVALID_STATE', 'Only an active A4 product or courier-service order can be prepared.', $correlationId, status: 409);
            }

            $proof = $this->validatePhaseProof(
                $work,
                1,
                $actorId,
                $nodeId,
                $expectedWorkVersion,
                $evidenceId,
                $proofPayload,
                $correlationId,
            );
            if ($proof === null) {
                $this->assertCleanOrderEvidence((string) $work->id, $evidenceId, $correlationId);
            }

            $now = now();
            $transfer = [
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'status' => 'prepared',
                'transfer_mode' => null,
                'prepared_by_user_id' => $actorId,
                'offered_by_user_id' => null,
                'offered_to_user_id' => null,
                'departed_by_user_id' => null,
                'received_by_user_id' => null,
                'prepared_evidence_file_id' => $evidenceId,
                'custody_evidence_file_id' => null,
                'receipt_evidence_file_id' => null,
                'prepared_idempotency_key' => $idempotencyKey,
                'custody_idempotency_key' => null,
                'accept_idempotency_key' => null,
                'receipt_idempotency_key' => null,
                'prepared_at' => $now,
                'offered_at' => null,
                'departed_at' => null,
                'received_at' => null,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            DB::table('order_handoff_transfers')->insert($transfer);
            $structure = $this->completeA4Phase($work, 1, $actorId, $proof, $now, $correlationId);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'in_progress',
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'started_at' => $work->started_at ?? $now,
                'version' => DB::raw('version + 1'),
                'row_version' => DB::raw('row_version + 1'),
                'updated_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update(['status' => 'in_progress', 'version' => DB::raw('version + 1'), 'updated_at' => $now]);
            $proofEvent = $this->proofEventPayload($proof);
            $this->writeWorkEvent((string) $work->id, 'prepared', 'ready_for_collection', $actorId, $evidenceId, $correlationId, $now, (string) $transfer['id'], $proofEvent);
            $auditId = $this->audits->record(
                action: 'order.handoff.prepared',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorId),
                commandName: 'A4HandoffService::markPrepared',
                expectedVersion: $expectedOrderVersion,
                previous: ['status' => 'accepted'],
                next: ['status' => 'prepared', 'transfer_id' => $transfer['id'], ...$proofEvent],
                reason: 'The assigned A4 provider prepared the accepted order.',
                orderId: $orderId,
            );
            $this->outbox->enqueue('work.ready_for_collection', 'work_instance', (string) $work->id, ['order_id' => $orderId, 'work_instance_id' => (string) $work->id, 'handoff_transfer_id' => $transfer['id']], $correlationId, auditEventId: $auditId);

            return $this->result((object) $transfer, false);
        });
    }

    /** @return array<string, mixed> */
    public function offerCustody(string $orderId, string $actorId, string $mode, ?string $courierId, string $idempotencyKey, int $expectedTransferVersion, string $correlationId): array
    {
        return DB::transaction(function () use ($orderId, $actorId, $mode, $courierId, $idempotencyKey, $expectedTransferVersion, $correlationId): array {
            $order = $this->lockA4Order($orderId, $correlationId);
            $work = $this->lockA4Work($orderId, $correlationId);
            if ((string) $order->provider_user_id !== $actorId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the assigned order provider can offer custody.', $correlationId, status: 403);
            }
            $transfer = DB::table('order_handoff_transfers')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($transfer === null) {
                throw new OrderError('INVALID_STATE', 'Mark this order prepared before offering custody.', $correlationId, status: 409);
            }
            if ((string) ($transfer->custody_idempotency_key ?? '') === $idempotencyKey) {
                $replayedRecipient = $mode === 'counter_pickup'
                    ? (string) $order->buyer_user_id
                    : (is_string($courierId) ? $courierId : '');
                if ((string) $transfer->transfer_mode !== $mode || (string) $transfer->offered_to_user_id !== $replayedRecipient) {
                    throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for different custody terms.', $correlationId, status: 409);
                }

                return $this->result($transfer, true);
            }
            $this->assertWorkNotHeld($work, $correlationId);
            if ((string) $transfer->status !== 'prepared' || (int) $transfer->version !== $expectedTransferVersion) {
                throw new OrderError('VERSION_CONFLICT', 'The handoff changed. Refresh before offering custody.', $correlationId, status: 409);
            }
            if ($mode === 'counter_pickup') {
                if ($courierId !== null && $courierId !== '' && $courierId !== (string) $order->buyer_user_id) {
                    throw new OrderError('INVALID_RECIPIENT', 'Counter pickup must be offered to the order buyer.', $correlationId, status: 422);
                }
                $recipientId = (string) $order->buyer_user_id;
            } elseif ($mode === 'courier_delivery') {
                if (! is_string($courierId) || $courierId === '' || $courierId === (string) $order->provider_user_id
                    || $courierId === (string) $order->buyer_user_id || ! $this->isAssignedCourier($order, $orderId, $courierId)) {
                    throw new OrderError('INVALID_RECIPIENT', 'Choose an authorized courier assigned to this order.', $correlationId, status: 403);
                }
                $recipientId = $courierId;
            } else {
                throw new OrderError('INVALID_TRANSFER_MODE', 'Choose counter pickup or courier delivery.', $correlationId, status: 422);
            }
            $now = now();
            DB::table('order_handoff_transfers')->where('id', $transfer->id)->update([
                'status' => 'offered', 'transfer_mode' => $mode, 'offered_by_user_id' => $actorId,
                'offered_to_user_id' => $recipientId, 'custody_idempotency_key' => $idempotencyKey,
                'offered_at' => $now, 'version' => DB::raw('version + 1'), 'updated_at' => $now,
            ]);
            $auditId = $this->audits->record(
                action: 'order.handoff.custody_offer',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorId),
                expectedVersion: $expectedTransferVersion,
                previous: ['status' => 'prepared'],
                next: ['status' => 'offered', 'transfer_id' => (string) $transfer->id, 'transfer_mode' => $mode, 'recipient_user_id' => $recipientId],
                reason: 'The assigned A4 provider offered custody to the named recipient.',
                orderId: $orderId,
            );
            $this->outbox->enqueue('work.custody_offered', 'work_instance', (string) $transfer->work_instance_id, ['order_id' => $orderId, 'work_instance_id' => (string) $transfer->work_instance_id, 'handoff_transfer_id' => (string) $transfer->id, 'transfer_mode' => $mode], $correlationId, auditEventId: $auditId);

            return $this->result(DB::table('order_handoff_transfers')->where('id', $transfer->id)->first(), false);
        });
    }

    /** @return array<string, mixed> */
    public function acceptCustody(
        string $orderId,
        string $transferId,
        string $actorId,
        string $evidenceId,
        string $idempotencyKey,
        int $expectedTransferVersion,
        string $correlationId,
        ?string $nodeId = null,
        ?int $expectedWorkVersion = null,
        array $proofPayload = [],
    ): array {
        return DB::transaction(function () use ($orderId, $transferId, $actorId, $evidenceId, $idempotencyKey, $expectedTransferVersion, $correlationId, $nodeId, $expectedWorkVersion, $proofPayload): array {
            $order = $this->lockA4Order($orderId, $correlationId);
            $work = $this->lockA4Work($orderId, $correlationId);
            $transfer = DB::table('order_handoff_transfers')->where('id', $transferId)->where('order_id', $orderId)->lockForUpdate()->first();
            if ($transfer === null) {
                throw new OrderError('HANDOFF_NOT_FOUND', 'The custody offer could not be found.', $correlationId, status: 404);
            }
            if ((string) ($transfer->accept_idempotency_key ?? '') === $idempotencyKey && (string) $transfer->departed_by_user_id === $actorId) {
                if ((string) $transfer->custody_evidence_file_id !== $evidenceId) {
                    throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for different custody evidence.', $correlationId, status: 409);
                }
                $this->assertReplayProofMatches($work, 2, $nodeId, $expectedWorkVersion, $evidenceId, $proofPayload, null, $correlationId);

                return $this->result($transfer, true);
            }
            if ((string) $transfer->offered_to_user_id !== $actorId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the named custody recipient can accept this offer.', $correlationId, status: 403);
            }
            if ((string) $transfer->status !== 'offered' || (int) $transfer->version !== $expectedTransferVersion) {
                throw new OrderError('VERSION_CONFLICT', 'This custody offer changed. Refresh before accepting it.', $correlationId, status: 409);
            }
            if ($transfer->transfer_mode === 'courier_delivery' && ! $this->isAssignedCourier($order, $orderId, $actorId)) {
                throw new OrderError('AUTHORIZATION_DENIED', 'This courier is no longer assigned to the order.', $correlationId, status: 403);
            }
            if ($transfer->transfer_mode === 'counter_pickup' && $actorId !== (string) $order->buyer_user_id) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the order buyer can accept counter pickup.', $correlationId, status: 403);
            }
            $this->assertWorkNotHeld($work, $correlationId);
            $this->workGates->assertWorkCanAdvance((string) $transfer->work_instance_id, $correlationId);
            if ($transfer->transfer_mode === 'courier_delivery') {
                $this->assertDealChainCourierGate($order, $actorId, $correlationId);
            }

            $proof = $this->validatePhaseProof(
                $work,
                2,
                $actorId,
                $nodeId,
                $expectedWorkVersion,
                $evidenceId,
                $proofPayload,
                $correlationId,
            );
            if ($proof === null) {
                $this->assertCleanOrderEvidence((string) $work->id, $evidenceId, $correlationId);
            }
            $stockFulfillment = null;
            $stockReservationId = null;
            $stockCommandScope = null;
            $stockIdempotencyKey = null;
            if ($this->listingTypeForOrder($orderId, $correlationId) === 'product') {
                $stockReservationId = $this->capacityReservationId($orderId, $correlationId);
                $quantity = $this->orderQuantity($orderId, $correlationId);
                $stockCommandScope = 'order.handoff.fulfillment:'.$orderId;
                $stockIdempotencyKey = 'a4-fulfillment:'.$orderId;
                try {
                    $stockFulfillment = $this->capacity->fulfillForOrder(
                        $stockReservationId,
                        $quantity,
                        $actorId,
                        $stockCommandScope,
                        $stockIdempotencyKey,
                        $correlationId,
                    );
                } catch (KernelException $error) {
                    throw new OrderError(
                        $error->envelope->code,
                        $error->getMessage(),
                        $correlationId,
                        status: $error->status,
                        fieldErrors: $error->envelope->fieldErrors,
                        retryable: $error->envelope->retryable,
                    );
                }
            }
            $now = now();
            DB::table('order_handoff_transfers')->where('id', $transferId)->update([
                'status' => 'departed', 'departed_by_user_id' => $actorId, 'custody_evidence_file_id' => $evidenceId,
                'accept_idempotency_key' => $idempotencyKey, 'departed_at' => $now,
                'version' => DB::raw('version + 1'), 'updated_at' => $now,
            ]);
            $structure = $this->completeA4Phase($work, 2, $actorId, $proof, $now, $correlationId);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'in_progress',
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'version' => DB::raw('version + 1'),
                'row_version' => DB::raw('row_version + 1'),
                'updated_at' => $now,
            ]);
            $proofEvent = $this->proofEventPayload($proof);
            $this->writeWorkEvent((string) $transfer->work_instance_id, 'custody_accepted', 'custody_departed', $actorId, $evidenceId, $correlationId, $now, (string) $transfer->id, $proofEvent);
            $stockProvenance = [
                'stock_fulfilled' => $stockFulfillment !== null,
                'stock_reservation_id' => is_array($stockFulfillment) && is_string($stockFulfillment['reservation_id'] ?? null)
                    ? $stockFulfillment['reservation_id']
                    : null,
                'stock_movement_command_scope' => $stockCommandScope,
                'stock_movement_idempotency_key' => $stockIdempotencyKey,
                'stock_fulfilled_quantity' => (int) ($stockFulfillment['fulfilled_quantity'] ?? 0),
                'stock_remaining_quantity' => is_array($stockFulfillment) ? (int) ($stockFulfillment['remaining_quantity'] ?? 0) : null,
                'stock_fulfillment_replay' => (bool) ($stockFulfillment['replay'] ?? false),
            ];
            $departureFact = [
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'handoff_transfer_id' => (string) $transfer->id,
                'transfer_mode' => (string) $transfer->transfer_mode,
                'departed_by_user_id' => $actorId,
                'custody_recipient_user_id' => (string) $transfer->offered_to_user_id,
                'work_version' => (int) $work->version,
                'resulting_work_version' => (int) $work->version + 1,
                'transfer_version' => (int) $expectedTransferVersion + 1,
                ...$stockProvenance,
                ...$proofEvent,
            ];
            $auditId = $this->audits->record(
                action: 'order.handoff.custody_departure',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorId),
                commandName: 'A4HandoffService::acceptCustody',
                expectedVersion: $expectedTransferVersion,
                previous: ['status' => 'offered'],
                next: ['status' => 'departed', 'transfer_id' => $transferId, 'transfer_mode' => (string) $transfer->transfer_mode, ...$stockProvenance, ...$proofEvent],
                reason: 'Named courier or counter pickup buyer accepted physical custody.',
                orderId: $orderId,
            );
            // Custody departure is persisted separately from customer receipt or a delivery-signed fact.
            $this->outbox->enqueue(
                eventType: 'work.custody_departed',
                aggregateType: 'work_instance',
                aggregateId: (string) $work->id,
                payload: $departureFact,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );

            return $this->result(DB::table('order_handoff_transfers')->where('id', $transferId)->first(), false);
        });
    }

    /** @return array<string, mixed> */
    public function recordReceipt(
        string $orderId,
        string $actorId,
        string $evidenceId,
        string $idempotencyKey,
        int $expectedTransferVersion,
        string $correlationId,
        ?int $expectedWorkVersion = null,
        ?string $nodeId = null,
        array $proofPayload = [],
        ?string $challengeId = null,
        ?string $code = null,
    ): array {
        $challengeFailure = null;
        $result = DB::transaction(function () use ($orderId, $actorId, $evidenceId, $idempotencyKey, $expectedTransferVersion, $correlationId, $expectedWorkVersion, $nodeId, $proofPayload, $challengeId, $code, &$challengeFailure): array {
            $order = $this->lockA4Order($orderId, $correlationId);
            $work = $this->lockA4Work($orderId, $correlationId);
            $transfer = DB::table('order_handoff_transfers')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($transfer === null) {
                throw new OrderError('INVALID_STATE', 'No custody transfer exists for this order.', $correlationId, status: 409);
            }
            if ((string) ($transfer->receipt_idempotency_key ?? '') === $idempotencyKey && (string) $transfer->received_by_user_id === $actorId) {
                if ((string) $transfer->receipt_evidence_file_id !== $evidenceId) {
                    throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for different receipt evidence.', $correlationId, status: 409);
                }
                $this->assertReplayProofMatches($work, 3, $nodeId, $expectedWorkVersion, $evidenceId, $proofPayload, $challengeId, $correlationId);

                return $this->result($transfer, true);
            }
            if ((string) $transfer->status !== 'departed' || (int) $transfer->version !== $expectedTransferVersion) {
                throw new OrderError('VERSION_CONFLICT', 'Receipt is available only after custody departure. Refresh and try again.', $correlationId, status: 409);
            }
            $recipientId = $this->finalRecipientId($orderId, (string) $order->buyer_user_id);
            $isCourierReceipt = $transfer->transfer_mode === 'courier_delivery' && (string) $transfer->offered_to_user_id === $actorId;
            if ($actorId !== $recipientId || $actorId === (string) $order->provider_user_id || $isCourierReceipt) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the named final recipient can confirm receipt.', $correlationId, status: 403);
            }
            $this->assertWorkNotHeld($work, $correlationId);
            $this->workGates->assertWorkCanAdvance((string) $transfer->work_instance_id, $correlationId);
            $proof = $this->validatePhaseProof(
                $work,
                3,
                $actorId,
                $nodeId,
                $expectedWorkVersion,
                $evidenceId,
                $proofPayload,
                $correlationId,
            );
            if ($proof === null) {
                $this->assertCleanOrderEvidence((string) $work->id, $evidenceId, $correlationId);
            }
            $structure = $this->decodeStructure($work->structure);
            $receiptNode = $this->nodeForOrdinal($structure, 3);
            $challengeRequired = $receiptNode !== null && $this->requiresDropoffChallenge($receiptNode);
            $challengeOutcome = null;
            if ($challengeRequired) {
                if ($proof === null || $nodeId === null || $expectedWorkVersion === null || ! is_string($challengeId) || $challengeId === '' || ! is_string($code) || $code === '') {
                    throw new OrderError('CHALLENGE_REQUIRED', 'The current recipient must verify the assigned worker’s six-digit receipt code.', $correlationId, status: 409);
                }
                $challengeOutcome = $this->clearanceChallenges->consumeForA4Receipt(
                    orderId: $orderId,
                    actorId: $actorId,
                    nodeId: $nodeId,
                    challengeId: $challengeId,
                    code: $code,
                    expectedWorkVersion: $expectedWorkVersion,
                    transferId: (string) $transfer->id,
                    correlationId: $correlationId,
                );
                if (isset($challengeOutcome['error'])) {
                    $challengeFailure = $challengeOutcome['error'];

                    return $this->result($transfer, false);
                }
                $proof['payload']['a4_proof_metadata'] = [
                    ...$proof['payload']['a4_proof_metadata'],
                    'challenge_id' => $challengeOutcome['challenge_id'],
                    'challenge_kind' => $challengeOutcome['kind'],
                    'authorized_by_user_id' => $challengeOutcome['issuer_user_id'],
                    'verified_by_user_id' => $challengeOutcome['verifier_user_id'],
                ];
            } elseif (($challengeId !== null && $challengeId !== '') || ($code !== null && $code !== '')) {
                throw new OrderError('INVALID_CLEARANCE_CHALLENGE', 'This A4 receipt node does not accept a clearance code.', $correlationId, status: 422);
            }

            $now = now();
            $structure = $this->completeA4Phase($work, 3, $actorId, $proof, $now, $correlationId);
            DB::table('order_handoff_transfers')->where('id', $transfer->id)->update([
                'status' => 'received', 'received_by_user_id' => $actorId, 'receipt_evidence_file_id' => $evidenceId,
                'receipt_idempotency_key' => $idempotencyKey, 'received_at' => $now,
                'version' => DB::raw('version + 1'), 'updated_at' => $now,
            ]);
            DB::table('work_instances')->where('id', $work->id)->update([
                'status' => 'completed',
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'completed_at' => $now,
                'version' => DB::raw('version + 1'),
                'row_version' => DB::raw('row_version + 1'),
                'updated_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update(['status' => 'completed', 'completed_at' => $now, 'version' => DB::raw('version + 1'), 'updated_at' => $now]);
            $this->payments->markDueFromWorkFact($orderId, (string) $work->id, $correlationId);

            $proofEvent = $this->proofEventPayload($proof);
            $completionEvent = [
                ...$proofEvent,
                'node_id' => (string) ($receiptNode['id'] ?? $nodeId ?? ''),
                'node_ordinal' => 3,
                'work_version' => (int) $work->version,
                'completed_work_version' => (int) $work->version + 1,
                'final_signoff' => true,
                'completion_actor_user_id' => $actorId,
                'milestone' => 'customer_receipt',
                'recipient_user_id' => $actorId,
            ];
            if (is_array($challengeOutcome) && ($challengeOutcome['ok'] ?? false) === true) {
                $completionEvent += [
                    'challenge_id' => $challengeOutcome['challenge_id'],
                    'challenge_kind' => $challengeOutcome['kind'],
                    'authorized_by_user_id' => $challengeOutcome['issuer_user_id'],
                    'verified_by_user_id' => $challengeOutcome['verifier_user_id'],
                ];
            }
            $this->writeWorkEvent(
                (string) $work->id,
                'customer_receipt',
                'delivered_to_site',
                $actorId,
                $evidenceId,
                $correlationId,
                $now,
                (string) $transfer->id,
                $completionEvent,
            );
            $this->writeWorkEvent(
                (string) $work->id,
                'completed',
                'completed',
                $actorId,
                $evidenceId,
                $correlationId,
                $now,
                (string) $transfer->id,
                $completionEvent,
            );
            $auditId = $this->audits->record(
                action: 'order.handoff.receipt',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorId),
                commandName: 'A4HandoffService::recordReceipt',
                previous: ['status' => 'departed'],
                next: ['status' => 'received', 'transfer_id' => (string) $transfer->id, 'order_status' => 'completed', ...$completionEvent],
                reason: 'Named final recipient confirmed physical goods receipt.',
                orderId: $orderId,
            );
            $this->outbox->enqueue(
                eventType: 'work.completed',
                aggregateType: 'work_instance',
                aggregateId: (string) $work->id,
                payload: [
                    'order_id' => $orderId,
                    'work_instance_id' => (string) $work->id,
                    'handoff_transfer_id' => (string) $transfer->id,
                    'transfer_mode' => (string) $transfer->transfer_mode,
                    ...$completionEvent,
                ],
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $this->outbox->enqueue(
                eventType: 'work.delivered_to_site',
                aggregateType: 'work_instance',
                aggregateId: (string) $work->id,
                payload: [
                    'order_id' => $orderId,
                    'work_instance_id' => (string) $work->id,
                    'handoff_transfer_id' => (string) $transfer->id,
                    'transfer_mode' => (string) $transfer->transfer_mode,
                    ...$completionEvent,
                ],
                correlationId: $correlationId,
                eventId: (string) Str::uuid7(),
                auditEventId: $auditId,
            );
            $courierWork = $transfer->transfer_mode === 'courier_delivery'
                ? $this->dealChainCourierWork($order, (string) $transfer->departed_by_user_id)
                : null;
            if ($courierWork !== null) {
                $courierWorkRow = DB::table('work_instances')->where('id', $courierWork['work_instance_id'])->first(['status']);
                if ($courierWorkRow !== null) {
                    $this->writeLinkedCourierReceiptEvent(
                        workId: $courierWork['work_instance_id'],
                        previousStatus: (string) $courierWorkRow->status,
                        actorId: $actorId,
                        evidenceId: $evidenceId,
                        correlationId: $correlationId,
                        now: $now,
                        transferId: (string) $transfer->id,
                        receiptOrderId: $orderId,
                        handoffWorkId: (string) $work->id,
                    );
                }
            }
            if ($courierWork !== null) {
                $this->outbox->enqueue(
                    eventType: 'work.delivered_to_site',
                    aggregateType: 'work_instance',
                    aggregateId: $courierWork['work_instance_id'],
                    payload: [
                        'order_id' => $courierWork['order_id'],
                        'work_instance_id' => $courierWork['work_instance_id'],
                        'handoff_transfer_id' => (string) $transfer->id,
                        'handoff_work_instance_id' => (string) $work->id,
                        'receipt_order_id' => $orderId,
                        'transfer_mode' => (string) $transfer->transfer_mode,
                        'milestone' => 'customer_receipt',
                        'recipient_user_id' => $actorId,
                    ],
                    correlationId: $correlationId,
                    eventId: (string) Str::uuid7(),
                    auditEventId: $auditId,
                );
            }

            return $this->result(DB::table('order_handoff_transfers')->where('id', $transfer->id)->first(), false);
        });

        // Commit failed code attempts before surfacing the corresponding receipt error.
        if ($challengeFailure !== null) {
            throw new OrderError(
                (string) $challengeFailure['code'],
                (string) $challengeFailure['message'],
                $correlationId,
                status: (int) $challengeFailure['status'],
            );
        }

        return $result;
    }

    public function canViewAsCurrentPhaseActor(string $orderId, string $actorId, string $correlationId): bool
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        $work = DB::table('work_instances')->where('order_id', $orderId)->where('work_shape', 'A4')->first(['structure']);
        if ($order === null || $work === null) {
            return false;
        }
        $this->listingTypeForOrder($orderId, $correlationId);
        if ($actorId === (string) $order->buyer_user_id || $actorId === (string) $order->provider_user_id) {
            return true;
        }

        $transfer = DB::table('order_handoff_transfers')->where('order_id', $orderId)->first();
        if ($transfer === null) {
            return false;
        }
        foreach ([$transfer->offered_to_user_id, $transfer->departed_by_user_id, $transfer->received_by_user_id] as $participantId) {
            if (is_string($participantId) && $participantId !== '' && $participantId === $actorId) {
                return true;
            }
        }
        if ((string) $transfer->status !== 'departed') {
            return false;
        }

        $recipientId = $this->finalRecipientId($orderId, (string) $order->buyer_user_id);
        if (
            $actorId === $recipientId
            && ! ((string) $transfer->transfer_mode === 'courier_delivery' && (string) $transfer->offered_to_user_id === $actorId)
        ) {
            return true;
        }

        $structure = $this->decodeStructure($work->structure);
        $receiptNode = $this->nodeForOrdinal($structure, 3);
        if ($receiptNode === null || ! $this->requiresDropoffChallenge($receiptNode)) {
            return false;
        }
        $issuerId = $this->dropoffIssuerId($order, $transfer, $orderId);

        return $issuerId !== null && $issuerId !== $recipientId && $actorId === $issuerId;
    }

    public function projectForOrder(string $orderId, string $actorId, string $correlationId): array
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        $work = DB::table('work_instances')->where('order_id', $orderId)->where('work_shape', 'A4')->first();
        $transfer = DB::table('order_handoff_transfers')->where('order_id', $orderId)->first();
        $listingType = $work === null ? null : $this->listingTypeForOrder($orderId, $correlationId);
        $structure = $work === null ? [] : $this->decodeStructure($work->structure);
        $isBuyer = $order !== null && (string) $order->buyer_user_id === $actorId;
        $isProvider = $order !== null && (string) $order->provider_user_id === $actorId;
        $assignedCourier = $transfer !== null && $order !== null && $transfer->offered_to_user_id !== null
            && (string) $transfer->offered_to_user_id === $actorId && $transfer->transfer_mode === 'courier_delivery'
            && $this->isAssignedCourier($order, $orderId, $actorId);
        $canMarkPrepared = $isProvider && $transfer === null && (string) ($order->status ?? '') === 'accepted';
        $canOfferCustody = $isProvider && $transfer !== null && (string) $transfer->status === 'prepared';
        $canAcceptCustody = $transfer !== null && (string) $transfer->status === 'offered'
            && (string) $transfer->offered_to_user_id === $actorId
            && ($transfer->transfer_mode === 'counter_pickup' ? $isBuyer : $assignedCourier);
        $finalRecipient = $order === null ? null : $this->finalRecipientId($orderId, (string) $order->buyer_user_id);
        $canRecordReceipt = $order !== null && $transfer !== null && (string) $transfer->status === 'departed'
            && $finalRecipient === $actorId
            && $actorId !== (string) $order->provider_user_id
            && ! ($transfer->transfer_mode === 'courier_delivery' && (string) $transfer->offered_to_user_id === $actorId);
        $courierCandidates = $order !== null && $isProvider && $transfer !== null && (string) $transfer->status === 'prepared'
            ? $this->courierCandidatesForOrder($order, $orderId)
            : [];

        $proofNode = null;
        if ($work !== null && $order !== null) {
            $phaseOrdinal = null;
            $canManageEvidence = false;
            $allowAwaitingCustomerConfirmation = false;

            if ($canMarkPrepared) {
                $phaseOrdinal = 1;
                $canManageEvidence = true;
            } elseif ($canAcceptCustody) {
                $phaseOrdinal = 2;
                $canManageEvidence = true;
            } elseif ($canRecordReceipt || ($transfer !== null && (string) $transfer->status === 'departed')) {
                $candidate = $this->nodeForOrdinal($structure, 3);
                if (is_array($candidate) && $this->requiresDropoffChallenge($candidate)) {
                    $issuerId = $this->dropoffIssuerId($order, $transfer, $orderId);
                    if ($canRecordReceipt || ($issuerId !== null && $issuerId !== $finalRecipient && $issuerId === $actorId)) {
                        $phaseOrdinal = 3;
                        $canManageEvidence = $canRecordReceipt;
                        $allowAwaitingCustomerConfirmation = true;
                    }
                } elseif ($canRecordReceipt) {
                    $phaseOrdinal = 3;
                    $canManageEvidence = true;
                    $allowAwaitingCustomerConfirmation = true;
                }
            }

            if ($phaseOrdinal !== null) {
                $candidate = $this->nodeForOrdinal($structure, $phaseOrdinal);
                $expectedStatus = $phaseOrdinal === 3 ? 'awaiting_customer_confirmation' : 'active';
                if (is_array($candidate) && ($candidate['status'] ?? null) === $expectedStatus) {
                    $nodes = $this->workEvidence->projectNodes(
                        orderId: $orderId,
                        workInstanceId: (string) $work->id,
                        actorUserId: $actorId,
                        nodes: [$candidate],
                        canViewSubmittedEvidence: $canManageEvidence,
                        canManageEvidence: $canManageEvidence,
                        allowAwaitingCustomerConfirmation: $allowAwaitingCustomerConfirmation,
                        allowNativeA4EvidenceManagement: $canManageEvidence,
                    );
                    $proofNode = $nodes[0] ?? null;
                    if (is_array($proofNode)) {
                        $proofNode['can_issue_challenge'] = false;
                        $proofNode['can_verify_challenge'] = false;
                        $proofNode['pending_challenge'] = null;
                        if ($phaseOrdinal === 3 && $this->requiresDropoffChallenge($candidate)) {
                            $signature = $structure['signature_hash'] ?? null;
                            $proofNode = $this->clearanceChallenges->projectNode(
                                orderId: $orderId,
                                actorUserId: $actorId,
                                workVersion: (int) $work->version,
                                workSignature: is_string($signature) ? $signature : '',
                                node: $proofNode,
                            );
                        }
                    }
                }
            }
        }

        return [
            'enabled' => $work !== null,
            'listingType' => $listingType,
            'status' => $transfer?->status ?? 'not_prepared',
            'transfer' => $transfer === null ? null : $this->result($transfer, false),
            'couriers' => $courierCandidates,
            'canMarkPrepared' => $canMarkPrepared,
            'canOfferCustody' => $canOfferCustody,
            'canAcceptCustody' => $canAcceptCustody,
            'canRecordReceipt' => $canRecordReceipt,
            'workVersion' => $work === null ? null : (int) $work->version,
            'proofNode' => $proofNode,
        ];
    }

    private function lockA4Order(string $orderId, string $correlationId): object
    {
        $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
        if ($order === null) {
            throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
        }

        return $order;
    }

    private function lockA4Work(string $orderId, string $correlationId): object
    {
        $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
        if ($work === null || (string) $work->work_shape !== 'A4') {
            throw new OrderError('INVALID_ORDER_SHAPE', 'This custody protocol is only available for A4 product or courier-service orders.', $correlationId, status: 409);
        }
        $this->listingTypeForOrder($orderId, $correlationId);

        return $work;
    }

    private function assertWorkNotHeld(object $work, string $correlationId): void
    {
        if ($this->administrativeHolds->hasActiveHold('work_instance', (string) $work->id)) {
            throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Work instance has an active administrative hold.', $correlationId, status: 409);
        }
    }

    /**
     * @param  array<string, mixed>  $proofPayload
     * @return array{node: array<string, mixed>, payload: array<string, mixed>}|null
     */
    private function validatePhaseProof(
        object $work,
        int $ordinal,
        string $actorId,
        ?string $nodeId,
        ?int $expectedWorkVersion,
        string $evidenceId,
        array $proofPayload,
        string $correlationId,
    ): ?array {
        $requiresAuthoredContext = (int) ($work->payload_schema_version ?? 1) >= 2;
        if (! $requiresAuthoredContext && $nodeId === null && $expectedWorkVersion === null) {
            if ($proofPayload !== []) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'This photo-only A4 contract does not accept additional authored proof fields.', $correlationId, status: 422);
            }

            return null;
        }
        if (! is_string($nodeId) || $nodeId === '' || $expectedWorkVersion === null) {
            throw new OrderError('WORK_PROOF_CONTEXT_REQUIRED', 'Submit the current A4 node ID and Work version with its proof.', $correlationId, status: 422);
        }
        if ($expectedWorkVersion !== (int) $work->version) {
            throw new OrderError('VERSION_CONFLICT', 'Work changed. Refresh before submitting A4 proof.', $correlationId, status: 409);
        }

        $structure = $this->decodeStructure($work->structure);
        $node = $this->nodeForOrdinal($structure, $ordinal);
        if ($node === null || (string) ($node['id'] ?? '') !== $nodeId) {
            throw new OrderError('WORK_NODE_MISMATCH', 'The submitted proof does not match the current governed A4 node.', $correlationId, status: 409);
        }
        $expectedStatus = $ordinal === 3 ? 'awaiting_customer_confirmation' : 'active';
        if (($node['status'] ?? null) !== $expectedStatus) {
            throw new OrderError('INVALID_STATE', 'This A4 Work node is not the active proof phase.', $correlationId, status: 409);
        }
        $signature = $structure['signature_hash'] ?? null;
        if (! is_string($signature) || trim($signature) === '') {
            throw new OrderError('WORK_SIGNATURE_UNAVAILABLE', 'The accepted Work signature is unavailable.', $correlationId, status: 409);
        }
        if (array_key_exists('evidence_file_id', $proofPayload) || array_key_exists('evidence_file_ids', $proofPayload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'Attach the native photo through evidence_file_id.', $correlationId, status: 422);
        }

        $proofNode = $node;
        $requiredProofs = (array) ($node['required_proofs'] ?? []);
        foreach ([
            'photo_proof' => true,
            'checklist_steps' => ! empty($node['checklist_items']),
            'metric_reading' => ! empty($node['metric_requirements']),
        ] as $tool => $required) {
            if ($required && ! in_array($tool, $requiredProofs, true)) {
                $requiredProofs[] = $tool;
            }
        }
        $proofNode['required_proofs'] = $requiredProofs;
        $submitted = [...$proofPayload, 'evidence_file_ids' => [$evidenceId]];
        $validatedPayload = $this->workExecution->validateAuthoredNodeEvidence(
            $work,
            $proofNode,
            $actorId,
            $submitted,
            $correlationId,
        );
        $fingerprint = $this->proofFingerprint($evidenceId, $proofPayload);
        $validatedPayload['a4_proof_metadata'] = [
            'node_id' => $nodeId,
            'node_ordinal' => $ordinal,
            'work_signature' => $signature,
            'work_version' => $expectedWorkVersion,
            'request_fingerprint' => $fingerprint,
            'challenge_id' => null,
        ];

        return ['node' => $node, 'payload' => $validatedPayload];
    }

    /**
     * @param  array<string, mixed>  $proofPayload
     */
    private function assertReplayProofMatches(
        object $work,
        int $ordinal,
        ?string $nodeId,
        ?int $expectedWorkVersion,
        string $evidenceId,
        array $proofPayload,
        ?string $challengeId,
        string $correlationId,
    ): void {
        $structure = $this->decodeStructure($work->structure);
        $node = $this->nodeForOrdinal($structure, $ordinal);
        $metadata = is_array($node['evidence_payload']['a4_proof_metadata'] ?? null)
            ? $node['evidence_payload']['a4_proof_metadata']
            : null;
        $requiresAuthoredContext = (int) ($work->payload_schema_version ?? 1) >= 2;
        if (! $requiresAuthoredContext && $nodeId === null && $expectedWorkVersion === null && $proofPayload === []) {
            if ($metadata !== null) {
                throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use the original A4 Work node and version for this idempotent request.', $correlationId, status: 409);
            }

            return;
        }
        if (! is_string($nodeId) || $nodeId === '' || $expectedWorkVersion === null) {
            throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use the original A4 Work node and version for this idempotent request.', $correlationId, status: 409);
        }
        $signature = $structure['signature_hash'] ?? null;
        if (
            $node === null
            || (string) ($node['id'] ?? '') !== $nodeId
            || $metadata === null
            || (string) ($metadata['node_id'] ?? '') !== $nodeId
            || (int) ($metadata['work_version'] ?? 0) !== $expectedWorkVersion
            || ! is_string($signature)
            || ! hash_equals((string) ($metadata['work_signature'] ?? ''), $signature)
            || ! hash_equals((string) ($metadata['request_fingerprint'] ?? ''), $this->proofFingerprint($evidenceId, $proofPayload))
            || (($metadata['challenge_id'] ?? null) === null ? $challengeId !== null && $challengeId !== '' : (string) $metadata['challenge_id'] !== (string) $challengeId)
        ) {
            throw new OrderError('IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for different A4 proof.', $correlationId, status: 409);
        }
    }

    /** @param array<string, mixed> $structure */
    private function nodeForOrdinal(array $structure, int $ordinal): ?array
    {
        $match = null;
        foreach ((array) ($structure['nodes'] ?? []) as $node) {
            if (! is_array($node) || (int) ($node['ordinal'] ?? 0) !== $ordinal) {
                continue;
            }
            if ($match !== null) {
                return null;
            }
            $match = $node;
        }

        return $match;
    }

    /**
     * @param  array<string, mixed>  $proof
     * @return array<string, mixed>
     */
    private function completeA4Phase(object $work, int $ordinal, string $actorId, ?array $proof, mixed $now, string $correlationId): array
    {
        $structure = $this->decodeStructure($work->structure);
        $nodes = (array) ($structure['nodes'] ?? []);
        $targetIndex = null;
        foreach ($nodes as $index => $node) {
            if (is_array($node) && (int) ($node['ordinal'] ?? 0) === $ordinal) {
                if ($targetIndex !== null) {
                    throw new OrderError('INVALID_WORK_SPECIFICATION', 'The A4 Work phase is ambiguous.', $correlationId, status: 409);
                }
                $targetIndex = $index;
            }
        }
        if ($targetIndex === null) {
            if ((int) ($work->payload_schema_version ?? 1) >= 2) {
                throw new OrderError('WORK_NODE_MISMATCH', 'The accepted A4 Work phase is missing.', $correlationId, status: 409);
            }

            return $structure;
        }

        $node = $nodes[$targetIndex];
        $timestamp = $now->toIso8601String();
        $node['status'] = 'completed';
        $node['completed_at'] = $timestamp;
        $node['completed_by_user_id'] = $actorId;
        if ($ordinal === 3) {
            $node['customer_confirmed_at'] = $timestamp;
        }
        if ($proof !== null) {
            $node['evidence_payload'] = $proof['payload'];
        }
        $nodes[$targetIndex] = $node;

        $nextIndex = null;
        foreach ($nodes as $index => $candidate) {
            if (is_array($candidate) && (int) ($candidate['ordinal'] ?? 0) === $ordinal + 1) {
                if ($nextIndex !== null) {
                    throw new OrderError('INVALID_WORK_SPECIFICATION', 'The next A4 Work phase is ambiguous.', $correlationId, status: 409);
                }
                $nextIndex = $index;
            }
        }
        if ($nextIndex !== null) {
            $next = $nodes[$nextIndex];
            $next['status'] = $ordinal === 2 ? 'awaiting_customer_confirmation' : 'active';
            $nodes[$nextIndex] = $next;
            $structure['active_node_id'] = (string) ($next['id'] ?? '');
            $structure['active_ordinal'] = $ordinal + 1;
            $structure['pending_customer_confirmation'] = $ordinal === 2;
        } else {
            $structure['active_node_id'] = (string) ($node['id'] ?? '');
            $structure['active_ordinal'] = $ordinal;
            $structure['pending_customer_confirmation'] = false;
        }
        $structure['nodes'] = $nodes;

        return $structure;
    }

    /** @param array<string, mixed>|null $proof */
    private function proofEventPayload(?array $proof): array
    {
        if ($proof === null) {
            return [];
        }
        $metadata = (array) ($proof['payload']['a4_proof_metadata'] ?? []);

        return [
            'node_id' => (string) ($metadata['node_id'] ?? ''),
            'node_ordinal' => (int) ($metadata['node_ordinal'] ?? 0),
            'work_signature' => (string) ($metadata['work_signature'] ?? ''),
            'work_version' => (int) ($metadata['work_version'] ?? 0),
            'proof_fingerprint' => (string) ($metadata['request_fingerprint'] ?? ''),
        ];
    }

    /** @param array<string, mixed> $proofPayload */
    private function proofFingerprint(string $evidenceId, array $proofPayload): string
    {
        return hash('sha256', json_encode([
            'evidence_file_id' => $evidenceId,
            'proof' => $this->canonicalizeProof($proofPayload),
        ], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
    }

    private function canonicalizeProof(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->canonicalizeProof($item), $value);
        }
        ksort($value);

        foreach ($value as $key => $item) {
            $value[$key] = $this->canonicalizeProof($item);
        }

        return $value;
    }

    /** @param array<string, mixed> $node */
    private function requiresDropoffChallenge(array $node): bool
    {
        return ($node['approval_method'] ?? null) === 'worker_dropoff'
            || ($node['handoff_party'] ?? null) === 'worker_dropoff';
    }

    private function dropoffIssuerId(object $order, ?object $transfer, string $orderId): ?string
    {
        if ($transfer === null) {
            return null;
        }
        if ((string) $transfer->transfer_mode === 'counter_pickup') {
            return (string) $order->provider_user_id;
        }
        if ((string) $transfer->transfer_mode !== 'courier_delivery') {
            return null;
        }

        $courierId = (string) ($transfer->departed_by_user_id ?? '');

        return $courierId !== '' && $this->isAssignedCourier($order, $orderId, $courierId)
            ? $courierId
            : null;
    }

    /** @return array<string, mixed> */
    private function decodeStructure(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function assertDealChainCourierGate(object $productOrder, string $courierUserId, string $correlationId): void
    {
        if (! is_string($productOrder->deal_chain_id ?? null) || ! is_string($productOrder->deal_need_id ?? null)) {
            return;
        }

        foreach ($this->courierAuthority->activeCourierCandidatesForProductNeed(
            (string) $productOrder->deal_chain_id,
            (string) $productOrder->deal_need_id,
        ) as $candidate) {
            if ($candidate['user_id'] !== $courierUserId) {
                continue;
            }
            $courierWorkId = DB::table('work_instances')->where('order_id', $candidate['order_id'])->value('id');
            if (! is_string($courierWorkId)) {
                throw new KernelException(
                    'PREDECESSOR_GATE_BLOCKED',
                    'The assigned courier has no current Work instance for this Deal Chain pickup.',
                    $correlationId,
                    status: 409,
                );
            }
            $this->workGates->assertWorkCanAdvance($courierWorkId, $correlationId);

            return;
        }
    }

    /** @return array{order_id: string, work_instance_id: string}|null */
    private function dealChainCourierWork(object $productOrder, string $courierUserId): ?array
    {
        if (! is_string($productOrder->deal_chain_id ?? null) || ! is_string($productOrder->deal_need_id ?? null)) {
            return null;
        }

        foreach ($this->courierAuthority->activeCourierCandidatesForProductNeed(
            (string) $productOrder->deal_chain_id,
            (string) $productOrder->deal_need_id,
        ) as $candidate) {
            if ($candidate['user_id'] !== $courierUserId) {
                continue;
            }
            $workId = DB::table('work_instances')->where('order_id', $candidate['order_id'])->value('id');
            if (is_string($workId)) {
                return ['order_id' => $candidate['order_id'], 'work_instance_id' => $workId];
            }
        }

        return null;
    }

    private function isAssignedCourier(object $order, string $orderId, string $courierId): bool
    {
        $activeParty = DB::table('order_parties')->where('order_id', $orderId)->where('user_id', $courierId)->where('status', 'active')
            ->where(function ($query): void {
                $query->where('party_type', 'courier')->orWhereIn('responsibility', ['courier', 'delivery']);
            })->exists();
        if ($activeParty) {
            return true;
        }

        return is_string($order->deal_chain_id ?? null)
            && $order->deal_chain_id !== ''
            && is_string($order->deal_need_id ?? null)
            && $order->deal_need_id !== ''
            && $this->courierAuthority->isAuthorizedCourier((string) $order->deal_chain_id, (string) $order->deal_need_id, $courierId);
    }

    /**
     * @return list<array{id: string, label: string, public_reference: string|null}>
     */
    private function courierCandidatesForOrder(object $order, string $orderId): array
    {
        $partyCandidateIds = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('status', 'active')
            ->where('user_id', '!=', (string) $order->provider_user_id)
            ->where('user_id', '!=', (string) $order->buyer_user_id)
            ->where(function ($query): void {
                $query->where('party_type', 'courier')->orWhereIn('responsibility', ['courier', 'delivery']);
            })
            ->orderBy('user_id')
            ->pluck('user_id')
            ->map(static fn (mixed $userId): string => (string) $userId)
            ->all();

        $dealCandidates = [];
        if (
            is_string($order->deal_chain_id ?? null) && $order->deal_chain_id !== ''
            && is_string($order->deal_need_id ?? null) && $order->deal_need_id !== ''
        ) {
            $dealCandidates = $this->courierAuthority->activeCourierCandidatesForProductNeed(
                (string) $order->deal_chain_id,
                (string) $order->deal_need_id,
            );
        }
        $displayNames = $this->participantNames->displayNamesFor(array_values(array_unique([
            ...$partyCandidateIds,
            ...array_column($dealCandidates, 'user_id'),
        ])));

        $candidates = [];
        foreach ($partyCandidateIds as $userId) {
            $candidates[$userId] = [
                'id' => $userId,
                'label' => $displayNames[$userId] ?? 'Assigned courier',
                'public_reference' => null,
            ];
        }
        foreach ($dealCandidates as $candidate) {
            $userId = $candidate['user_id'];
            $candidates[$userId] ??= [
                'id' => $userId,
                'label' => $displayNames[$userId] ?? 'Courier · '.$candidate['public_reference'],
                'public_reference' => $candidate['public_reference'],
            ];
        }

        return array_values($candidates);
    }

    private function listingTypeForOrder(string $orderId, string $correlationId): string
    {
        $snapshot = DB::table('orders')
            ->join('order_terms_snapshots', 'order_terms_snapshots.id', '=', 'orders.current_terms_snapshot_id')
            ->where('orders.id', $orderId)
            ->first(['order_terms_snapshots.scope']);
        $scope = is_array($snapshot?->scope) ? $snapshot->scope : json_decode((string) ($snapshot?->scope ?? '{}'), true);
        $listingType = is_array($scope) ? (string) ($scope['listing_type'] ?? '') : '';
        if (! in_array($listingType, ['product', 'service'], true)) {
            throw new OrderError('INVALID_ORDER_TERMS', 'The accepted order does not identify a supported product or courier-service handoff.', $correlationId, status: 409);
        }

        return $listingType;
    }

    private function finalRecipientId(string $orderId, string $buyerId): string
    {
        $recipient = DB::table('order_parties')->where('order_id', $orderId)->where('status', 'active')->where('party_type', 'recipient')->where('responsibility', 'final_recipient')->value('user_id');

        return is_string($recipient) ? $recipient : $buyerId;
    }

    private function assertCleanOrderEvidence(string $workId, string $evidenceId, string $correlationId): void
    {
        $event = DB::table('work_events')->where('work_instance_id', $workId)->where('event_type', 'work.evidence.uploaded')->where('evidence_file_id', $evidenceId)->exists();
        $file = DB::table('evidence_files')->where('id', $evidenceId)->where('evidence_type', 'work_node_photo_proof')->where('data_class', 'WORK_EXECUTION')->where('scan_status', 'clean')->whereNull('deleted_at')->first();
        $held = DB::table('retention_holds')->where('evidence_file_id', $evidenceId)->where('status', 'active')->where(function ($query): void {
            $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->exists();
        if (! $event || $file === null || $held) {
            throw new OrderError('CLEAN_HANDOFF_EVIDENCE_REQUIRED', 'Use clean, scanned and available Work evidence for this handoff.', $correlationId, status: 422);
        }

    }

    private function capacityReservationId(string $orderId, string $correlationId): string
    {
        $id = DB::table('order_proposals')->where('order_id', $orderId)->where('status', 'accepted')->orderByDesc('proposal_version')->value('capacity_reservation_id');
        if (! is_string($id) || $id === '') {
            throw new OrderError('CAPACITY_RESERVATION_MISSING', 'This order has no committed stock reservation.', $correlationId, status: 409);
        }

        return $id;
    }

    private function orderQuantity(string $orderId, string $correlationId): int
    {
        $snapshot = DB::table('order_terms_snapshots')->where('order_id', $orderId)->orderByDesc('snapshot_version')->first();
        $scope = is_array($snapshot?->scope) ? $snapshot->scope : json_decode((string) ($snapshot?->scope ?? '{}'), true);
        $quantity = is_array($scope) ? (int) ($scope['quantity'] ?? 0) : 0;
        if ($quantity < 1) {
            throw new OrderError('INVALID_ORDER_QUANTITY', 'The accepted order quantity is not valid.', $correlationId, status: 409);
        }

        return $quantity;
    }

    private function writeWorkEvent(string $workId, string $action, string $fact, string $actorId, ?string $evidenceId, string $correlationId, mixed $now, ?string $transferId = null, array $milestone = []): void
    {
        DB::table('work_events')->insert([
            'id' => (string) Str::uuid7(), 'work_instance_id' => $workId, 'previous_status' => $action === 'prepared' ? 'not_started' : 'in_progress',
            'new_status' => $action === 'completed' || $action === 'customer_receipt' ? 'completed' : 'in_progress', 'event_type' => 'work.'.$fact, 'event_version' => 1,
            'actor_user_id' => $actorId, 'evidence_file_id' => $evidenceId,
            'payload' => json_encode(['action' => $action, 'handoff_transfer_id' => $transferId, ...$milestone], JSON_THROW_ON_ERROR), 'payload_version' => 1,
            'idempotency_key' => 'a4-'.$action.'-'.$workId.'-'.($transferId ?? 'prepared'), 'correlation_id' => $correlationId,
            'occurred_at' => $now, 'effective_at' => $now, 'created_at' => $now,
        ]);
    }

    private function writeLinkedCourierReceiptEvent(
        string $workId,
        string $previousStatus,
        string $actorId,
        string $evidenceId,
        string $correlationId,
        mixed $now,
        string $transferId,
        string $receiptOrderId,
        string $handoffWorkId,
    ): void {
        DB::table('work_events')->insert([
            'id' => (string) Str::uuid7(),
            'work_instance_id' => $workId,
            'previous_status' => $previousStatus,
            'new_status' => $previousStatus,
            'event_type' => 'work.delivered_to_site',
            'event_version' => 1,
            'actor_user_id' => $actorId,
            'evidence_file_id' => $evidenceId,
            'payload' => json_encode([
                'action' => 'customer_receipt',
                'handoff_transfer_id' => $transferId,
                'handoff_work_instance_id' => $handoffWorkId,
                'receipt_order_id' => $receiptOrderId,
                'milestone' => 'customer_receipt',
                'recipient_user_id' => $actorId,
            ], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'a4-linked-customer-receipt-'.$workId.'-'.$transferId,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);
    }

    /** @return array<string, mixed> */
    private function result(object $transfer, bool $replay): array
    {
        return [
            'id' => (string) $transfer->id,
            'status' => (string) $transfer->status,
            'mode' => $transfer->transfer_mode === null ? null : (string) $transfer->transfer_mode,
            'offered_to_user_id' => $transfer->offered_to_user_id === null ? null : (string) $transfer->offered_to_user_id,
            'version' => (int) $transfer->version,
            'prepared_at' => (string) $transfer->prepared_at,
            'offered_at' => $transfer->offered_at === null ? null : (string) $transfer->offered_at,
            'departed_at' => $transfer->departed_at === null ? null : (string) $transfer->departed_at,
            'received_at' => $transfer->received_at === null ? null : (string) $transfer->received_at,
            'replay' => $replay,
        ];
    }
}

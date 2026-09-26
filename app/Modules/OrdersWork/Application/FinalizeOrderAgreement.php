<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class FinalizeOrderAgreement
{
    public function __construct(
        private readonly OrderListingSourcePort $listings,
        private readonly OrderCapacityPort $capacity,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly WorkContractRegistry $workRegistry,
        private readonly OrderPaymentObligationPort $payments,
        private readonly WorkExecutionService $workExecution,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(
        string $actorUserId,
        string $orderId,
        int $expectedOrderVersion,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        $this->assertStorage($correlationId);
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new OrderError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }

        return DB::transaction(function () use (
            $actorUserId,
            $orderId,
            $expectedOrderVersion,
            $idempotencyKey,
            $correlationId,
        ): array {
            $orderSnapshot = DB::table('orders')->where('id', $orderId)->first();
            if ($orderSnapshot === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }

            $buyerId = (string) $orderSnapshot->buyer_user_id;
            $providerId = (string) $orderSnapshot->provider_user_id;
            if ($actorUserId !== $buyerId && $actorUserId !== $providerId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to finalize this order.', $correlationId, status: 403);
            }

            $listingId = (string) $orderSnapshot->listing_id;

            $scope = 'order.finalize:'.$orderId;
            $fingerprint = [
                'operation' => 'order.finalize',
                'order_id' => $orderId,
                'expected_order_version' => $expectedOrderVersion,
            ];

            try {
                $preReplay = $this->idempotency->findSucceededReplay(
                    scope: $scope,
                    key: $idempotencyKey,
                    fingerprint: $fingerprint,
                    actorUserId: $actorUserId,
                    correlationId: $correlationId,
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

            if ($preReplay !== null && $preReplay->isReplay) {
                return is_array($preReplay->replayPayload) ? $preReplay->replayPayload : [];
            }

            $buyerParties = DB::table('order_parties')
                ->where('order_id', $orderId)
                ->where('party_type', 'buyer')
                ->where('status', 'active')
                ->get();

            if ($buyerParties->count() !== 1) {
                throw new OrderError('INVALID_PROPOSAL', 'Exactly one active buyer party is required.', $correlationId, status: 422);
            }

            $buyerParty = $buyerParties->first();
            if ((string) ($buyerParty->responsibility ?? '') !== 'primary') {
                throw new OrderError('INVALID_PROPOSAL', 'The active buyer party must be primary.', $correlationId, status: 422);
            }

            $partyScope = json_decode((string) ($buyerParty->scope ?? '{}'), true);
            if (! is_array($partyScope) || ! isset($partyScope['proposal']) || ! is_array($partyScope['proposal'])) {
                throw new OrderError('INVALID_PROPOSAL', 'Order proposal is missing or invalid.', $correlationId, status: 422);
            }

            $proposal = $partyScope['proposal'];

            if (! isset($proposal['amount_minor']) || ! is_int($proposal['amount_minor']) || $proposal['amount_minor'] < 0) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal amount_minor must be a non-negative integer.', $correlationId, status: 422);
            }
            if (! isset($proposal['currency']) || ! is_string($proposal['currency']) || strlen($proposal['currency']) !== 3) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal currency must be a 3-character string.', $correlationId, status: 422);
            }
            if (! isset($proposal['quantity']) || ! is_int($proposal['quantity']) || $proposal['quantity'] < 1) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal quantity must be a positive integer.', $correlationId, status: 422);
            }
            if (! isset($proposal['listing_version_id']) || ! is_string($proposal['listing_version_id']) || trim($proposal['listing_version_id']) === '') {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal listing_version_id is missing.', $correlationId, status: 422);
            }
            if (! isset($proposal['listing_version_number']) || ! is_int($proposal['listing_version_number']) || $proposal['listing_version_number'] < 1) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal listing_version_number is missing or invalid.', $correlationId, status: 422);
            }

            $amountMinor = $proposal['amount_minor'];
            $currency = $proposal['currency'];
            $quantity = $proposal['quantity'];
            $proposalListingVersionId = $proposal['listing_version_id'];
            $proposalListingVersionNumber = $proposal['listing_version_number'];
            $heldReservationId = $this->normalizeCapacityReservationId($proposal['capacity_reservation_id'] ?? null);

            $source = $this->listings->lockActiveApproved($listingId);
            if ($source === null) {
                throw new OrderError('LISTING_NOT_AVAILABLE', 'That listing is no longer available.', $correlationId, status: 409);
            }

            if ((string) $source['owner_user_id'] !== $providerId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'The listing owner no longer matches this order.', $correlationId, status: 403);
            }

            if (
                (string) $source['listing_version_id'] !== $proposalListingVersionId
                || (int) $source['listing_version_number'] !== $proposalListingVersionNumber
            ) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'This listing changed. Refresh and re-propose before finalizing.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }

            $workShape = (string) ($source['work_shape'] ?? '');
            try {
                $workContract = $this->workRegistry->resolveForWork(
                    shapeCode: $workShape,
                    shapeContractVersion: 1,
                    payloadSchemaVersion: 1,
                    correlationId: $correlationId,
                );
            } catch (WorkContractError $error) {
                throw new OrderError(
                    $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: 422,
                    fieldErrors: $error->envelope->fieldErrors,
                    retryable: $error->envelope->retryable,
                );
            }

            try {
                $capacityReservation = $this->capacity->commitForOrder(
                    listingId: $listingId,
                    listingVersionId: $source['listing_version_id'],
                    orderId: $orderId,
                    quantity: $quantity,
                    commandScope: 'order.finalize.capacity:'.$orderId,
                    idempotencyKey: $idempotencyKey,
                    correlationId: $correlationId,
                    heldReservationId: $heldReservationId,
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
            $capacityReservationId = $capacityReservation['reservation_id'] ?? null;

            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if (
                $order === null
                || (string) $order->listing_id !== $listingId
                || (string) $order->buyer_user_id !== $buyerId
                || (string) $order->provider_user_id !== $providerId
            ) {
                throw new OrderError('VERSION_CONFLICT', 'This order changed. Refresh before finalizing.', $correlationId, status: 409, retryable: true);
            }
            if ((int) $order->version !== $expectedOrderVersion) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'This order changed. Refresh before finalizing.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }
            if ((string) $order->status !== 'pending_acceptance') {
                throw new OrderError('INVALID_STATE', 'Only a pending proposal can be finalized.', $correlationId, status: 409);
            }

            $lockedBuyerParties = DB::table('order_parties')
                ->where('order_id', $orderId)
                ->where('party_type', 'buyer')
                ->where('status', 'active')
                ->lockForUpdate()
                ->get();

            if ($lockedBuyerParties->count() !== 1) {
                throw new OrderError('VERSION_CONFLICT', 'Order buyer party changed. Refresh before finalizing.', $correlationId, status: 409, retryable: true);
            }

            $lockedBuyerParty = $lockedBuyerParties->first();
            if ((string) ($lockedBuyerParty->responsibility ?? '') !== 'primary') {
                throw new OrderError('VERSION_CONFLICT', 'Order buyer party changed. Refresh before finalizing.', $correlationId, status: 409, retryable: true);
            }

            $lockedPartyScope = json_decode((string) ($lockedBuyerParty->scope ?? '{}'), true);
            $lockedProposal = (is_array($lockedPartyScope) && isset($lockedPartyScope['proposal']) && is_array($lockedPartyScope['proposal']))
                ? $lockedPartyScope['proposal']
                : null;

            $lockedHeldReservationId = is_array($lockedProposal)
                ? $this->normalizeCapacityReservationId($lockedProposal['capacity_reservation_id'] ?? null)
                : null;
            if (
                $lockedProposal === null
                || (int) ($lockedProposal['amount_minor'] ?? -1) !== $amountMinor
                || (string) ($lockedProposal['currency'] ?? '') !== $currency
                || (int) ($lockedProposal['quantity'] ?? -1) !== $quantity
                || (string) ($lockedProposal['listing_version_id'] ?? '') !== $proposalListingVersionId
                || (int) ($lockedProposal['listing_version_number'] ?? -1) !== $proposalListingVersionNumber
                || $lockedHeldReservationId !== $heldReservationId
            ) {
                throw new OrderError('VERSION_CONFLICT', 'This proposal changed. Refresh and re-propose before finalizing.', $correlationId, status: 409, retryable: true);
            }
            $selectedLane = (string) ($lockedProposal['lane'] ?? 'external_cash');
            $allowedLanes = ['external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'];
            if (! in_array($selectedLane, $allowedLanes, true)) {
                throw new OrderError(
                    'UNSUPPORTED_PAYMENT_LANE',
                    "Selected payment lane [{$selectedLane}] is not supported.",
                    $correlationId,
                    status: 422,
                );
            }

            try {
                $reservation = $this->idempotency->begin(
                    scope: $scope,
                    key: $idempotencyKey,
                    fingerprint: $fingerprint,
                    correlationId: $correlationId,
                    actorUserId: $actorUserId,
                );
            } catch (KernelException $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
            }

            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }

            $now = now();
            $nextVersion = ((int) $order->version) + 1;

            DB::table('orders')->where('id', $orderId)->update([
                'status' => 'accepted',
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            DB::table('order_terms_snapshots')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => $source['listing_version_id'],
                'source_quote_id' => null,
                'scope' => json_encode([
                    'title' => $source['title'],
                    'description' => $source['description'],
                    'category_code' => $source['category_code'],
                    'listing_type' => $source['listing_type'],
                ], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'payment_lane_options' => json_encode([$selectedLane], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['eligible_after' => 'work_completed'], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $actorUserId,
                'accepted_at' => $now,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);
            $structure = $this->workExecution->initializeStructure($source, $workContract->shapeCode);
            $workId = (string) Str::uuid7();
            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $source['capability_profile_id'] !== '' ? $source['capability_profile_id'] : null,
                'work_shape' => $workContract->shapeCode,
                'shape_contract_version' => $workContract->shapeContractVersion,
                'payload_schema_version' => $workContract->payloadSchemaVersion,
                'row_version' => 1,
                'status' => 'not_started',
                'scheduled_at' => null,
                'started_at' => null,
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'completion_evidence_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $obligationId = $this->payments->createPrimary(
                orderId: $orderId,
                workInstanceId: $workId,
                amountMinor: $amountMinor,
                currency: $currency,
                payerUserId: $buyerId,
                recipientUserId: $providerId,
                correlationId: $correlationId,
                lane: $selectedLane,
            );

            $response = [
                'order_id' => $orderId,
                'status' => 'accepted',
                'version' => $nextVersion,
                'terms_snapshot_version' => 1,
                'work_instance_id' => $workId,
                'payment_obligation_id' => $obligationId,
                'payment_lane' => $selectedLane,
                'listing_version_id' => $source['listing_version_id'],
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'capacity_reservation_id' => $capacityReservationId,
            ];
            ksort($response);

            $auditId = $this->audits->record(
                action: 'order.finalize',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'FinalizeOrderAgreement',
                expectedVersion: $expectedOrderVersion,
                previous: ['status' => 'pending_acceptance', 'version' => $expectedOrderVersion],
                next: $response,
                reason: 'Order agreement finalized',
                orderId: $orderId,
                paymentObligationId: $obligationId,
            );
            $this->outbox->enqueue(
                eventType: 'order.accepted',
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $this->idempotency->succeed(
                row: $reservation->row,
                responsePayload: $response,
                responseEventId: $auditId,
                responseReference: $orderId,
            );

            return $response;
        });
    }

    private function normalizeCapacityReservationId(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function assertStorage(string $correlationId): void
    {
        foreach ([
            'orders',
            'order_parties',
            'order_terms_snapshots',
            'work_instances',
            'payment_obligations',
            'idempotency_keys',
            'audit_events',
            'outbox_messages',
        ] as $table) {
            if (! Schema::hasTable($table)) {
                throw new OrderError('STORAGE_UNAVAILABLE', 'Order storage is unavailable.', $correlationId, status: 503, retryable: true);
            }
        }
    }
}

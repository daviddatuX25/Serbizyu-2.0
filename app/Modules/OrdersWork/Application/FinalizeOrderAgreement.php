<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
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
        private readonly NotificationsPort $notifications,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
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
            $currentProposal = $orderSnapshot->current_proposal_id !== null
                ? DB::table('order_proposals')->where('id', $orderSnapshot->current_proposal_id)->first()
                : null;
            if ($currentProposal === null || (string) $currentProposal->status !== 'proposed') {
                throw new OrderError('INVALID_PROPOSAL', 'There is no current proposal awaiting acceptance.', $correlationId, status: 409);
            }
            if ((string) $currentProposal->proposed_by_user_id === $actorUserId) {
                throw new OrderError('COUNTERPARTY_REQUIRED', 'Only the counterparty to the current proposal can accept it.', $correlationId, status: 403);
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

            $proposal = json_decode((string) $currentProposal->scope, true);
            if (! is_array($proposal)) {
                throw new OrderError('INVALID_PROPOSAL', 'Current proposal terms are invalid.', $correlationId, status: 422);
            }

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
            $unitAmountMinor = $proposal['unit_amount_minor'] ?? null;
            if ($unitAmountMinor !== null && ! is_int($unitAmountMinor)) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal unit_amount_minor must be an integer or null.', $correlationId, status: 422);
            }
            if (is_int($unitAmountMinor) && $amountMinor !== $unitAmountMinor * $quantity) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal total does not match its unit price and quantity.', $correlationId, status: 422);
            }
            $proposalListingVersionNumber = $proposal['listing_version_number'];
            $variantId = isset($proposal['variant_id']) && is_string($proposal['variant_id']) ? $proposal['variant_id'] : null;
            $packageId = isset($proposal['package_id']) && is_string($proposal['package_id']) ? $proposal['package_id'] : null;
            $addonIds = $proposal['addon_ids'] ?? [];
            if (! is_array($addonIds) || array_filter($addonIds, static fn (mixed $id): bool => ! is_string($id)) !== []) {
                throw new OrderError('INVALID_PROPOSAL', 'Proposal addon_ids must be a list of strings.', $correlationId, status: 422);
            }
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
            $sourceTerms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
            $selected = null;
            $selectionField = $variantId !== null ? 'variants' : ($packageId !== null ? 'package_tiers' : null);
            $selectionId = $variantId ?? $packageId;
            if ($selectionField !== null && $selectionId !== null) {
                foreach (($sourceTerms[$selectionField] ?? []) as $option) {
                    if (is_array($option) && (string) ($option['id'] ?? '') === $selectionId) {
                        $selected = $option;
                        break;
                    }
                }
                if ($selected === null) {
                    throw new OrderError('VERSION_CONFLICT', 'The selected listing option is no longer available.', $correlationId, status: 409, retryable: true);
                }
            }
            $addonTotalMinor = 0;
            foreach ($addonIds as $addonId) {
                $addon = null;
                foreach (($sourceTerms['addons'] ?? []) as $candidate) {
                    if (is_array($candidate) && (string) ($candidate['id'] ?? '') === $addonId) {
                        $addon = $candidate;
                        break;
                    }
                }
                if ($addon === null || ($addon['status'] ?? 'available') !== 'available') {
                    throw new OrderError('VERSION_CONFLICT', 'A selected seller add-on is no longer available.', $correlationId, status: 409, retryable: true);
                }
                $role = strtolower((string) ($addon['partner_role'] ?? ''));
                $code = strtolower((string) ($addon['code'] ?? ''));
                if (in_array($role, ['store', 'courier', 'auditor'], true) || in_array($code, ['turnkey_parts', 'safety_audit', 'courier_delivery', 'product_install'], true)) {
                    throw new OrderError('INVALID_PROPOSAL', 'Partner slots are not listing add-ons.', $correlationId, status: 422);
                }
                $addonTotalMinor += (int) ($addon['price_amount_minor'] ?? 0);
            }
            $currentBaseAmount = $selected !== null
                ? (isset($selected['price_amount_minor']) ? (int) $selected['price_amount_minor'] : (int) round((float) ($selected['price'] ?? 0) * 100))
                : (int) ($source['price_amount_minor'] ?? 0);
            if ((string) $currentProposal->kind === 'initial' && $unitAmountMinor !== $currentBaseAmount + $addonTotalMinor) {
                throw new OrderError('INVALID_PROPOSAL', 'The proposed unit price no longer matches the selected listing scope.', $correlationId, status: 409, retryable: true);
            }

            $workShape = (string) ($proposal['work_shape'] ?? $source['work_shape'] ?? '');
            $workSpecification = $proposal['work_specification'] ?? ($source['work_specification'] ?? null);
            $workStages = (array) ($proposal['milestone_stages'] ?? ($source['milestone_stages'] ?? []));
            try {
                $workContract = WorkContractSelector::resolve(
                    $this->workRegistry,
                    $workShape,
                    is_array($workSpecification) ? $workSpecification : null,
                    $workStages,
                    $correlationId,
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
            $workSpecification = is_array($workSpecification) ? $workSpecification : [];
            $workSpecification['shape_contract_version'] = $workContract->shapeContractVersion;
            $workSpecification['payload_schema_version'] = $workContract->payloadSchemaVersion;
            $workSpecification['nodes'] ??= $workStages;
            $source['work_specification'] = $workSpecification;

            try {
                $capacityReservation = $this->capacity->commitForOrder(
                    listingId: $listingId,
                    listingVersionId: $source['listing_version_id'],
                    orderId: $orderId,
                    quantity: $quantity,
                    commandScope: 'order.finalize.capacity:'.$orderId,
                    resourceKey: (string) ($proposal['resource_key'] ?? ''),
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
            if ($this->administrativeHolds->hasActiveHold('order', $orderId)) {
                throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Order agreement has an active administrative hold.', $correlationId, status: 409);
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
            if ((string) $order->status !== 'proposed') {
                throw new OrderError('INVALID_STATE', 'Only a proposed order can be accepted.', $correlationId, status: 409);
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

            $lockedProposalRecord = DB::table('order_proposals')
                ->where('id', $order->current_proposal_id)
                ->lockForUpdate()
                ->first();
            $lockedProposal = $lockedProposalRecord !== null
                ? json_decode((string) $lockedProposalRecord->scope, true)
                : null;
            $lockedHeldReservationId = $this->normalizeCapacityReservationId($lockedProposalRecord?->capacity_reservation_id ?? null);
            if (
                $lockedProposalRecord === null
                || (string) $lockedProposalRecord->status !== 'proposed'
                || (string) $order->current_proposal_id !== (string) $currentProposal->id
                || ! is_array($lockedProposal)
                || ! hash_equals((string) $currentProposal->terms_hash, (string) $lockedProposalRecord->terms_hash)
                || (int) ($lockedProposal['amount_minor'] ?? -1) !== $amountMinor
                || (string) ($lockedProposal['currency'] ?? '') !== $currency
                || (int) ($lockedProposal['quantity'] ?? -1) !== $quantity
                || (string) ($lockedProposal['listing_version_id'] ?? '') !== $proposalListingVersionId
                || (int) ($lockedProposal['listing_version_number'] ?? -1) !== $proposalListingVersionNumber
                || $lockedHeldReservationId !== $heldReservationId
            ) {
                throw new OrderError('VERSION_CONFLICT', 'This proposal changed. Refresh and re-propose before accepting.', $correlationId, status: 409, retryable: true);
            }
            $selectedLane = (string) ($lockedProposal['lane'] ?? 'external_cash');
            $allowedLanes = ['external_cash', 'p2p_transfer', 'protected_digital'];
            if (! in_array($selectedLane, $allowedLanes, true)) {
                throw new OrderError(
                    'UNSUPPORTED_PAYMENT_LANE',
                    "Selected payment lane [{$selectedLane}] is not supported.",
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
            $termsSnapshotId = (string) Str::uuid7();
            $termsScope = [
                'title' => trim((string) ($proposal['title'] ?? $source['title'])),
                'description' => (string) ($proposal['description'] ?? $source['description']),
                'category_code' => (string) ($proposal['category_code'] ?? $source['category_code']),
                'listing_type' => (string) ($proposal['listing_type'] ?? $source['listing_type']),
                'quantity' => $quantity,
                'variant_id' => $variantId,
                'resource_key' => $proposal['resource_key'] ?? null,
                'package_id' => $packageId,
                'deal_chain_combination_id' => $proposal['deal_chain_combination_id'] ?? null,
                'addon_ids' => $addonIds,
                'unit_amount_minor' => $unitAmountMinor,
                'items' => [[
                    'variant_id' => $variantId,
                    'resource_key' => $proposal['resource_key'] ?? null,
                    'package_id' => $packageId,
                    'quantity' => $quantity,
                    'unit_amount_minor' => $unitAmountMinor,
                    'amount_minor' => $amountMinor,
                ]],
                'lane' => $selectedLane,
                'slot' => $proposal['slot'] ?? null,
                'note' => $proposal['note'] ?? null,
                'work_specification' => $workSpecification,
                'milestone_stages' => $workStages,
            ];
            DB::table('order_terms_snapshots')->insert([
                'id' => $termsSnapshotId,
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => $source['listing_version_id'],
                'source_quote_id' => null,
                'scope' => json_encode($termsScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
            DB::table('order_proposals')->where('id', $currentProposal->id)->update([
                'status' => 'accepted',
                'responded_by_user_id' => $actorUserId,
                'responded_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update([
                'status' => 'accepted',
                'current_terms_snapshot_id' => $termsSnapshotId,
                'accepted_at' => $now,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            $structure = $this->workExecution->initializeStructure($source, $workContract->shapeCode, $correlationId);
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
            $appointmentReservationId = $lockedProposalRecord->appointment_reservation_id ?? null;
            if ($workContract->shapeCode === 'A3' && is_string($appointmentReservationId) && $appointmentReservationId !== '') {
                $appointment = $this->capacity->commitAppointmentForOrder(
                    reservationId: $appointmentReservationId,
                    orderId: $orderId,
                    workInstanceId: $workId,
                    actorUserId: $actorUserId,
                    correlationId: $correlationId,
                );
                DB::table('work_instances')->where('id', $workId)->update([
                    'status' => 'scheduled',
                    'scheduled_at' => $appointment['starts_at'],
                    'updated_at' => $now,
                ]);
            }
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
                previous: ['status' => 'proposed', 'version' => $expectedOrderVersion],
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
            $recipientUserId = (string) $currentProposal->proposed_by_user_id;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: 'order.accepted',
                attention: NotificationAttention::Updates,
                title: 'Your Order proposal was accepted',
                body: 'Review the current Order.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'order.accepted:'.$orderId.':v'.$nextVersion.':'.$recipientUserId,
                correlationId: $correlationId,
            ));

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
            'order_proposals',
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

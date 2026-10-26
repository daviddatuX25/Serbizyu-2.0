<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\ChildOrderFormationPort;
use App\Shared\Contracts\DealNeedOrderLinkPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class FormDealNeedChildOrder implements ChildOrderFormationPort
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
        private readonly DealNeedOrderLinkPort $dealLink,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * @param  array{
     *     deal_chain_id: string,
     *     deal_need_id: string,
     *     listing_id: string,
     *     buyer_user_id: string,
     *     provider_user_id: string,
     *     amount_minor: int,
     *     currency?: string,
     *     quantity?: int,
     *     lane?: string,
     *     expected_listing_version?: int,
     *     expected_listing_version_id?: string,
     *     resource_key?: string,
     *     selection?: array<string, mixed>,
     *     unit_amount_minor?: int|null,
     *     appointment_reservation_id?: string,
     * }  $params
     * @return array{
     *     order_id: string,
     *     status: string,
     *     deal_chain_id: string,
     *     deal_need_id: string,
     *     work_instance_id: string|null,
     *     payment_obligation_id: string|null,
     *     version: int,
     * }
     */
    public function formChildOrder(
        string $actorUserId,
        array $params,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);

        $dealChainId = (string) ($params['deal_chain_id'] ?? '');
        $dealNeedId = (string) ($params['deal_need_id'] ?? '');
        $listingId = (string) ($params['listing_id'] ?? '');
        $buyerUserId = (string) ($params['buyer_user_id'] ?? '');
        $providerUserId = (string) ($params['provider_user_id'] ?? '');
        $amountMinor = (int) ($params['amount_minor'] ?? 0);
        $currency = strtoupper((string) ($params['currency'] ?? 'PHP'));
        $quantity = max(1, (int) ($params['quantity'] ?? 1));
        $lane = (string) ($params['lane'] ?? 'external_cash');
        $expectedListingVersion = isset($params['expected_listing_version']) ? (int) $params['expected_listing_version'] : null;
        $expectedListingVersionId = isset($params['expected_listing_version_id']) ? (string) $params['expected_listing_version_id'] : null;
        $resourceKey = (string) ($params['resource_key'] ?? '');
        $unitAmountMinor = isset($params['unit_amount_minor']) ? (int) $params['unit_amount_minor'] : null;
        $appointmentReservationId = isset($params['appointment_reservation_id']) ? (string) $params['appointment_reservation_id'] : null;
        $selection = is_array($params['selection'] ?? null) ? $params['selection'] : [];

        if ($dealChainId === '' || $dealNeedId === '' || $listingId === '' || $buyerUserId === '' || $providerUserId === '') {
            throw new OrderError(
                'VALIDATION_FAILED',
                'Missing required parameters for child order formation.',
                $correlationId,
                status: 422,
            );
        }

        if ($amountMinor < 0) {
            throw new OrderError(
                'VALIDATION_FAILED',
                'Child order amount cannot be negative.',
                $correlationId,
                status: 422,
                fieldErrors: ['amount_minor' => ['Amount must be non-negative.']],
            );
        }

        $allowedLanes = ['external_cash', 'p2p_transfer', 'protected_digital'];
        if (! in_array($lane, $allowedLanes, true)) {
            throw new OrderError(
                'UNSUPPORTED_PAYMENT_LANE',
                "Selected payment lane [{$lane}] is not supported.",
                $correlationId,
                status: 422,
            );
        }

        $scope = 'order.child_formation:'.$dealNeedId;
        $fingerprint = [
            'operation' => 'order.child_formation',
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $dealNeedId,
            'listing_id' => $listingId,
            'buyer_user_id' => $buyerUserId,
            'provider_user_id' => $providerUserId,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'quantity' => $quantity,
            'lane' => $lane,
            'resource_key' => $resourceKey,
            'selection' => $selection,
            'unit_amount_minor' => $unitAmountMinor,
            'appointment_reservation_id' => $appointmentReservationId,
        ];

        try {
            $reservation = $this->idempotency->begin(
                scope: $scope,
                key: $idempotencyKey,
                fingerprint: $fingerprint,
                correlationId: $correlationId,
                actorUserId: $actorUserId,
            );
        } catch (KernelException $error) {
            throw new OrderError(
                $error->envelope->code,
                $error->getMessage(),
                $correlationId,
                status: $error->status,
            );
        }

        if ($reservation->isReplay) {
            /** @var array{order_id: string, status: string, deal_chain_id: string, deal_need_id: string, work_instance_id: string|null, payment_obligation_id: string|null, version: int} */
            return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
        }

        return DB::transaction(function () use (
            $actorUserId,
            $dealChainId,
            $dealNeedId,
            $listingId,
            $buyerUserId,
            $providerUserId,
            $amountMinor,
            $currency,
            $quantity,
            $lane,
            $expectedListingVersion,
            $expectedListingVersionId,
            $resourceKey,
            $unitAmountMinor,
            $selection,
            $appointmentReservationId,
            $correlationId,
            $idempotencyKey,
            $reservation,
        ): array {
            // 1. Verify and lock Deal Need via DealCoordination port
            $needSnapshot = $this->dealLink->lockEligibleNeed($dealChainId, $dealNeedId, $correlationId);
            // Verify absence of an active child order for this Deal Need
            $existingActiveOrder = DB::table('orders')
                ->where('deal_need_id', $dealNeedId)
                ->whereIn('status', ['proposed', 'accepted', 'in_progress'])
                ->first();

            if ($existingActiveOrder !== null) {
                throw new OrderError(
                    'ACTIVE_CHILD_ORDER_EXISTS',
                    'An active child order already exists for this Deal Need.',
                    $correlationId,
                    status: 409,
                );
            }

            // 2. Lock & revalidate Listing
            $source = $this->listings->lockActiveApproved($listingId);
            if ($source === null) {
                throw new OrderError(
                    'LISTING_NOT_AVAILABLE',
                    'The listing is no longer available.',
                    $correlationId,
                    status: 409,
                );
            }

            if ((string) $source['owner_user_id'] !== $providerUserId) {
                throw new OrderError(
                    'AUTHORIZATION_DENIED',
                    'The listing owner does not match the specified provider.',
                    $correlationId,
                    status: 403,
                );
            }

            if (($expectedListingVersion !== null && (int) $source['listing_version_number'] !== $expectedListingVersion)
                || ($expectedListingVersionId !== null && (string) $source['listing_version_id'] !== $expectedListingVersionId)) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'Listing terms changed. Refresh and review before confirming.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }
            $workShape = (string) ($source['work_shape'] ?? '');
            $workSpecification = $source['work_specification'] ?? null;
            $workStages = (array) ($source['milestone_stages'] ?? []);
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
                );
            }
            $workSpecification = is_array($workSpecification) ? $workSpecification : [];
            $workSpecification['shape_contract_version'] = $workContract->shapeContractVersion;
            $workSpecification['payload_schema_version'] = $workContract->payloadSchemaVersion;
            $workSpecification['nodes'] ??= $workStages;
            $source['work_specification'] = $workSpecification;
            $appointmentHold = null;
            if ($workShape === 'A3') {
                if ($appointmentReservationId === null || $appointmentReservationId === '') {
                    throw new OrderError('APPOINTMENT_HOLD_REQUIRED', 'An A3 child Order requires a customer-held appointment time.', $correlationId, status: 422);
                }
                try {
                    $appointmentHold = $this->capacity->claimAppointmentHold(
                        reservationId: $appointmentReservationId,
                        listingId: $listingId,
                        listingVersionId: (string) $source['listing_version_id'],
                        providerUserId: $providerUserId,
                        customerUserId: $buyerUserId,
                        correlationId: $correlationId,
                    );
                } catch (KernelException $error) {
                    throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status, retryable: true);
                }
            } elseif ($appointmentReservationId !== null) {
                throw new OrderError('UNEXPECTED_APPOINTMENT_HOLD', 'Appointment holds are only valid for A3 child Orders.', $correlationId, status: 422);
            }

            $now = now();
            $orderId = (string) Str::uuid7();
            $termsSnapshotId = (string) Str::uuid7();
            $proposalId = (string) Str::uuid7();

            // Insert the order row before its order-linked capacity commitment.
            DB::table('orders')->insert([
                'id' => $orderId,
                'origin' => 'deal_chain',
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => $providerUserId,
                'status' => 'accepted',
                'geography' => (string) ($source['geography_area'] ?? 'Tagudin'),
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => $dealNeedId,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            try {
                $capacityReservation = $this->capacity->commitForOrder(
                    listingId: $listingId,
                    listingVersionId: (string) $source['listing_version_id'],
                    orderId: $orderId,
                    quantity: $quantity,
                    commandScope: 'order.child_formation:'.$orderId,
                    idempotencyKey: $idempotencyKey,
                    correlationId: $correlationId,
                    heldReservationId: null,
                    resourceKey: $resourceKey,
                );
            } catch (KernelException $error) {
                throw new OrderError(
                    $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: $error->status,
                );
            }

            // 5. Insert primary Order Parties
            $this->insertParty($orderId, $buyerUserId, 'buyer', 'primary', $correlationId, $now);
            $this->insertParty($orderId, $providerUserId, 'provider', 'primary', $correlationId, $now);

            // 6. Insert Order Terms Snapshot
            $termsScope = [
                'title' => (string) $source['title'],
                'quantity' => $quantity,
                'listing_type' => (string) $source['listing_type'],
                'category_code' => (string) $source['category_code'],
                'amount_minor' => $amountMinor,
                'unit_amount_minor' => $unitAmountMinor,
                'currency' => $currency,
                'lane' => $lane,
                'resource_key' => $resourceKey !== '' ? $resourceKey : null,
                'appointment_reservation_id' => $appointmentReservationId,
                'selection' => $selection,
                'work_specification' => $workSpecification,
                'milestone_stages' => $workStages,
            ];
            $scopeJson = json_encode($termsScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            DB::table('order_terms_snapshots')->insert([
                'id' => $termsSnapshotId,
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => (string) $source['listing_version_id'],
                'source_quote_id' => null,
                'scope' => $scopeJson,
                'scope_payload_version' => 1,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'payment_lane_options' => json_encode([$lane], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode([
                    'allowed_prior_to_hours' => 24,
                    'fee_ratio' => 0.0,
                ], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode([
                    'review_window_days' => 14,
                ], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $actorUserId,
                'accepted_at' => $now,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);
            DB::table('order_proposals')->insert([
                'id' => $proposalId,
                'order_id' => $orderId,
                'proposal_version' => 1,
                'parent_proposal_id' => null,
                'kind' => 'initial',
                'status' => 'accepted',
                'proposed_by_user_id' => $providerUserId,
                'responded_by_user_id' => $actorUserId,
                'responded_at' => $now,
                'source_listing_version_id' => (string) $source['listing_version_id'],
                'scope' => $scopeJson,
                'scope_payload_version' => 1,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'terms_hash' => hash('sha256', $scopeJson),
                'note' => null,
                'appointment_reservation_id' => $appointmentReservationId,
                'capacity_reservation_id' => $capacityReservation['reservation_id'] ?? null,
                'expires_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update([
                'current_proposal_id' => $proposalId,
                'current_terms_snapshot_id' => $termsSnapshotId,
                'accepted_at' => $now,
            ]);

            // 7. Initialize Work Instance with the validated selected contract.

            $workId = (string) Str::uuid7();
            $structure = $this->workExecution->initializeStructure($source, $workContract->shapeCode, $correlationId);

            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $source['capability_profile_id'] ?? null,
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
            if ($appointmentReservationId !== null) {
                try {
                    $appointment = $this->capacity->commitAppointmentForOrder(
                        reservationId: $appointmentReservationId,
                        orderId: $orderId,
                        workInstanceId: $workId,
                        actorUserId: $actorUserId,
                        correlationId: $correlationId,
                    );
                } catch (KernelException $error) {
                    throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status, retryable: true);
                }

                DB::table('work_instances')->where('id', $workId)->update([
                    'status' => 'scheduled',
                    'scheduled_at' => $appointment['starts_at'],
                    'updated_at' => $now,
                ]);
            }

            // 8. Create Primary Payment Obligation
            $obligationId = null;
            if ($amountMinor > 0) {
                $obligationId = $this->payments->createPrimary(
                    orderId: $orderId,
                    workInstanceId: $workId,
                    amountMinor: $amountMinor,
                    currency: $currency,
                    payerUserId: $buyerUserId,
                    recipientUserId: $providerUserId,
                    correlationId: $correlationId,
                    lane: $lane,
                );
            }
            // 9. Advance Deal Need status to in_progress via DealCoordination port
            $this->dealLink->markChildFormed($dealChainId, $dealNeedId, $orderId, $correlationId);
            $response = [
                'order_id' => $orderId,
                'status' => 'accepted',
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => $dealNeedId,
                'work_instance_id' => $workId,
                'payment_obligation_id' => $obligationId,
                'version' => 1,
            ];
            ksort($response);

            // 10. Record Audit & Outbox
            $auditId = $this->audits->record(
                action: 'order.child_formed',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'FormDealNeedChildOrder',
                expectedVersion: 1,
                previous: null,
                next: $response,
                reason: 'Child agreement formed for deal chain need',
            );

            $this->outbox->enqueue(
                eventType: 'order.accepted',
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $providerUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: 'order.accepted',
                attention: NotificationAttention::Updates,
                title: 'Deal Need agreement accepted',
                body: 'Review the accepted Order for your Deal Chain Need.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'order.accepted:'.$orderId.':v1:'.$providerUserId,
                correlationId: $correlationId,
            ));


            $this->idempotency->succeed($reservation->row, $response);

            return $response;
        });
    }

    private function insertParty(
        string $orderId,
        string $userId,
        string $partyType,
        string $responsibility,
        string $correlationId,
        DateTimeInterface $now,
        array $scope = [],
    ): void {
        DB::table('order_parties')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $orderId,
            'user_id' => $userId,
            'party_type' => $partyType,
            'responsibility' => $responsibility,
            'scope' => json_encode($scope === [] ? ['role' => $partyType] : $scope, JSON_THROW_ON_ERROR),
            'consent_grant_id' => null,
            'status' => 'active',
            'effective_at' => $now,
            'ended_at' => null,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function assertIdempotencyKey(string $key, string $correlationId): void
    {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $key) !== 1) {
            throw new OrderError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }
    }
}

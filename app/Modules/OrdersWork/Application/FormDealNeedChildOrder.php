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

        $allowedLanes = ['external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'];
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
            $reservation,
            $correlationId,
            $idempotencyKey,
        ): array {
            // 1. Verify and lock Deal Need via DealCoordination port
            $needSnapshot = $this->dealLink->lockEligibleNeed($dealChainId, $dealNeedId, $correlationId);
            // Verify absence of an active child order for this Deal Need
            $existingActiveOrder = DB::table('orders')
                ->where('deal_need_id', $dealNeedId)
                ->whereNotIn('status', ['cancelled', 'closed'])
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

            if ($expectedListingVersion !== null && (int) $source['listing_version_number'] !== $expectedListingVersion) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'Listing terms changed. Refresh and review before confirming.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }

            $now = now();
            $orderId = (string) Str::uuid7();

            // 3. Commit capacity
            try {
                $this->capacity->commitForOrder(
                    listingId: $listingId,
                    listingVersionId: (string) $source['listing_version_id'],
                    orderId: $orderId,
                    quantity: $quantity,
                    commandScope: 'order.child_formation:'.$orderId,
                    idempotencyKey: $idempotencyKey,
                    correlationId: $correlationId,
                    heldReservationId: null,
                );
            } catch (KernelException $error) {
                throw new OrderError(
                    $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: $error->status,
                );
            }

            // 4. Create child Order with exact lineage constraints
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

            // 5. Insert primary Order Parties
            $this->insertParty($orderId, $buyerUserId, 'buyer', 'primary', $correlationId, $now);
            $this->insertParty($orderId, $providerUserId, 'provider', 'primary', $correlationId, $now);

            // 6. Insert Order Terms Snapshot
            DB::table('order_terms_snapshots')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => (string) $source['listing_version_id'],
                'source_quote_id' => null,
                'scope' => json_encode([
                    'title' => (string) $source['title'],
                    'quantity' => $quantity,
                    'listing_type' => (string) $source['listing_type'],
                    'category_code' => (string) $source['category_code'],
                ], JSON_THROW_ON_ERROR),
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

            // 7. Initialize Work Instance
            $workShape = (string) ($source['work_shape'] ?? '');
            if ($workShape === '') {
                $workShape = (string) ($source['listing_type'] === 'product' ? 'A4' : 'A1');
            }

            $workContract = $this->workRegistry->resolveForWork(
                shapeCode: $workShape,
                shapeContractVersion: 1,
                payloadSchemaVersion: 1,
                correlationId: $correlationId,
            );

            $workId = (string) Str::uuid7();
            $structure = $this->workExecution->initializeStructure($source, $workContract->shapeCode);

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

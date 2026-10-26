<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\KernelException;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Contracts\QuoteAwardOrderFormationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class FormQuoteAwardOrder implements QuoteAwardOrderFormationPort
{
    public function __construct(
        private readonly WorkExecutionService $work,
        private readonly OrderPaymentObligationPort $payments,
        private readonly OrderListingSourcePort $listingSource,
        private readonly OrderCapacityPort $capacity,
        private readonly WorkContractRegistry $workRegistry,
    ) {}

    public function formAward(string $actorUserId, array $terms, string $correlationId): array
    {
        return DB::transaction(function () use ($actorUserId, $terms, $correlationId): array {
            $workShape = is_string($terms['work_shape'] ?? null) ? $terms['work_shape'] : '';
            if ($workShape === 'A3' && (! is_string($terms['appointment_reservation_id'] ?? null) || $terms['appointment_reservation_id'] === '')) {
                throw new KernelException('APPOINTMENT_HOLD_REQUIRED', 'A3 quote acceptance requires the customer-selected appointment hold.', $correlationId, status: 409);
            }
            $scope = is_array($terms['scope'] ?? null) ? $terms['scope'] : [];
            $listingType = isset($scope['listing_type']) && is_string($scope['listing_type']) ? $scope['listing_type'] : null;
            if ($workShape === 'A3') {
                $sourceVersionId = $terms['source_listing_version_id'] ?? null;
                $pinnedAppointmentVersionId = $scope['appointment_listing_version_id'] ?? null;
                if ($listingType !== 'service'
                    || (($terms['listing_id'] ?? null) !== null && (! is_string($sourceVersionId) || $sourceVersionId === '' || $pinnedAppointmentVersionId !== $sourceVersionId))
                    || (($terms['listing_id'] ?? null) === null && $sourceVersionId !== null)) {
                    throw new KernelException('APPOINTMENT_SOURCE_INVALID', 'The A3 quote does not contain a valid pinned service source.', $correlationId, status: 409);
                }
            }
            $productSelection = null;
            if ($workShape === 'A4' && is_string($terms['listing_id'] ?? null) && $terms['listing_id'] !== '') {
                $listingSource = $this->listingSource->lockActiveApproved((string) $terms['listing_id']);
                $pinnedVersionId = $scope['source_listing_version_id'] ?? null;
                if (
                    $listingSource === null
                    || (string) $listingSource['owner_user_id'] !== (string) $terms['provider_user_id']
                    || ! is_string($pinnedVersionId)
                    || $pinnedVersionId === ''
                    || $pinnedVersionId !== (string) $listingSource['listing_version_id']
                    || ($terms['source_listing_version_id'] ?? null) !== $pinnedVersionId
                    || ($scope['listing_type'] ?? null) !== (string) $listingSource['listing_type']
                    || (string) $listingSource['work_shape'] !== 'A4'
                ) {
                    throw new KernelException('LISTING_VERSION_CHANGED', 'The linked A4 listing version or owner changed. Refresh the quote before awarding it.', $correlationId, status: 409);
                }

                $listingType = (string) $listingSource['listing_type'];
                if ($listingType === 'product') {
                    $variantId = $scope['variant_id'] ?? null;
                    $quantity = filter_var($scope['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 999]]);
                    if (! is_string($variantId) || $variantId === '') {
                        throw new KernelException('PRODUCT_VARIANT_REQUIRED', 'The linked product quote has no selected variant.', $correlationId, status: 422);
                    }
                    if ($quantity === false) {
                        throw new KernelException('PRODUCT_QUANTITY_REQUIRED', 'The linked product quote has no valid quantity.', $correlationId, status: 422);
                    }
                    $variants = is_array($listingSource['terms']['variants'] ?? null) ? $listingSource['terms']['variants'] : [];
                    $matchingVariants = array_values(array_filter(
                        $variants,
                        static fn (mixed $variant): bool => is_array($variant) && (string) ($variant['id'] ?? '') === $variantId,
                    ));
                    if (count($matchingVariants) !== 1) {
                        throw new KernelException('PRODUCT_VARIANT_INVALID', 'The selected quote variant is not part of the pinned product listing.', $correlationId, status: 422);
                    }

                    $variant = $matchingVariants[0];
                    $resourceKey = is_string($variant['resource_key'] ?? null) ? trim($variant['resource_key']) : '';
                    if ($resourceKey === '') {
                        $resourceKey = trim((string) ($variant['id'] ?? ''));
                    }
                    $sourceUnitAmountMinor = isset($variant['price_amount_minor'])
                        ? filter_var($variant['price_amount_minor'], FILTER_VALIDATE_INT)
                        : (is_numeric($variant['price'] ?? null) ? (int) round((float) $variant['price'] * 100) : false);
                    if (
                        $resourceKey === ''
                        || $sourceUnitAmountMinor === false
                        || $sourceUnitAmountMinor < 0
                        || ($scope['resource_key'] ?? null) !== $resourceKey
                        || filter_var($scope['source_unit_amount_minor'] ?? null, FILTER_VALIDATE_INT) !== $sourceUnitAmountMinor
                    ) {
                        throw new KernelException('PRODUCT_SELECTION_CHANGED', 'The pinned product variant terms no longer match the submitted quote.', $correlationId, status: 409);
                    }

                    $scope['resource_key'] = $resourceKey;
                    $scope['source_unit_amount_minor'] = (int) $sourceUnitAmountMinor;
                    $unitAmountMinor = (int) $terms['amount_minor'] % (int) $quantity === 0
                        ? intdiv((int) $terms['amount_minor'], (int) $quantity)
                        : null;
                    $scope['unit_amount_minor'] = $unitAmountMinor;
                    $productSelection = [
                        'listing_id' => (string) $terms['listing_id'],
                        'listing_version_id' => (string) $listingSource['listing_version_id'],
                        'resource_key' => $resourceKey,
                        'quantity' => (int) $quantity,
                    ];
                }
                $scope['listing_type'] = $listingType;
                $terms['source_listing_version_id'] = (string) $listingSource['listing_version_id'];
            } elseif ($workShape !== 'A3' && is_string($terms['listing_id'] ?? null) && $terms['listing_id'] !== '') {
                $listingSource = $this->listingSource->findActiveApproved((string) $terms['listing_id']);
                if ($listingSource !== null && (string) $listingSource['owner_user_id'] === (string) $terms['provider_user_id']) {
                    $listingType = (string) $listingSource['listing_type'];
                }
            } elseif ($workShape === 'A4' && $listingType === 'product') {
                throw new KernelException('PRODUCT_LISTING_REQUIRED', 'A4 product quote awards require a linked, version-pinned listing.', $correlationId, status: 422);
            }
            if ($workShape === 'A4' && ! in_array($listingType, ['product', 'service'], true)) {
                throw new KernelException('LISTING_TYPE_UNAVAILABLE', 'A4 quote award requires an immutable product or courier-service listing type.', $correlationId, status: 409);
            }
            if ($listingType !== null) {
                $scope['listing_type'] = $listingType;
                $terms['scope'] = $scope;
            }
            $workSpecification = is_array($scope['work_specification'] ?? null) ? $scope['work_specification'] : null;
            $workStages = is_array($scope['milestone_stages'] ?? null) ? $scope['milestone_stages'] : [];
            try {
                $workContract = WorkContractSelector::resolve(
                    $this->workRegistry,
                    $workShape,
                    $workSpecification,
                    $workStages,
                    $correlationId,
                );
            } catch (WorkContractError $error) {
                throw new KernelException(
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
            $scope['work_specification'] = $workSpecification;
            $terms['scope'] = $scope;
            $now = now();
            $orderId = (string) Str::uuid7();
            $workId = (string) Str::uuid7();
            $termsSnapshotId = (string) Str::uuid7();
            $proposalId = (string) Str::uuid7();
            DB::table('orders')->insert([
                'id' => $orderId,
                'origin' => 'request',
                'mechanism' => 'quote_tender',
                'listing_id' => $terms['listing_id'],
                'request_id' => $terms['request_id'],
                'quote_id' => $terms['quote_id'],
                'buyer_user_id' => $terms['buyer_user_id'],
                'provider_user_id' => $terms['provider_user_id'],
                'status' => 'accepted',
                'geography' => $terms['geography'],
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $capacityReservationId = null;
            if ($productSelection !== null) {
                $reservation = $this->capacity->commitForOrder(
                    listingId: $productSelection['listing_id'],
                    listingVersionId: $productSelection['listing_version_id'],
                    orderId: $orderId,
                    quantity: $productSelection['quantity'],
                    commandScope: 'quote.award.capacity:'.$terms['quote_id'],
                    idempotencyKey: 'quote-award-capacity:'.$terms['quote_id'],
                    correlationId: $correlationId,
                    resourceKey: $productSelection['resource_key'],
                );
                if ($reservation === null) {
                    throw new KernelException('CAPACITY_BUCKET_NOT_FOUND', 'The selected product variant has no stock capacity.', $correlationId, status: 409);
                }
                $capacityReservationId = $reservation['reservation_id'];
                $scope['capacity_reservation_id'] = $capacityReservationId;
                $terms['scope'] = $scope;
            }
            foreach (['buyer' => $terms['buyer_user_id'], 'provider' => $terms['provider_user_id']] as $role => $userId) {
                DB::table('order_parties')->insert([
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'user_id' => $userId,
                    'party_type' => $role,
                    'responsibility' => $role === 'buyer' ? 'ordering_and_payment' : 'fulfillment_and_service',
                    'scope' => json_encode(['role' => $role], JSON_THROW_ON_ERROR),
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
            DB::table('order_terms_snapshots')->insert([
                'id' => $termsSnapshotId,
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => $terms['source_listing_version_id'] ?? null,
                'source_quote_id' => $terms['quote_id'],
                'scope' => json_encode($terms['scope'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'scope_payload_version' => 1,
                'amount_minor' => $terms['amount_minor'],
                'currency' => $terms['currency'],
                'payment_lane_options' => json_encode($terms['payment_lane_options'], JSON_THROW_ON_ERROR),
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
            $proposalScope = [
                ...$terms['scope'],
                'amount_minor' => (int) $terms['amount_minor'],
                'currency' => (string) $terms['currency'],
                'quantity' => (int) ($terms['scope']['quantity'] ?? 1),
            ];
            $proposalJson = json_encode($proposalScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            DB::table('order_proposals')->insert([
                'id' => $proposalId,
                'order_id' => $orderId,
                'proposal_version' => 1,
                'parent_proposal_id' => null,
                'kind' => 'initial',
                'status' => 'accepted',
                'proposed_by_user_id' => $terms['provider_user_id'],
                'responded_by_user_id' => $actorUserId,
                'source_listing_version_id' => $terms['source_listing_version_id'] ?? null,
                'scope' => $proposalJson,
                'scope_payload_version' => 1,
                'amount_minor' => (int) $terms['amount_minor'],
                'currency' => (string) $terms['currency'],
                'terms_hash' => hash('sha256', $proposalJson),
                'note' => null,
                'capacity_reservation_id' => $capacityReservationId,
                'appointment_reservation_id' => $terms['appointment_reservation_id'] ?? null,
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
            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $terms['capability_profile_id'],
                'work_shape' => $workShape,
                'status' => 'not_started',
                'scheduled_at' => null,
                'started_at' => null,
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => json_encode($this->work->initializeStructure($terms['scope'], $terms['work_shape'], $correlationId), JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'completion_evidence_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'shape_contract_version' => $workContract->shapeContractVersion,
                'payload_schema_version' => $workContract->payloadSchemaVersion,
                'row_version' => 1,
                'revisions_used' => 0,
                'awaiting_signoff_at' => null,
                'cancelled_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($workShape === 'A3') {
                $appointment = $this->capacity->commitAppointmentForOrder(
                    reservationId: (string) $terms['appointment_reservation_id'],
                    orderId: $orderId,
                    workInstanceId: $workId,
                    actorUserId: $actorUserId,
                    correlationId: $correlationId,
                );
                DB::table('work_instances')->where('id', $workId)->update([
                    'scheduled_at' => $appointment['starts_at'],
                    'status' => 'scheduled',
                    'updated_at' => $now,
                ]);
            }
            $obligationId = $this->payments->createPrimary(
                $orderId, $workId, $terms['amount_minor'], $terms['currency'],
                $terms['buyer_user_id'], $terms['provider_user_id'], $correlationId,
            );

            return ['order_id' => $orderId, 'work_instance_id' => $workId, 'payment_obligation_id' => $obligationId];
        });
    }
}

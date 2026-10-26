<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\PublicReferenceAllocator;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class SubmitOrderProposal
{
    public function __construct(
        private readonly OrderListingSourcePort $listings,
        private readonly OrderCapacityPort $capacity,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly PublicReferenceAllocator $references,
        private readonly WorkContractRegistry $workRegistry,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * @param  array{amount_minor?: int, currency?: string, quantity?: int, variant_id?: string|null, package_id?: string|null, listing_version_id?: string|null, appointment_reservation_id?: string, deal_chain_combination_id?: string|null, addon_ids?: list<string>, lane?: string, note?: string, slot?: array<string, mixed>}  $input
     */
    public function handle(
        string $buyerUserId,
        string $listingId,
        int $expectedListingVersion,
        string $idempotencyKey,
        string $correlationId,
        array $input = [],
    ): array {
        $this->assertStorage($correlationId);
        $this->assertIdempotencyKey($idempotencyKey, $correlationId);

        $amountMinor = (int) ($input['amount_minor'] ?? 0);
        $currency = strtoupper((string) ($input['currency'] ?? 'PHP'));
        $quantity = (int) ($input['quantity'] ?? 1);
        $variantId = isset($input['variant_id']) && is_string($input['variant_id']) ? trim($input['variant_id']) : null;
        $packageId = isset($input['package_id']) && is_string($input['package_id']) ? trim($input['package_id']) : null;
        $expectedListingVersionId = isset($input['listing_version_id']) && is_string($input['listing_version_id']) ? trim($input['listing_version_id']) : null;
        $appointmentReservationId = isset($input['appointment_reservation_id']) && is_string($input['appointment_reservation_id']) ? trim($input['appointment_reservation_id']) : null;
        $combinationId = isset($input['deal_chain_combination_id']) && is_string($input['deal_chain_combination_id']) ? trim($input['deal_chain_combination_id']) : null;
        $addonIds = $input['addon_ids'] ?? [];
        $lane = strtolower(trim((string) ($input['lane'] ?? 'external_cash')));
        $note = isset($input['note']) && is_string($input['note']) ? trim($input['note']) : null;
        $slot = $input['slot'] ?? null;
        if (! is_array($addonIds) || array_filter($addonIds, static fn (mixed $id): bool => ! is_string($id)) !== []) {
            throw new OrderError('VALIDATION_FAILED', 'Choose valid seller add-ons.', $correlationId, status: 422);
        }
        if ($slot !== null && ! is_array($slot)) {
            throw new OrderError('VALIDATION_FAILED', 'Choose a valid booking slot.', $correlationId, status: 422);
        }

        if ($quantity < 1 || ($variantId !== null && $variantId === '') || ($packageId !== null && $packageId === '') || ($variantId !== null && $packageId !== null)) {
            throw new OrderError('VALIDATION_FAILED', 'Choose one valid listing option and quantity.', $correlationId, status: 422);
        }
        if (! in_array($lane, ['external_cash', 'p2p_transfer', 'protected_digital'], true)) {
            throw new OrderError('UNSUPPORTED_PAYMENT_LANE', 'Choose a supported payment lane.', $correlationId, status: 422);
        }

        if ($amountMinor < 0) {
            throw new OrderError(
                'VALIDATION_FAILED',
                'Proposal amount cannot be negative.',
                $correlationId,
                fieldErrors: ['amount_minor' => ['Enter a non-negative amount.']],
            );
        }

        return DB::transaction(function () use (
            $buyerUserId,
            $listingId,
            $expectedListingVersion,
            $idempotencyKey,
            $correlationId,
            $amountMinor,
            $currency,
            $quantity,
            $variantId,
            $packageId,
            $expectedListingVersionId,
            $combinationId,
            $addonIds,
            $lane,
            $note,
            $slot,
            $appointmentReservationId,
        ): array {
            $source = $this->listings->findActiveApproved($listingId);
            if ($source === null) {
                throw new OrderError('LISTING_NOT_AVAILABLE', 'That listing is not available to book.', $correlationId, status: 404);
            }
            if ((int) $source['listing_version_number'] !== $expectedListingVersion
                || ($expectedListingVersionId !== null && $expectedListingVersionId !== (string) $source['listing_version_id'])) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'This listing changed. Refresh and review before proposing.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }
            if ($source['owner_user_id'] === $buyerUserId) {
                throw new OrderError('VALIDATION_FAILED', 'You cannot book your own listing.', $correlationId, status: 422);
            }
            $eligibleLanes = $this->listings->eligiblePaymentLanesForVersion((string) $source['listing_version_id']);
            if (! in_array($lane, $eligibleLanes, true)) {
                throw new OrderError('UNSUPPORTED_PAYMENT_LANE', 'The selected payment lane is unavailable for this listing.', $correlationId, status: 422);
            }
            $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
            $workShape = (string) ($source['work_shape'] ?? '');
            $workSpecification = $source['work_specification'] ?? ($terms['work_specification'] ?? null);
            $workStages = (array) ($source['milestone_stages'] ?? ($terms['milestone_stages'] ?? []));
            try {
                WorkContractSelector::resolve(
                    $this->workRegistry,
                    $workShape,
                    is_array($workSpecification) ? $workSpecification : null,
                    $workStages,
                    $correlationId,
                );
            } catch (WorkContractError $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: 422);
            }

            $isAppointment = $workShape === 'A3';
            if ($isAppointment && $appointmentReservationId === null) {
                throw new OrderError('APPOINTMENT_REQUIRED', 'Choose and hold an appointment time before sending the proposal.', $correlationId, status: 422);
            }
            if (! $isAppointment && $appointmentReservationId !== null) {
                throw new OrderError('INVALID_APPOINTMENT', 'Appointment holds are only valid for A3 listings.', $correlationId, status: 422);
            }
            if ($isAppointment) {
                $slot = null;
            }

            $selectedVariant = null;
            $selectedPackage = null;
            if ($variantId !== null) {
                foreach (($terms['variants'] ?? []) as $variant) {
                    if (is_array($variant) && (string) ($variant['id'] ?? '') === $variantId) {
                        $selectedVariant = $variant;
                        break;
                    }
                }
                if ($selectedVariant === null || (string) ($source['listing_type'] ?? '') !== 'product') {
                    throw new OrderError('VALIDATION_FAILED', 'The selected product variant is not part of this listing.', $correlationId, status: 422);
                }
            } elseif ($packageId !== null) {
                foreach (($terms['package_tiers'] ?? []) as $package) {
                    if (is_array($package) && (string) ($package['id'] ?? '') === $packageId) {
                        $selectedPackage = $package;
                        break;
                    }
                }
                if ($selectedPackage === null) {
                    throw new OrderError('VALIDATION_FAILED', 'The selected package is not part of this listing.', $correlationId, status: 422);
                }
            } elseif (($source['listing_type'] ?? '') === 'product' && is_array($terms['variants'] ?? null) && $terms['variants'] !== []) {
                foreach ($terms['variants'] as $variant) {
                    if (is_array($variant) && (($variant['is_default'] ?? $variant['isDefault'] ?? false) === true)) {
                        $selectedVariant = $variant;
                        $variantId = (string) ($variant['id'] ?? '');
                        break;
                    }
                }
                if ($selectedVariant === null) {
                    throw new OrderError('VALIDATION_FAILED', 'Choose a product variant before booking.', $correlationId, status: 422);
                }
            }
            $resourceKey = '';
            if ((string) ($source['listing_type'] ?? '') === 'product') {
                $resourceKey = is_string($selectedVariant['resource_key'] ?? null) ? trim($selectedVariant['resource_key']) : '';
                if ($resourceKey === '') {
                    $resourceKey = is_string($selectedVariant['id'] ?? null) ? trim($selectedVariant['id']) : '';
                }
                if ($resourceKey === '') {
                    throw new OrderError('INVALID_PROPOSAL', 'The selected product variant has no stable stock identity.', $correlationId, status: 422);
                }
            }

            $selectedPrice = $selectedVariant ?? $selectedPackage;
            $priceIsAuthored = is_array($selectedPrice)
                ? (isset($selectedPrice['price_amount_minor']) || is_numeric($selectedPrice['price'] ?? null))
                : ($source['price_amount_minor'] ?? null) !== null;
            if (! $priceIsAuthored) {
                throw new OrderError('VALIDATION_FAILED', 'This listing has no authored price for the selected option.', $correlationId, status: 422);
            }
            $resolvedUnitAmount = is_array($selectedPrice)
                ? (isset($selectedPrice['price_amount_minor']) ? (int) $selectedPrice['price_amount_minor'] : (int) round((float) $selectedPrice['price'] * 100))
                : (int) $source['price_amount_minor'];
            $resolvedAddons = [];
            $addonTotalMinor = 0;
            if ($addonIds !== []) {
                if ((string) ($source['listing_type'] ?? '') !== 'service') {
                    throw new OrderError('VALIDATION_FAILED', 'Seller add-ons are only available for service listings.', $correlationId, status: 422);
                }
                foreach ($addonIds as $addonId) {
                    $addon = null;
                    foreach (($terms['addons'] ?? []) as $candidate) {
                        if (is_array($candidate) && in_array($addonId, [(string) ($candidate['id'] ?? ''), (string) ($candidate['code'] ?? '')], true)) {
                            $addon = $candidate;
                            break;
                        }
                    }
                    if ($addon === null || ($addon['status'] ?? 'available') !== 'available') {
                        throw new OrderError('VALIDATION_FAILED', 'A selected seller add-on is no longer available.', $correlationId, status: 409, retryable: true);
                    }
                    $resolvedAddons[] = (string) ($addon['id'] ?? $addon['code']);
                    $addonTotalMinor += (int) ($addon['price_amount_minor'] ?? 0);
                }
                $addonIds = $resolvedAddons;
            }
            $resolvedUnitAmount += $addonTotalMinor;
            $resolvedAmount = $resolvedUnitAmount * $quantity;
            $resolvedCurrency = is_array($selectedPrice) && is_string($selectedPrice['currency'] ?? null)
                ? strtoupper($selectedPrice['currency'])
                : (string) ($source['currency'] ?? 'PHP');
            if ($combinationId !== null) {
                $combinationExists = collect($terms['deal_chain_combinations'] ?? [])
                    ->contains(fn (mixed $combination): bool => is_array($combination) && (string) ($combination['id'] ?? '') === $combinationId);
                if (! $combinationExists) {
                    throw new OrderError('VALIDATION_FAILED', 'The selected Deal Chain combination is not part of this listing.', $correlationId, status: 422);
                }
            }

            $selection = [
                'variant_id' => $variantId,
                'package_id' => $packageId,
                'listing_version_id' => (string) $source['listing_version_id'],
                'deal_chain_combination_id' => $combinationId,
                'addon_ids' => $addonIds,
                'resource_key' => $resourceKey !== '' ? $resourceKey : null,
                'appointment_reservation_id' => $appointmentReservationId,
            ];
            $scope = 'order.propose:'.$buyerUserId.':'.$listingId;
            $fingerprint = [
                'operation' => 'order.propose',
                'listing_id' => $listingId,
                'expected_listing_version' => $expectedListingVersion,
                'listing_version_id' => $selection['listing_version_id'],
                'variant_id' => $variantId,
                'package_id' => $packageId,
                'appointment_reservation_id' => $appointmentReservationId,
                'deal_chain_combination_id' => $combinationId,
                'addon_ids' => $addonIds,
                'resource_key' => $selection['resource_key'],
                'unit_amount_minor' => $resolvedUnitAmount,
                'amount_minor' => $resolvedAmount,
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
                'requested_amount_minor' => $amountMinor,
                'requested_currency' => $currency,
                'lane' => $lane,
                'note' => $note,
                'slot' => $slot,
            ];

            try {
                $reservation = $this->idempotency->begin(
                    scope: $scope,
                    key: $idempotencyKey,
                    fingerprint: $fingerprint,
                    correlationId: $correlationId,
                    actorUserId: $buyerUserId,
                );
            } catch (KernelException $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
            }

            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }
            $appointment = null;
            if ($isAppointment) {
                try {
                    $appointment = $this->capacity->claimAppointmentHold(
                        reservationId: (string) $appointmentReservationId,
                        listingId: $listingId,
                        listingVersionId: (string) $source['listing_version_id'],
                        providerUserId: (string) $source['owner_user_id'],
                        customerUserId: $buyerUserId,
                        correlationId: $correlationId,
                    );
                } catch (KernelException $error) {
                    throw new OrderError(
                        'APPOINTMENT_HOLD_INVALID',
                        $error->getMessage(),
                        $correlationId,
                        status: $error->status,
                        fieldErrors: ['appointment_reservation_id' => [$error->getMessage()]],
                        retryable: true,
                    );
                }
                $slot = [
                    'starts_at' => $appointment['starts_at'],
                    'ends_at' => $appointment['ends_at'],
                    'duration_minutes' => $appointment['duration_minutes'],
                ];
            }

            $capacityReservationId = null;
            if ($resourceKey !== '') {
                $bucket = $this->capacity->findOpenQuantityBucket(
                    $listingId,
                    (string) $source['listing_version_id'],
                    $resourceKey,
                );
                if ($bucket === null) {
                    throw new OrderError('AVAILABILITY_CONFLICT', 'The selected variant is no longer available.', $correlationId, status: 409, retryable: true);
                }
                try {
                    $held = $this->capacity->hold(
                        listingCapacityId: $bucket['id'],
                        quantity: $quantity,
                        commandScope: 'order.propose.capacity:'.$buyerUserId.':'.$listingId,
                        idempotencyKey: $idempotencyKey,
                        correlationId: $correlationId,
                    );
                    $capacityReservationId = $held['reservation_id'];
                } catch (KernelException $error) {
                    throw new OrderError(
                        'AVAILABILITY_CONFLICT',
                        'There is not enough availability for the selected variant. Review the stock and try again.',
                        $correlationId,
                        status: 409,
                        fieldErrors: ['availability' => [$error->getMessage()]],
                        retryable: true,
                    );
                }
            }

            $now = now();
            $orderId = (string) Str::uuid7();
            DB::table('orders')->insert([
                'id' => $orderId,
                'public_reference' => $this->references->allocate('orders'),
                'origin' => 'listing',
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => $source['owner_user_id'],
                'status' => 'proposed',
                'geography' => $source['geography_area'],
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $proposal = [
                'amount_minor' => $resolvedAmount,
                'unit_amount_minor' => $resolvedUnitAmount,
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
                'lane' => $lane,
                'note' => $note,
                'slot' => $slot,
                'title' => (string) $source['title'],
                'description' => (string) ($source['description'] ?? ''),
                'listing_type' => (string) $source['listing_type'],
                'listing_version_id' => (string) $source['listing_version_id'],
                'listing_version_number' => (int) $source['listing_version_number'],
                'work_specification' => $source['work_specification'] ?? null,
                'milestone_stages' => $source['milestone_stages'] ?? [],
                'capacity_reservation_id' => $capacityReservationId,
                ...$selection,
            ];

            $this->insertParty(
                $orderId,
                $buyerUserId,
                'buyer',
                'primary',
                $correlationId,
                $now,
                ['role' => 'buyer', 'proposal' => $proposal],
            );
            $this->insertParty($orderId, $source['owner_user_id'], 'provider', 'primary', $correlationId, $now);

            $proposalId = (string) Str::uuid7();
            $proposalJson = json_encode($proposal, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            DB::table('order_proposals')->insert([
                'id' => $proposalId,
                'order_id' => $orderId,
                'proposal_version' => 1,
                'parent_proposal_id' => null,
                'kind' => 'initial',
                'status' => 'proposed',
                'proposed_by_user_id' => $buyerUserId,
                'responded_by_user_id' => null,
                'responded_at' => null,
                'source_listing_version_id' => $source['listing_version_id'],
                'scope' => $proposalJson,
                'scope_payload_version' => 1,
                'amount_minor' => $resolvedAmount,
                'currency' => $resolvedCurrency,
                'terms_hash' => hash('sha256', $proposalJson),
                'note' => $note,
                'capacity_reservation_id' => $capacityReservationId,
                'appointment_reservation_id' => $appointmentReservationId,
                'expires_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update(['current_proposal_id' => $proposalId]);
            $response = [
                'order_id' => $orderId,
                'proposal_id' => $proposalId,
                'proposal_version' => 1,
                'status' => 'proposed',
                'version' => 1,
                'listing_id' => $listingId,
                'listing_version_id' => $source['listing_version_id'],
                'listing_version_number' => $source['listing_version_number'],
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => $source['owner_user_id'],
                'amount_minor' => $resolvedAmount,
                'unit_amount_minor' => $resolvedUnitAmount,
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
                'variant_id' => $variantId,
                'resource_key' => $resourceKey !== '' ? $resourceKey : null,
                'package_id' => $packageId,
                'deal_chain_combination_id' => $combinationId,
                'addon_ids' => $addonIds,
                'capacity_reservation_id' => $capacityReservationId,
            ];
            ksort($response);

            // Stash proposal payload on a draft terms-less JSON via outbox/audit only; finalize re-reads listing.
            $auditId = $this->audits->record(
                action: 'order.propose',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($buyerUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'SubmitOrderProposal',
                expectedVersion: $expectedListingVersion,
                previous: null,
                next: $response,
                reason: 'Buyer proposed a direct booking',
            );
            $this->outbox->enqueue(
                eventType: 'order.proposed',
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $providerUserId = (string) $source['owner_user_id'];
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $providerUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: 'order.proposal_received',
                attention: NotificationAttention::NeedsAction,
                title: 'A customer sent an Order proposal',
                body: 'Review the proposal and respond to the current terms.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'order.proposal_received:'.$orderId.':v1:'.$providerUserId,
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

    /**
     * @param  array<string, mixed>  $scope
     */
    private function insertParty(
        string $orderId,
        string $userId,
        string $partyType,
        string $responsibility,
        string $correlationId,
        mixed $now,
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

    private function assertStorage(string $correlationId): void
    {
        foreach (['orders', 'order_proposals', 'order_parties', 'idempotency_keys', 'audit_events', 'outbox_messages'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new OrderError('STORAGE_UNAVAILABLE', 'Order storage is unavailable.', $correlationId, status: 503, retryable: true);
            }
        }
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

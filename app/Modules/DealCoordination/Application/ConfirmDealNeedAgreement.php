<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\ChildOrderFormationPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ConfirmDealNeedAgreement
{
    public function __construct(
        private readonly ChildOrderFormationPort $childOrders,
        private readonly OrderListingSourcePort $listings,
        private readonly OrderCapacityPort $capacity,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly DealWorkGatePort $workGates,
    ) {}

    /** @return array{order_id: string, status: string, deal_chain_id: string, deal_need_id: string, work_instance_id: string|null, payment_obligation_id: string|null, version: int} */
    public function handle(
        string $actorUserId,
        string $dealChainId,
        string $dealNeedId,
        string $invitationId,
        int $expectedNeedVersion,
        string $termsHash,
        string $capacityHash,
        string $idempotencyKey,
        string $correlationId,
        ?string $appointmentReservationId = null,
    ): array {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new DealCoordinationError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }

        $scope = 'deal_need.confirm_agreement:'.$actorUserId.':'.$dealNeedId;
        $fingerprint = [
            'operation' => 'deal_need.confirm_agreement',
            'actor_user_id' => $actorUserId,
            'deal_chain_id' => $dealChainId,
            'deal_need_id' => $dealNeedId,
            'invitation_id' => $invitationId,
            'expected_need_version' => $expectedNeedVersion,
            'terms_hash' => $termsHash,
            'capacity_hash' => $capacityHash,
            'appointment_reservation_id' => $appointmentReservationId,
        ];

        return DB::transaction(function () use (
            $actorUserId,
            $dealChainId,
            $dealNeedId,
            $invitationId,
            $expectedNeedVersion,
            $termsHash,
            $capacityHash,
            $appointmentReservationId,
            $idempotencyKey,
            $correlationId,
            $scope,
            $fingerprint,
        ): array {
            $chain = DB::table('deal_chains')->where('id', $dealChainId)->lockForUpdate()->first();
            if ($chain === null) {
                throw new DealCoordinationError('DEAL_CHAIN_NOT_FOUND', 'Deal Chain not found.', $correlationId, status: 404);
            }
            if ((string) $chain->coordinator_user_id !== $actorUserId) {
                throw new DealCoordinationError('AUTHORIZATION_DENIED', 'Only the Deal Chain coordinator can confirm this agreement.', $correlationId, status: 403);
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
                throw new DealCoordinationError(
                    $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: $error->status,
                );
            }

            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }

            $need = DB::table('deal_needs')
                ->where('id', $dealNeedId)
                ->where('deal_chain_id', $dealChainId)
                ->lockForUpdate()
                ->first();
            if ($need === null) {
                throw new DealCoordinationError('DEAL_NEED_NOT_FOUND', 'Deal Need not found in this Deal Chain.', $correlationId, status: 404);
            }
            if ((int) $need->version !== $expectedNeedVersion) {
                throw new DealCoordinationError('VERSION_CONFLICT', 'The Deal Need changed. Refresh and review before confirming.', $correlationId, status: 409, retryable: true);
            }
            if ((string) $need->status !== 'awaiting_customer_confirmation') {
                throw new DealCoordinationError('INVALID_NEED_STATE', 'A provider must accept the invitation before customer confirmation.', $correlationId, status: 409);
            }

            $invitation = DB::table('deal_invitations')
                ->where('id', $invitationId)
                ->where('deal_need_id', $dealNeedId)
                ->lockForUpdate()
                ->first();
            if ($invitation === null) {
                throw new DealCoordinationError('INVITATION_NOT_FOUND', 'The accepted invitation does not belong to this Deal Need.', $correlationId, status: 404);
            }
            if ((string) $invitation->status !== 'accepted' || now()->greaterThan($invitation->expires_at)) {
                throw new DealCoordinationError('INVALID_INVITATION_STATE', 'The selected provider invitation is not active and accepted.', $correlationId, status: 409);
            }

            $offer = is_array($invitation->scope)
                ? $invitation->scope
                : (json_decode((string) $invitation->scope, true) ?: []);
            if (! is_array($offer)
                || ! is_string($offer['terms_hash'] ?? null)
                || ! is_string($offer['capacity_hash'] ?? null)
                || ! is_string($offer['listing_id'] ?? null)
                || ! is_string($offer['listing_version_id'] ?? null)) {
                throw new DealCoordinationError('INVALID_INVITATION_TERMS', 'The invitation does not contain a complete pinned offer.', $correlationId, status: 409);
            }

            $expectedOffer = $offer;
            unset($expectedOffer['terms_hash'], $expectedOffer['capacity_hash']);
            ksort($expectedOffer, SORT_STRING);
            $storedTermsHash = hash('sha256', json_encode($expectedOffer, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            if (! hash_equals($offer['terms_hash'], $storedTermsHash)
                || ! hash_equals($offer['terms_hash'], $termsHash)
                || ! hash_equals($offer['capacity_hash'], $capacityHash)) {
                throw new DealCoordinationError('TERMS_CHANGED', 'The accepted listing terms no longer match the customer confirmation.', $correlationId, status: 409, retryable: true);
            }
            if (! is_numeric($offer['amount_minor'] ?? null) || (int) $offer['amount_minor'] < 0) {
                throw new DealCoordinationError('PRICE_REQUIRED', 'The accepted provider terms need a confirmed amount before an Order can be formed.', $correlationId, status: 409);
            }

            $listing = $this->listings->findActiveApproved($offer['listing_id']);
            if ($listing === null
                || (string) $listing['listing_version_id'] !== $offer['listing_version_id']
                || (int) $listing['listing_version_number'] !== (int) $offer['listing_version']) {
                throw new DealCoordinationError('LISTING_TERMS_CHANGED', 'The pinned listing version is no longer active. Refresh the accepted terms before confirming.', $correlationId, status: 409, retryable: true);
            }
            if ((string) $listing['owner_user_id'] !== (string) $invitation->invited_provider_user_id) {
                throw new DealCoordinationError('LISTING_PROVIDER_CHANGED', 'The invitation provider no longer owns the pinned listing.', $correlationId, status: 409);
            }
            $workShape = (string) ($offer['work_shape'] ?? $listing['work_shape'] ?? '');
            if ($workShape === 'A3' && ($appointmentReservationId === null || $appointmentReservationId === '')) {
                throw new DealCoordinationError('APPOINTMENT_HOLD_REQUIRED', 'Choose and hold an appointment time before confirming this A3 agreement.', $correlationId, status: 422);
            }
            if ($workShape !== 'A3' && $appointmentReservationId !== null) {
                throw new DealCoordinationError('UNEXPECTED_APPOINTMENT_HOLD', 'An appointment hold is only valid for an A3 listing.', $correlationId, status: 422);
            }

            $resourceKey = (string) ($offer['resource_key'] ?? '');
            $quantity = (int) ($offer['quantity'] ?? 0);
            $bucket = $this->capacity->findOpenQuantityBucket(
                (string) $offer['listing_id'],
                (string) $offer['listing_version_id'],
                $resourceKey,
            );
            $currentCapacityHash = hash('sha256', json_encode([
                'listing_id' => $offer['listing_id'],
                'listing_version_id' => $offer['listing_version_id'],
                'resource_key' => $resourceKey,
                'quantity' => $quantity,
                'capacity_id' => $bucket['id'] ?? null,
                'remaining_quantity' => $bucket['remaining_quantity'] ?? null,
            ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            if (! hash_equals($offer['capacity_hash'], $currentCapacityHash)
                || ($resourceKey !== '' && ($bucket === null || (int) $bucket['remaining_quantity'] < $quantity))) {
                throw new DealCoordinationError('CAPACITY_CHANGED', 'The pinned listing capacity changed. Review and confirm the updated availability.', $correlationId, status: 409, retryable: true);
            }

            $selection = [
                'listing_version_id' => $offer['listing_version_id'],
                'variant_id' => $offer['variant_id'] ?? null,
                'package_id' => $offer['package_id'] ?? null,
                'addon_ids' => array_values((array) ($offer['addon_ids'] ?? [])),
                'deal_chain_combination_id' => $offer['deal_chain_combination_id'] ?? null,
            ];
            try {
                $order = $this->childOrders->formChildOrder(
                    actorUserId: $actorUserId,
                    params: [
                        'deal_chain_id' => $dealChainId,
                        'deal_need_id' => $dealNeedId,
                        'listing_id' => (string) $offer['listing_id'],
                        'buyer_user_id' => $actorUserId,
                        'provider_user_id' => (string) $invitation->invited_provider_user_id,
                        'amount_minor' => (int) $offer['amount_minor'],
                        'currency' => (string) ($offer['currency'] ?? 'PHP'),
                        'quantity' => $quantity,
                        'lane' => (string) ($offer['lane'] ?? 'external_cash'),
                        'expected_listing_version' => (int) $offer['listing_version'],
                        'expected_listing_version_id' => (string) $offer['listing_version_id'],
                        'resource_key' => $resourceKey,
                        'appointment_reservation_id' => $appointmentReservationId,
                        'selection' => $selection,
                        'unit_amount_minor' => isset($offer['unit_amount_minor']) ? (int) $offer['unit_amount_minor'] : null,
                    ],
                    idempotencyKey: $idempotencyKey,
                    correlationId: $correlationId,
                );
            } catch (KernelException $error) {
                throw new DealCoordinationError(
                    $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: $error->status,
                    fieldErrors: $error->envelope->fieldErrors,
                    retryable: $error->envelope->retryable,
                );
            }

            $confirmedCapacityHash = (string) $offer['capacity_hash'];
            if ($appointmentReservationId !== null) {
                $appointment = $this->capacity->activeAppointmentForOrder((string) $order['order_id']);
                if ($appointment === null || (string) $appointment['work_instance_id'] !== (string) $order['work_instance_id']) {
                    throw new DealCoordinationError('APPOINTMENT_NOT_COMMITTED', 'The selected appointment could not be committed to the child Order.', $correlationId, status: 409);
                }
                $confirmedCapacityHash = hash('sha256', json_encode([
                    'staged_capacity_hash' => $offer['capacity_hash'],
                    'appointment_reservation_id' => $appointmentReservationId,
                    'starts_at' => $appointment['starts_at'],
                    'ends_at' => $appointment['ends_at'],
                    'duration_minutes' => (int) $appointment['duration_minutes'],
                ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
            $now = now();
            DB::table('deal_need_confirmations')->insert([
                'id' => (string) Str::uuid7(),
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => $dealNeedId,
                'invitation_id' => $invitationId,
                'order_id' => $order['order_id'],
                'appointment_reservation_id' => $appointmentReservationId,
                'confirmed_by_user_id' => $actorUserId,
                'listing_id' => $offer['listing_id'],
                'listing_version_id' => $offer['listing_version_id'],
                'terms_hash' => $offer['terms_hash'],
                'capacity_hash' => $confirmedCapacityHash,
                'payload_version' => 1,
                'correlation_id' => $correlationId,
                'confirmed_at' => $now,
                'created_at' => $now,
            ]);
            if (is_string($order['work_instance_id'] ?? null)) {
                $this->workGates->registerConfirmedNeedWork(
                    dealChainId: $dealChainId,
                    dealNeedId: $dealNeedId,
                    orderId: (string) $order['order_id'],
                    workInstanceId: $order['work_instance_id'],
                    correlationId: $correlationId,
                );
            }

            $auditId = $this->audits->record(
                action: 'deal_need.customer_confirmed',
                targetType: 'deal_need',
                targetId: $dealNeedId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'ConfirmDealNeedAgreement',
                expectedVersion: $expectedNeedVersion,
                previous: ['status' => (string) $need->status, 'version' => (int) $need->version],
                next: $order,
                reason: 'Coordinator confirmed exact accepted provider terms and formed independent child Order',
            );
            $this->outbox->enqueue(
                eventType: 'deal_need.customer_confirmed',
                aggregateType: 'deal_need',
                aggregateId: $dealNeedId,
                payload: $order,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $this->idempotency->succeed($reservation->row, $order);

            return $order;
        });
    }
}

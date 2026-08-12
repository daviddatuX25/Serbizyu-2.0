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
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }

            $buyerId = (string) $order->buyer_user_id;
            $providerId = (string) $order->provider_user_id;
            $isBuyer = $actorUserId === $buyerId;
            $isProvider = $actorUserId === $providerId;
            if (! $isBuyer && ! $isProvider) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to finalize this order.', $correlationId, status: 403);
            }

            $scope = 'order.finalize:'.$orderId;
            $fingerprint = [
                'operation' => 'order.finalize',
                'order_id' => $orderId,
                'expected_order_version' => $expectedOrderVersion,
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
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
            }

            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
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

            $buyerParty = DB::table('order_parties')
                ->where('order_id', $orderId)
                ->where('party_type', 'buyer')
                ->where('status', 'active')
                ->first();
            $proposal = [];
            if ($buyerParty !== null) {
                $partyScope = json_decode((string) ($buyerParty->scope ?? '{}'), true);
                if (is_array($partyScope) && isset($partyScope['proposal']) && is_array($partyScope['proposal'])) {
                    $proposal = $partyScope['proposal'];
                }
            }
            if ($proposal === []) {
                $proposal = [
                    'amount_minor' => 0,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'listing_version_number' => null,
                    'capacity_reservation_id' => null,
                ];
            }

            $listingId = (string) $order->listing_id;
            $source = $this->listings->findActiveApproved($listingId);
            if ($source === null) {
                throw new OrderError('LISTING_NOT_AVAILABLE', 'That listing is no longer available.', $correlationId, status: 409);
            }

            $expectedListingVersion = $proposal['listing_version_number'] ?? null;
            if ($expectedListingVersion !== null && (int) $expectedListingVersion !== (int) $source['listing_version_number']) {
                throw new OrderError(
                    'VERSION_CONFLICT',
                    'This listing changed. Refresh and re-propose before finalizing.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }

            if ($isBuyer && (string) $source['owner_user_id'] !== $providerId) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to finalize this order.', $correlationId, status: 403);
            }

            $amountMinor = (int) ($proposal['amount_minor'] ?? $source['price_amount_minor'] ?? 0);
            $currency = (string) ($proposal['currency'] ?? $source['currency'] ?? 'PHP');
            $capacityReservationId = isset($proposal['capacity_reservation_id']) && is_string($proposal['capacity_reservation_id'])
                ? $proposal['capacity_reservation_id']
                : null;

            if ($capacityReservationId !== null) {
                try {
                    $this->capacity->commit($capacityReservationId, $correlationId);
                } catch (KernelException $error) {
                    throw new OrderError(
                        $error->envelope->code,
                        $error->getMessage(),
                        $correlationId,
                        status: $error->status,
                        retryable: $error->envelope->retryable,
                    );
                }
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
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
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

            $workId = (string) Str::uuid7();
            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $source['capability_profile_id'] !== '' ? $source['capability_profile_id'] : null,
                'work_shape' => $source['listing_type'] === 'product' ? 'product_handoff' : 'local_service',
                'status' => 'not_started',
                'scheduled_at' => null,
                'started_at' => null,
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => null,
                'structure_payload_version' => null,
                'completion_evidence_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $obligationId = (string) Str::uuid7();
            DB::table('payment_obligations')->insert([
                'id' => $obligationId,
                'order_id' => $orderId,
                'work_instance_id' => $workId,
                'purpose' => 'primary_consideration',
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'lane' => 'external_cash',
                'status' => 'created',
                'due_condition' => 'on_acceptance',
                'policy_version_id' => null,
                'platform_fee_amount_minor' => 0,
                'processor_cost_amount_minor' => 0,
                'payer_user_id' => $buyerId,
                'recipient_user_id' => $providerId,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $response = [
                'order_id' => $orderId,
                'status' => 'accepted',
                'version' => $nextVersion,
                'terms_snapshot_version' => 1,
                'work_instance_id' => $workId,
                'payment_obligation_id' => $obligationId,
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

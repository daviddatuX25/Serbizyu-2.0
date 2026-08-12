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

final class SubmitOrderProposal
{
    public function __construct(
        private readonly OrderListingSourcePort $listings,
        private readonly OrderCapacityPort $capacity,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /**
     * @param  array{amount_minor?: int, currency?: string, quantity?: int}  $input
     * @return array<string, mixed>
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
        $quantity = max(1, (int) ($input['quantity'] ?? 1));

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
        ): array {
            $source = $this->listings->findActiveApproved($listingId);
            if ($source === null) {
                throw new OrderError('LISTING_NOT_AVAILABLE', 'That listing is not available to book.', $correlationId, status: 404);
            }
            if ((int) $source['listing_version_number'] !== $expectedListingVersion) {
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

            $resolvedAmount = $amountMinor > 0
                ? $amountMinor
                : (int) ($source['price_amount_minor'] ?? 0);
            $resolvedCurrency = $amountMinor > 0
                ? $currency
                : (string) ($source['currency'] ?? 'PHP');

            $scope = 'order.propose:'.$buyerUserId.':'.$listingId;
            $fingerprint = [
                'operation' => 'order.propose',
                'listing_id' => $listingId,
                'expected_listing_version' => $expectedListingVersion,
                'amount_minor' => $resolvedAmount,
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
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

            $capacityReservationId = null;
            $bucket = $this->capacity->findOpenQuantityBucket($listingId, $source['listing_version_id']);
            if ($bucket !== null) {
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
                        $error->envelope->code,
                        $error->getMessage(),
                        $correlationId,
                        status: $error->status,
                        retryable: $error->envelope->retryable,
                    );
                }
            }

            $now = now();
            $orderId = (string) Str::uuid7();

            DB::table('orders')->insert([
                'id' => $orderId,
                'origin' => 'listing',
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => $source['owner_user_id'],
                'status' => 'pending_acceptance',
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
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
                'listing_version_id' => $source['listing_version_id'],
                'listing_version_number' => $source['listing_version_number'],
                'capacity_reservation_id' => $capacityReservationId,
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

            $response = [
                'order_id' => $orderId,
                'status' => 'pending_acceptance',
                'version' => 1,
                'listing_id' => $listingId,
                'listing_version_id' => $source['listing_version_id'],
                'listing_version_number' => $source['listing_version_number'],
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => $source['owner_user_id'],
                'amount_minor' => $resolvedAmount,
                'currency' => $resolvedCurrency,
                'quantity' => $quantity,
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
        foreach (['orders', 'order_parties', 'idempotency_keys', 'audit_events', 'outbox_messages'] as $table) {
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

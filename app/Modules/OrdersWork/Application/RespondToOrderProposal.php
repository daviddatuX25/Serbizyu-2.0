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
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use JsonException;

final class RespondToOrderProposal
{
    public function __construct(
        private readonly OrderCapacityPort $capacity,
        private readonly OrderPaymentObligationPort $payments,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}

    /**
     * @param  array{amount_minor?: int, currency?: string, scope?: array<string, mixed>, note?: string|null}  $input
     * @return array<string, mixed>
     */
    public function handle(
        string $actorUserId,
        string $orderId,
        string $action,
        int $expectedOrderVersion,
        string $idempotencyKey,
        string $correlationId,
        array $input = [],
    ): array {
        if (! in_array($action, ['decline', 'counter', 'amend'], true)) {
            throw new OrderError('INVALID_ACTION', 'This order proposal action is not supported.', $correlationId, status: 422);
        }
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new OrderError('INVALID_IDEMPOTENCY_KEY', 'Use a valid idempotency key.', $correlationId, fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']]);
        }
        if (in_array($action, ['counter', 'amend'], true) && (! isset($input['amount_minor']) || ! is_int($input['amount_minor']) || $input['amount_minor'] < 0)) {
            throw new OrderError('VALIDATION_FAILED', 'Enter a non-negative proposed amount.', $correlationId, fieldErrors: ['amount_minor' => ['Enter a non-negative amount.']]);
        }
        if (isset($input['scope']) && ! is_array($input['scope'])) {
            throw new OrderError('VALIDATION_FAILED', 'Proposal scope must be structured terms.', $correlationId, fieldErrors: ['scope' => ['Enter valid proposal terms.']]);
        }
        if (isset($input['note']) && ! is_string($input['note'])) {
            throw new OrderError('VALIDATION_FAILED', 'Proposal note must be text.', $correlationId, fieldErrors: ['note' => ['Enter a valid note.']]);
        }

        foreach (['orders', 'order_proposals', 'order_terms_snapshots', 'order_parties', 'idempotency_keys', 'audit_events', 'outbox_messages'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new OrderError('STORAGE_UNAVAILABLE', 'Order proposal storage is unavailable.', $correlationId, status: 503, retryable: true);
            }
        }

        return DB::transaction(function () use ($actorUserId, $orderId, $action, $expectedOrderVersion, $idempotencyKey, $correlationId, $input): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }
            if (! in_array($actorUserId, [(string) $order->buyer_user_id, (string) $order->provider_user_id], true)) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to respond to this order.', $correlationId, status: 403);
            }
            $fingerprint = [
                'operation' => 'order.proposal.'.$action,
                'order_id' => $orderId,
                'expected_order_version' => $expectedOrderVersion,
                'input' => $input,
            ];
            try {
                $preReplay = $this->idempotency->findSucceededReplay(
                    scope: 'order.proposal.'.$action.':'.$orderId,
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
            if ($preReplay?->isReplay) {
                return is_array($preReplay->replayPayload) ? $preReplay->replayPayload : [];
            }
            $this->assertOrderNotHeld($orderId, $correlationId);

            if ((int) $order->version !== $expectedOrderVersion) {
                throw new OrderError('VERSION_CONFLICT', 'This order changed. Refresh before responding.', $correlationId, status: 409, retryable: true);
            }

            $current = $order->current_proposal_id !== null
                ? DB::table('order_proposals')->where('id', $order->current_proposal_id)->lockForUpdate()->first()
                : null;
            if ($current === null) {
                throw new OrderError('INVALID_PROPOSAL', 'The order has no current proposal.', $correlationId, status: 409);
            }
            $scope = json_decode((string) $current->scope, true);
            if (! is_array($scope)) {
                throw new OrderError('INVALID_PROPOSAL', 'The current proposal terms are invalid.', $correlationId, status: 422);
            }

            $isInitialResponse = (string) $order->status === 'proposed'
                && (string) $current->status === 'proposed'
                && in_array($action, ['decline', 'counter'], true);
            $isAmendment = $action === 'amend'
                && in_array((string) $order->status, ['accepted', 'in_progress'], true)
                && (string) $current->status !== 'proposed';
            if (! $isInitialResponse && ! $isAmendment) {
                throw new OrderError('INVALID_STATE', 'This proposal cannot be changed in its current order state.', $correlationId, status: 409);
            }
            if ($action !== 'amend' && (string) $current->proposed_by_user_id === $actorUserId) {
                throw new OrderError('COUNTERPARTY_REQUIRED', 'Only the counterparty to the current proposal can respond.', $correlationId, status: 403);
            }
            if ($action === 'amend' && (string) $current->status === 'proposed') {
                throw new OrderError('INVALID_STATE', 'A proposal is already awaiting acceptance.', $correlationId, status: 409);
            }

            try {
                $reservation = $this->idempotency->begin(
                    scope: 'order.proposal.'.$action.':'.$orderId,
                    key: $idempotencyKey,
                    fingerprint: $fingerprint,
                    correlationId: $correlationId,
                    actorUserId: $actorUserId,
                );
            } catch (KernelException $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status, fieldErrors: $error->envelope->fieldErrors, retryable: $error->envelope->retryable);
            }
            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }

            $now = now();
            $nextOrderVersion = $expectedOrderVersion + 1;
            if ($action === 'decline') {
                $reservationId = (string) ($current->capacity_reservation_id ?? ($scope['capacity_reservation_id'] ?? ''));
                if ($reservationId !== '') {
                    try {
                        $this->capacity->release($reservationId, $correlationId);
                    } catch (KernelException $error) {
                        throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status, fieldErrors: $error->envelope->fieldErrors, retryable: $error->envelope->retryable);
                    }
                }
                DB::table('order_proposals')->where('id', $current->id)->update([
                    'status' => 'declined',
                    'responded_by_user_id' => $actorUserId,
                    'responded_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('orders')->where('id', $orderId)->update([
                    'status' => 'cancelled',
                    'cancelled_at' => $now,
                    'version' => $nextOrderVersion,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
                $response = [
                    'order_id' => $orderId,
                    'proposal_id' => (string) $current->id,
                    'status' => 'cancelled',
                    'version' => $nextOrderVersion,
                ];
                $eventType = 'order.proposal_declined';
                $auditAction = 'order.proposal_decline';
                $reason = 'Counterparty declined the current Order proposal';
            } else {
                $nextScope = $scope;
                $newScope = $input['scope'] ?? [];
                foreach (['quantity', 'variant_id', 'resource_key', 'package_id', 'addon_ids', 'slot', 'capacity_reservation_id', 'appointment_reservation_id', 'listing_type', 'work_specification', 'milestone_stages'] as $capacityField) {
                    $existingCapacityValue = $capacityField === 'appointment_reservation_id'
                        ? ($current->appointment_reservation_id ?? null)
                        : ($scope[$capacityField] ?? null);
                    if (array_key_exists($capacityField, $newScope) && $newScope[$capacityField] !== $existingCapacityValue) {
                        throw new OrderError('SCOPE_CHANGE_REQUIRES_REPROPOSAL', 'Changing selected stock, booking capacity, listing type, or Work specification requires a new proposal.', $correlationId, status: 409);
                    }
                }
                $nextScope = array_replace($nextScope, $newScope);
                $amountMinor = (int) $input['amount_minor'];
                $quantity = max(1, (int) ($nextScope['quantity'] ?? 1));
                $unitAmountMinor = $amountMinor % $quantity === 0 ? intdiv($amountMinor, $quantity) : null;
                $currency = strtoupper((string) ($input['currency'] ?? $current->currency));
                if (strlen($currency) !== 3) {
                    throw new OrderError('VALIDATION_FAILED', 'Choose a valid currency.', $correlationId, fieldErrors: ['currency' => ['Enter a three-letter currency code.']]);
                }
                $nextScope['amount_minor'] = $amountMinor;
                $nextScope['unit_amount_minor'] = $unitAmountMinor;
                $nextScope['currency'] = $currency;
                $nextScope['note'] = isset($input['note']) ? trim((string) $input['note']) : ($scope['note'] ?? null);
                if (isset($nextScope['items'][0]) && is_array($nextScope['items'][0])) {
                    $nextScope['items'][0]['amount_minor'] = $amountMinor;
                    $nextScope['items'][0]['unit_amount_minor'] = $unitAmountMinor;
                }
                $scopeJson = $this->canonicalJson($nextScope, $correlationId);
                $proposalId = (string) Str::uuid7();
                $kind = $action === 'counter' ? 'counter' : 'amendment';
                $proposalVersion = ((int) DB::table('order_proposals')->where('order_id', $orderId)->max('proposal_version')) + 1;
                if ($action === 'counter') {
                    DB::table('order_proposals')->where('id', $current->id)->update([
                        'status' => 'superseded',
                        'updated_at' => $now,
                    ]);
                }
                DB::table('order_proposals')->insert([
                    'id' => $proposalId,
                    'order_id' => $orderId,
                    'proposal_version' => $proposalVersion,
                    'parent_proposal_id' => $current->id,
                    'kind' => $kind,
                    'status' => 'proposed',
                    'proposed_by_user_id' => $actorUserId,
                    'responded_by_user_id' => null,
                    'responded_at' => null,
                    'source_listing_version_id' => $current->source_listing_version_id,
                    'scope' => $scopeJson,
                    'scope_payload_version' => (int) ($current->scope_payload_version ?? 1),
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'terms_hash' => hash('sha256', $scopeJson),
                    'note' => $nextScope['note'],
                    'capacity_reservation_id' => $current->capacity_reservation_id,
                    'appointment_reservation_id' => $current->appointment_reservation_id ?? null,
                    'expires_at' => $current->expires_at,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('orders')->where('id', $orderId)->update([
                    'current_proposal_id' => $proposalId,
                    'version' => $nextOrderVersion,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
                $response = [
                    'order_id' => $orderId,
                    'proposal_id' => $proposalId,
                    'proposal_version' => $proposalVersion,
                    'status' => 'proposed',
                    'version' => $nextOrderVersion,
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                ];
                $eventType = $action === 'counter' ? 'order.proposal_countered' : 'order.amendment_proposed';
                $auditAction = 'order.proposal_'.$action;
                $reason = $action === 'counter' ? 'Counterparty proposed new immutable Order terms' : 'Participant proposed bilateral amended Order terms';
            }

            $auditId = $this->audits->record(
                action: $auditAction,
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'RespondToOrderProposal',
                expectedVersion: $expectedOrderVersion,
                previous: ['status' => (string) $order->status, 'current_proposal_id' => (string) $current->id],
                next: $response,
                reason: $reason,
                orderId: $orderId,
            );
            $this->outbox->enqueue(
                eventType: $eventType,
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $recipientUserId = $action === 'decline'
                ? (string) $current->proposed_by_user_id
                : ($actorUserId === (string) $order->buyer_user_id
                    ? (string) $order->provider_user_id
                    : (string) $order->buyer_user_id);
            $attention = $action === 'decline'
                ? NotificationAttention::Updates
                : NotificationAttention::NeedsAction;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: $eventType,
                attention: $attention,
                title: $action === 'decline'
                    ? 'An Order proposal was declined'
                    : 'An Order proposal needs your response',
                body: $action === 'decline'
                    ? 'Review the current Order status.'
                    : 'Review the current Order terms and respond.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: $eventType.':'.$orderId.':v'.($action === 'decline' ? $nextOrderVersion : $proposalVersion).':'.$recipientUserId,
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

    /** @return array<string, mixed> */
    public function acceptAmendment(
        string $actorUserId,
        string $orderId,
        string $proposalId,
        int $expectedOrderVersion,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new OrderError('INVALID_IDEMPOTENCY_KEY', 'Use a valid idempotency key.', $correlationId);
        }

        return DB::transaction(function () use ($actorUserId, $orderId, $proposalId, $expectedOrderVersion, $idempotencyKey, $correlationId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }
            if (! in_array($actorUserId, [(string) $order->buyer_user_id, (string) $order->provider_user_id], true)) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not authorized to accept this amendment.', $correlationId, status: 403);
            }
            $fingerprint = [
                'operation' => 'order.amendment.accept',
                'order_id' => $orderId,
                'proposal_id' => $proposalId,
                'expected_order_version' => $expectedOrderVersion,
            ];
            try {
                $preReplay = $this->idempotency->findSucceededReplay(
                    scope: 'order.amendment.accept:'.$orderId,
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
            if ($preReplay?->isReplay) {
                return is_array($preReplay->replayPayload) ? $preReplay->replayPayload : [];
            }
            $this->assertOrderNotHeld($orderId, $correlationId);
            if ((int) $order->version !== $expectedOrderVersion) {
                throw new OrderError('VERSION_CONFLICT', 'This order changed. Refresh before accepting the amendment.', $correlationId, status: 409, retryable: true);
            }
            if (! in_array((string) $order->status, ['accepted', 'in_progress'], true) || (string) $order->current_proposal_id !== $proposalId) {
                throw new OrderError('INVALID_STATE', 'This amendment is not the current proposal for an accepted order.', $correlationId, status: 409);
            }

            $proposal = DB::table('order_proposals')->where('id', $proposalId)->lockForUpdate()->first();
            if ($proposal === null || (string) $proposal->kind !== 'amendment' || (string) $proposal->status !== 'proposed') {
                throw new OrderError('INVALID_PROPOSAL', 'This amendment is no longer awaiting acceptance.', $correlationId, status: 409);
            }
            if ((string) $proposal->proposed_by_user_id === $actorUserId) {
                throw new OrderError('COUNTERPARTY_REQUIRED', 'Only the counterparty to an amendment can accept it.', $correlationId, status: 403);
            }

            try {
                $reservation = $this->idempotency->begin(
                    scope: 'order.amendment.accept:'.$orderId,
                    key: $idempotencyKey,
                    fingerprint: $fingerprint,
                    correlationId: $correlationId,
                    actorUserId: $actorUserId,
                );
            } catch (KernelException $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status, fieldErrors: $error->envelope->fieldErrors, retryable: $error->envelope->retryable);
            }
            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }

            $termsScope = json_decode((string) $proposal->scope, true);
            $previousTerms = DB::table('order_terms_snapshots')->where('id', $order->current_terms_snapshot_id)->lockForUpdate()->first();
            if (! is_array($termsScope) || $previousTerms === null) {
                throw new OrderError('INVALID_PROPOSAL', 'The existing accepted terms are unavailable.', $correlationId, status: 409);
            }
            try {
                $paymentAmendment = $this->payments->supersedePrimaryForAmendedTerms(
                    orderId: $orderId,
                    actorUserId: $actorUserId,
                    amountMinor: (int) $proposal->amount_minor,
                    currency: (string) $proposal->currency,
                    correlationId: $correlationId,
                    idempotencyKey: $idempotencyKey,
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
            $snapshotVersion = ((int) DB::table('order_terms_snapshots')->where('order_id', $orderId)->max('snapshot_version')) + 1;
            $snapshotId = (string) Str::uuid7();
            $now = now();
            DB::table('order_terms_snapshots')->insert([
                'id' => $snapshotId,
                'order_id' => $orderId,
                'snapshot_version' => $snapshotVersion,
                'source_listing_version_id' => $proposal->source_listing_version_id,
                'source_quote_id' => $previousTerms->source_quote_id,
                'scope' => $this->canonicalJson($termsScope, $correlationId),
                'scope_payload_version' => (int) $previousTerms->scope_payload_version,
                'amount_minor' => (int) $proposal->amount_minor,
                'currency' => (string) $proposal->currency,
                'payment_lane_options' => $previousTerms->payment_lane_options,
                'payment_lane_options_payload_version' => (int) $previousTerms->payment_lane_options_payload_version,
                'cancellation_rules' => $previousTerms->cancellation_rules,
                'cancellation_rules_payload_version' => (int) $previousTerms->cancellation_rules_payload_version,
                'review_rules' => $previousTerms->review_rules,
                'review_rules_payload_version' => (int) $previousTerms->review_rules_payload_version,
                'policy_version_id' => $previousTerms->policy_version_id,
                'accepted_by_user_id' => $actorUserId,
                'accepted_at' => $now,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);
            DB::table('order_proposals')->where('id', $proposalId)->update([
                'status' => 'accepted',
                'responded_by_user_id' => $actorUserId,
                'responded_at' => $now,
                'updated_at' => $now,
            ]);
            $nextVersion = $expectedOrderVersion + 1;
            DB::table('orders')->where('id', $orderId)->update([
                'current_terms_snapshot_id' => $snapshotId,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            $response = [
                'order_id' => $orderId,
                'proposal_id' => $proposalId,
                'status' => (string) $order->status,
                'version' => $nextVersion,
                'terms_snapshot_id' => $snapshotId,
                'terms_snapshot_version' => $snapshotVersion,
                'amount_minor' => (int) $proposal->amount_minor,
                'currency' => (string) $proposal->currency,
                'payment_obligation_id' => $paymentAmendment['obligation_id'],
                'superseded_payment_obligation_id' => $paymentAmendment['superseded_obligation_id'],
                'payment_obligation_status' => $paymentAmendment['superseded_obligation_id'] === null ? 'unchanged' : 'superseded',
            ];
            $auditId = $this->audits->record(
                action: 'order.amendment_accept',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'AcceptOrderAmendment',
                expectedVersion: $expectedOrderVersion,
                previous: ['current_terms_snapshot_id' => (string) $order->current_terms_snapshot_id],
                next: $response,
                reason: 'Counterparty accepted a new immutable Order terms version',
                orderId: $orderId,
            );
            $this->outbox->enqueue(
                eventType: 'order.amendment_accepted',
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $recipientUserId = (string) $proposal->proposed_by_user_id;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: 'order.amendment_accepted',
                attention: NotificationAttention::Updates,
                title: 'Order amendment accepted',
                body: 'Review the updated Order terms.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'order.amendment_accepted:'.$orderId.':v'.$nextVersion.':'.$recipientUserId,
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

    private function assertOrderNotHeld(string $orderId, string $correlationId): void
    {
        if ($this->administrativeHolds->hasActiveHold('order', $orderId)) {
            throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Order agreement has an active administrative hold.', $correlationId, status: 409);
        }
    }

    private function canonicalJson(array $scope, string $correlationId): string
    {
        try {
            return json_encode($scope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (JsonException) {
            throw new OrderError('VALIDATION_FAILED', 'Proposal terms could not be encoded.', $correlationId, status: 422);
        }
    }
}

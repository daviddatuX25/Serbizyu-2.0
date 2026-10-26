<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\PublicReferenceAllocator;
use App\Shared\Contracts\ActingForAuthorizer;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\EvidenceClass;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Contracts\PaymentMismatchCasePort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class OrderPaymentObligationAdapter implements OrderPaymentObligationPort
{
    private const DISPOSABLE_ENVIRONMENTS = ['local', 'test', 'testing', 'capstone'];

    public function __construct(
        private readonly PublicReferenceAllocator $references,
        private readonly OrderListingSourcePort $listingSource,
        private readonly ActingForAuthorizer $actingFor,
        private readonly OutboxWriter $outbox,
        private readonly OutboxDispatcher $dispatcher,
        private readonly PaymentMismatchCasePort $mismatchCases,
        private readonly NotificationsPort $notifications,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
    ) {}

    /**
     * Create the primary payment obligation within the caller-owned transaction.
     *
     * @see OrderPaymentObligationPort::createPrimary()
     */
    public function createPrimary(
        string $orderId,
        string $workInstanceId,
        int $amountMinor,
        string $currency,
        string $payerUserId,
        string $recipientUserId,
        string $correlationId,
        string $lane = 'external_cash',
    ): string {
        $allowedLanes = ['external_cash', 'p2p_transfer', 'protected_digital'];
        if (! in_array($lane, $allowedLanes, true)) {
            throw new \InvalidArgumentException("Invalid payment lane [{$lane}].");
        }
        if ($lane === 'protected_digital' && ! $this->protectedDigitalSandboxEnabled()) {
            throw new \InvalidArgumentException('Protected digital payment obligations are limited to authorized disposable sandbox cohorts.');
        }

        $obligationId = (string) Str::uuid7();
        $now = now();

        $dueCondition = 'on_work_acceptance';

        DB::table('payment_obligations')->insert([
            'id' => $obligationId,
            'public_reference' => $this->references->allocate('payment_obligations'),
            'order_id' => $orderId,
            'work_instance_id' => $workInstanceId,
            'purpose' => 'primary_consideration',
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'lane' => $lane,
            'status' => 'not_due',
            'due_condition' => $dueCondition,
            'policy_version_id' => null,
            'platform_fee_amount_minor' => 0,
            'processor_cost_amount_minor' => 0,
            'payer_user_id' => $payerUserId,
            'recipient_user_id' => $recipientUserId,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $obligationId;
    }

    /**
     * Supersede an unreported obligation when both Order parties accept new consideration.
     *
     * The caller owns the surrounding Order transaction so agreement and payment history
     * either advance together or not at all.
     *
     * @return array{obligation_id: string, superseded_obligation_id: string|null}
     */
    public function supersedePrimaryForAmendedTerms(
        string $orderId,
        string $actorUserId,
        int $amountMinor,
        string $currency,
        string $correlationId,
        string $idempotencyKey,
    ): array {
        $currency = strtoupper($currency);
        if ($amountMinor < 0 || preg_match('/^[A-Z]{3}$/', $currency) !== 1) {
            throw new KernelException(
                'VALIDATION_FAILED',
                'Amended payment terms require a non-negative amount and a three-letter currency.',
                $correlationId,
                status: 422,
            );
        }

        $obligation = DB::table('payment_obligations')
            ->where('order_id', $orderId)
            ->where('purpose', 'primary_consideration')
            ->where('status', '!=', 'superseded')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();
        if ($obligation === null) {
            throw new KernelException(
                'PAYMENT_OBLIGATION_NOT_FOUND',
                'The current primary payment obligation is unavailable.',
                $correlationId,
                status: 409,
            );
        }

        if ((int) $obligation->amount_minor === $amountMinor && (string) $obligation->currency === $currency) {
            return ['obligation_id' => (string) $obligation->id, 'superseded_obligation_id' => null];
        }
        if ($this->administrativeHolds->hasActiveHold('payment_obligation', (string) $obligation->id)) {
            throw new KernelException('ADMINISTRATIVE_HOLD_ACTIVE', 'This Payment Obligation has an active administrative hold.', $correlationId, status: 409);
        }

        $safeEvents = [
            'payment.obligation.due',
            'payment.obligation.lane_selected',
            'payment.obligation.superseded',
            'payment.obligation.amended',
        ];
        $hasPaymentEvidence = DB::table('payment_events')
            ->where('payment_obligation_id', $obligation->id)
            ->where(function ($query) use ($safeEvents): void {
                $query->whereNotIn('event_type', $safeEvents)
                    ->orWhereNotNull('evidence_file_id');
            })
            ->exists();
        $hasProviderEvidence = DB::table('provider_events')
            ->where('payment_obligation_id', $obligation->id)
            ->exists();
        $hasFinancialTransaction = DB::table('financial_transactions')
            ->where('source_payment_obligation_id', $obligation->id)
            ->exists();
        if (
            ! in_array((string) $obligation->status, ['not_due', 'due'], true)
            || $obligation->settled_at !== null
            || $hasPaymentEvidence
            || $hasProviderEvidence
            || $hasFinancialTransaction
        ) {
            throw new KernelException(
                'PAYMENT_RECONCILIATION_REQUIRED',
                'Payment evidence exists for the current obligation; reconcile it before changing the agreed amount or currency.',
                $correlationId,
                status: 409,
            );
        }

        $now = now();
        $previousStatus = (string) $obligation->status;
        $successorId = (string) Str::uuid7();
        DB::table('payment_obligations')->where('id', $obligation->id)->update([
            'status' => 'superseded',
            'version' => DB::raw('version + 1'),
            'correlation_id' => $correlationId,
            'updated_at' => $now,
        ]);
        DB::table('payment_obligations')->insert([
            'id' => $successorId,
            'public_reference' => $this->references->allocate('payment_obligations'),
            'order_id' => (string) $obligation->order_id,
            'work_instance_id' => $obligation->work_instance_id,
            'purpose' => (string) $obligation->purpose,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'lane' => (string) $obligation->lane,
            'status' => $previousStatus,
            'due_condition' => (string) $obligation->due_condition,
            'policy_version_id' => $obligation->policy_version_id,
            'platform_fee_amount_minor' => (int) $obligation->platform_fee_amount_minor,
            'processor_cost_amount_minor' => (int) $obligation->processor_cost_amount_minor,
            'payer_user_id' => (string) $obligation->payer_user_id,
            'recipient_user_id' => (string) $obligation->recipient_user_id,
            'correlation_id' => $correlationId,
            'version' => 1,
            'supersedes_obligation_id' => (string) $obligation->id,
            'due_at' => $obligation->due_at,
            'settled_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->recordEvent(
            (string) $obligation->id,
            'payment.obligation.superseded',
            (string) $obligation->lane,
            (int) $obligation->amount_minor,
            (string) $obligation->currency,
            $actorUserId,
            $previousStatus,
            'superseded',
            $idempotencyKey.':payment-superseded',
            $correlationId,
            $now,
            ['successor_obligation_id' => $successorId, 'reason' => 'bilateral_order_terms_amendment'],
        );
        $this->recordEvent(
            $successorId,
            'payment.obligation.amended',
            (string) $obligation->lane,
            $amountMinor,
            $currency,
            $actorUserId,
            null,
            $previousStatus,
            $idempotencyKey.':payment-amended',
            $correlationId,
            $now,
            ['supersedes_obligation_id' => (string) $obligation->id],
        );

        return ['obligation_id' => $successorId, 'superseded_obligation_id' => (string) $obligation->id];
    }

    public function markDueFromWorkFact(string $orderId, string $workInstanceId, string $correlationId): ?string
    {
        $obligation = DB::table('payment_obligations')
            ->where('order_id', $orderId)
            ->where('work_instance_id', $workInstanceId)
            ->where('due_condition', 'on_work_acceptance')
            ->where('status', 'not_due')
            ->lockForUpdate()
            ->first();

        if ($obligation === null) {
            return null;
        }

        $now = now();
        DB::table('payment_obligations')
            ->where('id', $obligation->id)
            ->where('status', 'not_due')
            ->update([
                'status' => 'due',
                'due_at' => $now,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);

        DB::table('payment_events')->insert([
            'id' => (string) Str::uuid7(),
            'payment_obligation_id' => $obligation->id,
            'event_type' => 'payment.obligation.due',
            'lane' => (string) $obligation->lane,
            'amount_minor' => (int) $obligation->amount_minor,
            'currency' => (string) $obligation->currency,
            'actor_user_id' => null,
            'previous_status' => 'not_due',
            'new_status' => 'due',
            'idempotency_key' => 'work_due_'.substr($correlationId, 0, 12).'_'.(string) $obligation->id,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        return 'due';
    }

    public function projectForOrder(
        string $orderId,
        string $viewerUserId,
        ?string $acceptedListingVersionId,
    ): ?array {
        $obligation = DB::table('payment_obligations')
            ->where('order_id', $orderId)
            ->where('purpose', 'primary_consideration')
            ->where('status', '!=', 'superseded')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
        if ($obligation === null) {
            return null;
        }

        $status = (string) $obligation->status;
        $lane = (string) $obligation->lane;
        $isPayer = $viewerUserId === (string) $obligation->payer_user_id;
        $isRecipient = $viewerUserId === (string) $obligation->recipient_user_id;

        $proof = DB::table('payment_events as events')
            ->join('evidence_files as evidence', 'evidence.id', '=', 'events.evidence_file_id')
            ->where('events.payment_obligation_id', $obligation->id)
            ->where('events.event_type', 'payment.p2p.proof_submitted')
            ->whereNull('evidence.deleted_at')
            ->orderByDesc('events.occurred_at')
            ->first(['evidence.id', 'evidence.scan_status']);
        $reportedProofFacts = $lane === 'p2p_transfer'
            ? $this->latestSubmittedProofFacts((string) $obligation->id)
            : null;

        return [
            'id' => (string) $obligation->id,
            'status' => $status,
            'lane' => $lane,
            'amount_minor' => (int) $obligation->amount_minor,
            'currency' => (string) $obligation->currency,
            'eligible_lanes' => $this->eligibleLanes($acceptedListingVersionId),
            'can_select_lane' => $isPayer && $status === 'due',
            'can_report_cash' => $isPayer && $status === 'due' && $lane === 'external_cash',
            'can_acknowledge_cash' => $isRecipient && $status === 'payer_reported_cash' && $lane === 'external_cash',
            'can_submit_p2p_proof' => $isPayer && $lane === 'p2p_transfer'
                && ($status === 'due' || ($status === 'proof_rejected' && $reportedProofFacts !== null)),
            'can_verify_p2p_proof' => $isRecipient && $lane === 'p2p_transfer' && $status === 'payer_submitted_p2p_proof' && $proof?->scan_status === 'clean' && $reportedProofFacts !== null,
            'can_flag_payment_mismatch' => $isRecipient && (($lane === 'p2p_transfer' && $status === 'payer_submitted_p2p_proof' && $proof?->scan_status === 'clean' && $reportedProofFacts !== null)
                || ($lane === 'external_cash' && $status === 'payer_reported_cash')),
            'p2p_proof_scan_status' => $proof?->scan_status,
            'p2p_sent_amount_minor' => $reportedProofFacts['sent_amount_minor'] ?? null,
            'p2p_transfer_reference' => $reportedProofFacts['transfer_reference'] ?? null,
            'p2p_proof_url' => $isRecipient && $proof?->scan_status === 'clean'
                ? route('orders.payment-obligations.p2p.proof.show', [$orderId, $obligation->id])
                : null,
        ];
    }

    public function chooseLane(
        string $orderId,
        string $obligationId,
        string $payerUserId,
        string $lane,
        ?string $acceptedListingVersionId,
        string $correlationId,
        string $idempotencyKey,
    ): string {
        return DB::transaction(function () use ($orderId, $obligationId, $payerUserId, $lane, $acceptedListingVersionId, $correlationId, $idempotencyKey): string {
            $obligation = DB::table('payment_obligations')
                ->where('id', $obligationId)
                ->where('order_id', $orderId)
                ->lockForUpdate()
                ->first();
            if ($obligation === null) {
                throw new PaymentObligationError('OBLIGATION_NOT_FOUND', 'Payment obligation not found.', 404);
            }
            if ((string) $obligation->payer_user_id !== $payerUserId) {
                throw new PaymentObligationError('PAYER_REQUIRED', 'Only the payer can change the payment lane.', 403);
            }
            $priorSelection = DB::table('payment_events')
                ->where('payment_obligation_id', $obligationId)
                ->where('event_type', 'payment.obligation.superseded')
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($priorSelection !== null) {
                $priorPayload = is_string($priorSelection->payload) ? json_decode($priorSelection->payload, true) : (array) $priorSelection->payload;
                $successorId = (string) ($priorPayload['successor_obligation_id'] ?? '');
                $successor = $successorId === '' ? null : DB::table('payment_obligations')->where('id', $successorId)->first();
                if ($successor !== null && (string) $successor->lane === $lane) {
                    return $successorId;
                }
                throw new PaymentObligationError('IDEMPOTENCY_KEY_REUSED', 'This request key was already used for a different payment lane.', 409);
            }
            $this->assertPaymentObligationNotHeld($obligationId, $correlationId);
            if ((string) $obligation->status !== 'due') {
                throw new PaymentObligationError('PAYMENT_EVIDENCE_LOCKED', 'The payment lane cannot change after payment is reported or submitted.', 409);
            }
            $eligibleLanes = $this->eligibleLanes($acceptedListingVersionId);
            if (! in_array($lane, $eligibleLanes, true)) {
                throw new PaymentObligationError('PAYMENT_LANE_NOT_ELIGIBLE', 'That payment lane is not available for this order.', 422);
            }
            if ($lane === (string) $obligation->lane) {
                return (string) $obligation->id;
            }

            $now = now();
            $successorId = (string) Str::uuid7();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'superseded',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            DB::table('payment_obligations')->insert([
                'id' => $successorId,
                'public_reference' => $this->references->allocate('payment_obligations'),
                'order_id' => (string) $obligation->order_id,
                'work_instance_id' => $obligation->work_instance_id,
                'purpose' => (string) $obligation->purpose,
                'amount_minor' => (int) $obligation->amount_minor,
                'currency' => (string) $obligation->currency,
                'lane' => $lane,
                'status' => 'due',
                'due_condition' => (string) $obligation->due_condition,
                'policy_version_id' => $obligation->policy_version_id,
                'platform_fee_amount_minor' => 0,
                'processor_cost_amount_minor' => 0,
                'payer_user_id' => (string) $obligation->payer_user_id,
                'recipient_user_id' => (string) $obligation->recipient_user_id,
                'correlation_id' => $correlationId,
                'version' => 1,
                'supersedes_obligation_id' => (string) $obligation->id,
                'due_at' => $obligation->due_at ?? $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->recordEvent(
                (string) $obligation->id,
                'payment.obligation.superseded',
                (string) $obligation->lane,
                (int) $obligation->amount_minor,
                (string) $obligation->currency,
                $payerUserId,
                'due',
                'superseded',
                $idempotencyKey,
                $correlationId,
                $now,
                ['successor_obligation_id' => $successorId],
            );
            $this->recordEvent(
                $successorId,
                'payment.obligation.lane_selected',
                $lane,
                (int) $obligation->amount_minor,
                (string) $obligation->currency,
                $payerUserId,
                'due',
                'due',
                $idempotencyKey,
                $correlationId,
                $now,
                ['supersedes_obligation_id' => (string) $obligation->id],
            );

            return $successorId;
        });
    }

    public function reportCashPayment(
        string $orderId,
        string $obligationId,
        string $payerUserId,
        string $correlationId,
        string $idempotencyKey,
    ): string {
        return DB::transaction(function () use ($orderId, $obligationId, $payerUserId, $correlationId, $idempotencyKey): string {
            $obligation = DB::table('payment_obligations')
                ->where('id', $obligationId)
                ->where('order_id', $orderId)
                ->lockForUpdate()
                ->first();
            if ($obligation === null) {
                throw new PaymentObligationError('OBLIGATION_NOT_FOUND', 'Payment obligation not found.', 404);
            }
            if ((string) $obligation->payer_user_id !== $payerUserId) {
                throw new PaymentObligationError('PAYER_REQUIRED', 'Only the payer can report cash payment.', 403);
            }
            if ((string) $obligation->lane !== 'external_cash') {
                throw new PaymentObligationError('CASH_LANE_REQUIRED', 'Cash can only be reported for an external cash obligation.', 409);
            }
            if ((string) $obligation->status === 'payer_reported_cash') {
                return 'payer_reported_cash';
            }
            if ((string) $obligation->status !== 'due') {
                throw new PaymentObligationError('PAYMENT_NOT_DUE', 'This payment is not available to report.', 409);
            }

            $now = now();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'payer_reported_cash',
                'due_at' => $obligation->due_at ?? $now,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent(
                $obligationId,
                'payment.cash.reported',
                (string) $obligation->lane,
                (int) $obligation->amount_minor,
                (string) $obligation->currency,
                $payerUserId,
                'due',
                'payer_reported_cash',
                $idempotencyKey,
                $correlationId,
                $now,
            );
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->recipient_user_id,
                eventType: 'payment.cash.reported',
                attention: NotificationAttention::NeedsAction,
                title: 'Cash payment reported',
                body: 'Confirm the cash receipt or report a mismatch.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return 'payer_reported_cash';
        });
    }

    public function acknowledgeCashReceipt(
        string $orderId,
        string $obligationId,
        string $actorUserId,
        string $recipientUserId,
        ?string $consentGrantId,
        string $correlationId,
        string $idempotencyKey,
    ): string {
        return DB::transaction(function () use ($orderId, $obligationId, $actorUserId, $recipientUserId, $consentGrantId, $correlationId, $idempotencyKey): string {
            $obligation = DB::table('payment_obligations')
                ->where('id', $obligationId)
                ->where('order_id', $orderId)
                ->lockForUpdate()
                ->first();
            if ($obligation === null) {
                throw new PaymentObligationError('OBLIGATION_NOT_FOUND', 'Payment obligation not found.', 404);
            }
            if ((string) $obligation->recipient_user_id !== $recipientUserId) {
                throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can acknowledge cash receipt.', 403);
            }
            if ((string) $obligation->payer_user_id === $actorUserId) {
                throw new PaymentObligationError('PAYER_CANNOT_ACKNOWLEDGE', 'The payer cannot acknowledge their own cash report.', 403);
            }
            if ($actorUserId !== $recipientUserId) {
                if ($consentGrantId === null) {
                    throw new PaymentObligationError('RECIPIENT_REQUIRED', 'An active recipient delegation is required.', 403);
                }
                $this->actingFor->assertActive(
                    grantId: $consentGrantId,
                    granteeUserId: $actorUserId,
                    grantorUserId: $recipientUserId,
                    correlationId: $correlationId,
                    resourceType: 'payment_obligation',
                    resourceId: $obligationId,
                    requiredAction: 'acknowledge_cash_receipt',
                );
            }
            if ((string) $obligation->lane !== 'external_cash') {
                throw new PaymentObligationError('CASH_LANE_REQUIRED', 'Only external cash receipts can be acknowledged here.', 409);
            }
            if ((string) $obligation->status === 'settled') {
                return 'settled';
            }
            if ((string) $obligation->status !== 'payer_reported_cash') {
                throw new PaymentObligationError('CASH_REPORT_REQUIRED', 'A payer cash report must be recorded first.', 409);
            }
            $this->assertPaymentObligationNotHeld($obligationId, $correlationId);

            $now = now();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'settled',
                'settled_at' => $now,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent(
                $obligationId,
                'payment.cash.receipt_acknowledged',
                (string) $obligation->lane,
                (int) $obligation->amount_minor,
                (string) $obligation->currency,
                $actorUserId,
                'payer_reported_cash',
                'settled',
                $idempotencyKey,
                $correlationId,
                $now,
                $actorUserId === $recipientUserId ? [] : ['acting_for_user_id' => $recipientUserId],
            );
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->payer_user_id,
                eventType: 'payment.cash.receipt_acknowledged',
                attention: NotificationAttention::Updates,
                title: 'Cash receipt acknowledged',
                body: 'The recipient confirmed the reported cash receipt.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return 'settled';
        });
    }

    public function submitP2pProof(
        string $orderId,
        string $obligationId,
        string $payerUserId,
        UploadedFile $file,
        int $sentAmountMinor,
        string $transferReference,
        string $correlationId,
    ): string {
        $transferReference = trim($transferReference);
        if ($sentAmountMinor < 0 || $transferReference === '' || mb_strlen($transferReference) > 255) {
            throw new PaymentObligationError('P2P_PROOF_FACTS_INVALID', 'Enter a non-negative sent amount and a transfer reference of up to 255 characters.', 422);
        }

        DB::transaction(function () use ($orderId, $obligationId, $payerUserId, $sentAmountMinor, $transferReference): void {
            $obligation = $this->lockedObligation($orderId, $obligationId);
            $this->assertP2pProofSubmissionAllowed($obligation, $payerUserId, $sentAmountMinor, $transferReference);
        });
        $mimeType = $file->getMimeType();
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (! is_string($mimeType) || ! isset($extensions[$mimeType])) {
            throw new PaymentObligationError('P2P_PROOF_IMAGE_REQUIRED', 'Payment proof must be a JPEG, PNG, or WebP image.', 422);
        }
        $size = $file->getSize();
        if (! is_int($size) || $size < 1 || $size > 10 * 1024 * 1024) {
            throw new PaymentObligationError('P2P_PROOF_SIZE_INVALID', 'Payment proof must be no larger than 10 MB.', 422);
        }
        $realPath = $file->getRealPath();
        $hash = is_string($realPath) ? hash_file('sha256', $realPath) : false;
        if (! is_string($hash)) {
            throw new PaymentObligationError('P2P_PROOF_READ_FAILED', 'Payment proof could not be read.', 422);
        }

        $evidenceId = (string) Str::uuid7();
        $storageKey = $file->storeAs('evidence/payment/'.$obligationId, $evidenceId.'.'.$extensions[$mimeType], 'private');
        if (! is_string($storageKey) || $storageKey === '') {
            throw new PaymentObligationError('P2P_PROOF_STORAGE_FAILED', 'Payment proof could not be stored privately.', 503);
        }

        try {
            DB::transaction(function () use ($orderId, $obligationId, $payerUserId, $sentAmountMinor, $transferReference, $correlationId, $evidenceId, $storageKey, $mimeType, $size, $hash): void {
                $obligation = $this->lockedObligation($orderId, $obligationId);
                $this->assertP2pProofSubmissionAllowed($obligation, $payerUserId, $sentAmountMinor, $transferReference);
                $now = now();
                DB::table('evidence_files')->insert([
                    'id' => $evidenceId,
                    'owner_user_id' => $payerUserId,
                    'storage_key' => $storageKey,
                    'media_type' => $mimeType,
                    'size_bytes' => $size,
                    'content_hash' => $hash,
                    'evidence_type' => 'payment_p2p_proof',
                    'data_class' => 'FINANCIAL',
                    'scan_status' => 'quarantined',
                    'visibility' => 'order_parties',
                    'retention_policy' => 'payment_dispute_window',
                    'deleted_at' => null,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $this->outbox->enqueue(
                    eventType: 'work.evidence.scan_requested',
                    aggregateType: 'evidence_file',
                    aggregateId: $evidenceId,
                    payload: ['evidence_file_id' => $evidenceId],
                    correlationId: $correlationId,
                );
            });
        } catch (\Throwable $error) {
            Storage::disk('private')->delete($storageKey);
            throw $error;
        }
        $this->dispatcher->dispatch(limit: 1, eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
        if (DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status') !== 'clean') {
            throw new PaymentObligationError('P2P_PROOF_SCAN_UNAVAILABLE', 'Payment proof did not pass the safety scan.', 422);
        }

        return DB::transaction(function () use ($orderId, $obligationId, $payerUserId, $sentAmountMinor, $transferReference, $correlationId, $evidenceId): string {
            $obligation = $this->lockedObligation($orderId, $obligationId);
            $this->assertP2pProofSubmissionAllowed($obligation, $payerUserId, $sentAmountMinor, $transferReference);
            $previous = (string) $obligation->status;
            $now = now();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'payer_submitted_p2p_proof',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            DB::table('payment_events')->insert([
                'id' => (string) Str::uuid7(),
                'payment_obligation_id' => $obligationId,
                'event_type' => 'payment.p2p.proof_submitted',
                'lane' => 'p2p_transfer',
                'amount_minor' => (int) $obligation->amount_minor,
                'currency' => (string) $obligation->currency,
                'actor_user_id' => $payerUserId,
                'evidence_file_id' => $evidenceId,
                'previous_status' => $previous,
                'new_status' => 'payer_submitted_p2p_proof',
                'idempotency_key' => 'p2p-proof-'.$evidenceId,
                'correlation_id' => $correlationId,
                'payload' => json_encode([
                    'sent_amount_minor' => $sentAmountMinor,
                    'transfer_reference' => $transferReference,
                ], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'occurred_at' => $now,
                'effective_at' => $now,
                'created_at' => $now,
            ]);
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->recipient_user_id,
                eventType: 'payment.p2p.proof_submitted',
                attention: NotificationAttention::NeedsAction,
                title: 'P2P payment proof submitted',
                body: 'Review the payment proof for your Order.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return 'payer_submitted_p2p_proof';
        });
    }

    public function verifyP2pPayment(string $orderId, string $obligationId, string $recipientUserId, int $receivedAmountMinor, string $correlationId): string
    {
        return DB::transaction(function () use ($orderId, $obligationId, $recipientUserId, $receivedAmountMinor, $correlationId): string {
            $obligation = $this->lockedObligation($orderId, $obligationId);
            if ((string) $obligation->recipient_user_id !== $recipientUserId) {
                throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can verify a P2P transfer.', 403);
            }
            $proof = $this->cleanSubmittedProof($obligationId);
            $reportedFacts = $this->latestSubmittedProofFacts($obligationId);
            if ($proof === null || $reportedFacts === null) {
                throw new PaymentObligationError('P2P_PROOF_UNAVAILABLE', 'A clean submitted payment proof with its reported amount and reference is required.', 409);
            }
            if (
                (int) $obligation->amount_minor !== $receivedAmountMinor
                || $reportedFacts['sent_amount_minor'] !== $receivedAmountMinor
            ) {
                throw new PaymentObligationError('PAYMENT_AMOUNT_MISMATCH', 'The received amount differs from the reported transfer or the payment obligation. Open a payment mismatch case.', 409);
            }
            if ((string) $obligation->status !== 'payer_submitted_p2p_proof') {
                if ((string) $obligation->status === 'settled') {
                    return 'settled';
                }
                throw new PaymentObligationError('P2P_PROOF_NOT_SUBMITTED', 'There is no active payment proof to verify.', 409);
            }
            $this->assertPaymentObligationNotHeld($obligationId, $correlationId);
            $now = now();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'settled',
                'settled_at' => $now,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent($obligationId, 'payment.p2p.receipt_verified', 'p2p_transfer', (int) $obligation->amount_minor, (string) $obligation->currency, $recipientUserId, 'payer_submitted_p2p_proof', 'settled', 'p2p-verify-'.$proof->id, $correlationId, $now, [
                'received_amount_minor' => $receivedAmountMinor,
                'sent_amount_minor' => $reportedFacts['sent_amount_minor'],
                'transfer_reference' => $reportedFacts['transfer_reference'],
            ]);
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->payer_user_id,
                eventType: 'payment.p2p.receipt_verified',
                attention: NotificationAttention::Updates,
                title: 'P2P receipt verified',
                body: 'The recipient confirmed the payment proof for your Order.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return 'settled';
        });
    }

    public function rejectP2pProof(string $orderId, string $obligationId, string $recipientUserId, string $reason, string $correlationId): string
    {
        return DB::transaction(function () use ($orderId, $obligationId, $recipientUserId, $reason, $correlationId): string {
            $obligation = $this->lockedObligation($orderId, $obligationId);
            if ((string) $obligation->recipient_user_id !== $recipientUserId) {
                throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can reject P2P proof.', 403);
            }
            if ((string) $obligation->status !== 'payer_submitted_p2p_proof' || $this->cleanSubmittedProof($obligationId) === null) {
                throw new PaymentObligationError('P2P_PROOF_NOT_SUBMITTED', 'There is no clean submitted payment proof to reject.', 409);
            }
            $now = now();
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'proof_rejected',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent($obligationId, 'payment.p2p.proof_rejected', 'p2p_transfer', (int) $obligation->amount_minor, (string) $obligation->currency, $recipientUserId, 'payer_submitted_p2p_proof', 'proof_rejected', 'p2p-reject-'.Str::uuid7(), $correlationId, $now, ['reason' => $reason]);
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->payer_user_id,
                eventType: 'payment.p2p.proof_rejected',
                attention: NotificationAttention::NeedsAction,
                title: 'Payment proof rejected',
                body: 'Review the Order and submit a replacement proof.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return 'proof_rejected';
        });
    }

    public function flagPaymentMismatch(string $orderId, string $obligationId, string $recipientUserId, int $receivedAmountMinor, string $correlationId): string
    {
        return DB::transaction(function () use ($orderId, $obligationId, $recipientUserId, $receivedAmountMinor, $correlationId): string {
            $obligation = $this->lockedObligation($orderId, $obligationId);
            if ((string) $obligation->recipient_user_id !== $recipientUserId) {
                throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can report a payment mismatch.', 403);
            }
            $lane = (string) $obligation->lane;
            $previousStatus = (string) $obligation->status;
            if ($lane === 'external_cash' && $previousStatus !== 'payer_reported_cash') {
                throw new PaymentObligationError('CASH_REPORT_REQUIRED', 'A payer cash report is required before reporting a cash mismatch.', 409);
            }
            $reportedFacts = null;
            if ($lane === 'p2p_transfer') {
                if ($previousStatus !== 'payer_submitted_p2p_proof' || $this->cleanSubmittedProof($obligationId) === null) {
                    throw new PaymentObligationError('P2P_PROOF_NOT_SUBMITTED', 'A clean submitted payment proof is required.', 409);
                }
                $reportedFacts = $this->latestSubmittedProofFacts($obligationId);
                if ($reportedFacts === null) {
                    throw new PaymentObligationError('P2P_PROOF_FACTS_UNAVAILABLE', 'The submitted transfer amount and reference are unavailable.', 409);
                }
            }
            if (! in_array($lane, ['external_cash', 'p2p_transfer'], true)) {
                throw new PaymentObligationError('PAYMENT_MISMATCH_LANE_UNAVAILABLE', 'This payment lane does not support mismatch reporting.', 409);
            }
            $hasMismatch = (int) $obligation->amount_minor !== $receivedAmountMinor
                || ($reportedFacts !== null && (
                    $reportedFacts['sent_amount_minor'] !== $receivedAmountMinor
                    || $reportedFacts['sent_amount_minor'] !== (int) $obligation->amount_minor
                ));
            if (! $hasMismatch) {
                throw new PaymentObligationError('PAYMENT_AMOUNT_MATCHES', 'The received amount, reported transfer, and payment obligation match.', 422);
            }
            $now = now();
            $caseId = $this->mismatchCases->openPaymentMismatch([
                'obligation_id' => $obligationId,
                'order_id' => (string) $obligation->order_id,
                'work_instance_id' => $obligation->work_instance_id !== null ? (string) $obligation->work_instance_id : null,
                'amount_minor' => (int) $obligation->amount_minor,
                'reported_amount_minor' => $reportedFacts['sent_amount_minor'] ?? (int) $obligation->amount_minor,
                'currency' => (string) $obligation->currency,
                'lane' => $lane,
            ], $receivedAmountMinor, $recipientUserId, $correlationId);
            DB::table('payment_obligations')->where('id', $obligationId)->update([
                'status' => 'disputed_mismatch',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent($obligationId, 'payment.mismatch.reported', $lane, (int) $obligation->amount_minor, (string) $obligation->currency, $recipientUserId, $previousStatus, 'disputed_mismatch', 'payment-mismatch-'.$caseId, $correlationId, $now, ['support_case_id' => $caseId, 'payer_reported_amount_minor' => $reportedFacts['sent_amount_minor'] ?? (int) $obligation->amount_minor, 'received_amount_minor' => $receivedAmountMinor]);
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: $obligationId,
                recipientUserId: (string) $obligation->payer_user_id,
                eventType: 'payment.mismatch.reported',
                attention: NotificationAttention::NeedsAction,
                title: 'Payment mismatch reported',
                body: 'Review the payment issue for your Order.',
                version: (int) $obligation->version + 1,
                correlationId: $correlationId,
            );


            return $caseId;
        });
    }

    public function resolvePaymentMismatch(string $caseId, string $staffUserId, string $resolution, string $correlationId): string
    {
        return DB::transaction(function () use ($caseId, $staffUserId, $resolution, $correlationId): string {
            $caseFacts = $this->mismatchCases->resolvePaymentMismatchCase($caseId, $staffUserId, $resolution, $correlationId);
            $obligation = DB::table('payment_obligations')->where('id', $caseFacts['obligation_id'])->lockForUpdate()->first();
            $expectedLane = $caseFacts['lane'];
            if ($obligation === null || (string) $obligation->status !== 'disputed_mismatch' || (string) $obligation->lane !== $expectedLane) {
                throw new PaymentObligationError('MISMATCH_CASE_NOT_ACTIVE', 'Payment mismatch case is no longer active.', 409);
            }
            $this->assertPaymentObligationNotHeld((string) $obligation->id, $correlationId);
            $now = now();
            $status = $resolution === 'settle' ? 'settled' : 'due';
            DB::table('payment_obligations')->where('id', $obligation->id)->update([
                'status' => $status,
                'settled_at' => $status === 'settled' ? $now : null,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
            $this->recordEvent((string) $obligation->id, 'payment.mismatch.resolved', (string) $obligation->lane, (int) $obligation->amount_minor, (string) $obligation->currency, $staffUserId, 'disputed_mismatch', $status, 'payment-mismatch-resolve-'.$caseId, $correlationId, $now, ['support_case_id' => $caseId, 'resolution' => $resolution]);
            $nextVersion = (int) $obligation->version + 1;
            $payerUserId = (string) $obligation->payer_user_id;
            $paymentRecipientUserId = (string) $obligation->recipient_user_id;
            $payerAttention = $status === 'due'
                ? NotificationAttention::NeedsAction
                : NotificationAttention::Updates;
            $this->recordOrderIntent(
                orderId: (string) $obligation->order_id,
                obligationId: (string) $obligation->id,
                recipientUserId: $payerUserId,
                eventType: 'payment.mismatch.resolved',
                attention: $payerAttention,
                title: 'Payment mismatch resolved',
                body: 'Review the updated payment status for your Order.',
                version: $nextVersion,
                correlationId: $correlationId,
            );
            if ($paymentRecipientUserId !== $payerUserId) {
                $this->recordOrderIntent(
                    orderId: (string) $obligation->order_id,
                    obligationId: (string) $obligation->id,
                    recipientUserId: $paymentRecipientUserId,
                    eventType: 'payment.mismatch.resolved',
                    attention: NotificationAttention::Updates,
                    title: 'Payment mismatch resolved',
                    body: 'Review the updated payment status for your Order.',
                    version: $nextVersion,
                    correlationId: $correlationId,
                );
            }

            return $status;
        });
    }

    public function p2pProofForRecipient(string $orderId, string $obligationId, string $recipientUserId): object
    {
        $obligation = $this->lockedObligation($orderId, $obligationId);
        if ((string) $obligation->recipient_user_id !== $recipientUserId) {
            throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can access payment proof.', 403);
        }
        $proof = $this->cleanSubmittedProof($obligationId);
        if ($proof === null || (string) $obligation->status === 'proof_rejected') {
            throw new PaymentObligationError('P2P_PROOF_UNAVAILABLE', 'Payment proof is unavailable.', 404);
        }

        return $proof;
    }

    private function assertPaymentObligationNotHeld(string $obligationId, string $correlationId): void
    {
        if ($this->administrativeHolds->hasActiveHold('payment_obligation', $obligationId)) {
            throw new KernelException('ADMINISTRATIVE_HOLD_ACTIVE', 'This Payment Obligation has an active administrative hold.', $correlationId, status: 409);
        }
    }

    private function lockedObligation(string $orderId, string $obligationId): object
    {
        $obligation = DB::table('payment_obligations')->where('id', $obligationId)->where('order_id', $orderId)->lockForUpdate()->first();
        if ($obligation === null) {
            throw new PaymentObligationError('OBLIGATION_NOT_FOUND', 'Payment obligation not found.', 404);
        }

        return $obligation;
    }

    private function cleanSubmittedProof(string $obligationId): ?object
    {
        return DB::table('payment_events as events')
            ->join('evidence_files as evidence', 'evidence.id', '=', 'events.evidence_file_id')
            ->where('events.payment_obligation_id', $obligationId)
            ->where('events.event_type', 'payment.p2p.proof_submitted')
            ->where('evidence.scan_status', 'clean')
            ->whereNull('evidence.deleted_at')
            ->orderByDesc('events.occurred_at')
            ->first(['evidence.id', 'evidence.storage_key', 'evidence.media_type']);
    }

    private function assertP2pProofSubmissionAllowed(object $obligation, string $payerUserId, int $sentAmountMinor, string $transferReference): void
    {
        if ((string) $obligation->payer_user_id !== $payerUserId) {
            throw new PaymentObligationError('PAYER_REQUIRED', 'Only the payer can submit payment proof.', 403);
        }
        if ((string) $obligation->lane !== 'p2p_transfer') {
            throw new PaymentObligationError('P2P_LANE_REQUIRED', 'Payment proof is available only for a P2P transfer.', 409);
        }
        $status = (string) $obligation->status;
        if ($status === 'due') {
            return;
        }
        if ($status !== 'proof_rejected') {
            throw new PaymentObligationError('P2P_PROOF_NOT_AVAILABLE', 'This payment is not available for a proof upload.', 409);
        }

        $priorFacts = $this->latestSubmittedProofFacts((string) $obligation->id);
        if ($priorFacts === null
            || $priorFacts['sent_amount_minor'] !== $sentAmountMinor
            || ! hash_equals($priorFacts['transfer_reference'], $transferReference)) {
            throw new PaymentObligationError(
                'P2P_REPLACEMENT_FACTS_LOCKED',
                'A replacement proof must keep the originally reported amount and transfer reference.',
                409,
            );
        }
    }

    /** @return array{sent_amount_minor: int, transfer_reference: string}|null */
    private function latestSubmittedProofFacts(string $obligationId): ?array
    {
        $payload = DB::table('payment_events')
            ->where('payment_obligation_id', $obligationId)
            ->where('event_type', 'payment.p2p.proof_submitted')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->value('payload');
        $facts = is_string($payload) ? json_decode($payload, true) : null;
        if (
            ! is_array($facts)
            || ! is_int($facts['sent_amount_minor'] ?? null)
            || ! is_string($facts['transfer_reference'] ?? null)
            || trim($facts['transfer_reference']) === ''
        ) {
            return null;
        }

        return [
            'sent_amount_minor' => $facts['sent_amount_minor'],
            'transfer_reference' => trim($facts['transfer_reference']),
        ];
    }

    /**
     * @return list<string>
     */
    private function eligibleLanes(?string $acceptedListingVersionId): array
    {
        if ($acceptedListingVersionId === null || $acceptedListingVersionId === '') {
            return ['external_cash'];
        }

        $lanes = $this->listingSource->eligiblePaymentLanesForVersion($acceptedListingVersionId);
        if (! $this->protectedDigitalSandboxEnabled()) {
            $lanes = array_values(array_diff($lanes, ['protected_digital']));
        }

        return $lanes;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function recordEvent(
        string $obligationId,
        string $eventType,
        string $lane,
        int $amountMinor,
        string $currency,
        ?string $actorUserId,
        ?string $previousStatus,
        string $newStatus,
        string $idempotencyKey,
        string $correlationId,
        mixed $occurredAt,
        array $payload = [],
    ): void {
        DB::table('payment_events')->insert([
            'id' => (string) Str::uuid7(),
            'payment_obligation_id' => $obligationId,
            'event_type' => $eventType,
            'lane' => $lane,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'actor_user_id' => $actorUserId,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'idempotency_key' => $idempotencyKey,
            'correlation_id' => $correlationId,
            'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'occurred_at' => $occurredAt,
            'effective_at' => $occurredAt,
            'created_at' => $occurredAt,
        ]);
    }
    private function recordOrderIntent(
        string $orderId,
        string $obligationId,
        string $recipientUserId,
        string $eventType,
        NotificationAttention $attention,
        string $title,
        string $body,
        int $version,
        string $correlationId,
    ): void {
        $this->notifications->recordIntent(new NotificationIntent(
            recipientUserId: $recipientUserId,
            eventSourceType: 'payment_obligation',
            eventSourceId: $obligationId,
            eventType: $eventType,
            attention: $attention,
            title: $title,
            body: $body,
            actionUrl: route('orders.show', ['order' => $orderId], false),
            idempotencyKey: $eventType.':'.$obligationId.':v'.$version.':'.$recipientUserId,
            correlationId: $correlationId,
        ));
    }


    private function protectedDigitalSandboxEnabled(): bool
    {
        $environments = [
            (string) config('serbizyu.environment', ''),
            (string) config('serbizyu.public_environment', ''),
            (string) config('app.env', ''),
            app()->environment(),
        ];
        foreach ($environments as $environment) {
            if (! in_array($environment, self::DISPOSABLE_ENVIRONMENTS, true)) {
                return false;
            }
        }

        return config('serbizyu.evidence_class') === EvidenceClass::SANDBOX->value
            && in_array(config('serbizyu.providers.payment.mode'), ['disabled', 'sandbox'], true)
            && trim((string) config('serbizyu.providers.payment.credentials', '')) === '';
    }
}

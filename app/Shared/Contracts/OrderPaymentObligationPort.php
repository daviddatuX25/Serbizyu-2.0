<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

use Illuminate\Http\UploadedFile;

/**
 * Forms the primary payment obligation during the caller-owned Order transaction.
 *
 * PaymentObligations owns the implementation; OrdersWork supplies the immutable
 * Order, Work, amount, and party projection needed for the obligation.
 */
interface OrderPaymentObligationPort
{
    public function createPrimary(string $orderId, string $workInstanceId, int $amountMinor, string $currency, string $payerUserId, string $recipientUserId, string $correlationId, string $lane = 'external_cash'): string;

    /**
     * Atomically replace the current primary obligation for a bilateral accepted-terms amendment.
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
    ): array;

    public function markDueFromWorkFact(string $orderId, string $workInstanceId, string $correlationId): ?string;

    /** @return array<string, mixed>|null */
    public function projectForOrder(string $orderId, string $viewerUserId, ?string $acceptedListingVersionId): ?array;

    public function chooseLane(string $orderId, string $obligationId, string $payerUserId, string $lane, ?string $acceptedListingVersionId, string $correlationId, string $idempotencyKey): string;

    public function reportCashPayment(string $orderId, string $obligationId, string $payerUserId, string $correlationId, string $idempotencyKey): string;

    public function acknowledgeCashReceipt(string $orderId, string $obligationId, string $actorUserId, string $recipientUserId, ?string $consentGrantId, string $correlationId, string $idempotencyKey): string;

    /** Upload and scan private P2P evidence; clean uploads are submitted. */
    public function submitP2pProof(string $orderId, string $obligationId, string $payerUserId, UploadedFile $file, int $sentAmountMinor, string $transferReference, string $correlationId): string;

    public function verifyP2pPayment(string $orderId, string $obligationId, string $recipientUserId, int $receivedAmountMinor, string $correlationId): string;

    public function rejectP2pProof(string $orderId, string $obligationId, string $recipientUserId, string $reason, string $correlationId): string;

    public function flagPaymentMismatch(string $orderId, string $obligationId, string $recipientUserId, int $receivedAmountMinor, string $correlationId): string;

    public function resolvePaymentMismatch(string $caseId, string $staffUserId, string $resolution, string $correlationId): string;

    public function p2pProofForRecipient(string $orderId, string $obligationId, string $recipientUserId): object;
}

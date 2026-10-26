<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\PaymentMismatchCasePort;
use App\Shared\Contracts\StaffAccessPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TrustSupportCaseAdapter implements PaymentMismatchCasePort
{
    public function __construct(private readonly StaffAccessPort $staffAccess) {}

    /**
     * @param array{
     *   obligation_id: string,
     *   order_id: string,
     *   work_instance_id: ?string,
     *   amount_minor: int,
     *   reported_amount_minor: int,
     *   currency: string,
     *   lane: string
     * } $obligation
     */
    public function openPaymentMismatch(
        array $obligation,
        int $reportedAmountMinor,
        string $reporterUserId,
        string $correlationId,
    ): string {
        if (! in_array($obligation['lane'], ['external_cash', 'p2p_transfer'], true)) {
            throw new TrustSupportError('MISMATCH_LANE_UNSUPPORTED', 'Only external cash and P2P transfers support amount mismatch cases.', $correlationId);
        }
        if ($reportedAmountMinor < 0) {
            throw new TrustSupportError('MISMATCH_AMOUNT_INVALID', 'The reported amount must be a non-negative minor-unit amount.', $correlationId);
        }

        $now = now();
        $caseId = (string) Str::uuid7();
        $disputeId = (string) Str::uuid7();
        $holdId = (string) Str::uuid7();
        $summary = ($obligation['lane'] === 'external_cash' ? 'External cash' : 'P2P transfer')
            .' amount mismatch: obligation expects '.$obligation['amount_minor'].' '.$obligation['currency']
            .'; payer reports '.$obligation['reported_amount_minor'].' '.$obligation['currency']
            .'; recipient reports '.$reportedAmountMinor.' '.$obligation['currency'].'.';
        DB::table('support_cases')->insert([
            'id' => $caseId,
            'reporter_user_id' => $reporterUserId,
            'requester_user_id' => $reporterUserId,
            'category' => 'payment_mismatch_'.($obligation['lane'] === 'external_cash' ? 'cash' : 'p2p'),
            'severity' => 'high',
            'order_id' => $obligation['order_id'],
            'work_instance_id' => $obligation['work_instance_id'],
            'payment_obligation_id' => $obligation['obligation_id'],
            'status' => 'open',
            'owner_user_id' => null,
            'resolution' => null,
            'opened_at' => $now,
            'first_response_due_at' => $now->copy()->addHours(24),
            'resolution_due_at' => $now->copy()->addDays(7),
            'resolved_at' => null,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('disputes')->insert([
            'id' => $disputeId,
            'reporter_user_id' => $reporterUserId,
            'order_id' => $obligation['order_id'],
            'work_instance_id' => $obligation['work_instance_id'],
            'payment_obligation_id' => $obligation['obligation_id'],
            'reason' => $summary,
            'category' => 'payment_amount_mismatch',
            'status' => 'under_review',
            'severity' => 'high',
            'opened_at' => $now,
            'resolved_at' => null,
            'resolution_summary' => null,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('administrative_holds')->insert([
            'id' => $holdId,
            'order_id' => null,
            'work_instance_id' => null,
            'payment_obligation_id' => $obligation['obligation_id'],
            'reason_class' => 'dispute',
            'status' => 'active',
            'created_by_user_id' => $reporterUserId,
            'approved_by_user_id' => null,
            'effective_at' => $now,
            'released_at' => null,
            'release_conditions' => json_encode(['case_id' => $caseId, 'payment_only' => true], JSON_THROW_ON_ERROR),
            'release_conditions_payload_version' => 1,
            'release_reason' => null,
            'correlation_id' => $correlationId,
            'version' => 1,
            'support_case_id' => $caseId,
            'source_kind' => 'automatic',
            'created_at' => $now,
            'updated_at' => $now,

        ]);
        DB::table('dispute_events')->insert([
            'id' => (string) Str::uuid7(),
            'dispute_id' => $disputeId,
            'event_type' => 'payment_mismatch.opened',
            'actor_user_id' => $reporterUserId,
            'evidence_file_id' => null,
            'previous_status' => null,
            'new_status' => 'under_review',
            'payload' => json_encode([
                'support_case_id' => $caseId,
                'payer_reported_amount_minor' => $obligation['reported_amount_minor'],
                'recipient_received_amount_minor' => $reportedAmountMinor,
                'lane' => $obligation['lane'],
            ], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'payment-mismatch-'.$obligation['obligation_id'],
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        return $caseId;
    }

    /** @return array{obligation_id: string, lane: 'external_cash'|'p2p_transfer'} */
    public function resolvePaymentMismatchCase(
        string $caseId,
        string $staffUserId,
        string $resolution,
        string $correlationId,
    ): array {
        if (! $this->staffAccess->canAccessStaff($staffUserId)) {
            throw new TrustSupportError('AUTHORIZATION_DENIED', 'Resolving payment mismatch cases requires staff authorization.', $correlationId, 403);
        }
        if (! in_array($resolution, ['settle', 'release'], true)) {
            throw new TrustSupportError('INVALID_MISMATCH_RESOLUTION', 'Choose a valid payment mismatch resolution.', $correlationId);
        }

        $case = DB::table('support_cases')->where('id', $caseId)->lockForUpdate()->first();
        if ($case === null || ! in_array($case->category, ['payment_mismatch_cash', 'payment_mismatch_p2p'], true) || $case->payment_obligation_id === null) {
            throw new TrustSupportError('MISMATCH_CASE_NOT_FOUND', 'Payment mismatch case not found.', $correlationId, 404);
        }
        $lane = $case->category === 'payment_mismatch_cash' ? 'external_cash' : 'p2p_transfer';
        $obligation = DB::table('payment_obligations')->where('id', $case->payment_obligation_id)->lockForUpdate()->first(['id']);
        if ($obligation === null) {
            throw new TrustSupportError('MISMATCH_OBLIGATION_NOT_FOUND', 'The payment obligation linked to this case was not found.', $correlationId, 404);
        }
        if (! in_array((string) $case->status, ['open', 'resolved'], true)) {
            throw new TrustSupportError('MISMATCH_CASE_RESOLVED', 'Payment mismatch case is already resolved.', $correlationId, 409);
        }
        $disputeId = DB::table('dispute_events')
            ->where('event_type', 'payment_mismatch.opened')
            ->whereRaw("payload->>'support_case_id' = ?", [$caseId])
            ->value('dispute_id');
        if (! is_string($disputeId)) {
            throw new TrustSupportError('MISMATCH_DISPUTE_NOT_FOUND', 'The payment dispute linked to this case was not found.', $correlationId, 409);
        }
        $dispute = DB::table('disputes')
            ->where('id', $disputeId)
            ->where('payment_obligation_id', $case->payment_obligation_id)
            ->lockForUpdate()
            ->first();
        if ($dispute === null || in_array((string) $dispute->status, ['resolved', 'rejected', 'withdrawn', 'closed'], true)) {
            throw new TrustSupportError('MISMATCH_DISPUTE_RESOLVED', 'The linked payment dispute is no longer active.', $correlationId, 409);
        }
        $now = now();
        DB::table('support_cases')->where('id', $caseId)->update([
            'status' => 'resolved',
            'current_responsibility_party' => 'none',
            'current_responsibility_user_id' => null,
            'resolution' => $resolution,
            'resolved_at' => $now,
            'version' => DB::raw('version + 1'),
            'updated_at' => $now,
        ]);
        DB::table('disputes')->where('id', $disputeId)->update([
            'status' => 'resolved',
            'resolved_at' => $now,
            'resolution_summary' => $resolution,
            'version' => DB::raw('version + 1'),
            'updated_at' => $now,
        ]);
        DB::table('administrative_holds')->where('payment_obligation_id', $case->payment_obligation_id)
            ->whereIn('status', ['active', 'reviewing'])
            ->where('source_kind', 'automatic')
            ->whereRaw("release_conditions->>'case_id' = ?", [$caseId])
            ->update([
                'status' => 'released',
                'approved_by_user_id' => $staffUserId,
                'released_at' => $now,
                'release_reason' => 'payment_mismatch_'.$resolution,
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
        DB::table('dispute_events')->insert([
            'id' => (string) Str::uuid7(),
            'dispute_id' => $disputeId,
            'event_type' => 'payment_mismatch.resolved',
            'actor_user_id' => $staffUserId,
            'evidence_file_id' => null,
            'previous_status' => (string) $dispute->status,
            'new_status' => 'resolved',
            'payload' => json_encode(['support_case_id' => $caseId, 'resolution' => $resolution], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'payment-mismatch-resolve-'.$caseId,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        return [
            'obligation_id' => (string) $case->payment_obligation_id,
            'lane' => $lane,
        ];
    }
}

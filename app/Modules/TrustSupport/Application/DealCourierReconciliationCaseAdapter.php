<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealCourierReconciliationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class DealCourierReconciliationCaseAdapter implements DealCourierReconciliationPort
{
    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    public function openUncollectedCourierWithdrawalCase(
        string $orderId,
        string $workInstanceId,
        ?string $paymentObligationId,
        string $reporterUserId,
        string $requesterUserId,
        string $correlationId,
    ): string {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Courier withdrawal reconciliation cases must be recorded in the source transaction.');
        }
        $existing = DB::table('support_cases')
            ->where('category', 'deal_partner_withdrawal_reconciliation')
            ->where('order_id', $orderId)
            ->where('work_instance_id', $workInstanceId)
            ->where('payment_obligation_id', $paymentObligationId)
            ->whereNotIn('status', ['resolved', 'closed'])
            ->lockForUpdate()
            ->first(['id']);
        if ($existing !== null) {
            return (string) $existing->id;
        }

        $caseId = (string) Str::uuid7();
        $now = now();
        DB::table('support_cases')->insert([
            'id' => $caseId,
            'reporter_user_id' => $reporterUserId,
            'requester_user_id' => $requesterUserId,
            'category' => 'deal_partner_withdrawal_reconciliation',
            'severity' => 'normal',
            'order_id' => $orderId,
            'work_instance_id' => $workInstanceId,
            'payment_obligation_id' => $paymentObligationId,
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
        $auditId = $this->audits->record(
            action: 'deal_partner.withdrawal_reconciliation_opened',
            targetType: 'support_case',
            targetId: $caseId,
            correlationId: $correlationId,
            actor: ActorContext::human($reporterUserId),
            commandName: 'DealCourierReconciliationCaseAdapter::openUncollectedCourierWithdrawalCase',
            previous: null,
            next: [
                'category' => 'deal_partner_withdrawal_reconciliation',
                'order_id' => $orderId,
                'work_instance_id' => $workInstanceId,
                'payment_obligation_id' => $paymentObligationId,
                'status' => 'open',
            ],
            reason: 'Started courier work was withdrawn before physical custody transfer; original claims remain unchanged for scoped reconciliation.',
            orderId: $orderId,
        );
        $this->outbox->enqueue(
            eventType: 'trust_support.deal_partner_withdrawal_reconciliation_opened',
            aggregateType: 'support_case',
            aggregateId: $caseId,
            payload: [
                'support_case_id' => $caseId,
                'order_id' => $orderId,
                'work_instance_id' => $workInstanceId,
                'payment_obligation_id' => $paymentObligationId,
                'category' => 'deal_partner_withdrawal_reconciliation',
            ],
            correlationId: $correlationId,
            auditEventId: $auditId,
        );

        return $caseId;
    }
}

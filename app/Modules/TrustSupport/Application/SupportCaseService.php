<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeOrderVersionPort;
use App\Shared\Contracts\AdministrativePaymentVersionPort;
use App\Shared\Contracts\AdministrativeWorkVersionPort;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Contracts\StaffDirectoryPort;
use App\Shared\Contracts\CommandApprovalStorePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SupportCaseService
{
    public function __construct(
        private readonly StaffAccessPort $staffAccess,
        private readonly StaffDirectoryPort $staffDirectory,
        private readonly AdministrativeOrderVersionPort $orders,
        private readonly AdministrativeWorkVersionPort $work,
        private readonly AdministrativePaymentVersionPort $payments,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly IdempotencyGuard $idempotency,
        private readonly CommandApprovalStorePort $approvals,
    ) {}

    /** @return array<string,mixed> */
    public function assign(string $caseId, string $actorId, string $assigneeId, int $expectedVersion, string $idempotencyKey, string $correlationId): array
    {
        $this->assertStaff($actorId, $correlationId);
        return DB::transaction(function () use ($caseId, $actorId, $assigneeId, $expectedVersion, $idempotencyKey, $correlationId): array {
            $case = DB::table('support_cases')->where('id', $caseId)->lockForUpdate()->first();
            if ($case === null) throw new TrustSupportError('CASE_NOT_FOUND', 'Support case was not found.', $correlationId, 404);
            $reservation = $this->reserveCaseCommand('support_case.assign:'.$caseId, $idempotencyKey, [
                'operation' => 'support_case.assign', 'case_id' => $caseId, 'assignee_user_id' => $assigneeId, 'expected_version' => $expectedVersion,
            ], $actorId, $correlationId);
            if ($reservation->isReplay) return $reservation->replayPayload ?? [];
            if (! $this->staffAccess->canAccessStaff($assigneeId)) throw new TrustSupportError('ASSIGNEE_NOT_ELIGIBLE', 'Assign only to a currently authorized staff member.', $correlationId, 422);
            if ((int) $case->version !== $expectedVersion) throw new TrustSupportError('CASE_VERSION_CONFLICT', 'The case changed; refresh before assigning.', $correlationId, 409);
            if (in_array((string) $case->status, ['resolved', 'closed', 'rejected', 'withdrawn'], true)) throw new TrustSupportError('CASE_NOT_ASSIGNABLE', 'A closed case cannot be reassigned.', $correlationId, 409);
            $version = $expectedVersion + 1;
            DB::table('support_cases')->where('id', $caseId)->update([
                'owner_user_id' => $assigneeId, 'current_responsibility_party' => 'staff', 'current_responsibility_user_id' => null,
                'version' => $version, 'updated_at' => now(),
            ]);
            $auditId = $this->audits->record(
                'support_case.assigned', 'support_case', $caseId, $correlationId, ActorContext::human($actorId),
                commandName: 'support_case.assign', expectedVersion: $expectedVersion,
                previous: ['owner_user_id' => $case->owner_user_id, 'version' => $expectedVersion],
                next: ['owner_user_id' => $assigneeId, 'version' => $version], reason: 'Case responsibility assigned',
            );
            $this->outbox->enqueue('support_case.assigned', 'support_case', $caseId, ['assignee_user_id' => $assigneeId, 'version' => $version], $correlationId, $auditId);
            $result = ['case_id' => $caseId, 'assigned_user_id' => $assigneeId, 'version' => $version];
            $this->idempotency->succeed($reservation->row, $result, responseEventId: $auditId, responseReference: $caseId);
            return $result;
        });
    }

    /** @return array<string,mixed> */
    public function resolve(string $caseId, string $actorId, string $resolution, int $expectedVersion, string $idempotencyKey, string $correlationId): array
    {
        $this->assertStaff($actorId, $correlationId);
        $resolution = trim($resolution);
        if ($resolution === '' || mb_strlen($resolution) > 2000) throw new TrustSupportError('INVALID_RESOLUTION', 'Provide a case resolution of at most 2000 characters.', $correlationId, 422);
        return DB::transaction(function () use ($caseId, $actorId, $resolution, $expectedVersion, $idempotencyKey, $correlationId): array {
            $case = DB::table('support_cases')->where('id', $caseId)->lockForUpdate()->first();
            if ($case === null) throw new TrustSupportError('CASE_NOT_FOUND', 'Support case was not found.', $correlationId, 404);
            $reservation = $this->reserveCaseCommand('support_case.resolve:'.$caseId, $idempotencyKey, [
                'operation' => 'support_case.resolve', 'case_id' => $caseId, 'resolution' => $resolution, 'expected_version' => $expectedVersion,
            ], $actorId, $correlationId);
            if ($reservation->isReplay) return $reservation->replayPayload ?? [];
            if ((int) $case->version !== $expectedVersion) throw new TrustSupportError('CASE_VERSION_CONFLICT', 'The case changed; refresh before resolving.', $correlationId, 409);
            if (in_array((string) $case->status, ['resolved', 'closed', 'rejected', 'withdrawn'], true)) throw new TrustSupportError('CASE_NOT_RESOLVABLE', 'This case is already closed.', $correlationId, 409);
            $now = now();
            $version = $expectedVersion + 1;
            DB::table('support_cases')->where('id', $caseId)->update([
                'status' => 'resolved', 'resolution' => $resolution, 'resolved_at' => $now,
                'current_responsibility_party' => 'none', 'current_responsibility_user_id' => null,
                'version' => $version, 'updated_at' => $now,
            ]);
            $auditId = $this->audits->record(
                'support_case.resolved', 'support_case', $caseId, $correlationId, ActorContext::human($actorId),
                commandName: 'support_case.resolve', expectedVersion: $expectedVersion,
                previous: ['status' => (string) $case->status, 'version' => $expectedVersion],
                next: ['status' => 'resolved', 'version' => $version, 'resolution' => $resolution], reason: $resolution,
                orderId: $case->order_id === null ? null : (string) $case->order_id,
                paymentObligationId: $case->payment_obligation_id === null ? null : (string) $case->payment_obligation_id,
            );
            $this->outbox->enqueue('support_case.resolved', 'support_case', $caseId, ['version' => $version], $correlationId, $auditId);
            $result = ['case_id' => $caseId, 'status' => 'resolved', 'version' => $version, 'financial_rail_changed' => false];
            $this->idempotency->succeed($reservation->row, $result, responseEventId: $auditId, responseReference: $caseId);
            return $result;
        });
    }

    /** @return array<string,mixed> */
    public function workspace(string $caseId, string $staffActorId): array
    {
        $this->assertStaff($staffActorId, (string) Str::uuid7());
        $case = DB::table('support_cases')->where('id',$caseId)->first();
        if ($case === null) throw new TrustSupportError('CASE_NOT_FOUND','Support case was not found.',(string) Str::uuid7(),404);
        $targets=[];
        if ($case->order_id!==null) {
            $order=$this->orders->readTarget((string)$case->order_id);
            if ($order!==null) $targets[]=['kind'=>'order','id'=>(string)$case->order_id,'label'=>'Order · '.(string)$case->order_id,'version'=>$order['version']];
        }
        if ($case->work_instance_id!==null) {
            $target=$this->work->readTarget((string)$case->work_instance_id);
            $workTargets=$target===null?[]:[['id'=>(string)$case->work_instance_id,...$target]];
        } else {
            $workTargets=$case->order_id===null?[]:$this->work->targetsForOrder((string)$case->order_id);
        }
        foreach ($workTargets as $target) {
            if ($case->order_id!==null && $target['order_id']!==(string)$case->order_id) continue;
            $targets[]=['kind'=>'work_instance','id'=>$target['id'],'label'=>'Work instance · '.$target['id'],'version'=>$target['version']];
        }
        if ($case->payment_obligation_id!==null) {
            $target=$this->payments->readTarget((string)$case->payment_obligation_id);
            $paymentTargets=$target===null?[]:[['id'=>(string)$case->payment_obligation_id,...$target]];
        } else {
            $paymentTargets=$case->order_id===null?[]:$this->payments->targetsForOrder((string)$case->order_id);
        }
        foreach ($paymentTargets as $target) {
            if ($case->order_id!==null && $target['order_id']!==(string)$case->order_id) continue;
            $targets[]=['kind'=>'payment_obligation','id'=>$target['id'],'label'=>'Payment obligation · '.$target['id'],'version'=>$target['version']];
        }
        $holds=DB::table('administrative_holds')->where('support_case_id',$caseId)->orderByDesc('created_at')->get();
        $approvals=$this->approvals->forCase($caseId);
        $packets=app(LuponHandoffService::class)->casePackets($caseId);
        return [
            'actor_user_id'=>$staffActorId,
            'case'=>['id'=>(string)$case->id,'reference'=>(string)$case->public_reference,'version'=>(int)$case->version,'status'=>(string)$case->status,'assigned_user_id'=>$case->owner_user_id===null?null:(string)$case->owner_user_id,'responsibility_party'=>(string)$case->current_responsibility_party],
            'eligible_staff'=>$this->staffDirectory->eligibleStaff(),
            'targets'=>$targets,
            'holds'=>$holds->map(fn($hold):array=>['id'=>(string)$hold->id,'target_kind'=>$hold->order_id!==null?'order':($hold->work_instance_id!==null?'work_instance':'payment_obligation'),'target_id'=>(string)($hold->order_id??$hold->work_instance_id??$hold->payment_obligation_id),'status'=>(string)$hold->status,'version'=>(int)$hold->version,'reason_class'=>(string)$hold->reason_class,'release_reason'=>$hold->release_reason===null?null:(string)$hold->release_reason,'created_by_user_id'=>(string)$hold->created_by_user_id,'approved_by_user_id'=>$hold->approved_by_user_id===null?null:(string)$hold->approved_by_user_id,'effective_at'=>\Illuminate\Support\Carbon::parse($hold->effective_at)->toISOString(),'created_at'=>\Illuminate\Support\Carbon::parse($hold->created_at)->toISOString(),'released_at'=>$hold->released_at===null?null:\Illuminate\Support\Carbon::parse($hold->released_at)->toISOString()])->values()->all(),
            'approvals'=>array_map(function($approval) use ($staffActorId):array {
                $pending=(string)$approval->status==='pending' && now()->lt($approval->expires_at);
                $approved=(string)$approval->status==='approved' && now()->lt($approval->expires_at);
                return ['id'=>(string)$approval->id,'command_type'=>(string)$approval->command_type,'status'=>(string)$approval->status,'maker_user_id'=>(string)$approval->initiator_user_id,'checker_user_id'=>(string)$approval->approver_user_id,'payload_hash'=>(string)$approval->payload_hash,'expires_at'=>\Illuminate\Support\Carbon::parse($approval->expires_at)->toISOString(),'case_id'=>(string)$approval->support_case_id,'command_payload'=>is_array($approval->command_payload)?$approval->command_payload:json_decode((string)$approval->command_payload,true),'can_approve'=>$pending && (string)$approval->approver_user_id===$staffActorId && $this->staffAccess->canAccessStaff($staffActorId),'can_execute'=>$approved && (string)$approval->approver_user_id===$staffActorId && $this->staffAccess->canAccessStaff($staffActorId)];
            },$approvals),
            'packets'=>$packets['packets']??[],
            'available_exhibits'=>$packets['available_exhibits']??[],
            'excluded_exhibits'=>$packets['excluded_exhibits']??[],
            'permissions'=>[
                'can_assign'=>!in_array((string)$case->status,['resolved','closed','rejected','withdrawn'],true),
                'can_resolve'=>!in_array((string)$case->status,['resolved','closed','rejected','withdrawn'],true),
                'can_request_hold'=>!in_array((string)$case->status,['resolved','closed','rejected','withdrawn'],true),
                'can_request_release'=>collect($holds)->contains(fn($hold):bool=>in_array((string)$hold->status,['active','reviewing'],true)),
            ],
        ];
    }
    /** @param array<string,mixed> $fingerprint */
    private function reserveCaseCommand(string $scope, string $key, array $fingerprint, string $actorId, string $correlationId): \App\Shared\Application\IdempotencyReservation
    {
        try {
            return $this->idempotency->begin($scope, $key, $fingerprint, $correlationId, $actorId);
        } catch (KernelException $error) {
            throw new TrustSupportError($error->envelope->code, $error->getMessage(), $correlationId, $error->status, $error->envelope->fieldErrors);
        }
    }

    private function assertStaff(string $actorId,string $correlationId): void
    {
        if (!$this->staffAccess->canAccessStaff($actorId)) throw new TrustSupportError('AUTHORIZATION_DENIED','Current L4/admin/operate staff authority is required.',$correlationId,403);
    }
}

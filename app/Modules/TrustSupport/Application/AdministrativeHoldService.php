<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeOrderVersionPort;
use App\Shared\Contracts\AdministrativePaymentVersionPort;
use App\Shared\Contracts\AdministrativeWorkVersionPort;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Contracts\CommandApprovalStorePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AdministrativeHoldService
{
    private const COMMAND_PLACE = 'administrative_hold.place';
    private const COMMAND_RELEASE = 'administrative_hold.release';

    public function __construct(
        private readonly StaffAccessPort $staffAccess,
        private readonly AdministrativeOrderVersionPort $orders,
        private readonly AdministrativeWorkVersionPort $work,
        private readonly AdministrativePaymentVersionPort $payments,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly CommandApprovalStorePort $approvals,
    ) {}

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function requestApproval(array $input, string $makerId, string $correlationId): array
    {
        return DB::transaction(function () use ($input, $makerId, $correlationId): array {
        $this->assertStaff($makerId, $correlationId);
        $payload = $this->normalizePayload($input, $correlationId);
        $checker = (string) $input['checker_user_id'];
        if ($checker === $makerId) {
            throw new TrustSupportError('MAKER_CHECKER_SEPARATION_REQUIRED', 'The maker cannot approve their own command.', $correlationId, 403);
        }
        $this->assertStaff($checker, $correlationId);
        $hash = $this->payloadHash($payload);
        $scope = 'administrative_hold:'.$makerId;
        $existing = $this->approvals->lockByIdempotency($scope, $payload['idempotency_key']);
        if ($existing !== null) {
            if (! hash_equals((string) $existing->payload_hash, $hash)) {
                throw new TrustSupportError('IDEMPOTENCY_CONFLICT', 'That command key was already used for a different payload.', $correlationId, 409);
            }
            return $this->approvalDto($existing, replayed: true);
        }
        $currentTarget = $this->lockTarget($payload['target_kind'], $payload['target_id']);
        if ($currentTarget === null || $currentTarget['version'] !== $payload['expected_target_version']) {
            throw new TrustSupportError('TARGET_VERSION_CONFLICT', 'The target changed or is no longer available; refresh before requesting approval.', $correlationId, 409);
        }
        $this->assertCaseScope($payload, $currentTarget['order_id'], $correlationId);
        // A same-target request may have committed while this transaction waited on the target lock.
        $existing = $this->approvals->lockByIdempotency($scope, $payload['idempotency_key']);
        if ($existing !== null) {
            if (! hash_equals((string) $existing->payload_hash, $hash)) {
                throw new TrustSupportError('IDEMPOTENCY_CONFLICT', 'That command key was already used for a different payload.', $correlationId, 409);
            }
            return $this->approvalDto($existing, replayed: true);
        }
        if ($payload['command_type'] === self::COMMAND_RELEASE) {
            $hold = DB::table('administrative_holds')->where('id', $payload['hold_id'])->lockForUpdate()->first();
            if ($hold === null || (int) $hold->version !== $payload['expected_hold_version'] || $this->holdTarget($hold) !== [$payload['target_kind'], $payload['target_id']]) {
                throw new TrustSupportError('HOLD_VERSION_CONFLICT', 'The exact hold changed; refresh before requesting release.', $correlationId, 409);
            }
            if (! in_array((string) $hold->status, ['active', 'reviewing'], true)) {
                throw new TrustSupportError('HOLD_NOT_ACTIVE', 'Only an active hold can be released.', $correlationId, 409);
            }
        }

        $now = now();
        $id = (string) Str::uuid7();
        $fingerprint = hash('sha256', self::class.'|'.$payload['command_type'].'|'.$hash);
        $this->approvals->insert([
            'id' => $id,
            'approval_set_id' => (string) Str::uuid7(),
            'initiator_user_id' => $makerId,
            'approver_user_id' => $checker,
            'required_approver_role' => 'L4_OR_ADMIN_OPERATE',
            'approver_role' => 'L4_OR_ADMIN_OPERATE',
            'integration_client_id' => null,
            'command_type' => $payload['command_type'],
            'command_fingerprint' => $fingerprint,
            'payload_hash' => $hash,
            'command_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'command_result' => null,
            'support_case_id' => $payload['case_id'],
            'command_version' => 1,
            'target_ids' => json_encode([$payload['target_id']], JSON_THROW_ON_ERROR),
            'target_versions' => json_encode([$payload['target_kind'] => $payload['expected_target_version']], JSON_THROW_ON_ERROR),
            'scopes' => json_encode([$payload['target_kind']], JSON_THROW_ON_ERROR),
            'amount_minor' => null,
            'currency' => null,
            'policy_version' => 1,
            'reason' => $payload['reason'],
            'evidence_file_id' => null,
            'status' => 'pending',
            'issued_at' => $now,
            'expires_at' => $now->copy()->addMinutes(30),
            'consumed_at' => null,
            'idempotency_scope' => $scope,
            'idempotency_key' => $payload['idempotency_key'],
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $auditId = $this->audits->record(
            action: 'administrative_hold.approval_requested',
            targetType: 'command_approval',
            targetId: $id,
            correlationId: $correlationId,
            actor: ActorContext::human($makerId),
            commandName: $payload['command_type'],
            expectedVersion: $payload['expected_target_version'],
            next: ['status' => 'pending', 'command_type' => $payload['command_type'], 'payload_hash' => $hash, 'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id']],
            reason: $payload['reason'],
        );
        $this->outbox->enqueue('administrative_hold.approval_requested', 'command_approval', $id, ['case_id' => $payload['case_id'], 'status' => 'pending', 'command_type' => $payload['command_type'], 'payload_hash' => $hash], $correlationId, $auditId);
        $row = $this->approvals->findById($id);
        return $this->approvalDto($row);
        });
    }

    /** @return array<string, mixed> */
    public function approve(string $approvalId, string $actorId, string $correlationId): array
    {
        $this->assertStaff($actorId, $correlationId);
        return DB::transaction(function () use ($approvalId, $actorId, $correlationId): array {
            $approval = $this->approvals->lockById($approvalId);
            if ($approval === null) throw new TrustSupportError('APPROVAL_NOT_FOUND', 'Approval request was not found.', $correlationId, 404);
            if ((string) $approval->approver_user_id !== $actorId || (string) $approval->initiator_user_id === $actorId) {
                throw new TrustSupportError('APPROVER_NOT_DESIGNATED', 'Only the designated different staff checker can approve this command.', $correlationId, 403);
            }
            if ((string) $approval->status !== 'pending') {
                throw new TrustSupportError('APPROVAL_NOT_PENDING', 'This command is no longer pending approval.', $correlationId, 409);
            }
            if (now()->greaterThanOrEqualTo($approval->expires_at)) {
                throw new TrustSupportError('APPROVAL_EXPIRED', 'This approval expired; request a new command.', $correlationId, 409);
            }
            $payload = $this->decodePayload($approval->command_payload, $correlationId);
            if (! hash_equals((string) $approval->payload_hash, $this->payloadHash($payload))) {
                throw new TrustSupportError('APPROVAL_PAYLOAD_INVALID', 'The stored command payload failed integrity verification.', $correlationId, 409);
            }
            $target = $this->lockTarget($payload['target_kind'], $payload['target_id']);
            if ($target === null || $target['version'] !== (int) $payload['expected_target_version']) {
                throw new TrustSupportError('TARGET_VERSION_CONFLICT', 'The target changed; this approval cannot be used.', $correlationId, 409);
            }
            $this->assertCaseScope($payload, $target['order_id'], $correlationId);
            if ($payload['command_type'] === self::COMMAND_RELEASE) {
                $hold = DB::table('administrative_holds')->where('id', $payload['hold_id'])->lockForUpdate()->first();
                if ($hold === null || (int) $hold->version !== $payload['expected_hold_version'] || ! in_array((string) $hold->status, ['active', 'reviewing'], true)) {
                    throw new TrustSupportError('HOLD_VERSION_CONFLICT', 'The hold changed; this approval cannot be used.', $correlationId, 409);
                }
            }
            if ($this->approvals->markApproved($approvalId) !== 1) {
                throw new TrustSupportError('APPROVAL_NOT_PENDING', 'This command is no longer pending approval.', $correlationId, 409);
            }
            $auditId = $this->audits->record(
                action: 'administrative_hold.approval_approved',
                targetType: 'command_approval',
                targetId: $approvalId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorId),
                commandName: 'administrative_hold.approval_approved',
                expectedVersion: (int) $payload['expected_target_version'],
                previous: ['status' => 'pending'],
                next: ['status' => 'approved', 'support_case_id' => $payload['case_id'], 'command_type' => $payload['command_type']],
                reason: $payload['reason'],
                orderId: $payload['target_kind'] === 'order' ? $payload['target_id'] : null,
                paymentObligationId: $payload['target_kind'] === 'payment_obligation' ? $payload['target_id'] : null,
            );
            $this->outbox->enqueue('administrative_hold.approval_approved', 'command_approval', $approvalId, ['case_id' => $payload['case_id'], 'status' => 'approved'], $correlationId, $auditId);
            return $this->approvalDto($this->approvals->findById($approvalId));
        });
    }

    /** @return array<string, mixed> */
    public function execute(string $approvalId, string $actorId, string $correlationId): array
    {
        $this->assertStaff($actorId, $correlationId);
        return DB::transaction(function () use ($approvalId, $actorId, $correlationId): array {
            $approval = $this->approvals->lockById($approvalId);
            if ($approval === null) throw new TrustSupportError('APPROVAL_NOT_FOUND', 'Approval request was not found.', $correlationId, 404);
            if ((string) $approval->approver_user_id !== $actorId || (string) $approval->initiator_user_id === $actorId) {
                throw new TrustSupportError('APPROVER_NOT_DESIGNATED', 'Only the designated different staff checker can execute this command.', $correlationId, 403);
            }
            if ((string) $approval->status === 'consumed' && $approval->command_result !== null) {
                return $this->decodePayload($approval->command_result, $correlationId);
            }
            if ((string) $approval->status !== 'approved') {
                throw new TrustSupportError('APPROVAL_NOT_APPROVED', 'Approve this command before execution.', $correlationId, 409);
            }
            if (now()->greaterThanOrEqualTo($approval->expires_at)) {
                throw new TrustSupportError('APPROVAL_EXPIRED', 'This approval expired; request a new command.', $correlationId, 409);
            }
            $payload = $this->decodePayload($approval->command_payload, $correlationId);
            if (! hash_equals((string) $approval->payload_hash, $this->payloadHash($payload))
                || ! hash_equals((string) $approval->command_fingerprint, hash('sha256', self::class.'|'.$payload['command_type'].'|'.$approval->payload_hash))) {
                throw new TrustSupportError('APPROVAL_PAYLOAD_INVALID', 'The stored command payload failed integrity verification.', $correlationId, 409);
            }
            $target = $this->lockTarget($payload['target_kind'], $payload['target_id']);
            if ($target === null || $target['version'] !== (int) $payload['expected_target_version']) {
                throw new TrustSupportError('TARGET_VERSION_CONFLICT', 'The target changed; this approval cannot be executed.', $correlationId, 409);
            }
            $this->assertCaseScope($payload, $target['order_id'], $correlationId);
            $result = $payload['command_type'] === self::COMMAND_PLACE
                ? $this->placeHold($approval, $payload, $actorId, $correlationId)
                : $this->releaseHold($approval, $payload, $actorId, $correlationId);
            $consumedAt = now();
            if ($this->approvals->markConsumed($approvalId, $result, $consumedAt) !== 1) {
                throw new TrustSupportError('APPROVAL_NOT_APPROVED', 'This command can no longer be executed.', $correlationId, 409);
            }
            return $result;
        });
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    private function placeHold(object $approval, array $payload, string $actorId, string $correlationId): array
    {
        $targetColumn = $this->targetColumn($payload['target_kind']);
        $active = DB::table('administrative_holds')->where($targetColumn, $payload['target_id'])->whereIn('status', ['active', 'reviewing'])->where('effective_at', '<=', now())->exists();
        if ($active) throw new TrustSupportError('TARGET_ALREADY_HELD', 'An effective hold already exists on this exact target.', $correlationId, 409);
        $holdId = (string) Str::uuid7();
        $now = now();
        DB::table('administrative_holds')->insert([
            'id' => $holdId,
            'order_id' => $payload['target_kind'] === 'order' ? $payload['target_id'] : null,
            'work_instance_id' => $payload['target_kind'] === 'work_instance' ? $payload['target_id'] : null,
            'payment_obligation_id' => $payload['target_kind'] === 'payment_obligation' ? $payload['target_id'] : null,
            'reason_class' => $payload['reason_class'], 'status' => 'active',
            'created_by_user_id' => $approval->initiator_user_id, 'approved_by_user_id' => $actorId,
            'effective_at' => $now, 'released_at' => null, 'release_conditions' => json_encode($payload['release_conditions'] ?? [], JSON_THROW_ON_ERROR),
            'release_conditions_payload_version' => 1, 'release_reason' => null, 'correlation_id' => $correlationId,
            'version' => 1, 'support_case_id' => $payload['case_id'], 'placement_approval_id' => $approval->id,
            'release_approval_id' => null, 'source_kind' => 'manual', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $auditId = $this->recordCommand('administrative_hold.placed', $holdId, $actorId, $correlationId, null, [
            'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id'], 'status' => 'active', 'approval_id' => (string) $approval->id,
        ], $payload['reason'], $payload['expected_target_version'], $payload['target_kind'], $payload['target_id']);
        $this->outbox->enqueue('administrative_hold.placed', 'administrative_hold', $holdId, ['case_id' => $payload['case_id'], 'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id']], $correlationId, $auditId);
        return ['approval_id' => (string) $approval->id, 'hold_id' => $holdId, 'status' => 'active', 'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id'], 'hold_version' => 1, 'replayed' => false];
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    private function releaseHold(object $approval, array $payload, string $actorId, string $correlationId): array
    {
        $hold = DB::table('administrative_holds')->where('id', $payload['hold_id'])->lockForUpdate()->first();
        if ($hold === null || $this->holdTarget($hold) !== [$payload['target_kind'], $payload['target_id']]
            || (int) $hold->version !== $payload['expected_hold_version']
            || ! in_array((string) $hold->status, ['active', 'reviewing'], true)) {
            throw new TrustSupportError('HOLD_VERSION_CONFLICT', 'The exact hold changed or is already released.', $correlationId, 409);
        }
        $now = now();
        DB::table('administrative_holds')->where('id', $hold->id)->update([
            'status' => 'released', 'released_at' => $now, 'approved_by_user_id' => $actorId,
            'release_reason' => $payload['reason'], 'release_approval_id' => $approval->id,
            'version' => (int) $hold->version + 1, 'updated_at' => $now,
        ]);
        $auditId = $this->recordCommand('administrative_hold.released', (string) $hold->id, $actorId, $correlationId,
            ['status' => (string) $hold->status, 'version' => (int) $hold->version], ['status' => 'released', 'version' => (int) $hold->version + 1, 'approval_id' => (string) $approval->id],
            $payload['reason'], $payload['expected_target_version'], $payload['target_kind'], $payload['target_id']);
        $this->outbox->enqueue('administrative_hold.released', 'administrative_hold', (string) $hold->id, ['case_id' => $payload['case_id'], 'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id']], $correlationId, $auditId);
        return ['approval_id' => (string) $approval->id, 'hold_id' => (string) $hold->id, 'status' => 'released', 'target_kind' => $payload['target_kind'], 'target_id' => $payload['target_id'], 'hold_version' => (int) $hold->version + 1, 'replayed' => false];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    private function normalizePayload(array $input, string $correlationId): array
    {
        foreach (['case_id', 'command_type', 'checker_user_id', 'target_kind', 'target_id', 'expected_target_version', 'reason_class', 'reason', 'idempotency_key'] as $field) {
            if (! isset($input[$field]) || ! is_scalar($input[$field]) || (string) $input[$field] === '') {
                throw new TrustSupportError('INVALID_COMMAND', 'A required command field is missing: '.$field, $correlationId, 422);
            }
        }
        if (! in_array((string) $input['command_type'], [self::COMMAND_PLACE, self::COMMAND_RELEASE], true)) {
            throw new TrustSupportError('INVALID_COMMAND_TYPE', 'This command type is not supported.', $correlationId, 422);
        }
        if (! in_array((string) $input['target_kind'], ['order', 'work_instance', 'payment_obligation'], true)) {
            throw new TrustSupportError('INVALID_TARGET', 'Choose one exact Order, Work instance, or Payment Obligation target.', $correlationId, 422);
        }
        if (! in_array((string) $input['reason_class'], ['dispute', 'fraud', 'safety', 'legal', 'provider', 'operational'], true)) {
            throw new TrustSupportError('INVALID_REASON_CLASS', 'Choose a supported hold reason class.', $correlationId, 422);
        }
        $reason = trim((string) $input['reason']);
        if ($reason === '' || mb_strlen($reason) > 2000) throw new TrustSupportError('INVALID_REASON', 'Provide a reason of at most 2000 characters.', $correlationId, 422);
        $payload = [
            'case_id' => (string) $input['case_id'], 'command_type' => (string) $input['command_type'],
            'checker_user_id' => (string) $input['checker_user_id'],
            'target_kind' => (string) $input['target_kind'], 'target_id' => (string) $input['target_id'],
            'expected_target_version' => filter_var($input['expected_target_version'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 0,
            'reason_class' => (string) $input['reason_class'], 'reason' => $reason,
            'release_conditions' => $input['release_conditions'] ?? [], 'idempotency_key' => (string) $input['idempotency_key'],
        ];
        if ($payload['expected_target_version'] < 1 || ! is_array($payload['release_conditions']) || ! array_is_list($payload['release_conditions']) || count($payload['release_conditions']) > 10) throw new TrustSupportError('INVALID_COMMAND', 'Version or release conditions are invalid.', $correlationId, 422);
        foreach ($payload['release_conditions'] as $condition) {
            if (! is_string($condition) || trim($condition) === '' || mb_strlen($condition) > 500) throw new TrustSupportError('INVALID_COMMAND', 'Release conditions must be non-empty strings of at most 500 characters.', $correlationId, 422);
        }
        if ($payload['command_type'] === self::COMMAND_RELEASE) {
            if (! isset($input['hold_id']) || ! is_string($input['hold_id']) || ! isset($input['expected_hold_version'])) throw new TrustSupportError('INVALID_COMMAND', 'A release command must identify the exact hold and version.', $correlationId, 422);
            $payload['hold_id'] = $input['hold_id'];
            $payload['expected_hold_version'] = filter_var($input['expected_hold_version'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 0;
            if ($payload['expected_hold_version'] < 1) throw new TrustSupportError('INVALID_COMMAND', 'The expected hold version is invalid.', $correlationId, 422);
        }
        return $payload;
    }

    /** @param array<string, mixed> $payload */
    private function assertCaseScope(array $payload, string $targetOrderId, string $correlationId): void
    {
        $case = DB::table('support_cases')->where('id', $payload['case_id'])->first(['id', 'order_id', 'work_instance_id', 'payment_obligation_id']);
        if ($case === null) throw new TrustSupportError('CASE_NOT_FOUND', 'Support case was not found.', $correlationId, 404);
        $explicitTarget = match ($payload['target_kind']) {
            'order' => $case->order_id,
            'work_instance' => $case->work_instance_id,
            'payment_obligation' => $case->payment_obligation_id,
        };
        $explicitMatch = $explicitTarget !== null && (string) $explicitTarget === $payload['target_id'];
        $orderMatch = $case->order_id !== null && (string) $case->order_id === $targetOrderId;
        $caseHasScope = $case->order_id !== null || $explicitTarget !== null;
        if (! $caseHasScope || ($case->order_id !== null && ! $orderMatch)
            || ($explicitTarget !== null && ! $explicitMatch)
            || ($payload['target_kind'] === 'order' && (string) $case->order_id !== $payload['target_id'])) {
            throw new TrustSupportError('CASE_TARGET_MISMATCH', 'The selected aggregate is not the exact target or child of the case-linked Order.', $correlationId, 403);
        }
    }

    /** @param array<string, mixed> $payload */
    private function assertHoldScope(array $payload, string $correlationId): void
    {
        $hold = DB::table('administrative_holds')->where('id', $payload['hold_id'])->first(['id', 'support_case_id', 'release_conditions', 'order_id', 'work_instance_id', 'payment_obligation_id']);
        $conditions = $hold === null ? [] : (is_array($hold->release_conditions) ? $hold->release_conditions : json_decode((string) $hold->release_conditions, true));
        $legacyCase = is_array($conditions) ? ($conditions['case_id'] ?? null) : null;
        if ($hold === null || ((string) ($hold->support_case_id ?? '') !== $payload['case_id'] && (string) $legacyCase !== $payload['case_id']) || $this->holdTarget($hold) !== [$payload['target_kind'], $payload['target_id']]) {
            throw new TrustSupportError('HOLD_CASE_MISMATCH', 'The selected hold is not the exact target hold for this case.', $correlationId, 403);
        }
    }

    /** @return array{version:int,order_id:string}|null */
    private function lockTarget(string $kind, string $targetId): ?array
    {
        return match ($kind) {
            'order' => $this->orders->lockTarget($targetId),
            'work_instance' => $this->work->lockTarget($targetId),
            'payment_obligation' => $this->payments->lockTarget($targetId),
            default => null,
        };
    }

    private function targetColumn(string $kind): string
    {
        return match ($kind) {'order' => 'order_id', 'work_instance' => 'work_instance_id', 'payment_obligation' => 'payment_obligation_id'};
    }

    /** @return array{0:string,1:string}|null */
    private function holdTarget(object $hold): ?array
    {
        $targets = array_filter([
            'order' => $hold->order_id === null ? null : (string) $hold->order_id,
            'work_instance' => $hold->work_instance_id === null ? null : (string) $hold->work_instance_id,
            'payment_obligation' => $hold->payment_obligation_id === null ? null : (string) $hold->payment_obligation_id,
        ]);
        if (count($targets) !== 1) return null;
        $kind = (string) array_key_first($targets);
        return [$kind, (string) $targets[$kind]];
    }

    private function assertStaff(string $actorId, string $correlationId): void
    {
        if (! $this->staffAccess->canAccessStaff($actorId)) throw new TrustSupportError('AUTHORIZATION_DENIED', 'Current L4/admin/operate staff authority is required.', $correlationId, 403);
    }

    /** @param array<string, mixed> $payload */
    private function payloadHash(array $payload): string
    {
        return hash('sha256', json_encode($this->sortRecursive($payload), JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (! is_array($value)) return $value;
        if (array_is_list($value)) return array_map(fn ($item) => $this->sortRecursive($item), $value);
        ksort($value, SORT_STRING);
        foreach ($value as $key => $item) $value[$key] = $this->sortRecursive($item);
        return $value;
    }

    /** @return array<string, mixed> */
    private function decodePayload(mixed $value, string $correlationId): array
    {
        $decoded = is_array($value) ? $value : json_decode((string) $value, true);
        if (! is_array($decoded)) throw new TrustSupportError('APPROVAL_PAYLOAD_INVALID', 'The stored command result is unavailable.', $correlationId, 409);
        return $decoded;
    }

    /** @return array<string, mixed> */
    private function approvalDto(object $row, bool $replayed = false): array
    {
        return [
            'id' => (string) $row->id, 'command_type' => (string) $row->command_type, 'status' => (string) $row->status,
            'maker_user_id' => (string) $row->initiator_user_id, 'checker_user_id' => (string) $row->approver_user_id,
            'payload_hash' => (string) $row->payload_hash, 'expires_at' => \Illuminate\Support\Carbon::parse($row->expires_at)->toISOString(),
            'command_payload' => $this->decodePayload($row->command_payload, (string) $row->correlation_id), 'replayed' => $replayed,
        ];
    }

    /** @param array<string,mixed>|null $previous @param array<string,mixed>|null $next */
    private function recordCommand(string $action, string $targetId, string $actorId, string $correlationId, ?array $previous, ?array $next, string $reason, ?int $expectedVersion = null, ?string $targetKind = null, ?string $aggregateId = null): string
    {
        $orderId = $targetKind === 'order' ? $aggregateId : null;
        $paymentId = $targetKind === 'payment_obligation' ? $aggregateId : null;
        return $this->audits->record($action, 'administrative_hold', $targetId, $correlationId, ActorContext::human($actorId), commandName: $action, expectedVersion: $expectedVersion, previous: $previous, next: $next, reason: $reason, orderId: $orderId, paymentObligationId: $paymentId);
    }
}

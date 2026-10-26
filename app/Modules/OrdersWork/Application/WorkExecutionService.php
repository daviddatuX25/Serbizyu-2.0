<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\AdministrativeHoldReaderPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Contracts\WorkSpecificationPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkExecutionService
{
    public function __construct(
        private readonly WorkSpecificationPort $workSpecs,
        private readonly WorkContractRegistry $workContracts,
        private readonly WorkNodeEvidenceService $workEvidence,
        private readonly OrderPaymentObligationPort $paymentObligations,
        private readonly DealWorkGatePort $dealWorkGates,
        private readonly AdministrativeHoldReaderPort $administrativeHolds,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * Initialize the runtime Work structure from an Order's source terms or work_specification.
     *
     * @param  array<string, mixed>  $sourceTerms
     * @return array<string, mixed>
     */
    public function initializeStructure(
        array $sourceTerms,
        string $workShape,
        ?string $correlationId = null,
        ?int $shapeContractVersion = null,
        ?int $payloadSchemaVersion = null,
    ): array {
        $correlationId ??= (string) Str::uuid7();

        $shape = strtoupper(trim($workShape)) ?: 'A1';
        $spec = $sourceTerms['work_specification'] ?? null;
        if (is_string($spec)) {
            $spec = json_decode($spec, true);
        }

        $shapeContractVersion ??= is_array($spec) ? (int) ($spec['shape_contract_version'] ?? 1) : 1;
        $payloadSchemaVersion ??= is_array($spec) ? (int) ($spec['payload_schema_version'] ?? 1) : 1;

        try {
            $contract = $this->workContracts->resolveForWork($shape, $shapeContractVersion, $payloadSchemaVersion, $correlationId);
        } catch (WorkContractError $error) {
            throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
        }

        $rawNodes = [];
        $signatureHash = null;

        if (is_array($spec) && isset($spec['nodes']) && is_array($spec['nodes']) && $spec['nodes'] !== []) {
            $rawNodes = $spec['nodes'];
            $signatureHash = (string) ($spec['signature_hash'] ?? null);
        } elseif (isset($sourceTerms['milestone_stages']) && is_array($sourceTerms['milestone_stages']) && $sourceTerms['milestone_stages'] !== []) {
            $rawNodes = $sourceTerms['milestone_stages'];
        }

        if ($rawNodes === []) {
            $fallback = $this->workSpecs->publishedForShape($shape);
            $rawNodes = (array) ($fallback['definition']['steps'] ?? []);
        }

        try {
            $normalizedNodes = $this->workSpecs->normalizeNodes(
                $rawNodes,
                $shape,
                requireToolDefinitions: $contract->supportsItemizedChecklists || $contract->supportsNamedMetrics,
            );
        } catch (\InvalidArgumentException) {
            throw new OrderError(
                'INVALID_WORK_SPECIFICATION',
                'The Work source must include valid named measurement and checklist requirements.',
                $correlationId,
                status: 422,
            );
        }
        if ($signatureHash === null || $signatureHash === '') {
            $signatureHash = $this->workSpecs->computeSignature($shape, $normalizedNodes);
        }

        $runtimeNodes = [];
        foreach ($normalizedNodes as $idx => $node) {
            $this->assertNodeSupportedByContract($contract, $node, $correlationId);
            $runtimeNodes[] = [
                'id' => $node['id'],
                'ordinal' => $node['ordinal'],
                'title' => $node['title'],
                'description' => $node['description'],
                'node_kind' => $node['node_kind'],
                'evidence_type' => $node['evidence_type'],
                'evidence_description' => $node['evidence_description'],
                'control_mode' => $node['control_mode'],
                'mandatory' => $node['mandatory'],
                'duration_label' => $node['duration_label'],
                'required_proofs' => $node['required_proofs'] ?? [],
                'handoff_party' => $node['handoff_party'] ?? null,
                'approval_method' => $node['approval_method'] ?? 'none',
                'checklist_items' => $node['checklist_items'] ?? [],
                'metric_requirements' => $node['metric_requirements'] ?? [],
                'status' => $idx === 0 ? 'active' : 'locked',
                'completed_at' => null,
                'completed_by_user_id' => null,
                'evidence_payload' => null,
                'customer_confirmed_at' => null,
            ];
        }

        return [
            'schema_version' => 1,
            'signature_hash' => $signatureHash,
            'work_shape' => $shape,
            'active_node_id' => $runtimeNodes[0]['id'] ?? null,
            'active_ordinal' => 1,
            'pending_customer_confirmation' => false,
            'nodes' => $runtimeNodes,
        ];
    }

    /**
     * Advance a Work node on an Order.
     * Actions:
     * - complete_step (provider_advance)
     * - request_confirmation (customer_confirm / decision_gate)
     * - confirm_gate (customer_confirm / decision_gate)
     * - mark_ready_for_handoff (handoff_ready)
     * - propose_completion (final_signoff)
     * - signoff_completion (final_signoff)
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function advanceNode(
        string $orderId,
        string $actorUserId,
        string $nodeId,
        string $action,
        array $payload = [],
        ?string $correlationId = null,
    ): array {
        $corrId = $correlationId ?? (string) Str::uuid7();

        return DB::transaction(function () use ($orderId, $actorUserId, $nodeId, $action, $payload, $corrId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $corrId, status: 404);
            }

            $buyerId = (string) $order->buyer_user_id;
            $providerId = (string) $order->provider_user_id;
            $isBuyer = $actorUserId === $buyerId;
            $isProvider = $actorUserId === $providerId;

            if (! $isBuyer && ! $isProvider) {
                throw new OrderError('AUTHORIZATION_DENIED', 'You are not a participant in this order.', $corrId, status: 403);
            }

            $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($work === null) {
                throw new OrderError('WORK_NOT_FOUND', 'No work instance exists for this order.', $corrId, status: 404);
            }
            if ($this->administrativeHolds->hasActiveHold('work_instance', (string) $work->id)) {
                throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Work instance has an active administrative hold.', $corrId, status: 409);
            }
            try {
                $contract = $this->workContracts->resolveForWork(
                    (string) $work->work_shape,
                    (int) ($work->shape_contract_version ?? 1),
                    (int) ($work->payload_schema_version ?? 1),
                    $corrId,
                );
            } catch (WorkContractError $error) {
                throw new OrderError($error->envelope->code, $error->getMessage(), $corrId, status: $error->status);
            }

            $structure = $this->decodeJson($work->structure);
            $workShape = (string) $work->work_shape;
            if ($workShape === 'A4') {
                throw new OrderError('HANDOFF_PROTOCOL_REQUIRED', 'A4 product and courier handoffs advance only through the governed custody protocol.', $corrId, status: 409);
            }
            if ($workShape === 'A9') {
                throw new OrderError('A9_DELIVERY_PROTOCOL_REQUIRED', 'A9 completion requires acceptance of the current submitted delivery.', $corrId, status: 409);
            }

            if ($structure === null || ! isset($structure['nodes']) || ! is_array($structure['nodes']) || $structure['nodes'] === []) {
                $termsRow = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
                $termsData = $termsRow !== null ? $this->decodeJson($termsRow->scope) : [];
                $structure = $this->initializeStructure(
                    is_array($termsData) ? $termsData : [],
                    $workShape,
                    $corrId,
                    (int) ($work->shape_contract_version ?? 1),
                    (int) ($work->payload_schema_version ?? 1),
                );
            }

            $nodes = $structure['nodes'];
            $targetIdx = null;

            foreach ($nodes as $idx => $node) {
                if ((string) ($node['id'] ?? '') === $nodeId || (int) ($node['ordinal'] ?? -1) === (int) $nodeId) {
                    $targetIdx = $idx;
                    break;
                }
            }

            if ($targetIdx === null) {
                throw new OrderError('NODE_NOT_FOUND', 'Target work node does not exist.', $corrId, status: 404);
            }
            $node = $nodes[$targetIdx];
            $this->assertNodeSupportedByContract($contract, $node, $corrId);
            $this->assertDealWorkGate((string) $work->id, $corrId);

            $now = now();
            $prevWorkStatus = (string) $work->status;
            $newWorkStatus = $prevWorkStatus;
            $prevOrderStatus = (string) $order->status;
            $newOrderStatus = $prevOrderStatus;

            switch ($action) {
                case 'complete_step':
                    if (! $isProvider) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can advance execution steps.', $corrId, status: 403);
                    }
                    if (($node['status'] ?? null) !== 'active') {
                        throw new OrderError('INVALID_STATE', 'Only the active node can be completed.', $corrId, status: 409);
                    }
                    if (($node['node_kind'] ?? null) === 'final_signoff') {
                        throw new OrderError('INVALID_ACTION', 'Final Work completion requires customer sign-off or its authored receipt challenge.', $corrId, status: 409);
                    }
                    if (($node['control_mode'] ?? 'provider_advance') !== 'provider_advance') {
                        throw new OrderError('INVALID_ACTION', 'This Work node requires a different clearance authority.', $corrId, status: 409);
                    }
                    if (in_array((string) ($node['approval_method'] ?? 'none'), ['presence_otp', 'worker_dropoff'], true)) {
                        throw new OrderError('CHALLENGE_REQUIRED', 'This Work node requires its authored counterparty challenge.', $corrId, status: 409);
                    }
                    $payload = $this->validatedEvidencePayload((string) $work->id, $node, $actorUserId, $payload, $corrId, $now);
                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->toIso8601String();
                    $node['completed_by_user_id'] = $actorUserId;
                    $node['evidence_payload'] = $payload;

                    if (in_array($prevWorkStatus, ['not_started', 'scheduled'], true)) {
                        $newWorkStatus = 'in_progress';
                    }
                    if (isset($nodes[$targetIdx + 1])) {
                        $nodes[$targetIdx + 1]['status'] = 'active';
                        $structure['active_node_id'] = $nodes[$targetIdx + 1]['id'];
                        $structure['active_ordinal'] = $targetIdx + 2;
                    } elseif ($targetIdx + 1 === count($nodes)) {
                        $newWorkStatus = 'awaiting_signoff';
                    }
                    break;

                case 'request_confirmation':
                    if (! $isProvider) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can submit proof for customer confirmation.', $corrId, status: 403);
                    }
                    if (($node['node_kind'] ?? null) === 'final_signoff') {
                        throw new OrderError('INVALID_ACTION', 'Use the final Work completion proposal action for the sign-off node.', $corrId, status: 409);
                    }
                    if (($node['status'] ?? null) !== 'active' || ($node['control_mode'] ?? null) !== 'customer_confirm') {
                        throw new OrderError('INVALID_STATE', 'This Work node is not an active customer-confirmation gate.', $corrId, status: 409);
                    }
                    $payload = $this->validatedEvidencePayload((string) $work->id, $node, $actorUserId, $payload, $corrId, $now);
                    $node['status'] = 'awaiting_customer_confirmation';
                    $node['evidence_payload'] = $payload;
                    $structure['pending_customer_confirmation'] = true;
                    $structure['active_node_id'] = $node['id'];
                    break;

                case 'confirm_gate':
                    if (! $isBuyer) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can confirm this gate.', $corrId, status: 403);
                    }
                    if (($node['control_mode'] ?? null) !== 'customer_confirm' || ($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
                        throw new OrderError('INVALID_STATE', 'This node is not awaiting customer confirmation.', $corrId, status: 409);
                    }
                    if (($node['approval_method'] ?? 'app_confirm') !== 'app_confirm') {
                        throw new OrderError('CONFIRMATION_METHOD_UNAVAILABLE', 'This node requires an in-person confirmation method.', $corrId, status: 409);
                    }
                    if (($node['node_kind'] ?? null) === 'final_signoff') {
                        throw new OrderError('INVALID_ACTION', 'Final Work completion requires the atomic Order sign-off action.', $corrId, status: 409);
                    }
                    $payload = $this->validatedEvidencePayload(
                        (string) $work->id,
                        $node,
                        $providerId,
                        is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [],
                        $corrId,
                        $now,
                        persistedProof: true,
                    );
                    $node['evidence_payload'] = $payload;
                    $node['status'] = 'completed';
                    $node['customer_confirmed_at'] = $now->toIso8601String();
                    $structure['pending_customer_confirmation'] = false;
                    if (isset($nodes[$targetIdx + 1])) {
                        $nodes[$targetIdx + 1]['status'] = 'active';
                        $structure['active_node_id'] = $nodes[$targetIdx + 1]['id'];
                        $structure['active_ordinal'] = $targetIdx + 2;
                    }
                    break;

                case 'mark_ready_for_handoff':
                    if (! $isProvider) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can mark goods ready for handoff.', $corrId, status: 403);
                    }
                    if (($node['status'] ?? null) !== 'active' || ($node['control_mode'] ?? null) !== 'counterparty_handoff') {
                        throw new OrderError('INVALID_STATE', 'This node is not an active handoff gate.', $corrId, status: 409);
                    }
                    $payload = $this->validatedEvidencePayload((string) $work->id, $node, $actorUserId, $payload, $corrId, $now);
                    if (
                        in_array((string) ($node['approval_method'] ?? 'none'), ['presence_otp', 'worker_dropoff'], true)
                        || ($node['handoff_party'] ?? null) === 'worker_dropoff'
                    ) {
                        $node['status'] = 'awaiting_customer_confirmation';
                        $node['evidence_payload'] = $payload;
                        $structure['pending_customer_confirmation'] = true;
                        $structure['active_node_id'] = $node['id'];
                    } else {
                        $node['status'] = 'completed';
                        $node['completed_at'] = $now->toIso8601String();
                        $node['evidence_payload'] = $payload;
                        if (isset($nodes[$targetIdx + 1])) {
                            $nodes[$targetIdx + 1]['status'] = 'active';
                            $structure['active_node_id'] = $nodes[$targetIdx + 1]['id'];
                            $structure['active_ordinal'] = $targetIdx + 2;
                        }
                    }
                    break;

                case 'propose_completion':
                    if (! $isProvider) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can propose work completion.', $corrId, status: 403);
                    }
                    if (
                        ($node['status'] ?? null) !== 'active'
                        || ($node['node_kind'] ?? null) !== 'final_signoff'
                        || ($node['control_mode'] ?? null) !== 'customer_confirm'
                    ) {
                        throw new OrderError('INVALID_ACTION', 'Work completion can only be proposed at the active final sign-off node.', $corrId, status: 409);
                    }
                    if ($targetIdx !== count($nodes) - 1) {
                        throw new OrderError('INVALID_STATE', 'The final Work sign-off must be the last authored node.', $corrId, status: 409);
                    }
                    foreach (array_slice($nodes, 0, $targetIdx) as $predecessor) {
                        if (($predecessor['status'] ?? null) !== 'completed') {
                            throw new OrderError('INVALID_STATE', 'Every preceding Work node must be completed before final sign-off.', $corrId, status: 409);
                        }
                    }
                    $payload = $this->validatedEvidencePayload((string) $work->id, $node, $actorUserId, $payload, $corrId, $now);
                    $node['status'] = 'awaiting_customer_confirmation';
                    $node['evidence_payload'] = $payload;
                    $newWorkStatus = 'awaiting_signoff';
                    $structure['pending_customer_confirmation'] = true;
                    $structure['active_node_id'] = $node['id'];
                    break;

                case 'signoff_completion':
                    if (! $isBuyer) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can issue final sign-off.', $corrId, status: 403);
                    }
                    if (
                        ($node['node_kind'] ?? null) !== 'final_signoff'
                        || ($node['status'] ?? null) !== 'awaiting_customer_confirmation'
                        || ($node['approval_method'] ?? 'app_confirm') !== 'app_confirm'
                        || $targetIdx !== count($nodes) - 1
                    ) {
                        throw new OrderError('INVALID_STATE', 'Final Work sign-off is not available through this action.', $corrId, status: 409);
                    }
                    foreach (array_slice($nodes, 0, $targetIdx) as $predecessor) {
                        if (($predecessor['status'] ?? null) !== 'completed') {
                            throw new OrderError('INVALID_STATE', 'Every preceding Work node must be completed before final sign-off.', $corrId, status: 409);
                        }
                    }
                    $payload = $this->validatedEvidencePayload(
                        (string) $work->id,
                        $node,
                        $providerId,
                        is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [],
                        $corrId,
                        $now,
                        persistedProof: true,
                    );
                    $node['evidence_payload'] = $payload;
                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->toIso8601String();
                    $node['completed_by_user_id'] = $actorUserId;
                    $node['customer_confirmed_at'] = $now->toIso8601String();
                    $newWorkStatus = 'completed';
                    $newOrderStatus = 'completed';
                    $structure['pending_customer_confirmation'] = false;
                    break;

                default:
                    throw new OrderError('INVALID_ACTION', "Unsupported work node action [{$action}].", $corrId, status: 400);
            }
            if ($prevWorkStatus === 'scheduled' && $newWorkStatus === 'scheduled') {
                $newWorkStatus = 'in_progress';
            }
            if ($newOrderStatus === 'accepted' && ! in_array($newWorkStatus, ['not_started', 'scheduled'], true)) {
                $newOrderStatus = 'in_progress';
            }

            $nodes[$targetIdx] = $node;
            $structure['nodes'] = $nodes;

            // Update work_instances
            $workUpdate = [
                'status' => $newWorkStatus,
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'version' => DB::raw('version + 1'),
                'row_version' => DB::raw('COALESCE(row_version, 1) + 1'),
                'updated_at' => $now,
            ];
            if ($newWorkStatus === 'in_progress' && $work->started_at === null) {
                $workUpdate['started_at'] = $now;
            }
            if ($prevWorkStatus === 'scheduled' && $newWorkStatus !== 'scheduled' && $work->started_at === null) {
                $workUpdate['started_at'] = $now;
            }
            if ($newWorkStatus === 'awaiting_signoff' && $work->completion_proposed_at === null) {
                $workUpdate['completion_proposed_at'] = $now;
            }
            if ($newWorkStatus === 'completed' && $work->completed_at === null) {
                $workUpdate['completed_at'] = $now;
            }

            DB::table('work_instances')->where('id', (string) $work->id)->update($workUpdate);

            // Update order if status changed
            if ($newOrderStatus !== $prevOrderStatus) {
                DB::table('orders')->where('id', $orderId)->update([
                    'status' => $newOrderStatus,
                    'completed_at' => $newOrderStatus === 'completed' ? $now : null,
                    'version' => DB::raw('version + 1'),
                    'updated_at' => $now,
                ]);
            }

            // Work acceptance establishes a due obligation, never payment settlement.
            $obligationStatus = 'not_due';
            if ($newWorkStatus === 'completed') {
                $this->paymentObligations->markDueFromWorkFact($orderId, (string) $work->id, $corrId);
            }
            $obligation = DB::table('payment_obligations')->where('order_id', $orderId)->first();
            if ($obligation !== null) {
                $obligationStatus = (string) $obligation->status;
            }

            $workEventId = null;
            // Record work_events row
            if (Schema::hasTable('work_events')) {
                $primaryEvidenceFileId = (isset($payload['evidence_file_id']) && is_string($payload['evidence_file_id']))
                    ? $payload['evidence_file_id']
                    : ((isset($payload['evidence_file_ids'][0]) && is_string($payload['evidence_file_ids'][0]))
                        ? $payload['evidence_file_ids'][0]
                        : null);

                $workEventId = (string) Str::uuid7();
                DB::table('work_events')->insert([
                    'id' => $workEventId,
                    'work_instance_id' => (string) $work->id,
                    'previous_status' => $prevWorkStatus,
                    'new_status' => $newWorkStatus,
                    'event_type' => 'work.node.'.$action,
                    'event_version' => 1,
                    'actor_user_id' => $actorUserId,
                    'evidence_file_id' => $primaryEvidenceFileId,
                    'payload' => json_encode([
                        'node_id' => $node['id'],
                        'node_kind' => $node['node_kind'],
                        'action' => $action,
                        'payload' => $payload,
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'idempotency_key' => $action === 'signoff_completion'
                        ? 'work_signoff_completion_'.(string) $work->id
                        : 'work_act_'.substr($corrId, 0, 12).'_'.$nodeId.'_'.Str::random(6),
                    'correlation_id' => $corrId,
                    'occurred_at' => $now,
                    'effective_at' => $now,
                    'created_at' => $now,
                ]);
            }
            if ($workEventId !== null) {
                $auditId = $this->audits->record(
                    action: 'work.node.'.$action,
                    targetType: 'work_instance',
                    targetId: (string) $work->id,
                    correlationId: $corrId,
                    actor: ActorContext::human($actorUserId),
                    commandName: 'WorkExecutionService::advanceNode',
                    previous: ['work_status' => $prevWorkStatus, 'work_version' => (int) $work->version],
                    next: [
                        'work_status' => $newWorkStatus,
                        'order_status' => $newOrderStatus,
                        'work_version' => (int) $work->version + 1,
                        'node_id' => (string) $node['id'],
                        'action' => $action,
                    ],
                    reason: 'An authorized participant advanced an authored Work node.',
                    orderId: $orderId,
                );

                if ($action === 'signoff_completion' && $newWorkStatus === 'completed') {
                    $this->outbox->enqueue(
                        eventType: 'work.completed',
                        aggregateType: 'work_instance',
                        aggregateId: (string) $work->id,
                        payload: [
                            'order_id' => $orderId,
                            'work_instance_id' => (string) $work->id,
                            'final_signoff' => true,
                            'completion_actor_user_id' => $actorUserId,
                            'authorized_by_user_id' => $actorUserId,
                            'verified_by_user_id' => $actorUserId,
                            'node_id' => (string) $node['id'],
                            'challenge_id' => null,
                            'challenge_kind' => null,
                            'work_version' => (int) $work->version + 1,
                        ],
                        correlationId: $corrId,
                        auditEventId: $auditId,
                        eventId: $workEventId,
                    );
                } else {
                    $this->outbox->enqueue(
                        eventType: 'work.node.'.$action,
                        aggregateType: 'work_instance',
                        aggregateId: (string) $work->id,
                        payload: [
                            'order_id' => $orderId,
                            'work_instance_id' => (string) $work->id,
                            'node_id' => (string) $node['id'],
                            'node_kind' => (string) $node['node_kind'],
                            'action' => $action,
                            'actor_user_id' => $actorUserId,
                            'actor_role' => $isBuyer ? 'customer' : 'provider',
                            'work_version' => (int) $work->version + 1,
                        ],
                        correlationId: $corrId,
                        auditEventId: $auditId,
                        eventId: $workEventId,
                    );
                }
            }

            $notificationRecipientId = null;
            $notificationEventType = null;
            $notificationAttention = null;
            if (in_array($action, ['request_confirmation', 'propose_completion'], true)
                && in_array((string) ($node['approval_method'] ?? 'app_confirm'), ['app_confirm', 'presence_otp'], true)) {
                $notificationRecipientId = $buyerId;
                $notificationEventType = 'work.approval_requested';
                $notificationAttention = NotificationAttention::NeedsAction;
            } elseif (in_array($action, ['confirm_gate', 'signoff_completion'], true)) {
                $notificationRecipientId = $providerId;
                $notificationEventType = 'work.approval_confirmed';
                $notificationAttention = NotificationAttention::Updates;
            }
            if ($notificationRecipientId !== null && $notificationEventType !== null && $notificationAttention !== null) {
                $nextWorkVersion = (int) $work->version + 1;
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $notificationRecipientId,
                    eventSourceType: 'work_instance',
                    eventSourceId: (string) $work->id,
                    eventType: $notificationEventType,
                    attention: $notificationAttention,
                    title: $notificationAttention === NotificationAttention::NeedsAction
                        ? 'Work approval requested'
                        : 'Work approval recorded',
                    body: $notificationAttention === NotificationAttention::NeedsAction
                        ? 'Review the current Work step for your Order.'
                        : 'Review the current Work status for your Order.',
                    actionUrl: route('orders.show', ['order' => $orderId], false),
                    idempotencyKey: $notificationEventType.':'.(string) $work->id.':v'.$nextWorkVersion.':'.$notificationRecipientId,
                    correlationId: $corrId,
                ));
            }

            return [

                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'order_status' => $newOrderStatus,
                'work_status' => $newWorkStatus,
                'work_version' => (int) $work->version + 1,
                'obligation_status' => $obligationStatus,
                'structure' => $structure,
            ];
        });
    }

    /**
     * Advance an awaiting node only after the challenge row was consumed by its verified counterparty.
     *
     * @return array<string, mixed>
     */
    public function advanceVerifiedChallenge(
        string $orderId,
        string $actorUserId,
        string $nodeId,
        string $challengeId,
        string $correlationId,
    ): array {
        return DB::transaction(function () use ($orderId, $actorUserId, $nodeId, $challengeId, $correlationId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
            $challenge = DB::table('work_clearance_challenges')->where('id', $challengeId)
                ->where('order_id', $orderId)->where('node_id', $nodeId)->lockForUpdate()->first();
            if ($order === null || $work === null || $challenge === null || (string) $work->id !== (string) $challenge->work_instance_id) {
                throw new OrderError('CHALLENGE_STALE', 'This challenge is no longer valid for the current Work node.', $correlationId, status: 409);
            }
            if ($this->administrativeHolds->hasActiveHold('work_instance', (string) $work->id)) {
                throw new OrderError('ADMINISTRATIVE_HOLD_ACTIVE', 'This Work instance has an active administrative hold.', $correlationId, status: 409);
            }
            if (
                $challenge->consumed_at === null
                || (string) $challenge->consumed_by_user_id !== $actorUserId
                || $challenge->invalidated_at !== null
                || (int) $challenge->work_version !== (int) $work->version
            ) {
                throw new OrderError('CHALLENGE_STALE', 'This challenge is no longer valid for the current Work node.', $correlationId, status: 409);
            }
            if ((string) $work->work_shape === 'A4') {
                throw new OrderError('HANDOFF_PROTOCOL_REQUIRED', 'A4 handoffs use the governed custody protocol.', $correlationId, status: 409);
            }
            $contract = $this->contractForWorkRow($work, $correlationId);
            if (! $contract->supportsClearanceChallenges) {
                throw new OrderError('WORK_CONTRACT_VERSION_UNSUPPORTED', 'This Work contract does not support clearance challenges.', $correlationId, status: 409);
            }

            $structure = $this->decodeJson($work->structure);
            if ($structure === null || ! is_array($structure['nodes'] ?? null)) {
                throw new OrderError('WORK_NOT_FOUND', 'The Work node structure is unavailable.', $correlationId, status: 409);
            }
            $workSignature = $structure['signature_hash'] ?? null;
            if (
                ! is_string($workSignature)
                || trim($workSignature) === ''
                || ! hash_equals(hash('sha256', $workSignature), (string) ($challenge->work_signature_hash ?? ''))
            ) {
                throw new OrderError('CHALLENGE_STALE', 'The accepted Work specification changed after this code was issued.', $correlationId, status: 409);
            }
            $nodes = $structure['nodes'];
            $targetIdx = null;
            foreach ($nodes as $index => $candidate) {
                if ((string) ($candidate['id'] ?? '') === $nodeId) {
                    $targetIdx = $index;
                    break;
                }
            }
            if ($targetIdx === null) {
                throw new OrderError('NODE_NOT_FOUND', 'Target work node does not exist.', $correlationId, status: 404);
            }

            $node = $nodes[$targetIdx];
            $this->assertNodeSupportedByContract($contract, $node, $correlationId);
            $kind = (string) $challenge->kind;
            $method = (string) ($node['approval_method'] ?? 'none');
            $controlMode = (string) ($node['control_mode'] ?? '');
            $isPresenceVerifier = $kind === 'presence_otp'
                && $method === 'presence_otp'
                && $controlMode === 'customer_confirm'
                && (string) $challenge->issuer_user_id === (string) $order->buyer_user_id
                && $actorUserId === (string) $order->provider_user_id;
            $isDropoffVerifier = $kind === 'worker_dropoff'
                && ($method === 'worker_dropoff' || ($node['handoff_party'] ?? null) === 'worker_dropoff')
                && $controlMode === 'counterparty_handoff'
                && (string) $challenge->issuer_user_id !== $actorUserId;
            if (! $isPresenceVerifier && ! $isDropoffVerifier) {
                throw new OrderError('AUTHORIZATION_DENIED', 'This actor cannot verify the authored Work challenge.', $correlationId, status: 403);
            }
            if (($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
                throw new OrderError('CHALLENGE_STALE', 'This Work node is no longer awaiting counterparty clearance.', $correlationId, status: 409);
            }

            if (($node['node_kind'] ?? null) === 'final_signoff') {
                if ($targetIdx !== count($nodes) - 1) {
                    throw new OrderError('INVALID_STATE', 'The final Work sign-off must be the last authored node.', $correlationId, status: 409);
                }
                foreach (array_slice($nodes, 0, $targetIdx) as $predecessor) {
                    if (($predecessor['status'] ?? null) !== 'completed') {
                        throw new OrderError('INVALID_STATE', 'Every preceding Work node must be completed before final sign-off.', $correlationId, status: 409);
                    }
                }
            }
            $this->assertDealWorkGate((string) $work->id, $correlationId);
            $now = now();
            $node['evidence_payload'] = $this->validatedEvidencePayload(
                (string) $work->id,
                $node,
                (string) $order->provider_user_id,
                is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [],
                $correlationId,
                $now,
                persistedProof: true,
            );
            $previousWorkStatus = (string) $work->status;
            $newWorkStatus = $previousWorkStatus;
            $previousOrderStatus = (string) $order->status;
            $newOrderStatus = $previousOrderStatus;
            $node['status'] = 'completed';
            $node['completed_at'] = $now->toIso8601String();
            $node['completed_by_user_id'] = $actorUserId;
            $node['customer_confirmed_at'] = $now->toIso8601String();
            $structure['pending_customer_confirmation'] = false;
            if (($node['node_kind'] ?? null) === 'final_signoff') {
                $newWorkStatus = 'completed';
                $newOrderStatus = 'completed';
            } elseif (isset($nodes[$targetIdx + 1])) {
                $nodes[$targetIdx + 1]['status'] = 'active';
                $structure['active_node_id'] = $nodes[$targetIdx + 1]['id'];
                $structure['active_ordinal'] = $targetIdx + 2;
                if (in_array($previousWorkStatus, ['not_started', 'scheduled'], true)) {
                    $newWorkStatus = 'in_progress';
                }
            } else {
                $newWorkStatus = 'awaiting_signoff';
            }
            if ($newOrderStatus === 'accepted' && ! in_array($newWorkStatus, ['not_started', 'scheduled'], true)) {
                $newOrderStatus = 'in_progress';
            }
            if (($node['node_kind'] ?? null) === 'final_signoff') {
                $newOrderStatus = 'completed';
            }

            $nodes[$targetIdx] = $node;
            $structure['nodes'] = $nodes;
            DB::table('work_instances')->where('id', (string) $work->id)->update([
                'status' => $newWorkStatus,
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'version' => DB::raw('version + 1'),
                'row_version' => DB::raw('COALESCE(row_version, 1) + 1'),
                'started_at' => $newWorkStatus === 'in_progress' && $work->started_at === null ? $now : $work->started_at,
                'completion_proposed_at' => $newWorkStatus === 'awaiting_signoff' && $work->completion_proposed_at === null
                    ? $now
                    : $work->completion_proposed_at,
                'completed_at' => $newWorkStatus === 'completed' ? ($work->completed_at ?? $now) : $work->completed_at,
                'updated_at' => $now,
            ]);
            if ($newOrderStatus !== $previousOrderStatus) {
                DB::table('orders')->where('id', $orderId)->update([
                    'status' => $newOrderStatus,
                    'completed_at' => $newOrderStatus === 'completed' ? $now : null,
                    'version' => DB::raw('version + 1'),
                    'updated_at' => $now,
                ]);
            }

            $obligationStatus = 'not_due';
            if ($newWorkStatus === 'completed') {
                $this->paymentObligations->markDueFromWorkFact($orderId, (string) $work->id, $correlationId);
            }
            $obligation = DB::table('payment_obligations')->where('order_id', $orderId)->first();
            if ($obligation !== null) {
                $obligationStatus = (string) $obligation->status;
            }
            $workEventId = null;
            if (Schema::hasTable('work_events')) {
                $evidencePayload = is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [];
                $evidenceFileId = $evidencePayload['evidence_file_ids'][0] ?? null;
                $workEventId = (string) Str::uuid7();
                DB::table('work_events')->insert([
                    'id' => $workEventId,
                    'work_instance_id' => (string) $work->id,
                    'previous_status' => $previousWorkStatus,
                    'new_status' => $newWorkStatus,
                    'event_type' => 'work.node.challenge_verified',
                    'event_version' => 1,
                    'actor_user_id' => $actorUserId,
                    'evidence_file_id' => is_string($evidenceFileId) ? $evidenceFileId : null,
                    'payload' => json_encode([
                        'node_id' => $nodeId,
                        'node_kind' => $node['node_kind'] ?? null,
                        'challenge_id' => $challengeId,
                        'challenge_kind' => $kind,
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'idempotency_key' => 'work_challenge_'.$challengeId,
                    'correlation_id' => $correlationId,
                    'occurred_at' => $now,
                    'effective_at' => $now,
                    'created_at' => $now,
                ]);
            }
            if ($workEventId !== null) {
                $authorizedByUserId = $kind === 'presence_otp'
                    ? (string) $challenge->issuer_user_id
                    : (string) $challenge->verifier_user_id;
                $auditId = $this->audits->record(
                    action: 'work.node.challenge_verified',
                    targetType: 'work_instance',
                    targetId: (string) $work->id,
                    correlationId: $correlationId,
                    actor: ActorContext::human($actorUserId),
                    commandName: 'WorkExecutionService::advanceVerifiedChallenge',
                    previous: ['work_status' => $previousWorkStatus, 'work_version' => (int) $work->version],
                    next: [
                        'work_status' => $newWorkStatus,
                        'order_status' => $newOrderStatus,
                        'work_version' => (int) $work->version + 1,
                        'node_id' => $nodeId,
                        'challenge_id' => $challengeId,
                        'challenge_kind' => $kind,
                        'authorized_by_user_id' => $authorizedByUserId,
                        'verified_by_user_id' => $actorUserId,
                    ],
                    reason: 'An authorized counterparty verified a bound Work challenge.',
                    orderId: $orderId,
                );

                if (($node['node_kind'] ?? null) === 'final_signoff' && $newWorkStatus === 'completed') {
                    $this->outbox->enqueue(
                        eventType: 'work.completed',
                        aggregateType: 'work_instance',
                        aggregateId: (string) $work->id,
                        payload: [
                            'order_id' => $orderId,
                            'work_instance_id' => (string) $work->id,
                            'final_signoff' => true,
                            'completion_actor_user_id' => $actorUserId,
                            'authorized_by_user_id' => $authorizedByUserId,
                            'verified_by_user_id' => $actorUserId,
                            'node_id' => $nodeId,
                            'challenge_id' => $challengeId,
                            'challenge_kind' => $kind,
                            'work_version' => (int) $challenge->work_version,
                            'completed_work_version' => (int) $work->version + 1,
                        ],
                        correlationId: $correlationId,
                        auditEventId: $auditId,
                        eventId: $workEventId,
                    );
                } else {
                    $this->outbox->enqueue(
                        eventType: 'work.node.challenge_verified',
                        aggregateType: 'work_instance',
                        aggregateId: (string) $work->id,
                        payload: [
                            'order_id' => $orderId,
                            'work_instance_id' => (string) $work->id,
                            'node_id' => $nodeId,
                            'node_kind' => (string) ($node['node_kind'] ?? ''),
                            'challenge_id' => $challengeId,
                            'challenge_kind' => $kind,
                            'authorized_by_user_id' => $authorizedByUserId,
                            'verified_by_user_id' => $actorUserId,
                            'work_version' => (int) $work->version + 1,
                        ],
                        correlationId: $correlationId,
                        auditEventId: $auditId,
                        eventId: $workEventId,
                    );
                }
            }
            $challengeIssuerUserId = (string) $challenge->issuer_user_id;
            if ($challengeIssuerUserId !== $actorUserId) {
                $completedWorkVersion = (int) $work->version + 1;
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $challengeIssuerUserId,
                    eventSourceType: 'work_clearance_challenge',
                    eventSourceId: $challengeId,
                    eventType: 'work.approval_confirmed',
                    attention: NotificationAttention::Updates,
                    title: 'Work confirmation recorded',
                    body: 'The assigned Work confirmation was completed.',
                    actionUrl: route('orders.show', ['order' => $orderId], false),
                    idempotencyKey: 'work.approval_confirmed:'.$challengeId.':v'.$completedWorkVersion.':'.$challengeIssuerUserId,
                    correlationId: $correlationId,
                ));
            }


            return [
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'order_status' => $newOrderStatus,
                'work_status' => $newWorkStatus,
                'work_version' => (int) $work->version + 1,
                'obligation_status' => $obligationStatus,
                'structure' => $structure,
            ];
        });
    }

    /**
     * Validate authored evidence for a governed non-generic Work action.
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function validateAuthoredNodeEvidence(
        object $workRow,
        array $node,
        string $actorUserId,
        array $payload,
        string $correlationId,
    ): array {
        $contract = $this->contractForWorkRow($workRow, $correlationId);
        $this->assertNodeSupportedByContract($contract, $node, $correlationId);

        return $this->validatedEvidencePayload(
            (string) $workRow->id,
            $node,
            $actorUserId,
            $payload,
            $correlationId,
            Carbon::now(),
            nativeA4Photo: (string) $workRow->work_shape === 'A4',
        );
    }

    /**
     * Revalidate proof already persisted by a governed Work action without changing its server timestamps.
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function revalidatePersistedAuthoredNodeEvidence(
        object $workRow,
        array $node,
        string $actorUserId,
        array $payload,
        string $correlationId,
    ): array {
        $contract = $this->contractForWorkRow($workRow, $correlationId);
        $this->assertNodeSupportedByContract($contract, $node, $correlationId);

        return $this->validatedEvidencePayload(
            (string) $workRow->id,
            $node,
            $actorUserId,
            $payload,
            $correlationId,
            Carbon::now(),
            persistedProof: true,
            nativeA4Photo: (string) $workRow->work_shape === 'A4',
        );
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function validatedEvidencePayload(
        string $workInstanceId,
        array $node,
        string $actorUserId,
        array $payload,
        string $correlationId,
        Carbon $now,
        bool $persistedProof = false,
        bool $nativeA4Photo = false,
    ): array {
        $requiredProofs = $this->requiredProofs($node, $correlationId);

        $allowedKeys = ['notes'];
        foreach ($requiredProofs as $proof) {
            $key = match ($proof) {
                'photo_proof' => 'evidence_file_ids',
                'gps_checkin' => 'location',
                'metric_reading' => 'metric_readings',
                'checklist_steps' => 'checklist_responses',
                default => null,
            };
            if ($key !== null) {
                $allowedKeys[] = $key;
            }
        }
        if ($nativeA4Photo) {
            $allowedKeys[] = 'evidence_file_ids';
        }
        if (array_diff(array_keys($payload), $allowedKeys) !== []) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'The Work evidence payload contains unsupported fields.', $correlationId, status: 422);
        }

        if (isset($payload['notes'])) {
            if (! is_string($payload['notes']) || mb_strlen($payload['notes']) > 2000) {
                throw new OrderError('INVALID_WORK_NOTES', 'Work notes must be 2,000 characters or fewer.', $correlationId, status: 422);
            }
            $payload['notes'] = trim($payload['notes']);
        }

        if (in_array('photo_proof', $requiredProofs, true) || $nativeA4Photo) {
            $evidenceFileIds = $payload['evidence_file_ids'] ?? null;
            if (! is_array($evidenceFileIds) || ! array_is_list($evidenceFileIds) || array_filter($evidenceFileIds, 'is_string') !== $evidenceFileIds) {
                throw new OrderError('INVALID_WORK_EVIDENCE', 'Photo proof must contain uploaded evidence IDs.', $correlationId, status: 422);
            }
            $this->workEvidence->assertAvailablePhotoEvidence(
                $workInstanceId,
                (string) $node['id'],
                $actorUserId,
                $evidenceFileIds,
                $correlationId,
            );
        } elseif (($payload['evidence_file_ids'] ?? []) !== []) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not accept photo proof.', $correlationId, status: 422);
        }

        if (in_array('gps_checkin', $requiredProofs, true)) {
            $location = $payload['location'] ?? null;
            $allowedLocationKeys = ['latitude', 'longitude', 'source', 'observed_at', 'accuracy_m', 'landmark'];
            if ($persistedProof) {
                $allowedLocationKeys[] = 'received_at';
            }
            $latitude = is_array($location) ? ($location['latitude'] ?? null) : null;
            $longitude = is_array($location) ? ($location['longitude'] ?? null) : null;
            $source = is_array($location) ? ($location['source'] ?? null) : null;
            $observedAt = is_array($location) ? ($location['observed_at'] ?? null) : null;
            $accuracy = is_array($location) ? ($location['accuracy_m'] ?? null) : null;
            $landmark = is_array($location) ? ($location['landmark'] ?? null) : null;
            $receivedAt = $persistedProof
                ? (is_array($location) ? ($location['received_at'] ?? null) : null)
                : $now->toIso8601String();
            if (
                ! is_array($location)
                || array_diff(array_keys($location), $allowedLocationKeys) !== []
                || ! is_numeric($latitude) || ! is_finite((float) $latitude) || (float) $latitude < -90 || (float) $latitude > 90
                || ! is_numeric($longitude) || ! is_finite((float) $longitude) || (float) $longitude < -180 || (float) $longitude > 180
                || ! in_array($source, ['gps', 'manual'], true)
                || ! is_string($observedAt) || strtotime($observedAt) === false
                || ! is_string($receivedAt) || strtotime($receivedAt) === false
                || ($source === 'gps' && (! is_numeric($accuracy) || ! is_finite((float) $accuracy) || (float) $accuracy < 0))
                || ($landmark !== null && (! is_string($landmark) || mb_strlen($landmark) > 120))
            ) {
                throw new OrderError('INVALID_LOCATION_PROOF', 'Provide a valid device location or manual map pin.', $correlationId, status: 422);
            }
            $payload['location'] = [
                'latitude' => (float) $latitude,
                'longitude' => (float) $longitude,
                'accuracy_m' => is_numeric($accuracy) ? (float) $accuracy : null,
                'source' => $source,
                'landmark' => is_string($landmark) ? trim($landmark) : null,
                'observed_at' => $observedAt,
                'received_at' => $receivedAt,
            ];
        } elseif (array_key_exists('location', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not accept location proof.', $correlationId, status: 422);
        }

        if (in_array('metric_reading', $requiredProofs, true)) {
            $readings = $payload['metric_readings'] ?? null;
            if (! is_array($readings) || ! array_is_list($readings)) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Enter the named measurements required by this Work node.', $correlationId, status: 422);
            }
            $payload['metric_readings'] = $this->validateMetricReadings($node, $readings, $correlationId, $now, $persistedProof);
        } elseif (array_key_exists('metric_readings', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not accept meter readings.', $correlationId, status: 422);
        }

        if (in_array('checklist_steps', $requiredProofs, true)) {
            $responses = $payload['checklist_responses'] ?? null;
            if (! is_array($responses) || ! array_is_list($responses)) {
                throw new OrderError('WORK_CHECKLIST_REQUIRED', 'Submit item-level responses for this Work checklist.', $correlationId, status: 422);
            }
            $payload['checklist_responses'] = $this->validateChecklistResponses($node, $responses, $correlationId);
        } elseif (array_key_exists('checklist_responses', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not require checklist proof.', $correlationId, status: 422);
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  list<mixed>  $readings
     * @return list<array{id: string, value: float, unit: string, observed_at: string, received_at: string}>
     */
    private function validateMetricReadings(
        array $node,
        array $readings,
        string $correlationId,
        Carbon $now,
        bool $persistedProof,
    ): array {
        $requirements = $node['metric_requirements'] ?? null;
        if (! is_array($requirements) || ! array_is_list($requirements) || $requirements === []) {
            throw new OrderError('METRIC_REQUIREMENTS_UNAVAILABLE', 'This Work node has no authored named measurement requirements.', $correlationId, status: 409);
        }

        $requirementsById = [];
        foreach ($requirements as $requirement) {
            if (
                ! is_array($requirement)
                || ! is_string($requirement['id'] ?? null)
                || ! is_string($requirement['name'] ?? null)
                || ! is_string($requirement['unit'] ?? null)
                || isset($requirementsById[$requirement['id']])
            ) {
                throw new OrderError('METRIC_REQUIREMENTS_UNAVAILABLE', 'This Work node has invalid named measurement requirements.', $correlationId, status: 409);
            }
            $requirementsById[$requirement['id']] = $requirement;
        }

        $seen = [];
        $normalized = [];
        $allowedReadingKeys = ['id', 'value', 'unit', 'observed_at'];
        if ($persistedProof) {
            $allowedReadingKeys[] = 'received_at';
        }
        foreach ($readings as $reading) {
            if (
                ! is_array($reading)
                || array_diff(array_keys($reading), $allowedReadingKeys) !== []
                || ! is_string($reading['id'] ?? null)
                || ! is_numeric($reading['value'] ?? null)
                || ! is_finite((float) $reading['value'])
            ) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Each named measurement needs an ID and finite numeric value.', $correlationId, status: 422);
            }

            $id = $reading['id'];
            $requirement = $requirementsById[$id] ?? null;
            if ($requirement === null || isset($seen[$id])) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Measurement IDs must match authored requirements exactly once.', $correlationId, status: 422);
            }
            $unit = $reading['unit'] ?? null;
            if (! is_string($unit) || $unit !== $requirement['unit']) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Each measurement must use its authored unit.', $correlationId, status: 422);
            }

            $value = (float) $reading['value'];
            if (
                (isset($requirement['min']) && $value < (float) $requirement['min'])
                || (isset($requirement['max']) && $value > (float) $requirement['max'])
            ) {
                throw new OrderError('METRIC_OUT_OF_BOUNDS', 'The measurement is outside its authored bounds.', $correlationId, status: 422);
            }
            $observedAt = $reading['observed_at'] ?? $now->toIso8601String();
            if (! is_string($observedAt) || strtotime($observedAt) === false) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Each measurement must have a valid observation time.', $correlationId, status: 422);
            }
            $receivedAt = $persistedProof
                ? ($reading['received_at'] ?? null)
                : $now->toIso8601String();
            if (! is_string($receivedAt) || strtotime($receivedAt) === false) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Each named measurement needs a valid server receipt timestamp.', $correlationId, status: 422);
            }

            $seen[$id] = true;
            $normalized[] = [
                'id' => $id,
                'value' => $value,
                'unit' => $unit,
                'observed_at' => $observedAt,
                'received_at' => $receivedAt,
            ];
        }

        foreach ($requirementsById as $id => $requirement) {
            if (($requirement['required'] ?? true) && ! isset($seen[$id])) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Submit every required named measurement for this Work node.', $correlationId, status: 422);
            }
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  list<mixed>  $responses
     * @return list<array{id: string, completed: bool}>
     */
    private function validateChecklistResponses(array $node, array $responses, string $correlationId): array
    {
        $items = $node['checklist_items'] ?? null;
        if (! is_array($items) || ! array_is_list($items) || $items === []) {
            throw new OrderError('CHECKLIST_ITEMS_UNAVAILABLE', 'This Work node has no authored checklist items.', $correlationId, status: 409);
        }

        $itemsById = [];
        foreach ($items as $item) {
            if (
                ! is_array($item)
                || ! is_string($item['id'] ?? null)
                || ! is_string($item['label'] ?? null)
                || isset($itemsById[$item['id']])
            ) {
                throw new OrderError('CHECKLIST_ITEMS_UNAVAILABLE', 'This Work node has invalid authored checklist items.', $correlationId, status: 409);
            }
            $itemsById[$item['id']] = $item;
        }

        $seen = [];
        $normalized = [];
        foreach ($responses as $response) {
            if (
                ! is_array($response)
                || array_diff(array_keys($response), ['id', 'completed']) !== []
                || ! is_string($response['id'] ?? null)
                || ! is_bool($response['completed'] ?? null)
            ) {
                throw new OrderError('INVALID_WORK_CHECKLIST', 'Each checklist response must identify an item and its completion state.', $correlationId, status: 422);
            }

            $id = $response['id'];
            $item = $itemsById[$id] ?? null;
            if ($item === null || isset($seen[$id])) {
                throw new OrderError('INVALID_WORK_CHECKLIST', 'Checklist response IDs must match authored items exactly once.', $correlationId, status: 422);
            }
            if (($item['required'] ?? true) && $response['completed'] !== true) {
                throw new OrderError('WORK_CHECKLIST_REQUIRED', 'Complete every required checklist item before advancing.', $correlationId, status: 422);
            }

            $seen[$id] = true;
            $normalized[] = ['id' => $id, 'completed' => $response['completed']];
        }

        foreach ($itemsById as $id => $item) {
            if (($item['required'] ?? true) && ! isset($seen[$id])) {
                throw new OrderError('WORK_CHECKLIST_REQUIRED', 'Complete every required checklist item before advancing.', $correlationId, status: 422);
            }
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return list<string>
     */
    private function requiredProofs(array $node, string $correlationId): array
    {
        $requiredProofs = $node['required_proofs'] ?? null;
        if (! is_array($requiredProofs)) {
            $requiredProofs = match ($node['evidence_type'] ?? null) {
                'photo_required', 'video_required', 'receipt_upload' => ['photo_proof'],
                'gps_checkin' => ['gps_checkin'],
                'meter_log' => ['metric_reading'],
                default => [],
            };
        }

        foreach ($requiredProofs as $proof) {
            if (! is_string($proof) || ! in_array($proof, WorkSpecificationPort::WORK_TOOLS, true)) {
                throw new OrderError('UNSUPPORTED_WORK_TOOL', 'This Work node contains an unsupported proof tool.', $correlationId, status: 409);
            }
            if ($proof === 'external_connector') {
                throw new OrderError('WORK_TOOL_UNAVAILABLE', 'The external connector for this Work node is not active.', $correlationId, status: 409);
            }

        }

        return array_values($requiredProofs);
    }

    private function contractForWorkRow(object $workRow, string $correlationId): WorkContractDefinition
    {
        try {
            return $this->workContracts->resolveForWork(
                (string) $workRow->work_shape,
                (int) ($workRow->shape_contract_version ?? 1),
                (int) ($workRow->payload_schema_version ?? 1),
                $correlationId,
            );
        } catch (WorkContractError $error) {
            throw new OrderError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
        }
    }

    /** @param array<string, mixed> $node */
    private function assertNodeSupportedByContract(WorkContractDefinition $contract, array $node, string $correlationId): void
    {
        foreach ($this->requiredProofs($node, $correlationId) as $proof) {
            if (! $contract->supportsTool($proof)) {
                throw new OrderError('WORK_CONTRACT_VERSION_UNSUPPORTED', 'This Work contract does not support the authored proof tool.', $correlationId, status: 409);
            }
        }
        if ((! $contract->supportsItemizedChecklists && ! empty($node['checklist_items']))
            || (! $contract->supportsNamedMetrics && ! empty($node['metric_requirements']))) {
            throw new OrderError('WORK_CONTRACT_VERSION_UNSUPPORTED', 'This Work contract does not support named checklist or measurement requirements.', $correlationId, status: 409);
        }
        if (in_array((string) ($node['approval_method'] ?? 'none'), ['presence_otp', 'worker_dropoff'], true)
            && ! $contract->supportsClearanceChallenges) {
            throw new OrderError('WORK_CONTRACT_VERSION_UNSUPPORTED', 'This Work contract does not support clearance challenges.', $correlationId, status: 409);
        }
    }

    private function assertDealWorkGate(string $workInstanceId, string $correlationId): void
    {
        try {
            $this->dealWorkGates->assertWorkCanAdvance($workInstanceId, $correlationId);
        } catch (KernelException $error) {
            throw new OrderError(
                (string) $error->envelope->code,
                $error->envelope->message,
                $correlationId,
                status: $error->status,
            );
        }
    }

    /**
     * Pure read projection of Work execution state for OrderController::show().
     *
     * @return array<string, mixed>|null
     */
    public function projectForOrder(?object $workRow, ?object $termsRow): ?array
    {
        if ($workRow === null) {
            return null;
        }

        $correlationId = (string) Str::uuid7();
        $this->contractForWorkRow($workRow, $correlationId);
        $structure = $this->decodeJson($workRow->structure);
        $workShape = (string) $workRow->work_shape;

        if ($structure === null || ! isset($structure['nodes']) || ! is_array($structure['nodes']) || $structure['nodes'] === []) {
            $termsData = $termsRow !== null ? $this->decodeJson($termsRow->scope) : [];
            $structure = $this->initializeStructure(
                is_array($termsData) ? $termsData : [],
                $workShape,
                $correlationId,
                (int) ($workRow->shape_contract_version ?? 1),
                (int) ($workRow->payload_schema_version ?? 1),
            );
        }

        return [
            'id' => (string) $workRow->id,
            'status' => (string) $workRow->status,
            'work_shape' => $workShape,
            'version' => (int) $workRow->version,
            'signature_hash' => $structure['signature_hash'] ?? null,
            'active_node_id' => $structure['active_node_id'] ?? null,
            'active_ordinal' => $structure['active_ordinal'] ?? 1,
            'pending_customer_confirmation' => (bool) ($structure['pending_customer_confirmation'] ?? false),
            'nodes' => $structure['nodes'] ?? [],
        ];
    }

    /** @return array<string, mixed>|null */
    private function decodeJson(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}

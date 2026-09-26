<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;
use App\Shared\Contracts\WorkSpecificationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkExecutionService
{
    public function __construct(
        private readonly WorkSpecificationPort $workSpecs,
    ) {}

    /**
     * Initialize the runtime Work structure from an Order's source terms or work_specification.
     *
     * @param  array<string, mixed>  $sourceTerms
     * @return array<string, mixed>
     */
    public function initializeStructure(array $sourceTerms, string $workShape): array
    {
        $shape = strtoupper(trim($workShape)) ?: 'A1';

        $spec = $sourceTerms['work_specification'] ?? null;
        if (is_string($spec)) {
            $spec = json_decode($spec, true);
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

        $normalizedNodes = $this->workSpecs->normalizeNodes($rawNodes, $shape);
        if ($signatureHash === null || $signatureHash === '') {
            $signatureHash = $this->workSpecs->computeSignature($shape, $normalizedNodes);
        }

        $runtimeNodes = [];
        foreach ($normalizedNodes as $idx => $node) {
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

            $structure = $this->decodeJson($work->structure);
            $workShape = (string) $work->work_shape;

            if ($structure === null || ! isset($structure['nodes']) || ! is_array($structure['nodes']) || $structure['nodes'] === []) {
                $termsRow = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
                $termsData = $termsRow !== null ? $this->decodeJson($termsRow->scope) : [];
                $structure = $this->initializeStructure(is_array($termsData) ? $termsData : [], $workShape);
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
                    if ($node['status'] !== 'active') {
                        throw new OrderError('INVALID_STATE', 'Only the active node can be completed.', $corrId, status: 409);
                    }

                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->toIso8601String();
                    $node['completed_by_user_id'] = $actorUserId;
                    $node['evidence_payload'] = $payload;

                    if ($prevWorkStatus === 'not_started') {
                        $newWorkStatus = 'in_progress';
                    }

                    // Unlock next node
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

                    $node['status'] = 'awaiting_customer_confirmation';
                    $node['evidence_payload'] = $payload;
                    $structure['pending_customer_confirmation'] = true;
                    $structure['active_node_id'] = $node['id'];
                    break;

                case 'confirm_gate':
                    if (! $isBuyer) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can confirm this gate.', $corrId, status: 403);
                    }
                    if ($node['status'] !== 'awaiting_customer_confirmation') {
                        throw new OrderError('INVALID_STATE', 'This node is not awaiting customer confirmation.', $corrId, status: 409);
                    }

                    $node['status'] = 'completed';
                    $node['customer_confirmed_at'] = $now->toIso8601String();
                    $structure['pending_customer_confirmation'] = false;

                    // Unlock next node
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

                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->toIso8601String();
                    $node['evidence_payload'] = $payload;

                    if (isset($nodes[$targetIdx + 1])) {
                        $nodes[$targetIdx + 1]['status'] = 'active';
                        $structure['active_node_id'] = $nodes[$targetIdx + 1]['id'];
                        $structure['active_ordinal'] = $targetIdx + 2;
                    }
                    break;

                case 'propose_completion':
                    if (! $isProvider) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the provider can propose work completion.', $corrId, status: 403);
                    }

                    $node['status'] = 'awaiting_customer_confirmation';
                    $newWorkStatus = 'awaiting_signoff';
                    $structure['pending_customer_confirmation'] = true;
                    $structure['active_node_id'] = $node['id'];
                    break;

                case 'signoff_completion':
                    if (! $isBuyer) {
                        throw new OrderError('AUTHORIZATION_DENIED', 'Only the customer can issue final sign-off.', $corrId, status: 403);
                    }

                    $node['status'] = 'completed';
                    $node['customer_confirmed_at'] = $now->toIso8601String();
                    $newWorkStatus = 'completed';
                    $newOrderStatus = 'closed';
                    $structure['pending_customer_confirmation'] = false;
                    break;

                default:
                    throw new OrderError('INVALID_ACTION', "Unsupported work node action [{$action}].", $corrId, status: 400);
            }

            $nodes[$targetIdx] = $node;
            $structure['nodes'] = $nodes;

            // Update work_instances
            $workUpdate = [
                'status' => $newWorkStatus,
                'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                'structure_payload_version' => 1,
                'updated_at' => $now,
            ];
            if ($newWorkStatus === 'in_progress' && $work->started_at === null) {
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
                    'updated_at' => $now,
                ]);
            }

            // Update payment obligation if completed
            $obligationStatus = 'pending';
            $obligation = DB::table('payment_obligations')->where('order_id', $orderId)->first();
            if ($obligation !== null) {
                $obligationStatus = (string) $obligation->status;
                if ($newWorkStatus === 'completed') {
                    DB::table('payment_obligations')->where('id', (string) $obligation->id)->update([
                        'status' => 'released',
                        'updated_at' => $now,
                    ]);
                    $obligationStatus = 'released';
                }
            }

            // Record work_events row
            if (Schema::hasTable('work_events')) {
                DB::table('work_events')->insert([
                    'id' => (string) Str::uuid7(),
                    'work_instance_id' => (string) $work->id,
                    'previous_status' => $prevWorkStatus,
                    'new_status' => $newWorkStatus,
                    'event_type' => 'work.node.'.$action,
                    'event_version' => 1,
                    'actor_user_id' => $actorUserId,
                    'evidence_file_id' => null,
                    'payload' => json_encode([
                        'node_id' => $node['id'],
                        'node_kind' => $node['node_kind'],
                        'action' => $action,
                        'payload' => $payload,
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'idempotency_key' => 'work_act_'.substr($corrId, 0, 12).'_'.$nodeId.'_'.Str::random(6),
                    'correlation_id' => $corrId,
                    'occurred_at' => $now,
                    'effective_at' => $now,
                    'created_at' => $now,
                ]);
            }

            return [
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'order_status' => $newOrderStatus,
                'work_status' => $newWorkStatus,
                'obligation_status' => $obligationStatus,
                'structure' => $structure,
            ];
        });
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

        $structure = $this->decodeJson($workRow->structure);
        $workShape = (string) $workRow->work_shape;

        if ($structure === null || ! isset($structure['nodes']) || ! is_array($structure['nodes']) || $structure['nodes'] === []) {
            $termsData = $termsRow !== null ? $this->decodeJson($termsRow->scope) : [];
            $structure = $this->initializeStructure(is_array($termsData) ? $termsData : [], $workShape);
        }

        return [
            'id' => (string) $workRow->id,
            'status' => (string) $workRow->status,
            'work_shape' => $workShape,
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

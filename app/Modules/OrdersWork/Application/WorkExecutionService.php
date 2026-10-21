<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Modules\Catalogs\Application\WorkCatalog;
use App\Shared\Contracts\WorkSpecificationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkExecutionService
{
    public function __construct(
        private readonly WorkSpecificationPort $workSpecs,
        private readonly WorkNodeEvidenceService $workEvidence,
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
                'required_proofs' => $node['required_proofs'] ?? [],
                'approval_method' => $node['approval_method'] ?? 'none',
                'metric_unit' => $node['metric_unit'] ?? null,
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
                    if (($node['status'] ?? null) !== 'active') {
                        throw new OrderError('INVALID_STATE', 'Only the active node can be completed.', $corrId, status: 409);
                    }
                    if (($node['control_mode'] ?? 'provider_advance') !== 'provider_advance') {
                        throw new OrderError('INVALID_ACTION', 'This Work node requires a different clearance authority.', $corrId, status: 409);
                    }
                    $payload = $this->validatedEvidencePayload((string) $work->id, $node, $actorUserId, $payload, $corrId, $now);
                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->toIso8601String();
                    $node['completed_by_user_id'] = $actorUserId;
                    $node['evidence_payload'] = $payload;

                    if ($prevWorkStatus === 'not_started') {
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
                    $requiredProofs = $this->requiredProofs($node, $corrId);
                    if (in_array('photo_proof', $requiredProofs, true)) {
                        $evidencePayload = is_array($node['evidence_payload'] ?? null) ? $node['evidence_payload'] : [];
                        $evidenceFileIds = array_values(array_filter(
                            (array) ($evidencePayload['evidence_file_ids'] ?? []),
                            static fn (mixed $id): bool => is_string($id),
                        ));
                        $this->workEvidence->assertAvailablePhotoEvidence(
                            (string) $work->id,
                            (string) $node['id'],
                            $providerId,
                            $evidenceFileIds,
                            $corrId,
                        );
                    }
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
                    if (
                        ($node['status'] ?? null) !== 'active'
                        || ($node['node_kind'] ?? null) !== 'final_signoff'
                        || ($node['control_mode'] ?? null) !== 'customer_confirm'
                    ) {
                        throw new OrderError('INVALID_ACTION', 'Work completion can only be proposed at the active final sign-off node.', $corrId, status: 409);
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
                    if (($node['status'] ?? null) !== 'awaiting_customer_confirmation'
                        || ($node['approval_method'] ?? 'app_confirm') !== 'app_confirm') {
                        throw new OrderError('INVALID_STATE', 'Final Work sign-off is not available through this action.', $corrId, status: 409);
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
                $primaryEvidenceFileId = (isset($payload['evidence_file_id']) && is_string($payload['evidence_file_id']))
                    ? $payload['evidence_file_id']
                    : ((isset($payload['evidence_file_ids'][0]) && is_string($payload['evidence_file_ids'][0]))
                        ? $payload['evidence_file_ids'][0]
                        : null);

                DB::table('work_events')->insert([
                    'id' => (string) Str::uuid7(),
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
     * @param array<string, mixed> $node
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function validatedEvidencePayload(
        string $workInstanceId,
        array $node,
        string $actorUserId,
        array $payload,
        string $correlationId,
        \Illuminate\Support\Carbon $now,
    ): array {
        $requiredProofs = $this->requiredProofs($node, $correlationId);

        $allowedKeys = ['notes'];
        foreach ($requiredProofs as $proof) {
            $key = match ($proof) {
                'photo_proof' => 'evidence_file_ids',
                'gps_checkin' => 'location',
                'metric_reading' => 'metric_readings',
                'checklist_steps' => 'checklist_completed',
                default => null,
            };
            if ($key !== null) {
                $allowedKeys[] = $key;
            }
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

        if (in_array('photo_proof', $requiredProofs, true)) {
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
            $latitude = is_array($location) ? ($location['latitude'] ?? null) : null;
            $longitude = is_array($location) ? ($location['longitude'] ?? null) : null;
            $source = is_array($location) ? ($location['source'] ?? null) : null;
            $observedAt = is_array($location) ? ($location['observed_at'] ?? null) : null;
            $accuracy = is_array($location) ? ($location['accuracy_m'] ?? null) : null;
            $landmark = is_array($location) ? ($location['landmark'] ?? null) : null;
            if (
                ! is_numeric($latitude) || ! is_finite((float) $latitude) || (float) $latitude < -90 || (float) $latitude > 90
                || ! is_numeric($longitude) || ! is_finite((float) $longitude) || (float) $longitude < -180 || (float) $longitude > 180
                || ! in_array($source, ['gps', 'manual'], true)
                || ! is_string($observedAt) || strtotime($observedAt) === false
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
                'received_at' => $now->toIso8601String(),
            ];
        } elseif (array_key_exists('location', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not accept location proof.', $correlationId, status: 422);
        }

        if (in_array('metric_reading', $requiredProofs, true)) {
            $readings = $payload['metric_readings'] ?? null;
            if (! is_array($readings) || ! array_is_list($readings) || $readings === []) {
                throw new OrderError('INVALID_METRIC_PROOF', 'Enter at least one measurement for this Work node.', $correlationId, status: 422);
            }
            $declaredUnits = array_values(array_filter(array_map('trim', explode('/', (string) ($node['metric_unit'] ?? '')))));
            foreach ($readings as $index => $reading) {
                if (! is_array($reading) || ! is_numeric($reading['value'] ?? null) || ! is_finite((float) $reading['value'])) {
                    throw new OrderError('INVALID_METRIC_PROOF', 'Each measurement must have a finite numeric value.', $correlationId, status: 422);
                }
                $unit = $reading['unit'] ?? null;
                if (! is_string($unit) || trim($unit) === '' || mb_strlen($unit) > 32) {
                    throw new OrderError('INVALID_METRIC_PROOF', 'Each measurement must specify a unit.', $correlationId, status: 422);
                }
                $unit = trim($unit);
                if ($declaredUnits !== [] && ! in_array($unit, $declaredUnits, true)) {
                    throw new OrderError('INVALID_METRIC_PROOF', 'The measurement unit does not match this Work node.', $correlationId, status: 422);
                }
                $observedAt = $reading['observed_at'] ?? $now->toIso8601String();
                if (! is_string($observedAt) || strtotime($observedAt) === false) {
                    throw new OrderError('INVALID_METRIC_PROOF', 'Each measurement must have a valid observation time.', $correlationId, status: 422);
                }
                $readings[$index] = [
                    'value' => (float) $reading['value'],
                    'unit' => $unit,
                    'observed_at' => $observedAt,
                    'received_at' => $now->toIso8601String(),
                ];
            }
            $payload['metric_readings'] = $readings;
        } elseif (array_key_exists('metric_readings', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not accept meter readings.', $correlationId, status: 422);
        }

        if (in_array('checklist_steps', $requiredProofs, true)) {
            if (($payload['checklist_completed'] ?? false) !== true) {
                throw new OrderError('WORK_CHECKLIST_REQUIRED', 'Confirm the required checklist before advancing this Work node.', $correlationId, status: 422);
            }
        } elseif (array_key_exists('checklist_completed', $payload)) {
            throw new OrderError('INVALID_WORK_EVIDENCE', 'This Work node does not require checklist proof.', $correlationId, status: 422);
        }

        return $payload;
    }


    /**
     * @param array<string, mixed> $node
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
            if (! is_string($proof) || ! in_array($proof, WorkCatalog::WORK_TOOLS, true)) {
                throw new OrderError('UNSUPPORTED_WORK_TOOL', 'This Work node contains an unsupported proof tool.', $correlationId, status: 409);
            }
            if ($proof === 'external_connector') {
                throw new OrderError('WORK_TOOL_UNAVAILABLE', 'The external connector for this Work node is not active.', $correlationId, status: 409);
            }
        }

        return array_values($requiredProofs);
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

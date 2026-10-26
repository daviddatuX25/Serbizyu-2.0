<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkClearanceChallengeService
{
    private const CHALLENGE_LIFETIME_MINUTES = 10;

    private const ISSUE_LIMIT = 3;

    private const ISSUE_WINDOW_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    public function __construct(
        private readonly WorkExecutionService $workExecution,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly OrderHandoffCourierAuthorityPort $courierAuthority,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * @return array{challenge_id: string, code: string, kind: string, expires_at: string, work_version: int, node_id: string}
     */
    public function issue(string $orderId, string $actorUserId, string $nodeId, string $correlationId): array
    {
        $this->assertStorage($correlationId);

        return DB::transaction(function () use ($orderId, $actorUserId, $nodeId, $correlationId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                throw new OrderError('ORDER_NOT_FOUND', 'The order could not be found.', $correlationId, status: 404);
            }

            $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($work === null) {
                throw new OrderError('WORK_NOT_FOUND', 'No work instance exists for this order.', $correlationId, status: 404);
            }

            $structure = $this->decodeStructure($work->structure);
            $node = $this->nodeById($structure, $nodeId);
            if ($node === null) {
                throw new OrderError('NODE_NOT_FOUND', 'Target work node does not exist.', $correlationId, status: 404);
            }
            $workSignature = $structure['signature_hash'] ?? null;
            $workSignatureFingerprint = $this->signatureFingerprint($workSignature);
            if ($workSignatureFingerprint === null) {
                throw new OrderError('WORK_SIGNATURE_UNAVAILABLE', 'The accepted Work signature is unavailable.', $correlationId, status: 409);
            }

            $context = $this->challengeContext($order, $node, $orderId, $correlationId);
            if ($context === null) {
                throw new OrderError('CHALLENGE_UNAVAILABLE', 'This Work node has no supported clearance challenge.', $correlationId, status: 409);
            }
            if ($actorUserId !== $context['issuer_user_id']) {
                throw new OrderError('AUTHORIZATION_DENIED', 'Only the authorized challenge issuer can issue this code.', $correlationId, status: 403);
            }
            if (($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
                throw new OrderError('INVALID_STATE', 'This Work node is not awaiting counterparty clearance.', $correlationId, status: 409);
            }

            $now = now();
            $recentIssues = DB::table('work_clearance_challenges')
                ->where('order_id', $orderId)
                ->where('node_id', $nodeId)
                ->where('issuer_user_id', $actorUserId)
                ->where('issued_at', '>=', $now->copy()->subMinutes(self::ISSUE_WINDOW_MINUTES))
                ->count();
            if ($recentIssues >= self::ISSUE_LIMIT) {
                throw new OrderError('CHALLENGE_RATE_LIMITED', 'Too many codes were issued for this Work node. Try again later.', $correlationId, status: 429, retryable: true);
            }

            $activeChallenges = DB::table('work_clearance_challenges')
                ->where('work_instance_id', (string) $work->id)
                ->where('node_id', $nodeId)
                ->whereNull('consumed_at')
                ->whereNull('invalidated_at')
                ->lockForUpdate()
                ->get();
            foreach ($activeChallenges as $activeChallenge) {
                $this->invalidateChallenge($activeChallenge, $actorUserId, 'reissued', $correlationId);
            }

            $challengeId = (string) Str::uuid7();
            $codeLength = $context['kind'] === 'presence_otp' ? 4 : 6;
            $code = str_pad((string) random_int(0, (10 ** $codeLength) - 1), $codeLength, '0', STR_PAD_LEFT);
            $expiresAt = $now->copy()->addMinutes(self::CHALLENGE_LIFETIME_MINUTES);
            $workVersion = (int) $work->version;

            DB::table('work_clearance_challenges')->insert([
                'id' => $challengeId,
                'order_id' => $orderId,
                'work_instance_id' => (string) $work->id,
                'node_id' => $nodeId,
                'kind' => $context['kind'],
                'issuer_user_id' => $actorUserId,
                'verifier_user_id' => $context['verifier_user_id'],
                'consumed_by_user_id' => null,
                'code_digest' => $this->digest($challengeId, $orderId, (string) $work->id, $nodeId, $context['kind'], $workVersion, $workSignatureFingerprint, $code, $correlationId),
                'work_signature_hash' => $workSignatureFingerprint,
                'code_length' => $codeLength,
                'work_version' => $workVersion,
                'attempt_count' => 0,
                'max_attempts' => self::MAX_ATTEMPTS,
                'issued_at' => $now,
                'expires_at' => $expiresAt,
                'consumed_at' => null,
                'invalidated_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->recordChallengeMutation(
                eventType: 'work.clearance.challenge_issued',
                action: 'work.clearance.challenge_issued',
                reason: 'An authorized Work challenge was issued.',
                challengeId: $challengeId,
                orderId: $orderId,
                workInstanceId: (string) $work->id,
                nodeId: $nodeId,
                kind: $context['kind'],
                actorUserId: $actorUserId,
                workVersion: $workVersion,
                previous: ['active_challenge_id' => null],
                next: [
                    'verifier_user_id' => $context['verifier_user_id'],
                    'expires_at' => $expiresAt->toIso8601String(),
                ],
                correlationId: $correlationId,
            );
            $verifierUserId = (string) $context['verifier_user_id'];
            $actionUrl = $context['kind'] === 'worker_dropoff' && (string) $work->work_shape === 'A4'
                ? route('orders.handoff.show', ['order' => $orderId], false)
                : route('orders.show', ['order' => $orderId], false);
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $verifierUserId,
                eventSourceType: 'work_clearance_challenge',
                eventSourceId: $challengeId,
                eventType: 'work.approval_requested',
                attention: NotificationAttention::NeedsAction,
                title: 'Work confirmation requested',
                body: 'Review the assigned Work confirmation for your Order.',
                actionUrl: $actionUrl,
                idempotencyKey: 'work.clearance.challenge:'.$challengeId.':v'.$workVersion.':'.$verifierUserId,
                correlationId: $correlationId,
            ));


            return [
                'challenge_id' => $challengeId,
                'code' => $code,
                'kind' => $context['kind'],
                'expires_at' => $expiresAt->toIso8601String(),
                'work_version' => $workVersion,
                'node_id' => $nodeId,
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function verify(
        string $orderId,
        string $actorUserId,
        string $nodeId,
        string $challengeId,
        string $code,
        int $expectedWorkVersion,
        string $correlationId,
    ): array {
        $this->assertStorage($correlationId);

        $result = DB::transaction(function () use ($orderId, $actorUserId, $nodeId, $challengeId, $code, $expectedWorkVersion, $correlationId): array {
            $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
            if ($order === null) {
                return $this->failure('ORDER_NOT_FOUND', 'The order could not be found.', 404);
            }
            $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($work === null) {
                return $this->failure('WORK_NOT_FOUND', 'No work instance exists for this order.', 404);
            }
            $challenge = DB::table('work_clearance_challenges')
                ->where('id', $challengeId)
                ->where('order_id', $orderId)
                ->where('work_instance_id', (string) $work->id)
                ->where('node_id', $nodeId)
                ->lockForUpdate()
                ->first();
            if ($challenge === null) {
                return $this->failure('CHALLENGE_NOT_FOUND', 'The challenge could not be found.', 404);
            }
            if ($actorUserId !== (string) $challenge->verifier_user_id) {
                return $this->failure('AUTHORIZATION_DENIED', 'Only the receiving counterparty can verify this code.', 403);
            }
            if ($challenge->consumed_at !== null || $challenge->invalidated_at !== null) {
                return $this->failure('CHALLENGE_REPLAYED', 'This challenge is no longer active.', 409);
            }

            $structure = $this->decodeStructure($work->structure);
            $node = $this->nodeById($structure, $nodeId);
            if ($node === null) {
                return $this->failure('CHALLENGE_STALE', 'This challenge is no longer valid for the current Work node.', 409);
            }

            $workSignature = $structure['signature_hash'] ?? null;
            $workSignatureFingerprint = $this->signatureFingerprint($workSignature);
            if (
                $workSignatureFingerprint === null
                || ! hash_equals((string) ($challenge->work_signature_hash ?? ''), $workSignatureFingerprint)
            ) {
                $this->invalidateChallenge($challenge, $actorUserId, 'work_signature_changed', $correlationId);

                return $this->failure('CHALLENGE_STALE', 'The accepted Work specification changed after this code was issued.', 409);
            }
            try {
                $context = $this->challengeContext($order, $node, $orderId, $correlationId);
            } catch (OrderError) {
                $this->invalidateChallenge($challenge, $actorUserId, 'assignment_changed', $correlationId);

                return $this->failure('CHALLENGE_STALE', 'This challenge is no longer valid for the current Work node.', 409);
            }
            if ($context === null || $context['kind'] !== (string) $challenge->kind
                || $context['issuer_user_id'] !== (string) $challenge->issuer_user_id
                || $context['verifier_user_id'] !== (string) $challenge->verifier_user_id) {
                $this->invalidateChallenge($challenge, $actorUserId, 'assignment_changed', $correlationId);

                return $this->failure('CHALLENGE_STALE', 'This challenge is no longer valid for the current Work node.', 409);
            }

            $now = now();
            if (Carbon::parse((string) $challenge->expires_at)->lessThanOrEqualTo($now)) {
                $this->invalidateChallenge($challenge, $actorUserId, 'expired', $correlationId);

                return $this->failure('CHALLENGE_EXPIRED', 'This challenge has expired. Request a new code.', 422);
            }

            $currentWorkVersion = (int) $work->version;
            if ($expectedWorkVersion !== (int) $challenge->work_version || $currentWorkVersion !== (int) $challenge->work_version) {
                $this->invalidateChallenge($challenge, $actorUserId, 'work_version_changed', $correlationId);

                return $this->failure('CHALLENGE_STALE', 'Work changed after this code was issued. Request a new code.', 409);
            }

            if (($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
                $this->invalidateChallenge($challenge, $actorUserId, 'node_state_changed', $correlationId);

                return $this->failure('CHALLENGE_STALE', 'This Work node is no longer awaiting counterparty clearance.', 409);
            }

            if ((int) $challenge->attempt_count >= (int) $challenge->max_attempts) {
                $this->invalidateChallenge($challenge, $actorUserId, 'attempts_exhausted', $correlationId);

                return $this->failure('CHALLENGE_ATTEMPTS_EXHAUSTED', 'This challenge has reached its verification limit.', 429);
            }

            $expectedDigest = $this->digest(
                (string) $challenge->id,
                $orderId,
                (string) $work->id,
                $nodeId,
                (string) $challenge->kind,
                (int) $challenge->work_version,
                $workSignatureFingerprint,
                $code,
                $correlationId,
            );
            if (! hash_equals((string) $challenge->code_digest, $expectedDigest)) {
                $attemptCount = (int) $challenge->attempt_count + 1;
                DB::table('work_clearance_challenges')->where('id', $challengeId)->update([
                    'attempt_count' => $attemptCount,
                    'invalidated_at' => $attemptCount >= (int) $challenge->max_attempts ? $now : null,
                    'updated_at' => $now,
                ]);
                $this->recordChallengeMutation(
                    eventType: 'work.clearance.challenge_attempt_failed',
                    action: 'work.clearance.challenge_attempt_failed',
                    reason: 'A Work challenge verification attempt did not match.',
                    challengeId: $challengeId,
                    orderId: $orderId,
                    workInstanceId: (string) $work->id,
                    nodeId: $nodeId,
                    kind: (string) $challenge->kind,
                    actorUserId: $actorUserId,
                    workVersion: (int) $challenge->work_version,
                    previous: ['attempt_count' => (int) $challenge->attempt_count],
                    next: [
                        'attempt_count' => $attemptCount,
                        'max_attempts' => (int) $challenge->max_attempts,
                        'invalidated' => $attemptCount >= (int) $challenge->max_attempts,
                    ],
                    correlationId: $correlationId,
                );

                return $this->failure(
                    $attemptCount >= (int) $challenge->max_attempts ? 'CHALLENGE_ATTEMPTS_EXHAUSTED' : 'CHALLENGE_CODE_INVALID',
                    $attemptCount >= (int) $challenge->max_attempts
                        ? 'This challenge has reached its verification limit.'
                        : 'The code is invalid. Try again.',
                    $attemptCount >= (int) $challenge->max_attempts ? 429 : 422,
                );
            }

            DB::table('work_clearance_challenges')->where('id', $challengeId)->update([
                'consumed_by_user_id' => $actorUserId,
                'consumed_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'data' => $this->workExecution->advanceVerifiedChallenge(
                    orderId: $orderId,
                    actorUserId: $actorUserId,
                    nodeId: $nodeId,
                    challengeId: $challengeId,
                    correlationId: $correlationId,
                ),
            ];
        });

        if (isset($result['error'])) {
            throw new OrderError(
                $result['error']['code'],
                $result['error']['message'],
                $correlationId,
                status: $result['error']['status'],
            );
        }

        return $result['data'];
    }

    /**
     * Consume an A4 receipt challenge inside the caller's governed receipt transaction.
     *
     * Failed verification outcomes are returned so the caller commits attempt updates
     * before throwing the corresponding HTTP error.
     *
     * @return array{ok: true, challenge_id: string, kind: string, issuer_user_id: string, verifier_user_id: string, work_version: int}|array{error: array{code: string, message: string, status: int}}
     */
    public function consumeForA4Receipt(
        string $orderId,
        string $actorId,
        string $nodeId,
        string $challengeId,
        string $code,
        int $expectedWorkVersion,
        string $transferId,
        string $correlationId,
    ): array {
        if (DB::transactionLevel() === 0) {
            throw new OrderError('INVALID_CHALLENGE_CONTEXT', 'A4 receipt challenges must be consumed inside the governed receipt transaction.', $correlationId, status: 500);
        }

        $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
        if ($order === null) {
            return $this->failure('ORDER_NOT_FOUND', 'The order could not be found.', 404);
        }
        $work = DB::table('work_instances')->where('order_id', $orderId)->lockForUpdate()->first();
        if ($work === null || (string) $work->work_shape !== 'A4') {
            return $this->failure('HANDOFF_PROTOCOL_REQUIRED', 'This is not an A4 receipt challenge.', 409);
        }
        $transfer = DB::table('order_handoff_transfers')
            ->where('id', $transferId)
            ->where('order_id', $orderId)
            ->lockForUpdate()
            ->first();
        if ($transfer === null || (string) $transfer->status !== 'departed') {
            return $this->failure('CHALLENGE_STALE', 'The current A4 custody phase no longer accepts this challenge.', 409);
        }
        $challenge = DB::table('work_clearance_challenges')
            ->where('id', $challengeId)
            ->where('order_id', $orderId)
            ->where('work_instance_id', (string) $work->id)
            ->where('node_id', $nodeId)
            ->lockForUpdate()
            ->first();
        if ($challenge === null) {
            return $this->failure('CHALLENGE_NOT_FOUND', 'The challenge could not be found.', 404);
        }
        if ($challenge->consumed_at !== null || $challenge->invalidated_at !== null) {
            return $this->failure('CHALLENGE_REPLAYED', 'This challenge is no longer active.', 409);
        }

        $structure = $this->decodeStructure($work->structure);
        $node = $this->nodeById($structure, $nodeId);
        if ($node === null || ($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
            $this->invalidateChallenge($challenge, $actorId, 'node_state_changed', $correlationId);

            return $this->failure('CHALLENGE_STALE', 'The current A4 receipt node no longer accepts this challenge.', 409);
        }
        $workSignature = $structure['signature_hash'] ?? null;
        $workSignatureFingerprint = $this->signatureFingerprint($workSignature);
        if (
            $workSignatureFingerprint === null
            || ! hash_equals((string) ($challenge->work_signature_hash ?? ''), $workSignatureFingerprint)
        ) {
            $this->invalidateChallenge($challenge, $actorId, 'work_signature_changed', $correlationId);

            return $this->failure('CHALLENGE_STALE', 'The accepted Work specification changed after this code was issued.', 409);
        }

        try {
            $context = $this->challengeContext($order, $node, $orderId, $correlationId);
        } catch (OrderError) {
            $this->invalidateChallenge($challenge, $actorId, 'assignment_changed', $correlationId);

            return $this->failure('CHALLENGE_STALE', 'The A4 receiving assignment changed after this code was issued.', 409);
        }
        if (
            $context === null
            || (string) $challenge->kind !== 'worker_dropoff'
            || $context['kind'] !== (string) $challenge->kind
            || $context['issuer_user_id'] !== (string) $challenge->issuer_user_id
            || $context['verifier_user_id'] !== (string) $challenge->verifier_user_id
            || (int) $challenge->work_version !== (int) $work->version
            || $expectedWorkVersion !== (int) $challenge->work_version
        ) {
            $this->invalidateChallenge($challenge, $actorId, 'assignment_or_version_changed', $correlationId);

            return $this->failure('CHALLENGE_STALE', 'The A4 receiving assignment or Work version changed after this code was issued.', 409);
        }
        if ($actorId !== $context['verifier_user_id']) {
            return $this->failure('AUTHORIZATION_DENIED', 'Only the actual A4 recipient can verify this code.', 403);
        }

        $now = now();
        if (Carbon::parse((string) $challenge->expires_at)->lessThanOrEqualTo($now)) {
            $this->invalidateChallenge($challenge, $actorId, 'expired', $correlationId);

            return $this->failure('CHALLENGE_EXPIRED', 'This challenge has expired. Request a new code.', 422);
        }
        if ((int) $challenge->attempt_count >= (int) $challenge->max_attempts) {
            $this->invalidateChallenge($challenge, $actorId, 'attempts_exhausted', $correlationId);

            return $this->failure('CHALLENGE_ATTEMPTS_EXHAUSTED', 'This challenge has reached its verification limit.', 429);
        }

        $expectedDigest = $this->digest(
            (string) $challenge->id,
            $orderId,
            (string) $work->id,
            $nodeId,
            (string) $challenge->kind,
            (int) $challenge->work_version,
            $workSignatureFingerprint,
            $code,
            $correlationId,
        );
        if (! hash_equals((string) $challenge->code_digest, $expectedDigest)) {
            $attemptCount = (int) $challenge->attempt_count + 1;
            DB::table('work_clearance_challenges')->where('id', $challengeId)->update([
                'attempt_count' => $attemptCount,
                'invalidated_at' => $attemptCount >= (int) $challenge->max_attempts ? $now : null,
                'updated_at' => $now,
            ]);
            $this->recordChallengeMutation(
                eventType: 'work.clearance.challenge_attempt_failed',
                action: 'work.clearance.challenge_attempt_failed',
                reason: 'An A4 receipt challenge verification attempt did not match.',
                challengeId: $challengeId,
                orderId: $orderId,
                workInstanceId: (string) $work->id,
                nodeId: $nodeId,
                kind: (string) $challenge->kind,
                actorUserId: $actorId,
                workVersion: (int) $challenge->work_version,
                previous: ['attempt_count' => (int) $challenge->attempt_count],
                next: ['attempt_count' => $attemptCount, 'max_attempts' => (int) $challenge->max_attempts, 'invalidated' => $attemptCount >= (int) $challenge->max_attempts],
                correlationId: $correlationId,
            );

            return $this->failure(
                $attemptCount >= (int) $challenge->max_attempts ? 'CHALLENGE_ATTEMPTS_EXHAUSTED' : 'CHALLENGE_CODE_INVALID',
                $attemptCount >= (int) $challenge->max_attempts ? 'This challenge has reached its verification limit.' : 'The code is invalid. Try again.',
                $attemptCount >= (int) $challenge->max_attempts ? 429 : 422,
            );
        }

        DB::table('work_clearance_challenges')->where('id', $challengeId)->update([
            'consumed_by_user_id' => $actorId,
            'consumed_at' => $now,
            'updated_at' => $now,
        ]);
        $this->recordChallengeMutation(
            eventType: 'work.clearance.challenge_consumed',
            action: 'work.clearance.challenge_consumed',
            reason: 'The actual A4 recipient verified a bound receipt challenge.',
            challengeId: $challengeId,
            orderId: $orderId,
            workInstanceId: (string) $work->id,
            nodeId: $nodeId,
            kind: (string) $challenge->kind,
            actorUserId: $actorId,
            workVersion: (int) $challenge->work_version,
            previous: ['consumed' => false],
            next: ['consumed' => true, 'verifier_user_id' => $actorId],
            correlationId: $correlationId,
        );

        return [
            'ok' => true,
            'challenge_id' => (string) $challenge->id,
            'kind' => (string) $challenge->kind,
            'issuer_user_id' => (string) $challenge->issuer_user_id,
            'verifier_user_id' => (string) $challenge->verifier_user_id,
            'work_version' => (int) $challenge->work_version,
        ];
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    public function projectNode(string $orderId, string $actorUserId, int $workVersion, string $workSignature, array $node): array
    {
        $node['can_issue_challenge'] = false;
        $node['can_verify_challenge'] = false;
        $node['pending_challenge'] = null;

        $workSignatureFingerprint = $this->signatureFingerprint($workSignature);
        if (
            $workSignatureFingerprint === null
            || ! Schema::hasTable('work_clearance_challenges')
            || ! Schema::hasColumn('work_clearance_challenges', 'work_signature_hash')
        ) {
            return $node;
        }

        $order = DB::table('orders')->where('id', $orderId)->first();
        if ($order === null) {
            return $node;
        }
        try {
            $context = $this->challengeContext($order, $node, $orderId, (string) Str::uuid7());
        } catch (OrderError) {
            return $node;
        }
        if ($context === null || ($node['status'] ?? null) !== 'awaiting_customer_confirmation') {
            return $node;
        }

        if ($actorUserId === $context['issuer_user_id']) {
            $node['can_issue_challenge'] = true;
        }
        $pending = DB::table('work_clearance_challenges')
            ->where('order_id', $orderId)
            ->where('node_id', (string) ($node['id'] ?? ''))
            ->where('issuer_user_id', $context['issuer_user_id'])
            ->where('verifier_user_id', $context['verifier_user_id'])
            ->where('work_version', $workVersion)
            ->where('work_signature_hash', $workSignatureFingerprint)
            ->whereNull('invalidated_at')
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->first(['id', 'kind', 'expires_at', 'work_version', 'issuer_user_id']);
        if ($pending === null) {
            return $node;
        }

        $node['can_verify_challenge'] = $actorUserId === $context['verifier_user_id'];
        if ($actorUserId === $context['issuer_user_id'] || $actorUserId === $context['verifier_user_id']) {
            $node['pending_challenge'] = [
                'id' => (string) $pending->id,
                'kind' => (string) $pending->kind,
                'expires_at' => (string) $pending->expires_at,
                'work_version' => (int) $pending->work_version,
                'issued_by_role' => $context['issuer_role'],
            ];
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $previous
     * @param  array<string, mixed>  $next
     */
    private function recordChallengeMutation(
        string $eventType,
        string $action,
        string $reason,
        string $challengeId,
        string $orderId,
        string $workInstanceId,
        string $nodeId,
        string $kind,
        string $actorUserId,
        int $workVersion,
        array $previous,
        array $next,
        string $correlationId,
    ): void {
        $safeState = [
            'challenge_id' => $challengeId,
            'order_id' => $orderId,
            'work_instance_id' => $workInstanceId,
            'node_id' => $nodeId,
            'kind' => $kind,
            'work_version' => $workVersion,
            'actor_user_id' => $actorUserId,
            ...$next,
        ];
        $auditId = $this->audits->record(
            action: $action,
            targetType: 'work_clearance_challenge',
            targetId: $challengeId,
            correlationId: $correlationId,
            actor: ActorContext::human($actorUserId),
            commandName: 'WorkClearanceChallengeService',
            previous: $previous,
            next: $safeState,
            reason: $reason,
            orderId: $orderId,
        );
        $this->outbox->enqueue(
            eventType: $eventType,
            aggregateType: 'work_instance',
            aggregateId: $workInstanceId,
            payload: $safeState,
            correlationId: $correlationId,
            auditEventId: $auditId,
        );
    }

    private function invalidateChallenge(object $challenge, string $actorUserId, string $reasonCode, string $correlationId): void
    {
        $now = now();
        DB::table('work_clearance_challenges')->where('id', $challenge->id)->update([
            'invalidated_at' => $now,
            'updated_at' => $now,
        ]);
        $this->recordChallengeMutation(
            eventType: 'work.clearance.challenge_invalidated',
            action: 'work.clearance.challenge_invalidated',
            reason: 'A bound Work clearance challenge was invalidated.',
            challengeId: (string) $challenge->id,
            orderId: (string) $challenge->order_id,
            workInstanceId: (string) $challenge->work_instance_id,
            nodeId: (string) $challenge->node_id,
            kind: (string) $challenge->kind,
            actorUserId: $actorUserId,
            workVersion: (int) $challenge->work_version,
            previous: ['attempt_count' => (int) $challenge->attempt_count, 'invalidated' => false],
            next: ['attempt_count' => (int) $challenge->attempt_count, 'invalidated' => true, 'reason_code' => $reasonCode],
            correlationId: $correlationId,
        );
    }

    private function assertStorage(string $correlationId): void
    {
        if (
            ! Schema::hasTable('work_clearance_challenges')
            || ! Schema::hasColumn('work_clearance_challenges', 'work_signature_hash')
        ) {
            throw new OrderError('WORK_CHALLENGE_STORAGE_UNAVAILABLE', 'Work challenge storage is unavailable.', $correlationId, status: 503, retryable: true);
        }
    }

    /**
     * @param  array<string, mixed>  $structure
     * @return array<string, mixed>|null
     */
    private function nodeById(array $structure, string $nodeId): ?array
    {
        foreach ((array) ($structure['nodes'] ?? []) as $node) {
            if (is_array($node) && (string) ($node['id'] ?? '') === $nodeId) {
                return $node;
            }
        }

        return null;
    }

    /**
     * @return array{kind: string, issuer_user_id: string, verifier_user_id: string, issuer_role: string}|null
     */
    private function challengeContext(object $order, array $node, string $orderId, string $correlationId): ?array
    {
        $approvalMethod = (string) ($node['approval_method'] ?? 'none');
        $handoffParty = (string) ($node['handoff_party'] ?? '');
        $controlMode = (string) ($node['control_mode'] ?? '');
        $buyerId = (string) $order->buyer_user_id;
        $providerId = (string) $order->provider_user_id;
        if ((string) DB::table('work_instances')->where('order_id', $orderId)->value('work_shape') === 'A4') {
            if (
                ! Schema::hasTable('order_handoff_transfers')
                || ($node['node_kind'] ?? null) !== 'final_signoff'
                || (int) ($node['ordinal'] ?? 0) !== 3
                || ($approvalMethod !== 'worker_dropoff' && $handoffParty !== 'worker_dropoff')
            ) {
                return null;
            }

            $transfer = DB::table('order_handoff_transfers')->where('order_id', $orderId)->first();
            if ($transfer === null || (string) $transfer->status !== 'departed') {
                return null;
            }
            $transferMode = (string) $transfer->transfer_mode;
            if (! in_array($transferMode, ['counter_pickup', 'courier_delivery'], true)) {
                return null;
            }
            $issuerId = $transferMode === 'courier_delivery' ? (string) $transfer->departed_by_user_id : $providerId;
            if (
                $issuerId === ''
                || ($transferMode === 'counter_pickup' && (string) $transfer->departed_by_user_id !== $buyerId)
                || ($transferMode === 'courier_delivery' && ! $this->isCurrentA4Courier($order, $orderId, $issuerId))
            ) {
                return null;
            }
            $recipients = DB::table('order_parties')
                ->where('order_id', $orderId)
                ->where('status', 'active')
                ->where('party_type', 'recipient')
                ->where('responsibility', 'final_recipient')
                ->distinct()
                ->pluck('user_id')
                ->map(static fn (mixed $id): string => (string) $id)
                ->values()
                ->all();
            if (count($recipients) > 1) {
                throw new OrderError('HANDOFF_RECIPIENT_AMBIGUOUS', 'The receiving counterparty for this handoff is ambiguous.', $correlationId, status: 409);
            }
            $verifierId = $recipients[0] ?? $buyerId;
            if ($issuerId === '' || $issuerId === $verifierId) {
                throw new OrderError('INVALID_HANDOFF_ASSIGNMENT', 'The handoff worker cannot verify their own drop-off code.', $correlationId, status: 409);
            }

            return [
                'kind' => 'worker_dropoff',
                'issuer_user_id' => $issuerId,
                'verifier_user_id' => $verifierId,
                'issuer_role' => $issuerId === $providerId ? 'provider' : 'courier',
            ];
        }

        if ($approvalMethod === 'presence_otp') {
            if ($controlMode !== 'customer_confirm' || $handoffParty === 'worker_dropoff') {
                return null;
            }

            return [
                'kind' => 'presence_otp',
                'issuer_user_id' => $buyerId,
                'verifier_user_id' => $providerId,
                'issuer_role' => 'customer',
            ];
        }
        if ($approvalMethod !== 'worker_dropoff' && $handoffParty !== 'worker_dropoff') {
            return null;
        }
        if ($controlMode !== 'counterparty_handoff') {
            return null;
        }

        $couriers = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('status', 'active')
            ->where('user_id', '!=', $buyerId)
            ->where('user_id', '!=', $providerId)
            ->where(function ($query): void {
                $query->where('party_type', 'courier')
                    ->orWhereIn('responsibility', ['courier', 'delivery']);
            })
            ->distinct()
            ->pluck('user_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->values()
            ->all();
        if (count($couriers) > 1) {
            throw new OrderError('HANDOFF_ASSIGNMENT_AMBIGUOUS', 'The assigned worker for this handoff is ambiguous.', $correlationId, status: 409);
        }
        $issuerId = $couriers[0] ?? $providerId;

        $recipients = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('status', 'active')
            ->where('party_type', 'recipient')
            ->where('responsibility', 'final_recipient')
            ->distinct()
            ->pluck('user_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->values()
            ->all();
        if (count($recipients) > 1) {
            throw new OrderError('HANDOFF_RECIPIENT_AMBIGUOUS', 'The receiving counterparty for this handoff is ambiguous.', $correlationId, status: 409);
        }
        $verifierId = $recipients[0] ?? $buyerId;
        if ($issuerId === $verifierId) {
            throw new OrderError('INVALID_HANDOFF_ASSIGNMENT', 'The handoff worker cannot verify their own drop-off code.', $correlationId, status: 409);
        }

        return [
            'kind' => 'worker_dropoff',
            'issuer_user_id' => $issuerId,
            'verifier_user_id' => $verifierId,
            'issuer_role' => $issuerId === $providerId ? 'provider' : 'courier',
        ];
    }

    private function isCurrentA4Courier(object $order, string $orderId, string $courierId): bool
    {
        $activeParty = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('user_id', $courierId)
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->where('party_type', 'courier')
                    ->orWhereIn('responsibility', ['courier', 'delivery']);
            })
            ->exists();
        if ($activeParty) {
            return true;
        }

        return is_string($order->deal_chain_id ?? null)
            && is_string($order->deal_need_id ?? null)
            && $order->deal_chain_id !== ''
            && $order->deal_need_id !== ''
            && $this->courierAuthority->isAuthorizedCourier(
                (string) $order->deal_chain_id,
                (string) $order->deal_need_id,
                $courierId,
            );
    }

    /** @return array<string, array{code: string, message: string, status: int}> */
    private function failure(string $code, string $message, int $status): array
    {
        return ['error' => ['code' => $code, 'message' => $message, 'status' => $status]];
    }

    private function signatureFingerprint(mixed $workSignature): ?string
    {
        if (! is_string($workSignature) || trim($workSignature) === '') {
            return null;
        }

        return hash('sha256', $workSignature);
    }

    private function digest(
        string $challengeId,
        string $orderId,
        string $workInstanceId,
        string $nodeId,
        string $kind,
        int $workVersion,
        string $workSignatureHash,
        string $code,
        string $correlationId,
    ): string {
        $applicationKey = config('app.key');
        if (! is_string($applicationKey) || $applicationKey === '') {
            throw new OrderError('CHALLENGE_CONFIGURATION_UNAVAILABLE', 'Work challenge signing is unavailable.', $correlationId, status: 503);
        }

        return hash_hmac(
            'sha256',
            json_encode([
                'challenge_id' => $challengeId,
                'order_id' => $orderId,
                'work_instance_id' => $workInstanceId,
                'node_id' => $nodeId,
                'work_signature_hash' => $workSignatureHash,
                'kind' => $kind,
                'work_version' => $workVersion,
                'code' => $code,
            ], JSON_THROW_ON_ERROR),
            $applicationKey,
        );
    }

    /** @return array<string, mixed> */
    private function decodeStructure(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }
}

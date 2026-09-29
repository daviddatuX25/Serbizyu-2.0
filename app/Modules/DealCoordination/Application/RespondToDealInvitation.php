<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use Illuminate\Support\Facades\DB;

final class RespondToDealInvitation
{
    public function __construct(
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /**
     * @return array{invitation_id: string, deal_need_id: string, status: string, need_status: string, version: int}
     */
    public function handle(
        string $actorUserId,
        string $invitationId,
        string $decision,
        int $expectedInvitationVersion,
        string $idempotencyKey,
        string $correlationId,
        ?string $responseNote = null,
    ): array {
        if (! in_array($decision, ['accept', 'decline'], true)) {
            throw new DealCoordinationError(
                'VALIDATION_FAILED',
                'Decision must be either accept or decline.',
                $correlationId,
                status: 422,
                fieldErrors: ['decision' => ['Decision must be either accept or decline.']],
            );
        }

        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new DealCoordinationError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }

        $scope = 'deal_invitation.respond:'.$actorUserId.':'.$invitationId;
        $fingerprint = [
            'operation' => 'deal_invitation.respond',
            'invitation_id' => $invitationId,
            'decision' => $decision,
            'expected_invitation_version' => $expectedInvitationVersion,
            'response_note' => $responseNote,
        ];

        try {
            $reservation = $this->idempotency->begin(
                scope: $scope,
                key: $idempotencyKey,
                fingerprint: $fingerprint,
                correlationId: $correlationId,
                actorUserId: $actorUserId,
            );
        } catch (KernelException $error) {
            throw new DealCoordinationError(
                $error->envelope->code,
                $error->getMessage(),
                $correlationId,
                status: $error->status,
            );
        }

        if ($reservation->isReplay) {
            /** @var array{invitation_id: string, deal_need_id: string, status: string, need_status: string, version: int} */
            return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
        }

        return DB::transaction(function () use (
            $actorUserId,
            $invitationId,
            $decision,
            $expectedInvitationVersion,
            $idempotencyKey,
            $correlationId,
            $responseNote,
            $reservation,
        ): array {
            $invitation = DB::table('deal_invitations')
                ->where('id', $invitationId)
                ->lockForUpdate()
                ->first();

            if ($invitation === null) {
                throw new DealCoordinationError(
                    'INVITATION_NOT_FOUND',
                    'Deal invitation not found.',
                    $correlationId,
                    status: 404,
                );
            }

            if ((string) $invitation->invited_provider_user_id !== $actorUserId) {
                throw new DealCoordinationError(
                    'AUTHORIZATION_DENIED',
                    'You are not authorized to respond to this deal invitation.',
                    $correlationId,
                    status: 403,
                );
            }

            if ((int) $invitation->version !== $expectedInvitationVersion) {
                throw new DealCoordinationError(
                    'VERSION_CONFLICT',
                    'The invitation has changed. Refresh and review before responding.',
                    $correlationId,
                    status: 409,
                    retryable: true,
                );
            }

            if (! in_array($invitation->status, ['sent', 'viewed'], true)) {
                throw new DealCoordinationError(
                    'INVALID_INVITATION_STATE',
                    "Cannot respond to invitation in '{$invitation->status}' status.",
                    $correlationId,
                    status: 409,
                );
            }

            if (now()->greaterThan($invitation->expires_at)) {
                throw new DealCoordinationError(
                    'INVITATION_EXPIRED',
                    'This deal invitation has expired.',
                    $correlationId,
                    status: 410,
                );
            }

            $dealNeedId = (string) $invitation->deal_need_id;
            $need = DB::table('deal_needs')
                ->where('id', $dealNeedId)
                ->lockForUpdate()
                ->first();

            if ($need === null) {
                throw new DealCoordinationError(
                    'DEAL_NEED_NOT_FOUND',
                    'The referenced deal need could not be found.',
                    $correlationId,
                    status: 404,
                );
            }

            $now = now();
            $newInvitationVersion = (int) $invitation->version + 1;
            $newNeedVersion = (int) $need->version + 1;

            if ($decision === 'accept') {
                DB::table('deal_invitations')
                    ->where('id', $invitationId)
                    ->update([
                        'status' => 'accepted',
                        'responded_at' => $now,
                        'response_note' => $responseNote,
                        'acceptance_idempotency_key' => $idempotencyKey,
                        'acceptance_correlation_id' => $correlationId,
                        'version' => $newInvitationVersion,
                        'updated_at' => $now,
                    ]);

                DB::table('deal_needs')
                    ->where('id', $dealNeedId)
                    ->update([
                        'status' => 'accepted',
                        'version' => $newNeedVersion,
                        'updated_at' => $now,
                    ]);

                $needStatus = 'accepted';
                $invitationStatus = 'accepted';
            } else {
                DB::table('deal_invitations')
                    ->where('id', $invitationId)
                    ->update([
                        'status' => 'declined',
                        'responded_at' => $now,
                        'response_note' => $responseNote,
                        'version' => $newInvitationVersion,
                        'updated_at' => $now,
                    ]);

                DB::table('deal_needs')
                    ->where('id', $dealNeedId)
                    ->update([
                        'status' => 'open',
                        'version' => $newNeedVersion,
                        'updated_at' => $now,
                    ]);

                $needStatus = 'open';
                $invitationStatus = 'declined';
            }

            $response = [
                'invitation_id' => $invitationId,
                'deal_need_id' => $dealNeedId,
                'status' => $invitationStatus,
                'need_status' => $needStatus,
                'version' => $newInvitationVersion,
            ];
            ksort($response);

            $auditId = $this->audits->record(
                action: 'deal_invitation.'.$decision,
                targetType: 'deal_invitation',
                targetId: $invitationId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'RespondToDealInvitation',
                expectedVersion: $expectedInvitationVersion,
                previous: [
                    'invitation_status' => $invitation->status,
                    'need_status' => $need->status,
                    'version' => $invitation->version,
                ],
                next: $response,
                reason: 'Provider responded to deal chain invitation',
            );

            $this->outbox->enqueue(
                eventType: 'deal_invitation.'.$invitationStatus,
                aggregateType: 'deal_invitation',
                aggregateId: $invitationId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );

            $this->idempotency->succeed($reservation->row, $response);

            return $response;
        });
    }
}

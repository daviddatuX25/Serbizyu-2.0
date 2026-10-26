<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealPartnerOrderPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class WithdrawDealPartner
{
    public function __construct(
        private readonly DealPartnerOrderPort $orders,
        private readonly DealWorkGatePort $gates,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
    ) {}

    /** @return array{deal_chain_id:string,deal_need_id:string,status:string,order_id:string|null,need_version:int} */
    public function handle(
        string $actorUserId,
        string $dealChainId,
        string $dealNeedId,
        int $expectedNeedVersion,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new DealCoordinationError('INVALID_IDEMPOTENCY_KEY', 'Use a valid idempotency key.', $correlationId);
        }
        return DB::transaction(function () use ($actorUserId, $dealChainId, $dealNeedId, $expectedNeedVersion, $idempotencyKey, $correlationId): array {
            $chain = DB::table('deal_chains')->where('id', $dealChainId)->lockForUpdate()->first();
            $need = DB::table('deal_needs')->where('deal_chain_id', $dealChainId)->where('id', $dealNeedId)->lockForUpdate()->first();
            if ($chain === null || $need === null) {
                throw new DealCoordinationError('DEAL_NEED_NOT_FOUND', 'Deal Need not found in this Deal Chain.', $correlationId, status: 404);
            }
            $fingerprint = ['operation' => 'deal_partner.withdraw', 'chain' => $dealChainId, 'need' => $dealNeedId, 'expected_version' => $expectedNeedVersion];
            try {
                $reservation = $this->idempotency->begin('deal_partner.withdraw:'.$dealNeedId.':'.$actorUserId, $idempotencyKey, $fingerprint, $correlationId, $actorUserId);
            } catch (KernelException $error) {
                throw new DealCoordinationError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
            }
            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }
            $isCoordinator = (string) $chain->coordinator_user_id === $actorUserId;
            $currentInviteeUserId = DB::table('deal_invitations')
                ->where('deal_need_id', $dealNeedId)
                ->whereIn('status', ['sent', 'viewed', 'accepted'])
                ->orderByDesc('created_at')
                ->value('invited_provider_user_id');
            if (! $isCoordinator && (string) $currentInviteeUserId !== $actorUserId) {
                throw new DealCoordinationError('AUTHORIZATION_DENIED', 'Only the coordinator or current invited partner can withdraw this Deal Need.', $correlationId, status: 403);
            }
            if ((int) $need->version !== $expectedNeedVersion) {
                throw new DealCoordinationError('VERSION_CONFLICT', 'The Deal Need changed. Refresh before withdrawing this partner.', $correlationId, status: 409, retryable: true);
            }
            if (in_array((string) $need->status, ['completed', 'cancelled', 'superseded', 'failed', 'replacement_needed'], true)) {
                throw new DealCoordinationError('INVALID_NEED_STATE', 'Only a current active Deal Need can be withdrawn.', $correlationId, status: 409);
            }

            $linkedProductOrderIds = [];
            $isCourier = (string) ($need->node_role ?? '') === 'courier';
            if ($isCourier) {
                $linkedProductOrderIds = DB::table('deal_dependencies as dependency')
                    ->join('deal_needs as predecessor', function ($join): void {
                        $join->on('predecessor.deal_chain_id', '=', 'dependency.deal_chain_id')
                            ->on('predecessor.id', '=', 'dependency.predecessor_need_id');
                    })
                    ->join('deal_need_confirmations as confirmation', function ($join): void {
                        $join->on('confirmation.deal_chain_id', '=', 'predecessor.deal_chain_id')
                            ->on('confirmation.deal_need_id', '=', 'predecessor.id');
                    })
                    ->where('dependency.deal_chain_id', $dealChainId)
                    ->where('dependency.successor_need_id', $dealNeedId)
                    ->whereIn('dependency.condition_code', ['part_ready', 'delivery_signed'])
                    ->where('dependency.dependency_type', 'blocks')
                    ->where('dependency.status', 'active')
                    ->where('predecessor.node_role', 'store')
                    ->whereNotIn('predecessor.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
                    ->pluck('confirmation.order_id')->map(static fn ($id): string => (string) $id)->all();
            }
            $snapshot = $this->orders->withdrawalSnapshot($dealChainId, $dealNeedId, $linkedProductOrderIds);
            if (! $isCoordinator && $snapshot !== null && $snapshot['provider_user_id'] !== $actorUserId) {
                throw new DealCoordinationError('AUTHORIZATION_DENIED', 'Only the current confirmed partner can withdraw this Deal Need.', $correlationId, status: 403);
            }
            if ($snapshot !== null) {
                $this->orders->cancelUnstartedChild(
                    dealChainId: $dealChainId,
                    dealNeedId: $dealNeedId,
                    linkedProductOrderIds: $linkedProductOrderIds,
                    allowUncollectedCourierWork: $isCourier,
                    actorUserId: $actorUserId,
                    requesterUserId: (string) $chain->coordinator_user_id,
                    expectedOrderVersion: $snapshot['order_version'],
                    correlationId: $correlationId,
                );
            }

            DB::table('deal_invitations')->where('deal_need_id', $dealNeedId)->whereIn('status', ['sent', 'viewed', 'accepted'])
                ->update(['status' => 'revoked', 'revoked_at' => now(), 'version' => DB::raw('version + 1'), 'updated_at' => now()]);
            $newVersion = $expectedNeedVersion + 1;
            DB::table('deal_needs')->where('id', $dealNeedId)->where('version', $expectedNeedVersion)->update([
                'status' => 'replacement_needed', 'version' => $newVersion, 'updated_at' => now(),
            ]);
            $this->gates->invalidateNeedEpoch($dealChainId, $dealNeedId, $correlationId);
            $auditId = $this->audits->record(
                action: 'deal_partner.withdrawn', targetType: 'deal_need', targetId: $dealNeedId,
                correlationId: $correlationId, actor: ActorContext::human($actorUserId),
                commandName: 'WithdrawDealPartner',
                previous: ['status' => (string) $need->status, 'version' => $expectedNeedVersion],
                next: ['status' => 'replacement_needed', 'version' => $newVersion, 'order_id' => $snapshot['order_id'] ?? null],
                reason: 'The current Deal Chain partner withdrew before irreversible custody completion.',
                orderId: $snapshot['order_id'] ?? null,
            );
            $this->outbox->enqueue(
                eventType: 'deal_partner.withdrawn', aggregateType: 'deal_need', aggregateId: $dealNeedId,
                payload: ['deal_chain_id' => $dealChainId, 'deal_need_id' => $dealNeedId, 'status' => 'replacement_needed', 'version' => $newVersion],
                correlationId: $correlationId, auditEventId: $auditId,
            );
            $partnerId = $snapshot['provider_user_id'] ?? DB::table('deal_invitations')
                ->where('deal_need_id', $dealNeedId)
                ->value('invited_provider_user_id');
            $recipient = $isCoordinator ? $partnerId : (string) $chain->coordinator_user_id;
            $actionUrl = $snapshot === null
                ? route('deal-invitations.index', [], false)
                : route('deal-chains.show', ['dealChain' => $dealChainId], false);
            if (is_string($recipient) && $recipient !== $actorUserId) {
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $recipient,
                    eventSourceType: 'deal_need',
                    eventSourceId: $dealNeedId,
                    eventType: 'deal.partner_withdrawn',
                    attention: NotificationAttention::Updates,
                    title: 'A Deal Chain partner withdrew',
                    body: 'The current partner slot was withdrawn before custody completion.',
                    actionUrl: $actionUrl,
                    idempotencyKey: 'deal_need:'.$dealNeedId.':withdrawn:v'.$newVersion.':'.$recipient,
                    correlationId: $correlationId,
                ));
            }
            $result = ['deal_chain_id' => $dealChainId, 'deal_need_id' => $dealNeedId, 'status' => 'replacement_needed', 'order_id' => $snapshot['order_id'] ?? null, 'need_version' => $newVersion];
            $this->idempotency->succeed($reservation->row, $result);
            return $result;
        });
    }
}

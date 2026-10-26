<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\DealChainCandidateRoleClassifier;
use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ChooseDealReplacement
{
    public function __construct(
        private readonly OrderListingSourcePort $listings,
        private readonly OrderCapacityPort $capacity,
        private readonly DealWorkGatePort $gates,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
    ) {}

    /** @return array{deal_chain_id:string,deal_need_id:string,replacement_need_id:string,invitation_id:string,status:string,version:int} */
    public function handle(string $actorUserId, string $dealChainId, string $dealNeedId, int $expectedNeedVersion, string $listingId, ?string $variantId, string $idempotencyKey, string $correlationId): array
    {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new DealCoordinationError('INVALID_IDEMPOTENCY_KEY', 'Use a valid idempotency key.', $correlationId);
        }
        return DB::transaction(function () use ($actorUserId, $dealChainId, $dealNeedId, $expectedNeedVersion, $listingId, $variantId, $idempotencyKey, $correlationId): array {
            $chain = DB::table('deal_chains')->where('id', $dealChainId)->lockForUpdate()->first();
            $old = DB::table('deal_needs')->where('deal_chain_id', $dealChainId)->where('id', $dealNeedId)->lockForUpdate()->first();
            if ($chain === null || $old === null) {
                throw new DealCoordinationError('DEAL_NEED_NOT_FOUND', 'Deal Need not found in this Deal Chain.', $correlationId, status: 404);
            }
            if ((string) $chain->coordinator_user_id !== $actorUserId) {
                throw new DealCoordinationError('AUTHORIZATION_DENIED', 'Only the Deal Chain coordinator can choose a replacement partner.', $correlationId, status: 403);
            }
            $fingerprint = ['operation' => 'deal_partner.replace', 'chain' => $dealChainId, 'need' => $dealNeedId, 'version' => $expectedNeedVersion, 'listing' => $listingId, 'variant' => $variantId];
            try {
                $reservation = $this->idempotency->begin('deal_partner.replace:'.$dealNeedId.':'.$actorUserId, $idempotencyKey, $fingerprint, $correlationId, $actorUserId);
            } catch (KernelException $error) {
                throw new DealCoordinationError($error->envelope->code, $error->getMessage(), $correlationId, status: $error->status);
            }
            if ($reservation->isReplay) {
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }
            if ((int) $old->version !== $expectedNeedVersion || (string) $old->status !== 'replacement_needed') {
                throw new DealCoordinationError('VERSION_CONFLICT', 'Refresh the current replacement slot before selecting a partner.', $correlationId, status: 409, retryable: true);
            }

            $source = $this->listings->lockActiveApproved($listingId);
            if ($source === null || (string) $source['owner_user_id'] === $actorUserId || ! $this->roleMatches((string) $old->node_role, $source)) {
                throw new DealCoordinationError('REPLACEMENT_LISTING_UNAVAILABLE', 'Choose an active approved listing for this Deal Chain slot.', $correlationId, status: 422);
            }
            $selection = $this->replacementScope($source, $variantId, $correlationId, $old);
            $newNeedId = (string) Str::uuid7();
            $newInvitationId = (string) Str::uuid7();
            $now = now();
            $newVersion = $expectedNeedVersion + 1;
            $newScope = $selection['scope'];
            DB::table('deal_needs')->insert([
                'id' => $newNeedId, 'deal_chain_id' => $dealChainId,
                'ordinal' => ((int) DB::table('deal_needs')->where('deal_chain_id', $dealChainId)->max('ordinal')) + 1,
                'node_key' => (string) $old->node_key, 'node_role' => (string) $old->node_role,
                'recipe_code' => (string) $old->recipe_code, 'recipe_version' => (int) $old->recipe_version,
                'source_listing_id' => (string) ($source['listing_id'] ?? $source['id']),
                'need_kind' => (string) $old->need_kind, 'title' => (string) $old->title,
                'description' => (string) $old->description, 'status' => 'invited', 'requested_at' => $now,
                'replaces_deal_need_id' => $dealNeedId, 'version' => 1, 'correlation_id' => $correlationId,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('deal_needs')->where('id', $dealNeedId)->where('version', $expectedNeedVersion)->update([
                'status' => 'superseded', 'version' => $newVersion, 'updated_at' => $now,
            ]);
            $oldEdges = DB::table('deal_dependencies')->where('deal_chain_id', $dealChainId)->where('status', 'active')
                ->where(fn ($q) => $q->where('predecessor_need_id', $dealNeedId)->orWhere('successor_need_id', $dealNeedId))
                ->orderBy('id')->lockForUpdate()->get();
            $edgeRetargets = [];
            foreach ($oldEdges as $edge) {
                $predecessorNeedId = (string) $edge->predecessor_need_id === $dealNeedId
                    ? $newNeedId
                    : (string) $edge->predecessor_need_id;
                $successorNeedId = (string) $edge->successor_need_id === $dealNeedId
                    ? $newNeedId
                    : (string) $edge->successor_need_id;
                $nextEdgeVersion = (int) $edge->version + 1;
                $updated = DB::table('deal_dependencies')
                    ->where('id', $edge->id)
                    ->where('version', (int) $edge->version)
                    ->where('status', 'active')
                    ->update([
                        'predecessor_need_id' => $predecessorNeedId,
                        'successor_need_id' => $successorNeedId,
                        'version' => $nextEdgeVersion,
                        'correlation_id' => $correlationId,
                        'removed_at' => null,
                        'updated_at' => $now,
                    ]);
                if ($updated !== 1) {
                    throw new DealCoordinationError('VERSION_CONFLICT', 'A Deal Chain prerequisite edge changed. Refresh and try again.', $correlationId, status: 409, retryable: true);
                }
                $edgeRetargets[] = [
                    'dependency_id' => (string) $edge->id,
                    'version' => $nextEdgeVersion,
                    'predecessor_need_id' => $predecessorNeedId,
                    'successor_need_id' => $successorNeedId,
                ];
            }
            $this->gates->invalidateNeedEpoch($dealChainId, $dealNeedId, $correlationId);
            DB::table('deal_invitations')->insert([
                'id' => $newInvitationId, 'deal_need_id' => $newNeedId,
                'invited_provider_user_id' => (string) $source['owner_user_id'], 'invited_by_user_id' => $actorUserId,
                'acting_for_user_id' => null, 'purpose' => 'deal_need_replacement',
                'scope' => json_encode($newScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'payload_version' => 1, 'status' => 'sent', 'expires_at' => $now->copy()->addDays(2), 'version' => 1,
                'correlation_id' => $correlationId, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $auditId = $this->audits->record(
                action: 'deal_partner.replacement_invited', targetType: 'deal_need', targetId: $newNeedId,
                correlationId: $correlationId, actor: ActorContext::human($actorUserId), commandName: 'ChooseDealReplacement',
                previous: ['deal_need_id' => $dealNeedId, 'version' => $expectedNeedVersion],
                next: [
                    'replacement_need_id' => $newNeedId,
                    'invitation_id' => $newInvitationId,
                    'status' => 'invited',
                    'retargeted_dependencies' => $edgeRetargets,
                ],
                reason: 'The coordinator selected a server-verified active listing as a fresh invitation for the replacement slot.',
            );
            $this->outbox->enqueue(
                eventType: 'deal_partner.replacement_invited', aggregateType: 'deal_need', aggregateId: $newNeedId,
                payload: [
                    'deal_chain_id' => $dealChainId,
                    'deal_need_id' => $newNeedId,
                    'replaces_deal_need_id' => $dealNeedId,
                    'invitation_id' => $newInvitationId,
                    'retargeted_dependency_versions' => array_map(
                        static fn (array $edge): array => ['dependency_id' => $edge['dependency_id'], 'version' => $edge['version']],
                        $edgeRetargets,
                    ),
                ],
                correlationId: $correlationId, auditEventId: $auditId,
            );
            $providerId = (string) $source['owner_user_id'];
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $providerId, eventSourceType: 'deal_need', eventSourceId: $newNeedId,
                eventType: 'deal.invitation_received', attention: NotificationAttention::NeedsAction,
                title: 'A Deal Chain invitation is ready', body: 'Review the invitation and respond to the proposed terms.',
                actionUrl: route('deal-invitations.index', [], false),
                idempotencyKey: 'deal_need:'.$newNeedId.':invitation:v1:'.$providerId, correlationId: $correlationId,
            ));
            $result = ['deal_chain_id' => $dealChainId, 'deal_need_id' => $dealNeedId, 'replacement_need_id' => $newNeedId, 'invitation_id' => $newInvitationId, 'status' => 'invited', 'version' => $newVersion];
            $this->idempotency->succeed($reservation->row, $result);
            return $result;
        });
    }

    /** @param array<string,mixed> $source */
    private function roleMatches(string $role, array $source): bool
    {
        $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];

        return DealChainCandidateRoleClassifier::matchesNeedRole(
            needRole: $role,
            listingType: (string) ($source['listing_type'] ?? ''),
            categoryCode: (string) ($terms['category_code'] ?? ''),
            title: (string) ($source['title'] ?? ''),
            fixtureKey: (string) ($terms['fixture_key'] ?? ''),
        );
    }

    /** @param array<string,mixed> $source @return array{scope:array<string,mixed>} */
    private function replacementScope(array $source, ?string $variantId, string $correlationId, object $need): array
    {
        $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
        $quantity = 1;
        $oldScope = DB::table('deal_invitations')->where('deal_need_id', $need->id)->orderByDesc('created_at')->value('scope');
        if (is_string($oldScope)) {
            $oldScope = json_decode($oldScope, true);
            if (is_array($oldScope)) $quantity = max(1, (int) ($oldScope['quantity'] ?? 1));
        }
        $selected = null;
        if ($variantId !== null) {
            foreach ((array) ($terms['variants'] ?? []) as $candidate) {
                if (is_array($candidate) && (string) ($candidate['id'] ?? '') === $variantId) $selected = $candidate;
            }
            if ($selected === null) throw new DealCoordinationError('VARIANT_REQUIRED', 'Choose a variant offered by this active listing.', $correlationId, status: 422);
        } elseif (($source['listing_type'] ?? '') === 'product' && ($terms['variants'] ?? []) !== []) {
            foreach ($terms['variants'] as $candidate) if (is_array($candidate) && ($candidate['is_default'] ?? false) === true) { $selected = $candidate; $variantId = (string) ($candidate['id'] ?? ''); break; }
            if ($selected === null) throw new DealCoordinationError('VARIANT_REQUIRED', 'This listing requires a variant selection.', $correlationId, status: 422);
        }
        $priceValue = is_array($selected)
            ? ($selected['price_amount_minor']
                ?? (is_numeric($selected['price'] ?? null) ? (int) round((float) $selected['price'] * 100) : null))
            : ($source['price_amount_minor'] ?? null);
        if (! is_numeric($priceValue) || (int) $priceValue < 0) {
            throw new DealCoordinationError('PRICE_REQUIRED', 'The selected active listing has no valid server-side price.', $correlationId, status: 422);
        }
        $price = (int) $priceValue;
        $resourceKey = trim((string) (is_array($selected) ? ($selected['resource_key'] ?? $selected['id'] ?? '') : ''));
        $bucket = $this->capacity->findOpenQuantityBucket((string) ($source['listing_id'] ?? $source['id']), (string) $source['listing_version_id'], $resourceKey);
        $scope = [
            'listing_id' => (string) ($source['listing_id'] ?? $source['id']),
            'listing_version_id' => (string) $source['listing_version_id'], 'listing_version' => (int) $source['listing_version_number'],
            'title' => (string) $source['title'], 'listing_type' => (string) $source['listing_type'],
            'work_shape' => (string) ($source['work_shape'] ?? ''), 'quantity' => $quantity,
            'unit_amount_minor' => $price, 'amount_minor' => $price * $quantity,
            'currency' => strtoupper((string) ($selected['currency'] ?? $source['currency'] ?? 'PHP')),
            'lane' => (in_array('external_cash', $this->listings->eligiblePaymentLanesForVersion((string) $source['listing_version_id']), true) ? 'external_cash' : ($this->listings->eligiblePaymentLanesForVersion((string) $source['listing_version_id'])[0] ?? 'external_cash')), 'variant_id' => $variantId, 'resource_key' => $resourceKey ?: null,
            'package_id' => null, 'addon_ids' => [], 'terms_hash' => '', 'capacity_hash' => '',
        ];
        $terms = $scope;
        unset($terms['terms_hash'], $terms['capacity_hash']);
        ksort($terms);
        $scope['terms_hash'] = hash('sha256', json_encode($terms, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $scope['capacity_hash'] = hash('sha256', json_encode([
            'listing_id' => $scope['listing_id'], 'listing_version_id' => $scope['listing_version_id'],
            'resource_key' => $resourceKey, 'quantity' => $quantity, 'capacity_id' => $bucket['id'] ?? null,
            'remaining_quantity' => $bucket['remaining_quantity'] ?? null,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return ['scope' => $scope];
    }

}

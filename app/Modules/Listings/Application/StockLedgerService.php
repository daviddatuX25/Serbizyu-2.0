<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderReferenceReaderPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StockLedgerService
{
    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly OrderReferenceReaderPort $orderReferences,
        private readonly NotificationsPort $notifications,
    ) {}

    /** @return array{id: string, listing_id: string, listing_version_id: string, resource_key: string, on_hand: int, held: int, committed_unfulfilled: int, available: int, availability_status: string, row_version: int} */
    public function provisionVariant(
        string $listingId,
        string $listingVersionId,
        string $ownerUserId,
        string $resourceKey,
        int $openingQuantity,
        string $correlationId,
    ): array {
        if (trim($resourceKey) === '' || $openingQuantity < 0) {
            throw new ListingError('VALIDATION_FAILED', 'A stable variant key and non-negative opening quantity are required.', $correlationId, fieldErrors: ['variants' => ['Variant stock must be zero or greater.']]);
        }

        return DB::transaction(function () use ($listingId, $listingVersionId, $ownerUserId, $resourceKey, $openingQuantity, $correlationId): array {
            $listing = DB::table('listings')->where('id', $listingId)->lockForUpdate()->first();
            if ($listing === null
                || (string) $listing->owner_user_id !== $ownerUserId
                || (string) $listing->listing_type !== 'product') {
                throw new ListingError('LISTING_NOT_FOUND', 'The stock bucket could not be found.', $correlationId, status: 404);
            }
            if (! DB::table('listing_versions')->where('id', $listingVersionId)->where('listing_id', $listingId)->exists()) {
                throw new ListingError('LISTING_NOT_FOUND', 'The listing version could not be found.', $correlationId, status: 404);
            }

            $existing = DB::table('listing_capacity')
                ->where('listing_id', $listingId)
                ->where('capacity_type', 'quantity')
                ->where('resource_key', $resourceKey)
                ->lockForUpdate()
                ->first();
            if ($existing !== null) {
                if ((string) $existing->listing_version_id !== $listingVersionId) {
                    DB::table('listing_capacity')->where('id', $existing->id)->update([
                        'listing_version_id' => $listingVersionId,
                        'updated_at' => now(),
                    ]);
                    $existing->listing_version_id = $listingVersionId;
                }

                return $this->balanceRow($existing);
            }
            $id = (string) Str::uuid7();
            $now = now();
            $status = $openingQuantity === 0 ? 'out_of_stock' : 'open';
            DB::table('listing_capacity')->insert([
                'id' => $id,
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'capacity_type' => 'quantity',
                'quantity' => $openingQuantity,
                'remaining_quantity' => $openingQuantity,
                'slot_start' => null,
                'slot_end' => null,
                'reservation_status' => $openingQuantity === 0 ? 'held' : 'open',
                'version' => 1,
                'resource_key' => $resourceKey,
                'row_version' => 1,
                'stock_policy' => 'tracked',
                'availability_status' => $status,
                'low_stock_threshold' => 0,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('stock_movements')->insert([
                'id' => (string) Str::uuid7(),
                'listing_capacity_id' => $id,
                'source_listing_version_id' => $listingVersionId,
                'reservation_id' => null,
                'order_id' => null,
                'movement_type' => 'opening_balance',
                'delta_on_hand' => $openingQuantity,
                'delta_held' => 0,
                'delta_committed' => 0,
                'balance_on_hand' => $openingQuantity,
                'balance_held' => 0,
                'balance_committed' => 0,
                'balance_available' => $openingQuantity,
                'counted_quantity' => null,
                'reason' => 'Opening stock provisioned from product variant.',
                'reference' => null,
                'evidence_file_id' => null,
                'actor_user_id' => $listing->owner_user_id,
                'owner_user_id' => $ownerUserId,
                'consent_grant_id' => null,
                'command_scope' => 'stock.opening:'.$listingId.':'.$resourceKey,
                'idempotency_key' => 'stock-open:'.$listingId.':'.$resourceKey,
                'correlation_id' => $correlationId,
                'occurred_at' => $now,
                'created_at' => $now,
            ]);

            return [
                'id' => $id,
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'resource_key' => $resourceKey,
                'on_hand' => $openingQuantity,
                'held' => 0,
                'committed_unfulfilled' => 0,
                'available' => $openingQuantity,
                'availability_status' => $status,
                'row_version' => 1,
            ];
        });
    }

    /** @param list<array<string, mixed>> $variants
     * @return list<array<string, mixed>>
     */
    public function provisionVariants(
        string $listingId,
        string $listingVersionId,
        string $ownerUserId,
        array $variants,
        string $correlationId,
    ): array {
        $buckets = [];
        foreach ($variants as $variant) {
            $resourceKey = trim((string) ($variant['id'] ?? ''));
            if ($resourceKey === '') {
                continue;
            }

            $openingQuantity = (int) ($variant['stock'] ?? 0);
            if ($openingQuantity < 0) {
                throw new ListingError('VALIDATION_FAILED', 'Variant opening stock cannot be negative.', $correlationId, fieldErrors: ['variants' => ['Enter an opening stock of zero or more.']]);
            }

            $buckets[] = $this->provisionVariant(
                listingId: $listingId,
                listingVersionId: $listingVersionId,
                ownerUserId: $ownerUserId,
                resourceKey: $resourceKey,
                openingQuantity: $openingQuantity,
                correlationId: $correlationId,
            );
        }

        return $buckets;
    }

    /** @return list<array<string, mixed>> */
    public function index(string $ownerUserId): array
    {
        $rows = DB::table('listing_capacity')
            ->join('listings', 'listings.id', '=', 'listing_capacity.listing_id')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->where('listings.owner_user_id', $ownerUserId)
            ->where('listings.listing_type', 'product')
            ->where('listing_capacity.capacity_type', 'quantity')
            ->where('listing_capacity.resource_key', '<>', '')
            ->select('listing_capacity.*', 'listings.id as product_listing_id', 'listing_versions.terms')
            ->orderBy('listing_versions.terms->title')
            ->orderBy('listing_capacity.resource_key')
            ->get();

        $balances = $this->balancesForCapacities($rows->pluck('id')->map(static fn (mixed $id): string => (string) $id)->all());

        return $rows->map(function (object $row) use ($balances): array {
            $terms = is_array($row->terms) ? $row->terms : (json_decode((string) $row->terms, true) ?: []);
            $variant = collect($terms['variants'] ?? [])->first(fn (array $candidate): bool => (string) ($candidate['id'] ?? '') === (string) $row->resource_key);

            return array_merge($this->balanceRow($row, $balances[(string) $row->id] ?? null), [
                'listing_title' => (string) ($terms['title'] ?? ''),
                'variant_name' => (string) ($variant['name'] ?? $variant['title'] ?? $row->resource_key),
                'image_url' => $terms['media'][0]['url'] ?? null,
            ]);
        })->all();
    }

    /** @return array<string, mixed> */
    public function show(string $capacityId, string $ownerUserId, string $correlationId): array
    {
        $bucket = DB::table('listing_capacity')
            ->join('listings', 'listings.id', '=', 'listing_capacity.listing_id')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->where('listing_capacity.id', $capacityId)
            ->where('listings.owner_user_id', $ownerUserId)
            ->where('listings.listing_type', 'product')
            ->where('listing_capacity.capacity_type', 'quantity')
            ->select('listing_capacity.*', 'listing_versions.terms')
            ->first();
        if ($bucket === null) {
            throw new ListingError('LISTING_NOT_FOUND', 'The stock item could not be found.', $correlationId, status: 404);
        }

        $terms = is_array($bucket->terms) ? $bucket->terms : (json_decode((string) $bucket->terms, true) ?: []);
        $variant = collect($terms['variants'] ?? [])->first(fn (array $candidate): bool => (string) ($candidate['id'] ?? '') === (string) $bucket->resource_key);
        $movementRows = DB::table('stock_movements')
            ->leftJoin('user_profiles as actors', 'actors.user_id', '=', 'stock_movements.actor_user_id')
            ->where('stock_movements.listing_capacity_id', $capacityId)
            ->orderByDesc('stock_movements.occurred_at')
            ->orderByDesc('stock_movements.id')
            ->get([
                'stock_movements.id', 'stock_movements.movement_type', 'stock_movements.delta_on_hand',
                'stock_movements.balance_on_hand', 'stock_movements.balance_held', 'stock_movements.balance_committed',
                'stock_movements.balance_available', 'stock_movements.counted_quantity', 'stock_movements.reason',
                'stock_movements.reference', 'stock_movements.occurred_at', 'stock_movements.owner_user_id',
                'stock_movements.order_id', 'actors.display_name as actor_name',
            ]);
        $references = $this->orderReferences->referencesForOrders(
            $movementRows->pluck('order_id')->filter()->map(static fn (mixed $id): string => (string) $id)->unique()->values()->all(),
        );
        $movements = $movementRows
            ->map(function (object $movement) use ($references): array {
                $row = (array) $movement;
                $row['order_reference'] = isset($movement->order_id)
                    ? ($references[(string) $movement->order_id] ?? null)
                    : null;

                return $row;
            })
            ->all();

        return array_merge($this->balanceRow($bucket), [
            'listing_title' => (string) ($terms['title'] ?? ''),
            'variant_name' => (string) ($variant['name'] ?? $variant['title'] ?? $bucket->resource_key),
            'affected_orders' => $this->affectedOrderReferences($capacityId),
            'movements' => $movements,
        ]);
    }

    /** @return array<string, mixed> */
    public function adjust(
        string $capacityId,
        string $actorUserId,
        string $ownerUserId,
        int $expectedRowVersion,
        string $movementType,
        int $quantity,
        string $idempotencyKey,
        string $reason,
        ?string $reference,
        string $correlationId,
    ): array {
        if (! in_array($movementType, ['receiving', 'damaged', 'recount'], true)
            || $quantity < 0
            || ($movementType !== 'recount' && $quantity === 0)
            || trim($idempotencyKey) === ''
            || trim($reason) === '') {
            throw new ListingError('VALIDATION_FAILED', 'Enter a valid stock movement and reason.', $correlationId, fieldErrors: ['movement_type' => ['Choose receiving, damaged, or recount.'], 'quantity' => ['Enter a valid quantity.'], 'reason' => ['A reason is required.']]);
        }

        $scope = 'stock.adjustment:'.$capacityId.':'.$ownerUserId;

        return DB::transaction(function () use ($capacityId, $actorUserId, $ownerUserId, $expectedRowVersion, $movementType, $quantity, $idempotencyKey, $reason, $reference, $correlationId, $scope): array {
            $bucket = DB::table('listing_capacity')
                ->join('listings', 'listings.id', '=', 'listing_capacity.listing_id')
                ->where('listing_capacity.id', $capacityId)
                ->where('listings.owner_user_id', $ownerUserId)
                ->where('listing_capacity.stock_policy', 'tracked')
                ->select('listing_capacity.*')
                ->lockForUpdate()
                ->first();
            if ($bucket === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The stock item could not be found.', $correlationId, status: 404);
            }
            if ($actorUserId !== $ownerUserId) {
                throw new ListingError('AUTHORIZATION_DENIED', 'Only the stock owner can record adjustments.', $correlationId, status: 403);
            }

            $existing = DB::table('stock_movements')->where('command_scope', $scope)->where('idempotency_key', $idempotencyKey)->first();
            if ($existing !== null) {
                if ((string) $existing->movement_type !== $movementType
                    || (string) ($existing->reason ?? '') !== $reason
                    || ($existing->reference ?? null) !== $reference
                    || (int) ($existing->counted_quantity ?? ($movementType === 'damaged' ? -((int) $existing->delta_on_hand) : (int) $existing->delta_on_hand)) !== $quantity) {
                    throw new ListingError('IDEMPOTENCY_CONFLICT', 'That stock adjustment key was already used for different input.', $correlationId, status: 409);
                }

                $affectedOrders = $this->affectedOrderReferences($capacityId);

                return array_merge($this->balanceRow($bucket), ['movement_id' => (string) $existing->id, 'replay' => true, 'affected_orders' => $affectedOrders]);
            }
            if ((int) $bucket->row_version !== $expectedRowVersion) {
                throw new ListingError('VERSION_CONFLICT', 'Stock changed since you opened this item. Refresh before recording an adjustment.', $correlationId, status: 409);
            }

            $previous = $this->balanceRow($bucket);
            $onHand = (int) $bucket->quantity;
            if ($movementType === 'receiving') {
                $onHand += $quantity;
            } elseif ($movementType === 'damaged') {
                if ($quantity > $onHand) {
                    throw new ListingError('VALIDATION_FAILED', 'Damaged quantity cannot exceed physical stock on hand.', $correlationId, fieldErrors: ['quantity' => ['Enter a quantity no greater than on-hand stock.']]);
                }
                $onHand -= $quantity;
            } else {
                $onHand = $quantity;
            }

            $held = $previous['held'];
            $committed = $previous['committed_unfulfilled'];
            $available = $onHand - $held - $committed;
            $status = $available < 0
                ? 'shortage'
                : ($available === 0
                    ? 'out_of_stock'
                    : ((string) ($bucket->availability_status ?? '') === 'paused' ? 'paused' : 'open'));
            $deltaOnHand = $onHand - (int) $bucket->quantity;
            $now = now();
            $movementId = (string) Str::uuid7();
            $version = $expectedRowVersion + 1;
            DB::table('listing_capacity')->where('id', $capacityId)->update([
                'quantity' => $onHand,
                'remaining_quantity' => $available,
                'availability_status' => $status,
                'reservation_status' => $available > 0 ? 'open' : 'held',
                'row_version' => $version,
                'version' => ((int) $bucket->version) + 1,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            DB::table('stock_movements')->insert([
                'id' => $movementId,
                'listing_capacity_id' => $capacityId,
                'source_listing_version_id' => $bucket->listing_version_id,
                'reservation_id' => null,
                'order_id' => null,
                'movement_type' => $movementType,
                'delta_on_hand' => $deltaOnHand,
                'delta_held' => 0,
                'delta_committed' => 0,
                'balance_on_hand' => $onHand,
                'balance_held' => $held,
                'balance_committed' => $committed,
                'balance_available' => $available,
                'counted_quantity' => $movementType === 'recount' ? $quantity : null,
                'reason' => $reason,
                'reference' => $reference,
                'evidence_file_id' => null,
                'actor_user_id' => $actorUserId,
                'owner_user_id' => $ownerUserId,
                'consent_grant_id' => null,
                'command_scope' => $scope,
                'idempotency_key' => $idempotencyKey,
                'correlation_id' => $correlationId,
                'occurred_at' => $now,
                'created_at' => $now,
            ]);
            $auditId = $this->audits->record(
                action: 'stock.adjusted',
                targetType: 'listing_capacity',
                targetId: $capacityId,
                correlationId: $correlationId,
                actor: ActorContext::human($actorUserId),
                commandName: 'RecordStockAdjustment',
                expectedVersion: $expectedRowVersion,
                previous: ['on_hand' => (int) $bucket->quantity, 'held' => $held, 'committed_unfulfilled' => $committed, 'available' => $previous['available']],
                next: ['on_hand' => $onHand, 'held' => $held, 'committed_unfulfilled' => $committed, 'available' => $available, 'availability_status' => $status],
                reason: $reason,
            );
            $affectedOrderIds = $this->affectedOrderIds($capacityId);
            $affectedOrders = array_values($this->orderReferences->activeReferencesForOrders($affectedOrderIds));
            if ($movementType === 'recount' && $status === 'shortage') {
                $this->notifyShortage($capacityId, $movementId, $version, $ownerUserId, $affectedOrderIds, $correlationId);
            }
            $this->outbox->enqueue('stock.adjusted', 'listing_capacity', $capacityId, [
                'listing_capacity_id' => $capacityId,
                'movement_id' => $movementId,
                'movement_type' => $movementType,
                'availability_status' => $status,
                'affected_orders' => $affectedOrders,
            ], $correlationId, $auditId);

            return [
                'movement_id' => $movementId,
                'replay' => false,
                'on_hand' => $onHand,
                'held' => $held,
                'committed_unfulfilled' => $committed,
                'available' => $available,
                'availability_status' => $status,
                'row_version' => $version,
                'affected_orders' => $affectedOrders,
            ];
        });
    }

    /** @param list<string> $capacityIds
     * @return array<string, object>
     */
    private function balancesForCapacities(array $capacityIds): array
    {
        if ($capacityIds === []) {
            return [];
        }

        $balances = [];
        foreach ($capacityIds as $capacityId) {
            $balances[$capacityId] = (object) ['held' => 0, 'committed_unfulfilled' => 0];
        }
        $reservationRows = DB::table('listing_capacity_reservations')
            ->whereIn('listing_capacity_id', $capacityIds)
            ->select('listing_capacity_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'held' THEN quantity ELSE 0 END), 0) AS held")
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('committed', 'fulfilled') THEN quantity - fulfilled_quantity - released_quantity ELSE 0 END), 0) AS committed_unfulfilled")
            ->groupBy('listing_capacity_id')
            ->get();
        foreach ($reservationRows as $reservationRow) {
            $balances[(string) $reservationRow->listing_capacity_id] = $reservationRow;
        }

        return $balances;
    }

    /** @return array<string, mixed> */
    private function balanceRow(object $bucket, ?object $reservationRows = null): array
    {
        $reservationRows ??= DB::table('listing_capacity_reservations')
            ->where('listing_capacity_id', $bucket->id)
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'held' THEN quantity ELSE 0 END), 0) AS held")
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('committed', 'fulfilled') THEN quantity - fulfilled_quantity - released_quantity ELSE 0 END), 0) AS committed_unfulfilled")
            ->first();
        $held = (int) ($reservationRows->held ?? 0);
        $committed = (int) ($reservationRows->committed_unfulfilled ?? 0);
        $onHand = (int) ($bucket->quantity ?? 0);

        return [
            'id' => (string) $bucket->id,
            'listing_id' => (string) $bucket->listing_id,
            'listing_version_id' => (string) $bucket->listing_version_id,
            'resource_key' => (string) $bucket->resource_key,
            'on_hand' => $onHand,
            'held' => $held,
            'committed_unfulfilled' => $committed,
            'available' => $onHand - $held - $committed,
            'availability_status' => (string) ($bucket->availability_status ?? 'open'),
            'row_version' => (int) $bucket->row_version,
        ];
    }

    /** @return list<string> */
    private function affectedOrderReferences(string $capacityId): array
    {
        return array_values($this->orderReferences->activeReferencesForOrders($this->affectedOrderIds($capacityId)));
    }

    /** @return list<string> */
    private function affectedOrderIds(string $capacityId): array
    {
        return DB::table('listing_capacity_reservations')
            ->where('listing_capacity_id', $capacityId)
            ->whereIn('status', ['held', 'committed'])
            ->whereNotNull('order_id')
            ->distinct()
            ->pluck('order_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();
    }

    /** @param list<string> $orderIds */
    private function notifyShortage(
        string $capacityId,
        string $movementId,
        int $version,
        string $ownerUserId,
        array $orderIds,
        string $correlationId,
    ): void {
        $eventType = 'stock.shortage_recount';
        $this->notifications->recordIntent(new NotificationIntent(
            recipientUserId: $ownerUserId,
            eventSourceType: 'stock_movement',
            eventSourceId: $movementId,
            eventType: $eventType,
            attention: NotificationAttention::NeedsAction,
            title: 'Short stock count recorded',
            body: 'Review the shortage and resolve affected reservations.',
            actionUrl: route('stock.show', ['capacity' => $capacityId], false),
            idempotencyKey: $eventType.':'.$movementId.':v'.$version.':'.$ownerUserId,
            correlationId: $correlationId,
        ));

        foreach ($this->orderReferences->activeOrderDetailsForOrders($orderIds) as $order) {
            $buyerUserId = $order['buyer_user_id'];
            $orderId = $order['order_id'];
            if ($buyerUserId === $ownerUserId) {
                continue;
            }

            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $buyerUserId,
                eventSourceType: 'stock_movement',
                eventSourceId: $movementId,
                eventType: $eventType,
                attention: NotificationAttention::Updates,
                title: 'Availability update for your Order',
                body: 'The provider recorded a stock shortage for an item in your Order.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: $eventType.':'.$movementId.':v'.$version.':'.$buyerUserId.':order:'.$orderId,
                correlationId: $correlationId,
            ));
        }
    }
}

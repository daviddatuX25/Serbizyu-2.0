<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\SeedTagudinBrowseCatalog;
use App\Modules\Listings\Application\StockLedgerService;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\FixtureConstants;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

/** @return array{listing_id: string, version_id: string, owner_id: string, correlation_id: string} */
function stockFixture(): array
{
    $owner = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $created = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $owner->id, (string) $owner->id),
        [
            'title' => 'Stock ledger test product',
            'description' => 'Product for stock ledger behavior tests.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'variants' => [['id' => 'variant-one', 'name' => 'Variant one', 'price' => 12, 'stock' => 5]],
        ],
        $correlationId,
    );

    return [
        'listing_id' => $created['id'],
        'version_id' => (string) DB::table('listing_versions')->where('listing_id', $created['id'])->value('id'),
        'owner_id' => (string) $owner->id,
        'correlation_id' => $correlationId,
    ];
}

function createStockOrder(array $fixture): string
{
    $orderId = (string) Str::uuid7();
    $buyer = User::factory()->create();
    DB::table('orders')->insert([
        'id' => $orderId,
        'origin' => 'listing',
        'mechanism' => 'direct',
        'listing_id' => $fixture['listing_id'],
        'request_id' => null,
        'quote_id' => null,
        'buyer_user_id' => (string) $buyer->id,
        'provider_user_id' => $fixture['owner_id'],
        'status' => 'accepted',
        'geography' => null,
        'deal_chain_id' => null,
        'deal_need_id' => null,
        'correlation_id' => $fixture['correlation_id'],
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $orderId;
}

it('seeds product variants once and never resets physical stock on a later seed run', function (): void {
    app(SeedTagudinBrowseCatalog::class)->handle();
    $bucket = DB::table('listing_capacity')
        ->where('listing_id', '0198a3b1-7c40-7abc-8def-5234567890ba')
        ->where('resource_key', 'var-ac-capacitor-35uf')
        ->first();

    expect($bucket)->not->toBeNull()
        ->and((int) $bucket->quantity)->toBe(20)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket->id)->where('movement_type', 'opening_balance')->count())->toBe(1);

    $damage = app(StockLedgerService::class)->adjust(
        capacityId: (string) $bucket->id,
        actorUserId: FixtureConstants::ACTIVE_OWNER_ID,
        ownerUserId: FixtureConstants::ACTIVE_OWNER_ID,
        expectedRowVersion: (int) $bucket->row_version,
        movementType: 'damaged',
        quantity: 1,
        idempotencyKey: 'seed-stock-damaged-0001',
        reason: 'Test damage movement',
        reference: null,
        correlationId: '0198a3b1-7c40-7abc-8def-5234567890ba',
    );
    $damageReplay = app(StockLedgerService::class)->adjust(
        capacityId: (string) $bucket->id,
        actorUserId: FixtureConstants::ACTIVE_OWNER_ID,
        ownerUserId: FixtureConstants::ACTIVE_OWNER_ID,
        expectedRowVersion: (int) $bucket->row_version,
        movementType: 'damaged',
        quantity: 1,
        idempotencyKey: 'seed-stock-damaged-0001',
        reason: 'Test damage movement',
        reference: null,
        correlationId: '0198a3b1-7c40-7abc-8def-5234567890ba',
    );
    app(SeedTagudinBrowseCatalog::class)->handle();

    expect($damageReplay['movement_id'])->toBe($damage['movement_id'])
        ->and($damageReplay['replay'])->toBeTrue()
        ->and((int) DB::table('listing_capacity')->where('id', $bucket->id)->value('quantity'))->toBe(19)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket->id)->count())->toBe(2);
});

it('provisions a stable variant bucket once, including zero opening stock', function (): void {
    $fixture = stockFixture();
    $stock = app(StockLedgerService::class);

    $first = $stock->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-zero',
        openingQuantity: 0,
        correlationId: $fixture['correlation_id'],
    );
    $again = $stock->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-zero',
        openingQuantity: 9,
        correlationId: $fixture['correlation_id'],
    );

    expect($again['id'])->toBe($first['id'])
        ->and($again['on_hand'])->toBe(0)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $first['id'])->count())->toBe(1);
});

it('provisions published variants through the listing command contract', function (): void {
    $fixture = stockFixture();
    DB::table('listings')->where('id', $fixture['listing_id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
    ]);
    $listings = app(ListingCommandStore::class);
    $first = $listings->provisionPublishedProductStock($fixture['listing_id'], $fixture['owner_id'], $fixture['correlation_id']);

    expect($first)->toHaveCount(1)
        ->and($first[0]['resource_key'])->toBe('variant-one')
        ->and($first[0]['on_hand'])->toBe(5);

    app(StockLedgerService::class)->adjust(
        capacityId: $first[0]['id'],
        actorUserId: $fixture['owner_id'],
        ownerUserId: $fixture['owner_id'],
        expectedRowVersion: 1,
        movementType: 'damaged',
        quantity: 1,
        idempotencyKey: 'stock-publication-damage-0001',
        reason: 'Damaged sample',
        reference: null,
        correlationId: $fixture['correlation_id'],
    );
    $currentVersion = DB::table('listing_versions')->where('id', $fixture['version_id'])->value('terms');
    $terms = is_array($currentVersion) ? $currentVersion : json_decode((string) $currentVersion, true);
    $terms['variants'][0]['price'] = 13;
    DB::table('listing_versions')->where('id', $fixture['version_id'])->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $again = $listings->provisionPublishedProductStock($fixture['listing_id'], $fixture['owner_id'], $fixture['correlation_id']);

    expect($again)->toHaveCount(1)
        ->and($again[0]['id'])->toBe($first[0]['id'])
        ->and($again[0]['on_hand'])->toBe(4)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $first[0]['id'])->where('movement_type', 'opening_balance')->count())->toBe(1);
});

it('records idempotent receiving and shortage recounts without releasing affected orders', function (): void {
    $fixture = stockFixture();
    $stock = app(StockLedgerService::class);
    $bucket = $stock->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-shortage',
        openingQuantity: 8,
        correlationId: $fixture['correlation_id'],
    );

    $receiving = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: $fixture['owner_id'],
        ownerUserId: $fixture['owner_id'],
        expectedRowVersion: 1,
        movementType: 'receiving',
        quantity: 2,
        idempotencyKey: 'stock-receive-0001',
        reason: 'Supplier delivery',
        reference: 'INV-TEST-01',
        correlationId: $fixture['correlation_id'],
    );
    $replay = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: $fixture['owner_id'],
        ownerUserId: $fixture['owner_id'],
        expectedRowVersion: 1,
        movementType: 'receiving',
        quantity: 2,
        idempotencyKey: 'stock-receive-0001',
        reason: 'Supplier delivery',
        reference: 'INV-TEST-01',
        correlationId: $fixture['correlation_id'],
    );
    expect($replay['movement_id'])->toBe($receiving['movement_id'])
        ->and($replay['on_hand'])->toBe(10);

    $orderId = createStockOrder($fixture);
    $orderReference = (string) DB::table('orders')->where('id', $orderId)->value('public_reference');
    DB::table('listing_capacity_reservations')->insert([
        'id' => (string) Str::uuid7(),
        'listing_capacity_id' => $bucket['id'],
        'listing_version_id' => $fixture['version_id'],
        'order_id' => $orderId,
        'source_mechanism' => 'direct',
        'source_reference_id' => null,
        'quantity' => 5,
        'slot_start' => null,
        'slot_end' => null,
        'status' => 'committed',
        'command_scope' => 'stock-test.order',
        'idempotency_key' => 'stock-test-order-0001',
        'row_version' => 1,
        'expires_at' => null,
        'committed_at' => now(),
        'released_at' => null,
        'correlation_id' => $fixture['correlation_id'],
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $heldOrderId = createStockOrder($fixture);
    $heldOrderReference = (string) DB::table('orders')->where('id', $heldOrderId)->value('public_reference');
    DB::table('listing_capacity_reservations')->insert([
        'id' => (string) Str::uuid7(),
        'listing_capacity_id' => $bucket['id'],
        'listing_version_id' => $fixture['version_id'],
        'order_id' => $heldOrderId,
        'source_mechanism' => 'direct',
        'source_reference_id' => null,
        'quantity' => 2,
        'slot_start' => null,
        'slot_end' => null,
        'status' => 'held',
        'command_scope' => 'stock-test.held-order',
        'idempotency_key' => 'stock-test-held-order-0001',
        'row_version' => 1,
        'expires_at' => null,
        'committed_at' => null,
        'released_at' => null,
        'correlation_id' => $fixture['correlation_id'],
        'created_at' => now(),
        'updated_at' => now(),
    ]);


    $recount = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: $fixture['owner_id'],
        ownerUserId: $fixture['owner_id'],
        expectedRowVersion: 2,
        movementType: 'recount',
        quantity: 3,
        idempotencyKey: 'stock-recount-0001',
        reason: 'Physical count',
        reference: null,
        correlationId: $fixture['correlation_id'],
    );
    $recountReplay = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: $fixture['owner_id'],
        ownerUserId: $fixture['owner_id'],
        expectedRowVersion: 2,
        movementType: 'recount',
        quantity: 3,
        idempotencyKey: 'stock-recount-0001',
        reason: 'Physical count',
        reference: null,
        correlationId: $fixture['correlation_id'],
    );

    expect($recount['on_hand'])->toBe(3)
        ->and($recount['held'])->toBe(2)
        ->and($recount['committed_unfulfilled'])->toBe(5)
        ->and($recount['available'])->toBe(-4)
        ->and($recount['availability_status'])->toBe('shortage')
        ->and($recount['affected_orders'])->toContain($orderReference)
        ->and($recount['affected_orders'])->toContain($heldOrderReference)
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $orderId)->value('status'))->toBe('committed')
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $heldOrderId)->value('status'))->toBe('held')
        ->and($recountReplay['movement_id'])->toBe($recount['movement_id'])
        ->and($recountReplay['replay'])->toBeTrue();


    try {
        app(CapacityReservationService::class)->hold(
            listingCapacityId: $bucket['id'],
            quantity: 1,
            commandScope: 'stock-shortage-hold',
            idempotencyKey: 'stock-shortage-hold-0001',
            correlationId: $fixture['correlation_id'],
        );
        expect(false)->toBeTrue('A shortage bucket must reject new holds.');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('CAPACITY_OVERSELL');
    }
});

it('rejects stale stock adjustment versions and cross-owner bucket access', function (): void {
    $fixture = stockFixture();
    $otherOwner = User::factory()->create();
    $stock = app(StockLedgerService::class);
    $bucket = $stock->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-lock',
        openingQuantity: 4,
        correlationId: $fixture['correlation_id'],
    );


    try {
        $stock->adjust(
            capacityId: $bucket['id'],
            actorUserId: $fixture['owner_id'],
            ownerUserId: $fixture['owner_id'],
            expectedRowVersion: 0,
            movementType: 'damaged',
            quantity: 1,
            idempotencyKey: 'stock-stale-0001',
            reason: 'Damaged',
            reference: null,
            correlationId: $fixture['correlation_id'],
        );
        expect(false)->toBeTrue('Expected stale row version to be rejected.');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VERSION_CONFLICT');
    }


    expect(fn () => $stock->show($bucket['id'], (string) $otherOwner->id, $fixture['correlation_id']))
        ->toThrow(ListingError::class);
});

it('increments stock row version when a held reservation is committed', function (): void {
    $fixture = stockFixture();
    $bucket = app(StockLedgerService::class)->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-commit-version',
        openingQuantity: 5,
        correlationId: $fixture['correlation_id'],
    );
    $orderId = createStockOrder($fixture);
    $capacity = app(CapacityReservationService::class);
    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 2,
        commandScope: 'stock-row-version.hold',
        idempotencyKey: 'stock-row-version-hold-0001',
        correlationId: $fixture['correlation_id'],
    );
    $capacity->commitForOrder(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        orderId: $orderId,
        quantity: 2,
        commandScope: 'stock-row-version.commit',
        idempotencyKey: 'stock-row-version-commit-0001',
        correlationId: $fixture['correlation_id'],
        heldReservationId: $held['reservation_id'],
        resourceKey: 'variant-commit-version',
    );

    try {
        app(StockLedgerService::class)->adjust(
            capacityId: $bucket['id'],
            actorUserId: $fixture['owner_id'],
            ownerUserId: $fixture['owner_id'],
            expectedRowVersion: 2,
            movementType: 'receiving',
            quantity: 1,
            idempotencyKey: 'stock-row-version-stale-0001',
            reason: 'Stale adjustment',
            reference: null,
            correlationId: $fixture['correlation_id'],
        );
        expect(false)->toBeTrue('Commit changes must invalidate a stale stock adjustment form.');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('VERSION_CONFLICT');
    }

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('row_version'))->toBe(3)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'commit')->count())->toBe(1)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'receiving')->count())->toBe(0);
});

it('deducts physical stock once when part of a committed order is fulfilled', function (): void {
    $fixture = stockFixture();
    $bucket = app(StockLedgerService::class)->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-fulfillment',
        openingQuantity: 6,
        correlationId: $fixture['correlation_id'],
    );
    $orderId = createStockOrder($fixture);
    $reservationId = (string) Str::uuid7();
    DB::table('listing_capacity_reservations')->insert([
        'id' => $reservationId,
        'listing_capacity_id' => $bucket['id'],
        'listing_version_id' => $fixture['version_id'],
        'order_id' => $orderId,
        'source_mechanism' => 'direct',
        'source_reference_id' => null,
        'quantity' => 4,
        'slot_start' => null,
        'slot_end' => null,
        'status' => 'committed',
        'command_scope' => 'stock-fulfillment-order',
        'idempotency_key' => 'stock-fulfillment-order-0001',
        'row_version' => 1,
        'expires_at' => null,
        'committed_at' => now(),
        'released_at' => null,
        'correlation_id' => $fixture['correlation_id'],
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('listing_capacity')->where('id', $bucket['id'])->update([
        'remaining_quantity' => 2,
        'row_version' => 2,
        'version' => 2,
    ]);

    $capacity = app(CapacityReservationService::class);
    $arguments = [
        'reservationId' => $reservationId,
        'quantity' => 2,
        'actorUserId' => $fixture['owner_id'],
        'commandScope' => 'stock.fulfillment:'.$orderId,
        'idempotencyKey' => 'stock-fulfillment-0001',
        'correlationId' => $fixture['correlation_id'],
    ];
    $result = $capacity->fulfillForOrder(...$arguments);
    $replay = $capacity->fulfillForOrder(...$arguments);
    $current = DB::table('listing_capacity')->where('id', $bucket['id'])->first();

    expect($result['fulfilled_quantity'])->toBe(2)
        ->and($result['remaining_quantity'])->toBe(2)
        ->and($replay['replay'])->toBeTrue()
        ->and((int) $current->quantity)->toBe(4)
        ->and((int) $current->remaining_quantity)->toBe(2)
        ->and(DB::table('listing_capacity_reservations')->where('id', $reservationId)->value('status'))->toBe('committed')
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'fulfillment')->count())->toBe(1);
});

it('serves owner-scoped stock pages and records a stock adjustment over HTTP', function (): void {
    $fixture = stockFixture();
    $owner = User::query()->findOrFail($fixture['owner_id']);
    $otherOwner = User::factory()->create();
    $bucket = app(StockLedgerService::class)->provisionVariant(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        ownerUserId: $fixture['owner_id'],
        resourceKey: 'variant-http',
        openingQuantity: 5,
        correlationId: $fixture['correlation_id'],
    );

    $this->actingAs($owner)->get('/stock')->assertOk();
    $this->actingAs($owner)->get('/stock/'.$bucket['id'])->assertOk();
    $this->actingAs($otherOwner)->get('/stock/'.$bucket['id'])->assertNotFound();

    $response = $this->actingAs($owner)->post('/stock/'.$bucket['id'].'/adjustments', [
        'movement_type' => 'receiving',
        'quantity' => 3,
        'expected_row_version' => 1,
        'idempotency_key' => 'stock-http-receive-0001',
        'reason' => 'HTTP supplier delivery',
        'reference' => 'INV-HTTP-1',
    ]);
    $response->assertRedirect(route('stock.show', ['capacity' => $bucket['id']]));

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('quantity'))->toBe(8)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'receiving')->count())->toBe(1)
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'receiving')->value('actor_user_id'))->toBe($fixture['owner_id'])
        ->and(DB::table('stock_movements')->where('listing_capacity_id', $bucket['id'])->where('movement_type', 'receiving')->value('owner_user_id'))->toBe($fixture['owner_id'])
        ->and(DB::table('audit_events')->where('target_type', 'listing_capacity')->where('target_id', $bucket['id'])->where('action', 'stock.adjusted')->count())->toBe(1)
        ->and(DB::table('outbox_messages')->where('aggregate_type', 'listing_capacity')->where('aggregate_id', $bucket['id'])->where('event_type', 'stock.adjusted')->count())->toBe(1);
});

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t3EdgePgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T3 order edge proofs require PostgreSQL.');
    }
}

function t3EdgeExpectOrderError(callable $callback, string $code): OrderError
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected OrderError '.$code);
    } catch (OrderError $error) {
        expect($error->envelope->code)->toBe($code);

        return $error;
    }

    throw new RuntimeException('unreachable');
}

/**
 * @return array{provider: User, buyer: User, listing: array<string, mixed>, correlation_id: string}
 */
function t3EdgeActiveListingFixture(string $listingType = 'service'): array
{
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);

    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin T3 edge listing',
        'description' => 'Edge-case listing for ordinary order formation.',
        'category_code' => $listingType === 'product' ? 'food' : 'home-help',
        'listing_type' => $listingType,
        'work_shape' => $listingType === 'product' ? 'A4' : 'A1',
    ], $correlationId);

    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);
    DB::table('listing_versions')
        ->where('listing_id', $listing['id'])
        ->where('version_number', (int) $listing['current_version'])
        ->update([
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
            'published_at' => now(),
            'updated_at' => now(),
        ]);
    if ($listingType === 'product') {
        $terms = json_decode((string) DB::table('listing_versions')
            ->where('listing_id', $listing['id'])
            ->where('version_number', (int) $listing['current_version'])
            ->value('terms'), true) ?: [];
        $terms['variants'] = [[
            'id' => 'variant-edge-default',
            'resource_key' => 'edge-default-stock',
            'name' => 'Default product variant',
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
            'is_default' => true,
        ]];
        DB::table('listing_versions')
            ->where('listing_id', $listing['id'])
            ->where('version_number', (int) $listing['current_version'])
            ->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    }

    $listing['expected_version'] = (int) DB::table('listings')->where('id', $listing['id'])->value('current_version');

    return [
        'provider' => $provider,
        'buyer' => $buyer,
        'listing' => $listing,
        'correlation_id' => $correlationId,
    ];
}

it('replays identical propose without duplicating the order', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $first = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-replay-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );
    $second = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-replay-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    expect($second)->toEqual($first)
        ->and(DB::table('orders')->where('buyer_user_id', $fx['buyer']->id)->where('listing_id', $fx['listing']['id'])->count())->toBe(1)
        ->and(DB::table('audit_events')->where('action', 'order.propose')->where('target_id', $first['order_id'])->count())->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'order.proposed')->where('aggregate_id', $first['order_id'])->count())->toBe(1);
});

it('rejects propose when the listing version is already stale', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();

    t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: ((int) $fx['listing']['expected_version']) + 1,
            idempotencyKey: 'propose-stale-edge-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 25000, 'currency' => 'PHP'],
        ),
        'VERSION_CONFLICT',
    );

    expect(DB::table('orders')->where('buyer_user_id', $fx['buyer']->id)->count())->toBe(0);
});

it('persists a selected product variant at its server price and keeps its listing version and quantity', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $version = DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->first();
    $terms = json_decode((string) $version->terms, true) ?: [];
    $terms['variants'] = [[
        'id' => 'variant-blue',
        'resource_key' => 'blue-finish',
        'name' => 'Blue finish',
        'price_amount_minor' => 18400,
        'is_default' => false,
    ]];
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);
    app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: (string) $version->id,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'blue-finish',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-variant-edge-1',
        correlationId: $fx['correlation_id'],
        input: [
            'variant_id' => 'variant-blue',
            'listing_version_id' => (string) $version->id,
            'quantity' => 2,
            'amount_minor' => 1,
            'currency' => 'USD',
        ],
    );
    $proposal = json_decode((string) DB::table('order_parties')
        ->where('order_id', $proposed['order_id'])
        ->where('party_type', 'buyer')
        ->value('scope'), true)['proposal'];
    expect($proposal)->toMatchArray([
        'variant_id' => 'variant-blue',
        'package_id' => null,
        'listing_version_id' => (string) $version->id,
        'quantity' => 2,
        'unit_amount_minor' => 18400,
        'amount_minor' => 36800,
        'currency' => 'PHP',
    ]);
});
it('commits the exact selected variant capacity resource for the requested quantity', function (): void {
    t3EdgePgsqlOrSkip();
    $fx = t3EdgeActiveListingFixture('product');
    $version = DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->first();
    $terms = json_decode((string) $version->terms, true) ?: [];
    $terms['variants'] = [[
        'id' => 'variant-blue',
        'resource_key' => 'variant-blue',
        'name' => 'Blue finish',
        'price_amount_minor' => 18400,
        'is_default' => false,
    ]];
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);

    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: (string) $version->id,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'variant-blue',
    );
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-variant-capacity-1',
        correlationId: $fx['correlation_id'],
        input: [
            'variant_id' => 'variant-blue',
            'listing_version_id' => (string) $version->id,
            'quantity' => 2,
        ],
    );
    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-variant-capacity-1',
        correlationId: $fx['correlation_id'],
    );

    $reservation = DB::table('listing_capacity_reservations')
        ->where('order_id', $proposed['order_id'])
        ->first();
    expect($finalized['amount_minor'])->toBe(36800)
        ->and($reservation)->not->toBeNull()
        ->and((string) $reservation->listing_capacity_id)->toBe($bucket['id'])
        ->and((int) $reservation->quantity)->toBe(2)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3)
        ->and((int) DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->value('amount_minor'))->toBe(36800);
});
it('holds capacity at proposal time and commits it only once on acceptance replay', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-capacity-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    expect(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('held')
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1);

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-capacity-edge-1',
        correlationId: $fx['correlation_id'],
    );
    $replayed = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-capacity-edge-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and($replayed)->toBe($finalized)
        ->and(DB::table('listing_capacity_reservations')->where('id', $finalized['capacity_reservation_id'])->value('status'))->toBe('committed')
        ->and(DB::table('listing_capacity_reservations')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'order.accepted')->where('aggregate_id', $proposed['order_id'])->count())->toBe(1);
});

it('lets the provider finalize a pending proposal', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-provider-finalize-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-provider-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->where('accepted_by_user_id', $fx['provider']->id)->exists())->toBeTrue();
});

it('rolls back committed capacity when finalization later fails', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-rollback-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: ((int) $proposed['version']) + 1,
            idempotencyKey: 'finalize-rollback-edge-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(0)
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('order_id'))->toBeNull()
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('rejects reused propose idempotency keys with a different fingerprint', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-fingerprint-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-fingerprint-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 30000, 'currency' => 'PHP'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );
});

it('rejects reused finalize idempotency keys with a different fingerprint', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-finalize-fp-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-fp-1',
        correlationId: $fx['correlation_id'],
    );

    t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: ((int) $proposed['version']) + 99,
            idempotencyKey: 'finalize-fp-1',
            correlationId: $fx['correlation_id'],
        ),
        'IDEMPOTENCY_KEY_REUSED',
    );
});

it('commits the exact proposal-time hold without a second capacity decrement', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-legacy-hold-1',
        correlationId: $fx['correlation_id'],
        input: ['quantity' => 2],
    );

    expect((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3)
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('held');
    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-legacy-hold-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and($finalized['capacity_reservation_id'])->toBe($proposed['capacity_reservation_id'])
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(3)
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('committed')
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('order_id'))->toBe($proposed['order_id']);
});

it('rejects an unavailable selected product resource before creating the Order', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fx['correlation_id'],
        resourceKey: 'other-product',
    );

    $error = t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-ambiguous-bucket-1',
            correlationId: $fx['correlation_id'],
            input: ['quantity' => 1],
        ),
        'AVAILABILITY_CONFLICT',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('orders')->where('listing_id', $fx['listing']['id'])->count())->toBe(0);
});

it('rejects capacity replay when existing reservation is not in committed status', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );

    // Create a held reservation directly with the command_scope and idempotency_key
    $scope = 'order.finalize.capacity:test-order-non-committed';
    $key = 'capacity-replay-uncommitted-1';
    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: $scope,
        idempotencyKey: $key,
        correlationId: $fx['correlation_id'],
    );

    try {
        $capacity->commitForOrder(
            listingId: $fx['listing']['id'],
            listingVersionId: $versionId,
            orderId: 'test-order-non-committed',
            quantity: 1,
            commandScope: $scope,
            idempotencyKey: $key,
            correlationId: $fx['correlation_id'],
        );
        expect(false)->toBeTrue('Expected ListingError INVALID_STATE');
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe('IDEMPOTENCY_CONFLICT')
            ->and($error->status)->toBe(409);
    }
});
it('rejects a product proposal when its resource-key bucket is missing', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $error = t3EdgeExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-no-bucket-hold-1',
            correlationId: $fx['correlation_id'],
            input: ['quantity' => 1],
        ),
        'AVAILABILITY_CONFLICT',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('orders')->where('listing_id', $fx['listing']['id'])->count())->toBe(0)
        ->and(DB::table('listing_capacity_reservations')->where('correlation_id', $fx['correlation_id'])->count())->toBe(0);
});

it('rejects a held reservation already bound to a different order', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $foreignBuyer = User::factory()->create();
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $bucket = app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );

    $foreignProposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-foreign-hold-owner-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );
    $targetProposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $foreignBuyer->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-foreign-hold-target-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );

    $held = app(CapacityReservationService::class)->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.foreign-hold-owner-1',
        idempotencyKey: 'legacy-foreign-hold-owner-1',
        correlationId: $fx['correlation_id'],
    );
    DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->update([
        'order_id' => $foreignProposal['order_id'],
        'updated_at' => now(),
    ]);

    $targetScope = json_decode(
        (string) DB::table('order_proposals')->where('id', $targetProposal['proposal_id'])->value('scope'),
        true,
    );
    $targetScope['capacity_reservation_id'] = $held['reservation_id'];
    $targetScopeJson = json_encode($targetScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    DB::table('order_proposals')->where('id', $targetProposal['proposal_id'])->update([
        'capacity_reservation_id' => $held['reservation_id'],
        'scope' => $targetScopeJson,
        'terms_hash' => hash('sha256', $targetScopeJson),
    ]);

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $targetProposal['order_id'],
            expectedOrderVersion: (int) $targetProposal['version'],
            idempotencyKey: 'finalize-foreign-hold-target-1',
            correlationId: $fx['correlation_id'],
        ),
        'INVALID_STATE',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('listing_capacity_reservations')->where('id', $held['reservation_id'])->value('order_id'))->toBe($foreignProposal['order_id'])
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(0)
        ->and(DB::table('orders')->where('id', $targetProposal['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('work_instances')->where('order_id', $targetProposal['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $targetProposal['order_id'])->count())->toBe(0);
});

it('rejects finalization when the capacity hold changes between proposal reads', function (): void {
    t3EdgePgsqlOrSkip();

    $fx = t3EdgeActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 4,
        correlationId: $fx['correlation_id'],
        resourceKey: 'edge-default-stock',
    );
    $firstHold = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.changed-hold-first',
        idempotencyKey: 'legacy-changed-hold-first-1',
        correlationId: $fx['correlation_id'],
    );
    $changedHold = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 'legacy.changed-hold-second',
        idempotencyKey: 'legacy-changed-hold-second-1',
        correlationId: $fx['correlation_id'],
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-changed-hold-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP', 'quantity' => 1],
    );

    $source = app(OrderListingSourcePort::class);
    app()->bind(OrderListingSourcePort::class, static function () use ($source, $proposed, $changedHold): OrderListingSourcePort {
        return new class($source, $proposed['proposal_id'], $changedHold['reservation_id']) implements OrderListingSourcePort
        {
            private bool $changed = false;

            public function __construct(
                private readonly OrderListingSourcePort $inner,
                private readonly string $proposalId,
                private readonly string $changedHoldId,
            ) {}

            public function findActiveApproved(string $listingId): ?array
            {
                return $this->inner->findActiveApproved($listingId);
            }

            public function lockActiveApproved(string $listingId): ?array
            {
                if (! $this->changed) {
                    $this->changed = true;
                    DB::table('order_proposals')->where('id', $this->proposalId)->update([
                        'capacity_reservation_id' => $this->changedHoldId,
                    ]);
                }

                return $this->inner->lockActiveApproved($listingId);
            }

            public function eligiblePaymentLanesForVersion(string $listingVersionId): array
            {
                return $this->inner->eligiblePaymentLanesForVersion($listingVersionId);
            }
        };
    });

    $error = t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['provider']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-changed-hold-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect($error->status)->toBe(409)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1)
        ->and(DB::table('listing_capacity_reservations')->where('id', $firstHold['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('listing_capacity_reservations')->where('id', $changedHold['reservation_id'])->value('status'))->toBe('held')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('proposed')
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

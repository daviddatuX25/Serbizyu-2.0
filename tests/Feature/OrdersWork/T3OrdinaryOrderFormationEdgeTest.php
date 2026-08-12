<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
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

it('holds capacity on propose and commits it on finalize', function (): void {
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
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-capacity-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    expect($proposed['capacity_reservation_id'])->not->toBeNull()
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('held')
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1);

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-capacity-edge-1',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and(DB::table('listing_capacity_reservations')->where('id', $proposed['capacity_reservation_id'])->value('status'))->toBe('committed')
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'order.accepted')->where('aggregate_id', $proposed['order_id'])->exists())->toBeTrue();
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

it('rolls back finalize children when capacity commit cannot proceed', function (): void {
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
        quantity: 1,
        correlationId: $fx['correlation_id'],
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-orphan-edge-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
    );

    expect($proposed['capacity_reservation_id'])->not->toBeNull();

    // Simulate an external release so finalize's commit fails inside the same transaction.
    app(CapacityReservationService::class)->release(
        (string) $proposed['capacity_reservation_id'],
        $fx['correlation_id'],
    );

    t3EdgeExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-orphan-edge-1',
            correlationId: $fx['correlation_id'],
        ),
        'INVALID_STATE',
    );

    expect(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
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

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

function t3PgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T3 order proofs require PostgreSQL.');
    }
}

function t3ExpectOrderError(callable $callback, string $code): OrderError
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
function t3ActiveListingFixture(string $listingType = 'service'): array
{
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);

    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin direct booking listing',
        'description' => 'Active approved listing used for T3 order formation.',
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

it('proposes a pending order without work or obligation children', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-0001',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    expect($proposed['status'])->toBe('pending_acceptance')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('order_parties')->where('order_id', $proposed['order_id'])->where('status', 'active')->count())->toBe(2)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('finalizes with standing acceptance creating terms work and external cash obligation', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-final-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $finalized = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-0001',
        correlationId: $fx['correlation_id'],
    );

    expect($finalized['status'])->toBe('accepted')
        ->and(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->where('snapshot_version', 1)->exists())->toBeTrue()
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->where('status', 'not_started')->exists())->toBeTrue()
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->where('lane', 'external_cash')->where('status', 'created')->exists())->toBeTrue();
});

it('rejects finalize when the listing version became stale', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-stale-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $current = (int) DB::table('listings')->where('id', $fx['listing']['id'])->value('current_version');
    $versionRow = DB::table('listing_versions')->where('listing_id', $fx['listing']['id'])->where('version_number', $current)->first();
    $pins = [
        'category_id' => $versionRow->category_id,
        'category_business_version' => $versionRow->category_business_version,
        'capability_profile_family_code' => $versionRow->capability_profile_family_code,
        'capability_profile_business_version' => $versionRow->capability_profile_business_version,
    ];

    $next = $current + 1;
    DB::table('listing_versions')->insert([
        'id' => (string) Str::uuid7(),
        'listing_id' => $fx['listing']['id'],
        'version_number' => $next,
        'description' => 'Changed after propose',
        'terms' => $versionRow->terms,
        'price_amount_minor' => 30000,
        'currency' => 'PHP',
        'payment_lane_availability' => $versionRow->payment_lane_availability,
        'availability_capacity_summary' => $versionRow->availability_capacity_summary,
        'safety_copy' => $versionRow->safety_copy,
        'effective_from' => now(),
        'effective_to' => null,
        'authored_by_user_id' => $fx['provider']->id,
        'payload_version' => 1,
        'version' => 1,
        'correlation_id' => $fx['correlation_id'],
        'published_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
        'category_id' => $pins['category_id'],
        'category_business_version' => $pins['category_business_version'],
        'capability_profile_family_code' => $pins['capability_profile_family_code'],
        'capability_profile_business_version' => $pins['capability_profile_business_version'],
        'row_version' => 1,
    ]);
    DB::table('listings')->where('id', $fx['listing']['id'])->update([
        'current_version' => $next,
        'version' => $next,
        'updated_at' => now(),
    ]);

    t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $fx['buyer']->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-key-stale-1',
            correlationId: $fx['correlation_id'],
        ),
        'VERSION_CONFLICT',
    );

    expect(DB::table('orders')->where('id', $proposed['order_id'])->value('status'))->toBe('pending_acceptance')
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(0);
});

it('replays identical finalize without duplicating children', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-key-replay-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $first = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-replay-1',
        correlationId: $fx['correlation_id'],
    );
    $second = app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fx['buyer']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: (int) $proposed['version'],
        idempotencyKey: 'finalize-key-replay-1',
        correlationId: $fx['correlation_id'],
    );

    expect($second)->toEqual($first)
        ->and(DB::table('order_terms_snapshots')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and(DB::table('work_instances')->where('order_id', $proposed['order_id'])->count())->toBe(1)
        ->and(DB::table('payment_obligations')->where('order_id', $proposed['order_id'])->count())->toBe(1);
});

it('blocks propose when capacity would oversell', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture('product');
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $fx['listing']['id'])
        ->where('version_number', (int) $fx['listing']['expected_version'])
        ->value('id');

    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fx['listing']['id'],
        listingVersionId: $versionId,
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fx['correlation_id'],
    );
    $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't3.prehold',
        idempotencyKey: 'prehold-1',
        correlationId: $fx['correlation_id'],
    );

    t3ExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['buyer']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-oversell-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 10000, 'currency' => 'PHP', 'quantity' => 1],
        ),
        'CAPACITY_OVERSELL',
    );

    expect(DB::table('orders')->where('buyer_user_id', $fx['buyer']->id)->where('listing_id', $fx['listing']['id'])->count())->toBe(0);
});

it('rejects self-booking and unauthorized finalize', function (): void {
    t3PgsqlOrSkip();

    $fx = t3ActiveListingFixture();

    t3ExpectOrderError(
        fn () => app(SubmitOrderProposal::class)->handle(
            buyerUserId: $fx['provider']->id,
            listingId: $fx['listing']['id'],
            expectedListingVersion: (int) $fx['listing']['expected_version'],
            idempotencyKey: 'propose-self-1',
            correlationId: $fx['correlation_id'],
            input: ['amount_minor' => 25000, 'currency' => 'PHP'],
        ),
        'VALIDATION_FAILED',
    );

    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fx['buyer']->id,
        listingId: $fx['listing']['id'],
        expectedListingVersion: (int) $fx['listing']['expected_version'],
        idempotencyKey: 'propose-authz-1',
        correlationId: $fx['correlation_id'],
        input: ['amount_minor' => 25000, 'currency' => 'PHP'],
    );

    $stranger = User::factory()->create();
    t3ExpectOrderError(
        fn () => app(FinalizeOrderAgreement::class)->handle(
            actorUserId: $stranger->id,
            orderId: $proposed['order_id'],
            expectedOrderVersion: (int) $proposed['version'],
            idempotencyKey: 'finalize-authz-1',
            correlationId: $fx['correlation_id'],
        ),
        'AUTHORIZATION_DENIED',
    );
});

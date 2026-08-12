<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t2CapacityPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T2 capacity proofs require PostgreSQL.');
    }
}

/**
 * @return array{listing_id: string, version_id: string, actor: ResourceActor, correlation_id: string}
 */
function t2CapacityListingFixture(): array
{
    $user = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($user->id, $user->id);

    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Capacity edge listing',
        'description' => 'Used for T2 capacity reservation edge cases.',
        'category_code' => 'food',
        'listing_type' => 'product',
    ], $correlationId);

    $version = DB::table('listing_versions')->where('listing_id', $created['id'])->first();

    return [
        'listing_id' => $created['id'],
        'version_id' => (string) $version->id,
        'actor' => $actor,
        'correlation_id' => $correlationId,
    ];
}

function t2ExpectListingError(callable $callback, string $code): ListingError
{
    try {
        $callback();
        expect(false)->toBeTrue('Expected ListingError '.$code);
    } catch (ListingError $error) {
        expect($error->envelope->code)->toBe($code);

        return $error;
    }

    throw new RuntimeException('unreachable');
}

it('rejects non-positive ensure and hold quantities', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);

    t2ExpectListingError(
        fn () => $capacity->ensureBucket(
            listingId: $fixture['listing_id'],
            listingVersionId: $fixture['version_id'],
            capacityType: 'quantity',
            quantity: 0,
            correlationId: $fixture['correlation_id'],
        ),
        'VALIDATION_FAILED',
    );

    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fixture['correlation_id'],
    );

    t2ExpectListingError(
        fn () => $capacity->hold(
            listingCapacityId: $bucket['id'],
            quantity: 0,
            commandScope: 't2.capacity.qty',
            idempotencyKey: 'bad-qty',
            correlationId: $fixture['correlation_id'],
        ),
        'VALIDATION_FAILED',
    );
});

it('returns the same bucket on repeated ensure without resetting remaining', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);

    $first = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 3,
        correlationId: $fixture['correlation_id'],
    );

    $capacity->hold(
        listingCapacityId: $first['id'],
        quantity: 1,
        commandScope: 't2.capacity.ensure',
        idempotencyKey: 'hold-one',
        correlationId: $fixture['correlation_id'],
    );

    $second = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 99,
        correlationId: $fixture['correlation_id'],
    );

    expect($second['id'])->toBe($first['id'])
        ->and($second['remaining_quantity'])->toBe(2)
        ->and($second['quantity'])->toBe(3);
});

it('rejects hold against a missing bucket', function (): void {
    t2CapacityPgsqlOrSkip();

    t2ExpectListingError(
        fn () => app(CapacityReservationService::class)->hold(
            listingCapacityId: (string) Str::uuid7(),
            quantity: 1,
            commandScope: 't2.capacity.missing',
            idempotencyKey: 'missing-bucket',
            correlationId: (string) Str::uuid7(),
        ),
        'LISTING_NOT_FOUND',
    );
});

it('allows partial holds then rejects the oversell that would exceed remaining', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 2,
        correlationId: $fixture['correlation_id'],
    );

    $a = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.partial',
        idempotencyKey: 'a',
        correlationId: $fixture['correlation_id'],
    );
    $b = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.partial',
        idempotencyKey: 'b',
        correlationId: $fixture['correlation_id'],
    );

    expect($a['remaining_quantity'])->toBe(1)
        ->and($b['remaining_quantity'])->toBe(0);

    $error = t2ExpectListingError(
        fn () => $capacity->hold(
            listingCapacityId: $bucket['id'],
            quantity: 1,
            commandScope: 't2.capacity.partial',
            idempotencyKey: 'c',
            correlationId: $fixture['correlation_id'],
        ),
        'CAPACITY_OVERSELL',
    );

    expect($error->status)->toBe(409)
        ->and(DB::table('listing_capacity_reservations')->where('listing_capacity_id', $bucket['id'])->where('status', 'held')->count())->toBe(2);
});

it('restores remaining on release and is idempotent on double release', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fixture['correlation_id'],
    );

    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.release',
        idempotencyKey: 'hold',
        correlationId: $fixture['correlation_id'],
    );

    $released = $capacity->release($held['reservation_id'], $fixture['correlation_id']);
    expect($released['status'])->toBe('released')
        ->and($released['remaining_quantity'])->toBe(1);

    $again = $capacity->release($held['reservation_id'], $fixture['correlation_id']);
    expect($again['status'])->toBe('released')
        ->and($again['remaining_quantity'])->toBe(1)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('remaining_quantity'))->toBe(1);
});

it('commits a hold without restoring remaining, then release after commit restocks once', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fixture['correlation_id'],
    );

    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.commit',
        idempotencyKey: 'hold',
        correlationId: $fixture['correlation_id'],
    );

    $committed = $capacity->commit($held['reservation_id'], $fixture['correlation_id']);
    expect($committed['status'])->toBe('committed')
        ->and($committed['remaining_quantity'])->toBe(0);

    $committedAgain = $capacity->commit($held['reservation_id'], $fixture['correlation_id']);
    expect($committedAgain['status'])->toBe('committed')
        ->and($committedAgain['remaining_quantity'])->toBe(0);

    $released = $capacity->release($held['reservation_id'], $fixture['correlation_id']);
    expect($released['status'])->toBe('released')
        ->and($released['remaining_quantity'])->toBe(1);
});

it('expires a hold and restores remaining without double-credit on second expire', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fixture['correlation_id'],
    );

    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.expire',
        idempotencyKey: 'hold',
        correlationId: $fixture['correlation_id'],
    );

    $expired = $capacity->expire($held['reservation_id'], $fixture['correlation_id']);
    expect($expired['status'])->toBe('expired')
        ->and($expired['remaining_quantity'])->toBe(1);

    $again = $capacity->expire($held['reservation_id'], $fixture['correlation_id']);
    expect($again['status'])->toBe('expired')
        ->and($again['remaining_quantity'])->toBe(1);
});

it('rejects commit of a released reservation', function (): void {
    t2CapacityPgsqlOrSkip();

    $fixture = t2CapacityListingFixture();
    $capacity = app(CapacityReservationService::class);
    $bucket = $capacity->ensureBucket(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['version_id'],
        capacityType: 'quantity',
        quantity: 1,
        correlationId: $fixture['correlation_id'],
    );

    $held = $capacity->hold(
        listingCapacityId: $bucket['id'],
        quantity: 1,
        commandScope: 't2.capacity.commit-released',
        idempotencyKey: 'hold',
        correlationId: $fixture['correlation_id'],
    );
    $capacity->release($held['reservation_id'], $fixture['correlation_id']);

    t2ExpectListingError(
        fn () => $capacity->commit($held['reservation_id'], $fixture['correlation_id']),
        'INVALID_STATE',
    );
});

it('rejects release of an unknown reservation id', function (): void {
    t2CapacityPgsqlOrSkip();

    t2ExpectListingError(
        fn () => app(CapacityReservationService::class)->release((string) Str::uuid7(), (string) Str::uuid7()),
        'LISTING_NOT_FOUND',
    );
});

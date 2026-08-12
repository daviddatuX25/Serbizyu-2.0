<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    $this->bootPhoneOtpAuth();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function t3HttpPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T3 order HTTP proofs require PostgreSQL.');
    }
}

function t3InertiaGet(string $uri)
{
    return test()->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])->get($uri);
}

/**
 * @return array{provider: User, listing_id: string, expected_version: int, correlation_id: string}
 */
function t3HttpActiveListingFor(User $provider): array
{
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);
    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'HTTP bookable Tagudin listing',
        'description' => 'Listing used to confirm throwaway Book → finalize HTTP path.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
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

    return [
        'provider' => $provider,
        'listing_id' => (string) $listing['id'],
        'expected_version' => (int) DB::table('listings')->where('id', $listing['id'])->value('current_version'),
        'correlation_id' => $correlationId,
    ];
}

it('redirects guests from book start to phone auth', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);

    $this->get(route('orders.start', $fx['listing_id']))
        ->assertRedirect(route('auth.sign-in'));
});

it('books from listing detail start and finalizes on the throwaway order page', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);

    $this->authenticateBuyer();

    $start = $this->get(route('orders.start', $fx['listing_id']));
    $start->assertRedirect();

    $orderId = (string) DB::table('orders')
        ->where('listing_id', $fx['listing_id'])
        ->where('status', 'pending_acceptance')
        ->value('id');

    expect($orderId)->not->toBe('')
        ->and($start->headers->get('Location'))->toEndWith('/orders/'.$orderId);

    t3InertiaGet(route('orders.show', $orderId))
        ->assertOk()
        ->assertJsonPath('component', 'Orders/Show')
        ->assertJsonPath('props.order.id', $orderId)
        ->assertJsonPath('props.order.status', 'pending_acceptance')
        ->assertJsonPath('props.order.can_finalize', true)
        ->assertJsonPath('props.work', null)
        ->assertJsonPath('props.obligation', null);

    $version = (int) DB::table('orders')->where('id', $orderId)->value('version');

    $this->post(route('orders.finalize', $orderId), [
        'expected_order_version' => $version,
        'idempotency_key' => 'http-finalize-'.$orderId,
    ])->assertRedirect(route('orders.show', $orderId));

    expect(DB::table('orders')->where('id', $orderId)->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $orderId)->count())->toBe(1)
        ->and(DB::table('work_instances')->where('order_id', $orderId)->where('status', 'not_started')->count())->toBe(1)
        ->and(DB::table('payment_obligations')->where('order_id', $orderId)->where('lane', 'external_cash')->count())->toBe(1);

    t3InertiaGet(route('orders.show', $orderId))
        ->assertOk()
        ->assertJsonPath('component', 'Orders/Show')
        ->assertJsonPath('props.order.status', 'accepted')
        ->assertJsonPath('props.order.can_finalize', false)
        ->assertJsonPath('props.work.status', 'not_started')
        ->assertJsonPath('props.obligation.lane', 'external_cash');
});

it('exposes booking affordance on listing detail without changing page mode', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);
    $this->authenticateBuyer();

    t3InertiaGet(route('listings.show', $fx['listing_id']))
        ->assertOk()
        ->assertJsonPath('component', 'ListingDetail')
        ->assertJsonPath('props.pageMode', 'detail')
        ->assertJsonPath('props.booking.direct_booking_enabled', true)
        ->assertJsonPath('props.booking.can_propose', true)
        ->assertJsonPath('props.booking.start_url', route('orders.start', $fx['listing_id']));
});

it('blocks owner self-booking through the HTTP start path', function (): void {
    t3HttpPgsqlOrSkip();

    $providerPhone = '+639171000201';
    $this->authenticateWithPhone($providerPhone);
    $providerId = (string) auth()->id();
    $provider = User::query()->findOrFail($providerId);
    $fx = t3HttpActiveListingFor($provider);

    $this->from(route('listings.show', $fx['listing_id']))
        ->get(route('orders.start', $fx['listing_id']))
        ->assertRedirect();

    expect(DB::table('orders')->where('listing_id', $fx['listing_id'])->count())->toBe(0);
});

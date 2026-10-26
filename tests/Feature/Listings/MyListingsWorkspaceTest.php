<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('The first connected slice uses the PostgreSQL 16/PostGIS baseline.');
    }

    $this->bootPhoneOtpAuth();
    app(FixtureRepository::class)->ensure();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function inertiaGetMyListings(string $uri)
{
    return test()->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])->get($uri);
}

it('redirects guests from my-listings to phone auth', function (): void {
    $this->get('/my-listings')
        ->assertRedirect(route('auth.sign-in'));

    expect(session('auth_return_to'))->toBe('/my-listings');
});

it('projects owner my listings with review_status on the List Dock route', function (): void {
    $this->authenticateProvider();

    $this->post('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Maya Tagudin',
        'service_area_display' => 'Tagudin, Ilocos Sur',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ])->assertRedirect();

    $created = $this->postJson('/listings', [
        'title' => 'Market errand help',
        'description' => 'Fetch listed items from Tagudin public market.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ])->assertCreated()->json('data');

    $page = inertiaGetMyListings('/my-listings')->assertOk();

    expect($page->json('component'))->toBe('MyListings')
        ->and($page->json('props.pageMode'))->toBe('listings');

    $myListings = $page->json('props.slice.myListings')
        ?? $page->json('props.myListings')
        ?? [];

    expect($myListings)->toBeArray()->not->toBeEmpty();

    $owned = collect($myListings)->first(
        static fn (array $row): bool => ($row['id'] ?? null) === $created['id'],
    );

    expect($owned)->toBeArray()
        ->and($owned['status'] ?? null)->toBe('draft')
        ->and($owned['review_status'] ?? null)->not->toBeNull()
        ->and($owned['title'] ?? null)->toBe('Market errand help');
});

it('projects seeded active AC listings for Kuya Ben on my-listings', function (): void {
    $this->seed(DealChainExecutionSeeder::class);
    $this->authenticateWithPhone('+639171111001');

    $page = inertiaGetMyListings('/my-listings')->assertOk();

    $myListings = $page->json('props.slice.myListings')
        ?? $page->json('props.myListings')
        ?? [];

    expect($myListings)->toBeArray()->toHaveCount(3);
    $titles = collect($myListings)->pluck('title')->all();
    expect($titles)->toContain('Inverter Split AC Deep Clean & Checkup')
        ->and($titles)->toContain('Split AC Capacitor Installation')
        ->and($titles)->toContain('Home Appliance Safety Audit');
});

it('redirects an owner from a private public URL to the private listing preview', function (): void {
    $this->authenticateProvider();

    $created = $this->postJson('/listings', [
        'title' => 'Private repair draft',
        'description' => 'A repair listing that has not been submitted for review.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ])->assertCreated()->json('data');

    $this->get('/listings/'.$created['id'])
        ->assertRedirect(route('listings.preview', ['listing' => $created['id']]));

    inertiaGetMyListings('/my-listings/'.$created['id'])
        ->assertOk()
        ->assertJsonPath('component', 'Listings/OwnerPreview')
        ->assertJsonPath('props.listing.id', $created['id'])
        ->assertJsonPath('props.listing.status', 'draft')
        ->assertJsonPath('props.listing.public', false);
});

it('does not disclose another owners listing through the private preview', function (): void {
    $this->authenticateProvider();

    $this->get('/my-listings/'.FixtureRepository::ACTIVE_LISTING_ID)
        ->assertNotFound();
});

it('keeps submitted listings private on my-listings projection and out of browse', function (): void {
    $this->authenticateProvider();

    $this->post('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Maya Tagudin',
        'service_area_display' => 'Tagudin, Ilocos Sur',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ])->assertRedirect();

    $created = $this->postJson('/listings', [
        'title' => 'Household help draft',
        'description' => 'Reliable local help for errands and household tasks.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ])->assertCreated()->json('data');

    $this->postJson('/listings/'.$created['id'].'/submit', [
        'expected_version' => 1,
        'idempotency_key' => 'my-listings-submit-'.$created['id'],
    ])->assertOk()
        ->assertJsonPath('data.status', 'pending_review')
        ->assertJsonPath('data.review_status', 'pending');

    $mine = inertiaGetMyListings('/my-listings')->assertOk();
    $myListings = $mine->json('props.slice.myListings') ?? $mine->json('props.myListings') ?? [];
    $owned = collect($myListings)->first(
        static fn (array $row): bool => ($row['id'] ?? null) === $created['id'],
    );

    expect($owned)->toBeArray()
        ->and($owned['status'] ?? null)->toBe('pending_review')
        ->and($owned['review_status'] ?? null)->toBe('pending');

    $browse = inertiaGetMyListings('/browse')->assertOk();
    $public = $browse->json('props.slice.publicListings') ?? $browse->json('props.publicListings') ?? [];

    expect(collect($public)->contains(
        static fn (array $row): bool => ($row['id'] ?? null) === $created['id'],
    ))->toBeFalse();
});
it('round trips product preparation terms over HTTP and lets the seller revise staff rejection', function (): void {
    $this->authenticateProvider();
    $this->post('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Maya Tagudin',
        'service_area_display' => 'Tagudin, Ilocos Sur',
        'category_code' => 'food',
        'listing_type' => 'product',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ])->assertRedirect();

    $owner = auth()->user();
    $created = $this->postJson('/listings', [
        'title' => 'Fresh Tagudin Rice Cakes',
        'description' => 'Freshly prepared rice cakes available for local pickup.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
        'work_catalog_code' => 'set-product-market-handoff',
        'work_set_version' => 1,
        'milestone_stages' => [
            ['id' => 'a4-prepare', 'title' => 'Sourcing and package preparation', 'description' => 'Pack the product.', 'step' => 1],
            ['id' => 'a4-handoff', 'title' => 'Handoff and recipient confirmation', 'description' => 'Confirm pickup.', 'step' => 2],
            ['id' => 'a4-close', 'title' => 'Condition close-out', 'description' => 'Record condition.', 'step' => 3],
        ],
        'prep_lead_time' => 'same_day',
        'variants' => [['id' => 'rice-cake-plain', 'name' => 'Plain', 'price' => 120, 'stock' => 8, 'is_default' => true]],
        'media' => ['items' => [['id' => 'rice-cover', 'kind' => 'photo', 'url' => '/rice-cake.jpg', 'is_cover' => true]]],
        'deal_chain_combinations' => [['id' => 'pickup', 'title' => 'Pickup', 'isDefault' => true]],
        'deal_chain_specification' => ['based_on_recipe_code' => 'direct'],
    ])->assertCreated()->json('data');

    expect($created['prep_lead_time'])->toBe('same_day')
        ->and($created['work_specification']['based_on_set_code'] ?? null)->toBe('set-product-market-handoff');

    $submitted = $this->postJson('/listings/'.$created['id'].'/submit', [
        'expected_version' => $created['version'],
        'idempotency_key' => 'seller-review-'.$created['id'],
    ])->assertOk()->json('data');

    $staff = User::factory()->create([
        'status' => 'active',
        'primary_access_tier' => 'L4',
    ]);
    $this->actingAs($staff)
        ->post(route('admin.listings.reject', $created['id']), [
            'expected_version' => $submitted['version'],
            'reason' => 'Clarify product packaging.',
        ])
        ->assertRedirect(route('admin.listings.index'));

    $this->actingAs($owner)
        ->patchJson('/listings/'.$created['id'], [
            'expected_version' => $submitted['version'] + 1,
            'title' => 'Fresh Tagudin Rice Cakes Revised',
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Fresh Tagudin Rice Cakes Revised')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.review_status', 'not_required')
        ->assertJsonPath('data.prep_lead_time', 'same_day')
        ->assertJsonPath('data.variants.0.id', 'rice-cake-plain')
        ->assertJsonPath('data.media.items.0.id', 'rice-cover')
        ->assertJsonPath('data.deal_chain_specification.based_on_recipe_code', 'direct');
});
it('supports seller pause resume and archive actions with version checks', function (): void {
    $this->authenticateProvider();
    $this->post('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Maya Tagudin',
        'service_area_display' => 'Tagudin, Ilocos Sur',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ])->assertRedirect();

    $owner = auth()->user();
    $created = $this->postJson('/listings', [
        'title' => 'Tagudin household errand service',
        'description' => 'Reliable local help for errands and household tasks.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ])->assertCreated()->json('data');
    $submitted = $this->postJson('/listings/'.$created['id'].'/submit', [
        'expected_version' => $created['version'],
        'idempotency_key' => 'lifecycle-submit-'.$created['id'],
    ])->assertOk()->json('data');

    $staff = User::factory()->create([
        'status' => 'active',
        'primary_access_tier' => 'L4',
    ]);
    $this->actingAs($staff)
        ->post(route('admin.listings.approve', $created['id']), [
            'expected_version' => $submitted['version'],
        ])
        ->assertRedirect(route('admin.listings.index'));

    $approvedVersion = $submitted['version'] + 1;
    $this->actingAs($owner)->postJson('/listings/'.$created['id'].'/pause', [
        'expected_version' => $approvedVersion,
    ])->assertOk()
        ->assertJsonPath('data.status', 'paused');

    $this->postJson('/listings/'.$created['id'].'/resume', [
        'expected_version' => $approvedVersion + 1,
    ])->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->postJson('/listings/'.$created['id'].'/archive', [
        'expected_version' => $approvedVersion + 2,
    ])->assertOk()
        ->assertJsonPath('data.status', 'archived');
});

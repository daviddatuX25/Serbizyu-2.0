<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
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

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Orders hub index tests require PostgreSQL.');
    }
});

it('requires authentication to access the orders hub', function (): void {
    $this->get('/orders')->assertRedirect('/auth/sign-in');
});

it('renders a proposed order in the authenticated buyer active bucket', function (): void {
    $buyer = User::factory()->create();
    $provider = User::factory()->create();
    $correlationId = (string) Str::uuid7();

    $actor = new ResourceActor($provider->id, $provider->id);
    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Tagudin fan repair',
        'description' => 'Test listing for orders hub index test.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
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
            'price_amount_minor' => 15000,
            'currency' => 'PHP',
            'published_at' => now(),
            'updated_at' => now(),
        ]);
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $buyer->id,
        listingId: (string) $listing['id'],
        expectedListingVersion: (int) $listing['version'],
        idempotencyKey: 'test-order-hub-'.Str::random(10),
        correlationId: $correlationId,
        input: [
            'amount_minor' => 15000,
            'currency' => 'PHP',
            'quantity' => 1,
        ],
    );

    // Inertia header request
    $manifestPath = public_path('build/manifest.json');
    $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';

    $response = $this->actingAs($buyer)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => $version,
        ])
        ->get('/orders')
        ->assertOk();

    $response->assertJsonPath('component', 'Orders/Index');
    expect($response->json('props.counts.active'))->toBeGreaterThanOrEqual(1);
    expect($response->json('props.counts.done'))->toBeGreaterThanOrEqual(0);

    $active = collect($response->json('props.active'));
    $matched = $active->firstWhere('id', $proposed['order_id']);
    expect($matched)->not->toBeNull()
        ->and($matched['order_status'])->toBe('proposed')
        ->and($matched['role'])->toBe('buyer')
        ->and($matched['amount_minor'])->toBe(15000)
        ->and($matched['currency'])->toBe('PHP');
});

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\PaymentObligations\Application\OrderPaymentObligationAdapter;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;

uses(DatabaseTransactions::class, CreatesAcceptedWorkOrder::class);

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
        ->and($matched['next_action'])->toBeNull()
        ->and($matched['waiting_on'])->toBe('provider')
        ->and($matched['amount_minor'])->toBe(15000)
        ->and($matched['currency'])->toBe('PHP');
    $providerResponse = $this->actingAs($provider)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => $version,
        ])
        ->get('/orders')
        ->assertOk();
    $providerItem = collect($providerResponse->json('props.needsAction'))->firstWhere('id', $proposed['order_id']);
    expect($providerItem)->not->toBeNull()
        ->and($providerItem['next_action'])->toBe('Respond to order proposal');
});

it('shows the due cash reporting action to the payer', function (): void {
    $fixture = $this->createAcceptedWorkOrder('A1', []);
    $obligation = DB::table('payment_obligations')->where('order_id', $fixture['order_id'])->firstOrFail();
    app(OrderPaymentObligationAdapter::class)->markDueFromWorkFact($fixture['order_id'], $obligation->work_instance_id, (string) Str::uuid7());

    $manifestPath = public_path('build/manifest.json');
    $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
    $response = $this->actingAs($fixture['buyer'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => $version,
    ])->get('/orders')->assertOk();
    $item = collect($response->json('props.needsAction'))->firstWhere('id', $fixture['order_id']);

    expect($item)->not->toBeNull()
        ->and($item['next_action'])->toBe('Report cash payment');
});

it('shows the cash acknowledgement action to the recipient', function (): void {
    $fixture = $this->createAcceptedWorkOrder('A1', []);
    $obligation = DB::table('payment_obligations')->where('order_id', $fixture['order_id'])->firstOrFail();
    $payments = app(OrderPaymentObligationAdapter::class);
    $payments->markDueFromWorkFact($fixture['order_id'], $obligation->work_instance_id, (string) Str::uuid7());
    $payments->reportCashPayment($fixture['order_id'], $obligation->id, $fixture['buyer']->id, (string) Str::uuid7(), 'queue-cash-'.Str::random(10));
    DB::table('orders')->where('id', $fixture['order_id'])->update(['status' => 'completed']);

    $manifestPath = public_path('build/manifest.json');
    $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
    $response = $this->actingAs($fixture['provider'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => $version,
    ])->get('/orders')->assertOk();
    $item = collect($response->json('props.needsAction'))->firstWhere('id', $fixture['order_id']);

    expect($item)->not->toBeNull()
        ->and($item['next_action'])->toBe('Acknowledge cash receipt');

    $payerResponse = $this->actingAs($fixture['buyer'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => $version,
    ])->get('/orders')->assertOk();
    $payerItem = collect($payerResponse->json('props.active'))->firstWhere('id', $fixture['order_id']);
    expect($payerItem)->not->toBeNull()
        ->and($payerItem['waiting_on'])->toBe('payment recipient');
});

it('shows the provider action for an active customer-confirmation node', function (): void {
    $fixture = $this->createAcceptedWorkOrder('A1', [[
        'id' => 'customer-intake',
        'title' => 'Confirm customer intake',
        'control_mode' => 'customer_confirm',
        'approval_method' => 'app_confirm',
        'required_proofs' => [],
    ]]);

    $manifestPath = public_path('build/manifest.json');
    $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
    $response = $this->actingAs($fixture['provider'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => $version,
    ])->get('/orders')->assertOk();
    $item = collect($response->json('props.needsAction'))->firstWhere('id', $fixture['order_id']);

    expect($item)->not->toBeNull()
        ->and($item['next_action'])->toBe('Request customer confirmation');
});

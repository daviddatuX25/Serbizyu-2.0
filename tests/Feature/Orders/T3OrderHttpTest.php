<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
function t3HttpActiveListingFor(User $provider, string $listingType = 'service'): array
{
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor($provider->id, $provider->id);
    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'HTTP bookable Tagudin listing',
        'description' => 'Listing used to confirm the direct booking HTTP path.',
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

it('books from listing detail and accepts only through the counterparty action', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);

    $this->authenticateBuyer();

    $start = $this->get(route('orders.start', $fx['listing_id']));
    $start->assertRedirect();

    $orderId = (string) DB::table('orders')
        ->where('listing_id', $fx['listing_id'])
        ->where('status', 'proposed')
        ->value('id');

    expect($orderId)->not->toBe('')
        ->and($start->headers->get('Location'))->toEndWith('/orders/'.$orderId);

    t3InertiaGet(route('orders.show', $orderId))
        ->assertOk()
        ->assertJsonPath('component', 'Orders/Show')
        ->assertJsonPath('props.order.id', $orderId)
        ->assertJsonPath('props.order.status', 'proposed')
        ->assertJsonPath('props.order.can_accept', false)
        ->assertJsonPath('props.work', null)
        ->assertJsonPath('props.obligation', null)
        ->assertJsonPath('props.financials.label', 'Order terms');

    $version = (int) DB::table('orders')->where('id', $orderId)->value('version');

    $this->actingAs($provider)->post(route('orders.accept', $orderId), [
        'expected_order_version' => $version,
        'idempotency_key' => 'http-accept-'.$orderId,
    ])->assertRedirect(route('orders.show', $orderId));

    expect(DB::table('orders')->where('id', $orderId)->value('status'))->toBe('accepted')
        ->and(DB::table('order_terms_snapshots')->where('order_id', $orderId)->count())->toBe(1)
        ->and(DB::table('work_instances')->where('order_id', $orderId)->where('status', 'not_started')->count())->toBe(1)
        ->and(DB::table('payment_obligations')->where('order_id', $orderId)->where('lane', 'external_cash')->count())->toBe(1);
    $currentVersion = (int) DB::table('listings')->where('id', $fx['listing_id'])->value('current_version');
    $versionRow = DB::table('listing_versions')
        ->where('listing_id', $fx['listing_id'])
        ->where('version_number', $currentVersion)
        ->first();
    $newTerms = json_decode((string) $versionRow->terms, true) ?: [];
    $newTerms['title'] = 'Changed mutable listing title';
    $newVersion = $currentVersion + 1;
    DB::table('listing_versions')->insert([
        'id' => (string) Str::uuid7(),
        'listing_id' => $fx['listing_id'],
        'version_number' => $newVersion,
        'description' => 'Changed after acceptance',
        'terms' => json_encode($newTerms, JSON_THROW_ON_ERROR),
        'price_amount_minor' => $versionRow->price_amount_minor,
        'currency' => $versionRow->currency,
        'payment_lane_availability' => $versionRow->payment_lane_availability,
        'availability_capacity_summary' => $versionRow->availability_capacity_summary,
        'safety_copy' => $versionRow->safety_copy,
        'effective_from' => now(),
        'effective_to' => null,
        'authored_by_user_id' => $provider->id,
        'payload_version' => 1,
        'version' => 1,
        'correlation_id' => $fx['correlation_id'],
        'published_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
        'category_id' => $versionRow->category_id,
        'category_business_version' => $versionRow->category_business_version,
        'capability_profile_family_code' => $versionRow->capability_profile_family_code,
        'capability_profile_business_version' => $versionRow->capability_profile_business_version,
        'row_version' => 1,
    ]);
    DB::table('listings')->where('id', $fx['listing_id'])->update([
        'current_version' => $newVersion,
        'version' => $newVersion,
        'updated_at' => now(),
    ]);

    t3InertiaGet(route('orders.show', $orderId))
        ->assertOk()
        ->assertJsonPath('component', 'Orders/Show')
        ->assertJsonPath('props.order.status', 'accepted')
        ->assertJsonPath('props.order.can_accept', false)
        ->assertJsonPath('props.work.status', 'not_started')
        ->assertJsonPath('props.obligation.lane', 'external_cash')
        ->assertJsonPath('props.order.listing_title', 'HTTP bookable Tagudin listing');
    $index = t3InertiaGet(route('orders.index'))->assertOk()->assertJsonPath('component', 'Orders/Index');
    expect(collect($index->json('props.active'))->firstWhere('id', $orderId)['title'])
        ->toBe('HTTP bookable Tagudin listing');
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
        ->assertJsonPath('props.booking.start_url', route('orders.start', $fx['listing_id']))
        ->assertJsonPath('props.activeListingDetail.listing_version_id', (string) DB::table('listing_versions')->where('listing_id', $fx['listing_id'])->where('version_number', $fx['expected_version'])->value('id'));
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
it('books the selected authored package at its server price with the requested quantity and listing version', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);
    $version = DB::table('listing_versions')
        ->where('listing_id', $fx['listing_id'])
        ->where('version_number', $fx['expected_version'])
        ->first();
    $terms = json_decode((string) $version->terms, true) ?: [];
    $terms['package_tiers'] = [
        ['id' => 'scope-basic', 'title' => 'Basic scope', 'price' => 120, 'is_default' => true],
        ['id' => 'scope-plus', 'title' => 'Plus scope', 'price' => 275, 'is_default' => false],
    ];
    $terms['addons'] = [[
        'id' => 'addon-rush',
        'code' => 'rush_priority',
        'title' => 'Rush scheduling',
        'description' => '',
        'price_amount_minor' => 5000,
        'currency' => 'PHP',
        'partner_role' => 'technician',
        'partner_fixture_keys' => [],
        'status' => 'available',
        'settlement_mode' => 'independent_provider_agreement',
    ]];
    DB::table('listing_versions')->where('id', $version->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);

    $this->authenticateBuyer();
    $query = http_build_query([
        'package_id' => 'scope-plus',
        'quantity' => 3,
        'listing_version_id' => (string) $version->id,
        'addon_ids' => ['addon-rush'],
    ]);
    $start = $this->get(route('orders.start', $fx['listing_id']).'?'.$query);
    $start->assertRedirect();

    $orderId = (string) DB::table('orders')->where('listing_id', $fx['listing_id'])->value('id');
    $proposal = json_decode((string) DB::table('order_parties')->where('order_id', $orderId)->where('party_type', 'buyer')->value('scope'), true)['proposal'];

    expect($proposal)->toMatchArray([
        'amount_minor' => 97500,
        'unit_amount_minor' => 32500,
        'package_id' => 'scope-plus',
        'variant_id' => null,
        'addon_ids' => ['addon-rush'],
        'quantity' => 3,
        'listing_version_id' => (string) $version->id,
    ]);
    $this->actingAs($provider)->post(route('orders.accept', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'http-accept-addon-'.$orderId,
    ])->assertRedirect(route('orders.show', $orderId));
    $snapshot = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
    expect((int) $snapshot->amount_minor)->toBe(97500)
        ->and(json_decode((string) $snapshot->scope, true))->toMatchArray([
            'quantity' => 3,
            'package_id' => 'scope-plus',
            'addon_ids' => ['addon-rush'],
        ])
        ->and((int) DB::table('payment_obligations')->where('order_id', $orderId)->value('amount_minor'))->toBe(97500);
});
it('validates and books the selected non-default variant at its server price with quantity total', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider, 'product');
    $version = DB::table('listing_versions')
        ->where('listing_id', $fx['listing_id'])
        ->where('version_number', $fx['expected_version'])
        ->first();
    $terms = json_decode((string) $version->terms, true) ?: [];
    $terms['variants'] = [
        ['id' => 'variant-default', 'name' => 'Default', 'price_amount_minor' => 12000, 'is_default' => true],
        ['id' => 'variant-blue', 'name' => 'Blue', 'price_amount_minor' => 18400, 'is_default' => false],
    ];
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);
    app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing_id'],
        listingVersionId: (string) $version->id,
        capacityType: 'quantity',
        quantity: 4,
        correlationId: $fx['correlation_id'],
        resourceKey: 'variant-blue',
    );

    $this->authenticateBuyer();

    $response = $this->postJson(route('orders.propose', $fx['listing_id']), [
        'expected_listing_version' => $fx['expected_version'],
        'idempotency_key' => 'http-variant-'.Str::random(16),
        'listing_version_id' => (string) $version->id,
        'variant_id' => 'variant-blue',
        'quantity' => 2,
        'amount_minor' => 1,
        'currency' => 'USD',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.amount_minor', 36800)
        ->assertJsonPath('data.unit_amount_minor', 18400)
        ->assertJsonPath('data.variant_id', 'variant-blue')
        ->assertJsonPath('data.package_id', null)
        ->assertJsonPath('data.listing_version_id', (string) $version->id)
        ->assertJsonPath('data.resource_key', 'variant-blue');
    $reservation = DB::table('listing_capacity_reservations')->where('id', $response->json('data.capacity_reservation_id'))->first();
    $holdMovement = DB::table('stock_movements')->where('reservation_id', $reservation->id)->where('movement_type', 'hold')->first();
    expect($reservation->status)->toBe('held')
        ->and((int) $holdMovement->delta_on_hand)->toBe(0)
        ->and((int) $holdMovement->delta_held)->toBe(2);

    $orderId = (string) $response->json('data.order_id');
    $proposal = json_decode((string) DB::table('order_parties')
        ->where('order_id', $orderId)
        ->where('party_type', 'buyer')
        ->value('scope'), true)['proposal'];
    expect($proposal)->toMatchArray([
        'variant_id' => 'variant-blue',
        'listing_version_id' => (string) $version->id,
        'quantity' => 2,
        'unit_amount_minor' => 18400,
        'amount_minor' => 36800,
    ]);
});

it('rejects a stale listing version at the booking entry point', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider);
    $this->authenticateBuyer();

    $this->get(route('orders.start', $fx['listing_id']).'?listing_version_id='.Str::uuid7())
        ->assertSessionHas('errors');
    expect(DB::table('orders')->where('listing_id', $fx['listing_id'])->count())->toBe(0);
});

it('fulfills A4 stock once at verified custody departure and records recipient receipt without settling payment', function (): void {
    t3HttpPgsqlOrSkip();

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider, 'product');
    $version = DB::table('listing_versions')->where('listing_id', $fx['listing_id'])->where('version_number', $fx['expected_version'])->first();
    $terms = json_decode((string) $version->terms, true) ?: [];
    $terms['variants'] = [['id' => 'a4-variant', 'name' => 'Physical item', 'price_amount_minor' => 5000, 'is_default' => true]];
    DB::table('listing_versions')->where('id', $version->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    app(CapacityReservationService::class)->ensureBucket(
        listingId: $fx['listing_id'],
        listingVersionId: (string) $version->id,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $fx['correlation_id'],
        resourceKey: 'a4-variant',
    );

    $this->authenticateBuyer();
    $buyerId = (string) auth()->id();
    $proposalResponse = $this->postJson(route('orders.propose', $fx['listing_id']), [
        'expected_listing_version' => $fx['expected_version'],
        'idempotency_key' => 'a4-proposal-'.$fx['listing_id'],
        'listing_version_id' => (string) $version->id,
        'variant_id' => 'a4-variant',
        'quantity' => 2,
        'amount_minor' => 1,
        'currency' => 'PHP',
    ])->assertCreated();
    $orderId = (string) $proposalResponse->json('data.order_id');
    expect(json_decode((string) DB::table('order_proposals')->where('order_id', $orderId)->value('scope'), true)['listing_type'])->toBe('product');
    $reservationId = (string) $proposalResponse->json('data.capacity_reservation_id');
    $this->actingAs($provider)->postJson(route('orders.counter', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'a4-counter-type-change-'.$orderId,
        'amount_minor' => 10000,
        'currency' => 'PHP',
        'scope' => ['listing_type' => 'service'],
    ])->assertStatus(409)->assertJsonPath('code', 'SCOPE_CHANGE_REQUIRES_REPROPOSAL');
    expect(json_decode((string) DB::table('order_proposals')->where('order_id', $orderId)->value('scope'), true)['listing_type'])->toBe('product');

    $this->actingAs($provider)->post(route('orders.accept', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'a4-accept-'.$orderId,
    ])->assertRedirect(route('orders.show', $orderId));
    $termsSnapshotId = (string) DB::table('orders')->where('id', $orderId)->value('current_terms_snapshot_id');
    $acceptedScope = json_decode((string) DB::table('order_terms_snapshots')->where('id', $termsSnapshotId)->value('scope'), true);
    $unknownScope = $acceptedScope;
    unset($unknownScope['listing_type']);
    DB::table('order_terms_snapshots')->where('id', $termsSnapshotId)->update(['scope' => json_encode($unknownScope, JSON_THROW_ON_ERROR)]);
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => (string) Str::uuid7(),
        'expected_order_version' => 2,
        'idempotency_key' => 'a4-unknown-listing-type-'.$orderId,
    ])->assertStatus(409)->assertJsonPath('code', 'INVALID_ORDER_TERMS');
    DB::table('order_terms_snapshots')->where('id', $termsSnapshotId)->update(['scope' => json_encode($acceptedScope, JSON_THROW_ON_ERROR)]);
    $this->actingAs($provider)->postJson(route('orders.work-nodes.advance', [$orderId, 'a4-workaround']), [
        'action' => 'complete_step',
    ])->assertStatus(409)->assertJsonPath('code', 'HANDOFF_PROTOCOL_REQUIRED');
    $this->actingAs(User::query()->findOrFail($buyerId))->postJson(route('orders.work.signoff', $orderId))->assertStatus(409);
    expect((string) DB::table('work_instances')->where('order_id', $orderId)->value('status'))->toBe('not_started')
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('accepted');

    $work = DB::table('work_instances')->where('order_id', $orderId)->first();
    $evidenceId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    DB::table('evidence_files')->insert([
        'id' => $evidenceId,
        'owner_user_id' => $provider->id,
        'storage_key' => 'evidence/work/'.$work->id.'/a4-test.jpg',
        'media_type' => 'image/jpeg',
        'size_bytes' => 64,
        'content_hash' => hash('sha256', 'a4 clean test evidence'),
        'evidence_type' => 'work_node_photo_proof',
        'data_class' => 'WORK_EXECUTION',
        'scan_status' => 'clean',
        'visibility' => 'order_parties',
        'retention_policy' => 'order_dispute_window',
        'deleted_at' => null,
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('work_events')->insert([
        'id' => (string) Str::uuid7(),
        'work_instance_id' => $work->id,
        'previous_status' => 'not_started',
        'new_status' => 'not_started',
        'event_type' => 'work.evidence.uploaded',
        'event_version' => 1,
        'actor_user_id' => $provider->id,
        'evidence_file_id' => $evidenceId,
        'payload' => json_encode(['node_id' => 'a4-prepare', 'tool_key' => 'photo_proof', 'scan_status' => 'clean'], JSON_THROW_ON_ERROR),
        'payload_version' => 1,
        'idempotency_key' => 'a4-proof-'.$work->id,
        'correlation_id' => $correlationId,
        'occurred_at' => now(),
        'effective_at' => now(),
        'created_at' => now(),
    ]);

    $outsider = User::factory()->create();
    $this->actingAs($outsider)->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => $evidenceId,
        'expected_order_version' => 2,
        'idempotency_key' => 'a4-outsider-'.$orderId,
    ])->assertForbidden();
    expect(DB::table('order_handoff_transfers')->where('order_id', $orderId)->exists())->toBeFalse()
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('accepted');

    DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'quarantined']);
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => $evidenceId,
        'expected_order_version' => 2,
        'idempotency_key' => 'a4-quarantined-'.$orderId,
    ])->assertUnprocessable();
    expect(DB::table('order_handoff_transfers')->where('order_id', $orderId)->exists())->toBeFalse();
    DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'clean']);

    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => $evidenceId,
        'expected_order_version' => 2,
        'idempotency_key' => 'a4-prepared-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'prepared');
    $transferId = (string) DB::table('order_handoff_transfers')->where('order_id', $orderId)->value('id');

    $courier = User::factory()->create();
    DB::table('order_parties')->insert([
        'id' => (string) Str::uuid7(),
        'order_id' => $orderId,
        'user_id' => $courier->id,
        'party_type' => 'courier',
        'responsibility' => 'delivery',
        'scope' => json_encode([], JSON_THROW_ON_ERROR),
        'consent_grant_id' => null,
        'status' => 'active',
        'effective_at' => now(),
        'ended_at' => null,
        'correlation_id' => $correlationId,
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $projectedCouriers = t3InertiaGet(route('orders.show', $orderId))
        ->assertOk()
        ->json('props.a4Handoff.couriers');
    expect(collect($projectedCouriers)->pluck('id')->all())->toBe([(string) $courier->id]);
    $this->actingAs($provider)->postJson(route('orders.handoff.custody', $orderId), [
        'transfer_mode' => 'courier_delivery',
        'courier_user_id' => $outsider->id,
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-invalid-offer-'.$orderId,
    ])->assertForbidden();
    expect((string) DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('prepared');

    $this->actingAs($provider)->postJson(route('orders.handoff.custody', $orderId), [
        'transfer_mode' => 'courier_delivery',
        'courier_user_id' => $courier->id,
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-offer-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'offered');

    $bucket = DB::table('listing_capacity')->where('id', DB::table('listing_capacity_reservations')->where('id', $reservationId)->value('listing_capacity_id'))->first();
    expect((int) $bucket->quantity)->toBe(5);
    $this->actingAs(User::query()->findOrFail($buyerId))->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 2,
        'idempotency_key' => 'a4-wrong-recipient-'.$orderId,
    ])->assertForbidden();
    $this->actingAs($courier)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-stale-version-'.$orderId,
    ])->assertStatus(409);
    DB::table('order_proposals')->where('order_id', $orderId)->where('status', 'accepted')->update(['capacity_reservation_id' => null]);
    $this->actingAs($courier)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 2,
        'idempotency_key' => 'a4-missing-reservation-'.$orderId,
    ])->assertStatus(409);
    expect((string) DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('offered')
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(0);
    DB::table('order_proposals')->where('order_id', $orderId)->where('status', 'accepted')->update(['capacity_reservation_id' => $reservationId]);
    DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'quarantined']);
    $this->actingAs($courier)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 2,
        'idempotency_key' => 'a4-quarantined-departure-'.$orderId,
    ])->assertUnprocessable();
    expect((string) DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('offered')
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(0);
    DB::table('evidence_files')->where('id', $evidenceId)->update(['scan_status' => 'clean']);

    $acceptPayload = [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 2,
        'idempotency_key' => 'a4-depart-'.$orderId,
    ];
    $this->actingAs($courier)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $acceptPayload)->assertOk()->assertJsonPath('data.status', 'departed');
    expect(DB::table('outbox_messages')->where('event_type', 'work.delivered_to_site')->where('aggregate_id', $work->id)->count())->toBe(0);
    $this->actingAs($courier)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $acceptPayload)->assertOk()->assertJsonPath('data.replay', true);

    expect((int) DB::table('listing_capacity')->where('id', $bucket->id)->value('quantity'))->toBe(3)
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1);
    $this->actingAs($outsider)->postJson(route('orders.handoff.receipt', $orderId), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 3,
        'idempotency_key' => 'a4-outsider-receipt-'.$orderId,
    ])->assertForbidden();
    expect((string) DB::table('order_handoff_transfers')->where('order_id', $orderId)->value('status'))->toBe('departed')
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('in_progress')
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1);

    $this->actingAs(User::query()->findOrFail($buyerId))->postJson(route('orders.handoff.receipt', $orderId), [
        'evidence_file_id' => $evidenceId,
        'expected_transfer_version' => 3,
        'idempotency_key' => 'a4-receipt-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'received');

    $auditActions = DB::table('audit_events')->where('order_id', $orderId)->pluck('action')->all();
    expect((int) DB::table('listing_capacity')->where('id', $bucket->id)->value('quantity'))->toBe(3)
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1)
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('completed')
        ->and((string) DB::table('payment_obligations')->where('order_id', $orderId)->value('status'))->toBe('due')
        ->and(DB::table('payment_obligations')->where('order_id', $orderId)->value('settled_at'))->toBeNull()
        ->and(DB::table('outbox_messages')->where('event_type', 'work.ready_for_collection')->where('aggregate_id', $work->id)->count())->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'work.delivered_to_site')->where('aggregate_id', $work->id)->count())->toBe(1)
        ->and(DB::table('outbox_messages')->where('event_type', 'work.completed')->where('aggregate_id', $work->id)->count())->toBe(1);
    expect($auditActions)->toContain('order.handoff.prepared', 'order.handoff.custody_offer', 'order.handoff.custody_departure', 'order.handoff.receipt');
});

it('completes a courier-service A1 order through provider Work actions and customer signoff without stock fulfillment', function (): void {
    t3HttpPgsqlOrSkip();
    Storage::fake('private');

    $provider = User::factory()->create();
    $fx = t3HttpActiveListingFor($provider, 'service');
    $version = DB::table('listing_versions')->where('listing_id', $fx['listing_id'])->where('version_number', $fx['expected_version'])->first();

    $this->authenticateBuyer();
    $buyerId = (string) auth()->id();
    $proposal = $this->postJson(route('orders.propose', $fx['listing_id']), [
        'expected_listing_version' => $fx['expected_version'],
        'listing_version_id' => (string) $version->id,
        'quantity' => 1,
        'idempotency_key' => 'courier-a1-proposal-'.$fx['listing_id'],
        'amount_minor' => 1,
        'currency' => 'PHP',
    ])->assertCreated();
    $orderId = (string) $proposal->json('data.order_id');
    $proposalScope = json_decode((string) DB::table('order_proposals')->where('order_id', $orderId)->value('scope'), true);
    expect($proposalScope['listing_type'])->toBe('service')
        ->and($proposal->json('data.capacity_reservation_id'))->toBeNull();

    $this->actingAs($provider)->post(route('orders.accept', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'courier-a1-accept-'.$orderId,
    ])->assertRedirect(route('orders.show', $orderId));
    $work = DB::table('work_instances')->where('order_id', $orderId)->firstOrFail();
    expect($work->work_shape)->toBe('A1');
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    $nodes = $structure['nodes'];
    $intake = $nodes[0];
    $execution = $nodes[1];
    $final = $nodes[2];

    $this->actingAs($provider)->postJson(route('orders.work-nodes.advance', [$orderId, $intake['id']]), [
        'action' => 'request_confirmation',
        'payload' => ['notes' => 'Confirm courier pickup and delivery point.'],
    ])->assertOk();
    $this->actingAs(User::query()->findOrFail($buyerId))->postJson(route('orders.work-nodes.advance', [$orderId, $intake['id']]), [
        'action' => 'confirm_gate',
        'payload' => [],
    ])->assertOk();

    $photoBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($photoBytes)->toBeString();
    $upload = $this->actingAs($provider)->post(route('orders.work-evidence.store', [
        'order' => $orderId,
        'node' => $execution['id'],
    ]), [
        'file' => UploadedFile::fake()->createWithContent('courier-proof.png', $photoBytes),
        'tool_key' => 'photo_proof',
    ])->assertCreated();
    $evidenceId = (string) $upload->json('data.id');
    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
    expect(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('clean');

    $this->actingAs($provider)->postJson(route('orders.work-nodes.advance', [$orderId, $execution['id']]), [
        'action' => 'complete_step',
        'payload' => ['evidence_file_ids' => [$evidenceId]],
    ])->assertOk();
    $this->actingAs($provider)->post(route('orders.work.propose-completion', $orderId), [
        'payload' => [],
    ])->assertRedirect();
    expect($final['node_kind'])->toBe('final_signoff');

    $this->actingAs(User::query()->findOrFail($buyerId))->post(route('orders.work.signoff', $orderId))
        ->assertRedirect();
    expect((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('completed')
        ->and((string) DB::table('work_instances')->where('id', $work->id)->value('status'))->toBe('completed')
        ->and((string) DB::table('payment_obligations')->where('order_id', $orderId)->value('status'))->toBe('due')
        ->and(DB::table('payment_obligations')->where('order_id', $orderId)->value('settled_at'))->toBeNull()
        ->and(DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(0)
        ->and(DB::table('order_handoff_transfers')->where('order_id', $orderId)->exists())->toBeFalse();
});

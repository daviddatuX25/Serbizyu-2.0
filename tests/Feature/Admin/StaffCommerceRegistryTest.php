<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Shared\Application\ResourceActor;
use App\Shared\Application\PublicReferenceAllocator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('filters persisted orders and payments independently and reports external-cash totals from the filtered population', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $orderId = (string) Str::uuid7();
    $orderReference = app(PublicReferenceAllocator::class)->allocate('orders');
    DB::table('orders')->insert([
        'id' => $orderId,
        'public_reference' => $orderReference,
        'origin' => 'direct',
        'mechanism' => 'request_quote',
        'status' => 'accepted',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $cashId = (string) Str::uuid7();
    $usdCashId = (string) Str::uuid7();
    $protectedId = (string) Str::uuid7();
    do {
        $cashReferenceStem = 'OBL-'.str_pad((string) random_int(0, 9_999_999), 7, '0', STR_PAD_LEFT);
    } while (DB::table('payment_obligations')->where('public_reference', 'like', $cashReferenceStem.'%')->exists());
    $cashReference = $cashReferenceStem.'0';
    foreach ([
        [$cashId, $cashReference, 'due', 'external_cash', 12500, 'PHP', now()->subMinute()],
        [$protectedId, app(PublicReferenceAllocator::class)->allocate('payment_obligations'), 'due', 'protected_digital', 7000, 'PHP', now()],
        [$usdCashId, $cashReferenceStem.'1', 'due', 'external_cash', 500, 'USD', now()->subMinutes(2)],
    ] as [$id, $reference, $status, $lane, $amount, $currency, $createdAt]) {
        DB::table('payment_obligations')->insert([
            'id' => $id,
            'public_reference' => $reference,
            'order_id' => $orderId,
            'purpose' => 'primary_consideration',
            'amount_minor' => $amount,
            'currency' => $currency,
            'lane' => $lane,
            'status' => $status,
            'due_condition' => 'on_work_acceptance',
            'platform_fee_amount_minor' => 0,
            'processor_cost_amount_minor' => 0,
            'due_at' => $createdAt,
            'settled_at' => null,
            'correlation_id' => (string) Str::uuid7(),
            'version' => 1,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    $this->actingAs($staff)->get('/admin/orders?'.http_build_query(['q' => $orderReference, 'status' => 'accepted']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 1)
            ->where('registry.rows.data.0.id', $orderId)
            ->where('registry.rows.data.0.reference', $orderReference));

    $this->actingAs($staff)->get('/admin/financials?'.http_build_query(['status' => 'due', 'q' => substr($cashReference, 4, 7)]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 2)
            ->where('registry.rows.data.0.id', $cashId)
            ->where('registry.rows.data.1.id', $usdCashId)
            ->where('registry.rows.data.1.facts.1.value', '500 USD')
            ->where('registry.rows.data.0.kind', 'payment')
            ->where('registry.metrics.obligation_count', 2)
            ->where('registry.metrics.external_cash_gmv_minor', null)
            ->where('registry.metrics.external_cash_gmv_currency', 'mixed')
            ->where('registry.metrics.platform_fee_minor', 0)
            ->where('registry.rows.data.0.facts.3.value', '0 PHP')
            ->where('registry.rows.data.0.facts.4.value', 'Non-custodial; external cash is not platform revenue'));
    $this->actingAs($staff)->get('/admin/financials?'.http_build_query(['status' => 'due', 'q' => $cashReference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 1)
            ->where('registry.rows.data.0.id', $cashId)
            ->where('registry.metrics.obligation_count', 1)
            ->where('registry.metrics.external_cash_gmv_minor', 12500)
            ->where('registry.metrics.external_cash_gmv_currency', 'PHP'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $orderId]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.id', $orderId)
            ->where('workspace.kind', 'order')
            ->where('workspace.rails.payment.state', 'due')
            ->where('workspace.rails.payment.facts.0.value', '7000 PHP')
            ->where('workspace.rails.payment.facts.1.value', 'protected_digital'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $orderReference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('workspace.id', $orderId)->where('workspace.reference', $orderReference));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $cashId]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.id', $cashId)
            ->where('workspace.kind', 'payment')
            ->where('workspace.rails.payment.state', 'due'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $cashReference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('workspace.id', $cashId)->where('workspace.reference', $cashReference));
});

it('lists persisted request and quote rows and resolves their UUIDs in the universal workspace', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $requester = User::factory()->create();
    $provider = User::factory()->create();
    $requestId = (string) Str::uuid7();
    $quoteId = (string) Str::uuid7();
    $description = 'registry-request-'.(string) Str::uuid7();
    $now = now();

    DB::table('requests')->insert([
        'id' => $requestId,
        'requester_user_id' => $requester->id,
        'description' => $description,
        'status' => 'published',
        'version' => 1,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('quotes')->insert([
        'id' => $quoteId,
        'request_id' => $requestId,
        'provider_user_id' => $provider->id,
        'quote_version' => 1,
        'amount_minor' => 8400,
        'currency' => 'PHP',
        'scope' => json_encode(['summary' => 'Actual quoted work']),
        'expires_at' => $now->copy()->addDay(),
        'work_shape' => 'service',
        'payment_lane_options' => json_encode(['external_cash']),
        'status' => 'submitted',
        'version' => 1,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $this->actingAs($staff)->get('/admin/tenders?'.http_build_query(['q' => $description, 'status' => 'published']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 1)
            ->where('registry.rows.data.0.id', $requestId)
            ->where('registry.rows.data.0.kind', 'request')
            ->where('registry.rows.data.0.title', $description)
            ->where('registry.metrics.record_count', 1));
    $this->actingAs($staff)->get('/admin/tenders?'.http_build_query(['q' => $quoteId, 'status' => 'submitted']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 1)
            ->where('registry.rows.data.0.id', $quoteId)
            ->where('registry.rows.data.0.kind', 'quote')
            ->where('registry.rows.data.0.summary', '8400 PHP · service'));

    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $requestId]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('workspace.id', $requestId)->where('workspace.kind', 'request'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $quoteId]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('workspace.id', $quoteId)->where('workspace.kind', 'quote'));
});

it('filters a persisted listing and resolves its exact public reference and stock bucket', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $owner = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $actor = new ResourceActor((string) $owner->id, (string) $owner->id);
    $created = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'Registry stock item',
        'description' => 'A persisted product listing with a real stock bucket.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
        'variants' => [['id' => 'registry-blue-variant', 'name' => 'Blue variant', 'price' => 14, 'stock' => 9]],
    ], $correlationId);
    app(SubmitListing::class)->handle(
        (string) $created['id'],
        $actor,
        1,
        'staff-commerce-registry-'.(string) Str::uuid7(),
        $correlationId,
    );
    $listingId = (string) $created['id'];
    DB::table('listing_daily_metrics')->insert([
        ['metric_date' => '2026-10-01', 'listing_id' => $listingId, 'impressions' => 12, 'views' => 8, 'inquiries' => 3, 'orders' => 1, 'gross_amount_minor' => 14200, 'currency' => 'PHP'],
        ['metric_date' => '2026-10-02', 'listing_id' => $listingId, 'impressions' => 2, 'views' => 1, 'inquiries' => 0, 'orders' => 0, 'gross_amount_minor' => 900, 'currency' => 'USD'],
    ]);
    $listingVersion = (int) DB::table('listings')->where('id', $listingId)->value('version');
    $this->actingAs($staff)->post(route('admin.listings.approve', $listingId), ['expected_version' => $listingVersion])
        ->assertRedirect(route('admin.listings.index'));
    $reference = (string) DB::table('listings')->where('id', $listingId)->value('public_reference');

    $this->actingAs($staff)->get('/admin/listings?'.http_build_query(['status' => 'approved', 'q' => $reference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registry.rows.meta.total', 1)
            ->where('registry.rows.data.0.id', $listingId)
            ->where('registry.rows.data.0.reference', $reference)
            ->where('registry.metrics.gross_amount_minor_PHP', 14200)
            ->where('registry.metrics.gross_amount_minor_USD', 900)
            ->where('registry.metrics.pending_review_count', 0));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $reference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.reference', $reference)
            ->where('workspace.listing_details.description', 'A persisted product listing with a real stock bucket.')
            ->where('workspace.listing_details.price_amount_minor', 1400)
            ->where('workspace.listing_details.currency', 'PHP')
            ->where('workspace.listing_details.variants.0.id', 'registry-blue-variant')
            ->where('workspace.stock.state', 'open')
            ->where('workspace.stock.facts.1.label', 'Variant registry-blue-variant on hand')
            ->where('workspace.stock.facts.1.value', '9')
            ->where('workspace.stock.facts.2.label', 'Variant registry-blue-variant available')
            ->where('workspace.stock.facts.2.value', '9'));
});


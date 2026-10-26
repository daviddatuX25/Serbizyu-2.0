<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\RespondToOrderProposal;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('shows the actual initial proposal when an order has no accepted terms', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $draft = app(CreateListingDraft::class)->handle(new ResourceActor((string) $provider->id, (string) $provider->id), [
        'title' => 'Proposal workspace listing', 'description' => 'Published source description.',
        'category_code' => 'home-help', 'listing_type' => 'service', 'work_shape' => 'A1',
    ], $correlationId);
    DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    DB::table('listing_versions')->where('listing_id', $draft['id'])->where('version_number', (int) $draft['version'])->update([
        'price_amount_minor' => 25000, 'currency' => 'PHP', 'published_at' => now(), 'updated_at' => now(),
    ]);
    $proposal = app(SubmitOrderProposal::class)->handle(buyerUserId: (string) $buyer->id, listingId: (string) $draft['id'], expectedListingVersion: (int) DB::table('listings')->where('id', $draft['id'])->value('current_version'), idempotencyKey: 'staff-proposal-order-'.Str::uuid7(), correlationId: $correlationId, input: ['amount_minor' => 32100, 'currency' => 'PHP']);
    $reference = (string) DB::table('orders')->where('id', $proposal['order_id'])->value('public_reference');

    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $reference]))
        ->assertOk()->assertInertia(fn ($page) => $page
            ->where('workspace.rails.agreement.state', 'pending_acceptance')
            ->where('workspace.rails.agreement.facts.0.value', '1')
            ->where('workspace.rails.agreement.facts.1.value', '25000 PHP'));
});

it('keeps accepted snapshot terms authoritative while an amendment is pending', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $draft = app(CreateListingDraft::class)->handle(new ResourceActor((string) $provider->id, (string) $provider->id), [
        'title' => 'Accepted proposal workspace listing', 'description' => 'Published source description.',
        'category_code' => 'home-help', 'listing_type' => 'service', 'work_shape' => 'A1',
    ], $correlationId);
    app(SubmitListing::class)->handle(listingId: (string) $draft['id'], actor: new ResourceActor((string) $provider->id, (string) $provider->id), expectedVersion: (int) $draft['version'], idempotencyKey: 'staff-accepted-listing-'.Str::uuid7(), correlationId: $correlationId);
    DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    $version = (int) DB::table('listings')->where('id', $draft['id'])->value('current_version');
    DB::table('listing_versions')->where('listing_id', $draft['id'])->where('version_number', $version)->update([
        'price_amount_minor' => 25000, 'currency' => 'PHP', 'published_at' => now(), 'updated_at' => now(),
    ]);
    $proposal = app(SubmitOrderProposal::class)->handle(buyerUserId: (string) $buyer->id, listingId: (string) $draft['id'], expectedListingVersion: (int) DB::table('listings')->where('id', $draft['id'])->value('current_version'), idempotencyKey: 'staff-accepted-order-'.Str::uuid7(), correlationId: $correlationId, input: ['amount_minor' => 32100, 'currency' => 'PHP']);
    app(FinalizeOrderAgreement::class)->handle(actorUserId: (string) $provider->id, orderId: $proposal['order_id'], expectedOrderVersion: 1, idempotencyKey: 'staff-accepted-finalize-'.Str::uuid7(), correlationId: $correlationId);
    app(RespondToOrderProposal::class)->handle(actorUserId: (string) $provider->id, orderId: $proposal['order_id'], action: 'amend', expectedOrderVersion: 2, idempotencyKey: 'staff-pending-amend-'.Str::uuid7(), correlationId: $correlationId, input: ['amount_minor' => 45600]);
    $reference = (string) DB::table('orders')->where('id', $proposal['order_id'])->value('public_reference');

    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $reference]))
        ->assertOk()->assertInertia(fn ($page) => $page
            ->where('workspace.rails.agreement.state', 'accepted')
            ->where('workspace.rails.agreement.facts.1.value', '25000 PHP'));
});

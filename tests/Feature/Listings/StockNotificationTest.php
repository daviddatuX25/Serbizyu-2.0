<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\StockLedgerService;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('notifies the stock owner to resolve a short recount and affected buyers only update links to their own Orders', function (): void {
    app(WorkCatalogSeeder::class)->run();
    $owner = User::factory()->create();
    $buyers = [User::factory()->create(), User::factory()->create()];
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $correlationId = (string) Str::uuid7();
    $draft = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $owner->id, (string) $owner->id),
        [
            'title' => 'Locally stocked product for a live Order',
            'description' => 'A provider-published product with tracked stock.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'work_catalog_code' => 'set-product-market-handoff',
            'work_set_version' => 1,
            'variants' => [[
                'id' => 'stock-notification-variant',
                'name' => 'Standard case',
                'price_amount_minor' => 2500,
                'currency' => 'PHP',
                'stock' => 5,
                'is_default' => true,
            ]],
        ],
        $correlationId,
    );
    $submitted = app(SubmitListing::class)->handle(
        listingId: (string) $draft['id'],
        actor: new ResourceActor((string) $owner->id, (string) $owner->id),
        expectedVersion: (int) $draft['expected_version'],
        idempotencyKey: 'stock-notification-listing-submit-0001',
        correlationId: $correlationId,
    );
    $this->actingAs($reviewer)
        ->post(route('admin.listings.approve', $draft['id']), ['expected_version' => $submitted['expected_version']])
        ->assertRedirect(route('admin.listings.index'));

    $listing = DB::table('listings')->where('id', $draft['id'])->firstOrFail();
    $listingVersion = DB::table('listing_versions')
        ->where('listing_id', $listing->id)
        ->where('version_number', (int) $listing->current_version)
        ->firstOrFail();
    $stock = app(StockLedgerService::class);
    $bucket = $stock->provisionVariant(
        listingId: (string) $listing->id,
        listingVersionId: (string) $listingVersion->id,
        ownerUserId: (string) $owner->id,
        resourceKey: 'stock-notification-variant',
        openingQuantity: 5,
        correlationId: $correlationId,
    );
    $orderIds = [];
    foreach ($buyers as $index => $buyer) {
        $proposal = app(SubmitOrderProposal::class)->handle(
            buyerUserId: (string) $buyer->id,
            listingId: (string) $listing->id,
            expectedListingVersion: (int) $listing->current_version,
            idempotencyKey: 'stock-notification-proposal-'.$index.'-0001',
            correlationId: $correlationId,
            input: ['quantity' => 2, 'variant_id' => 'stock-notification-variant', 'lane' => 'external_cash'],
        );
        $proposalIntent = DB::table('notifications')
            ->where('recipient_user_id', $owner->id)
            ->where('event_source_type', 'order')
            ->where('event_source_id', $proposal['order_id'])
            ->where('event_type', 'order.proposal_received')
            ->first();
        expect($proposalIntent)->not->toBeNull();
        $proposalPayload = json_decode((string) $proposalIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($proposalIntent->priority)->toBe('needs_action')
            ->and($proposalPayload['attention'])->toBe('needs_action')
            ->and($proposalPayload['action_url'])->toBe(route('orders.show', ['order' => $proposal['order_id']], false));

        app(FinalizeOrderAgreement::class)->handle(
            actorUserId: (string) $owner->id,
            orderId: (string) $proposal['order_id'],
            expectedOrderVersion: (int) $proposal['version'],
            idempotencyKey: 'stock-notification-accept-'.$index.'-0001',
            correlationId: $correlationId,
        );
        $acceptanceIntent = DB::table('notifications')
            ->where('recipient_user_id', $buyer->id)
            ->where('event_source_type', 'order')
            ->where('event_source_id', $proposal['order_id'])
            ->where('event_type', 'order.accepted')
            ->first();
        expect($acceptanceIntent)->not->toBeNull();
        $acceptancePayload = json_decode((string) $acceptanceIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($acceptanceIntent->priority)->toBe('updates')
            ->and($acceptancePayload['attention'])->toBe('updates')
            ->and($acceptancePayload['action_url'])->toBe(route('orders.show', ['order' => $proposal['order_id']], false));

        $orderIds[] = (string) $proposal['order_id'];
    }

    $expectedRowVersion = (int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('row_version');
    $notificationCount = DB::table('notifications')->count();
    $notificationOutboxCount = DB::table('outbox_messages')
        ->where('event_type', 'notification.intent.recorded')
        ->count();
    $rolledBack = false;
    try {
        DB::transaction(function () use ($stock, $bucket, $owner, $expectedRowVersion, $correlationId): void {
            $stock->adjust(
                capacityId: $bucket['id'],
                actorUserId: (string) $owner->id,
                ownerUserId: (string) $owner->id,
                expectedRowVersion: $expectedRowVersion,
                movementType: 'recount',
                quantity: 2,
                idempotencyKey: 'stock-shortage-rollback-0001',
                reason: 'Verify short recount rollback.',
                reference: null,
                correlationId: $correlationId,
            );
            throw new RuntimeException('Rollback the stock source transaction.');
        });
    } catch (RuntimeException $error) {
        $rolledBack = $error->getMessage() === 'Rollback the stock source transaction.';
    }
    expect($rolledBack)->toBeTrue()
        ->and(DB::table('notifications')->count())->toBe($notificationCount)
        ->and(DB::table('outbox_messages')->where('event_type', 'notification.intent.recorded')->count())->toBe($notificationOutboxCount)
        ->and((int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('row_version'))->toBe($expectedRowVersion);

    $recount = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: (string) $owner->id,
        ownerUserId: (string) $owner->id,
        expectedRowVersion: $expectedRowVersion,
        movementType: 'recount',
        quantity: 2,
        idempotencyKey: 'stock-shortage-actual-0001',
        reason: 'Recount stock after an Order reservation.',
        reference: null,
        correlationId: $correlationId,
    );
    $replay = $stock->adjust(
        capacityId: $bucket['id'],
        actorUserId: (string) $owner->id,
        ownerUserId: (string) $owner->id,
        expectedRowVersion: $expectedRowVersion,
        movementType: 'recount',
        quantity: 2,
        idempotencyKey: 'stock-shortage-actual-0001',
        reason: 'Recount stock after an Order reservation.',
        reference: null,
        correlationId: $correlationId,
    );
    expect($recount['availability_status'])->toBe('shortage')
        ->and($replay['movement_id'])->toBe($recount['movement_id'])
        ->and($replay['replay'])->toBeTrue();

    $ownerIntent = DB::table('notifications')
        ->where('recipient_user_id', $owner->id)
        ->where('event_source_type', 'stock_movement')
        ->where('event_source_id', $recount['movement_id'])
        ->where('event_type', 'stock.shortage_recount')
        ->first();
    expect($ownerIntent)->not->toBeNull();
    $ownerPayload = json_decode((string) $ownerIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($ownerIntent->priority)->toBe('needs_action')
        ->and($ownerPayload['attention'])->toBe('needs_action')
        ->and($ownerPayload['title'])->toBeString()
        ->and($ownerPayload['body'])->toBeString()
        ->and($ownerPayload['action_url'])->toBe(route('stock.show', ['capacity' => $bucket['id']], false))
        ->and(array_keys($ownerPayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);

    foreach ($buyers as $index => $buyer) {
        $buyerIntent = DB::table('notifications')
            ->where('recipient_user_id', $buyer->id)
            ->where('event_source_type', 'stock_movement')
            ->where('event_source_id', $recount['movement_id'])
            ->where('event_type', 'stock.shortage_recount')
            ->first();
        expect($buyerIntent)->not->toBeNull();
        $buyerPayload = json_decode((string) $buyerIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($buyerIntent->priority)->toBe('updates')
            ->and($buyerPayload['attention'])->toBe('updates')
            ->and($buyerPayload['title'])->toBeString()
            ->and($buyerPayload['body'])->toBeString()
            ->and($buyerPayload['action_url'])->toBe(route('orders.show', ['order' => $orderIds[$index]], false));
        expect($buyerPayload['action_url'])->not->toContain($orderIds[1 - $index]);
        expect(array_keys($buyerPayload))->toEqualCanonicalizing(['attention', 'title', 'body', 'action_url']);
        expect(DB::table('orders')->where('id', $orderIds[$index])->value('status'))->toBe('accepted')
            ->and(DB::table('listing_capacity_reservations')->where('order_id', $orderIds[$index])->value('status'))->toBe('committed')
            ->and(DB::table('payment_obligations')->where('order_id', $orderIds[$index])->value('status'))->toBe('not_due')
            ->and(DB::table('payment_obligations')->where('order_id', $orderIds[$index])->value('settled_at'))->toBeNull();
    }
    expect(DB::table('notifications')->where('event_source_id', $recount['movement_id'])->where('event_type', 'stock.shortage_recount')->count())->toBe(3);
});

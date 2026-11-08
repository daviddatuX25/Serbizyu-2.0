<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\OwnerListingsQuery;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(AuthenticatesWithPhoneOtp::class, DatabaseTransactions::class);

beforeEach(function (): void {
    $this->bootPhoneOtpAuth();
});

/** @return array{listing: array<string, mixed>, version: object} */
function savedPlanListing(User $owner, string $title, int $price, bool $publish = true): array
{
    $listing = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $owner->id, (string) $owner->id),
        [
            'title' => $title,
            'description' => 'Synthetic service for exact saved partnership verification.',
            'category_code' => 'repairs',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'price_amount_minor' => $price,
            'currency' => 'PHP',
        ],
        (string) Str::uuid7(),
    );
    $version = DB::table('listing_versions')->where('listing_id', $listing['id'])
        ->where('version_number', (int) $listing['current_version'])->first();
    if ($publish) {
        DB::table('listing_versions')->where('id', $version->id)->update(['published_at' => now()]);
        DB::table('listings')->where('id', $listing['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    }

    return ['listing' => $listing, 'version' => $version];
}

/** @return array{primary: array<string, mixed>, partner: array<string, mixed>, item: array<string, mixed>, combination: array<string, mixed>} */
function savedPlanScenario(): array
{
    $primary = savedPlanListing(User::factory()->create(), 'QA cooling service', 45000);
    $partner = savedPlanListing(User::factory()->create(), 'QA follow-up service', 7500);
    $combination = [
        'id' => 'with-follow-up',
        'title' => 'Service with follow-up',
        'planVersion' => 1,
        'recipeId' => 'turnkey_parts',
        'catalogVersion' => 1,
        'nodes' => [
            ['id' => 'cooling', 'title' => 'Cooling service', 'type' => 'labor', 'isPrimary' => true],
            ['id' => 'follow-up', 'title' => 'Follow-up', 'type' => 'labor', 'isPrimary' => false, 'listingId' => $partner['listing']['id'], 'assignmentMode' => 'preferred_partner'],
        ],
        'dependencies' => [
            ['id' => 'cooling-follow-up', 'predecessorId' => 'cooling', 'successorId' => 'follow-up', 'conditionCode' => 'work_completed', 'dependencyType' => 'blocks', 'status' => 'active'],
        ],
    ];
    $terms = json_decode((string) $primary['version']->terms, true);
    $terms['package_tiers'] = [['id' => 'duo', 'title' => 'Two units', 'price' => 850]];
    $terms['addons'] = [['id' => 'rush', 'title' => 'Rush scheduling', 'price_amount_minor' => 10000, 'status' => 'available']];
    $terms['deal_chain_combinations'] = [$combination];
    DB::table('listing_versions')->where('id', $primary['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);

    return [
        'primary' => $primary,
        'partner' => $partner,
        'combination' => $combination,
        'item' => [
            'id' => $primary['listing']['id'],
            'listing_version_id' => (string) $primary['version']->id,
            'package_id' => 'duo',
            'addon_ids' => ['rush'],
            'deal_chain_combination_id' => 'with-follow-up',
            'quantity' => 2,
            'deal_chain' => null,
            'slot_overrides' => null,
        ],
    ];
}

/** @return array{listing: array<string, mixed>, owner_id: string, updated: array<string, mixed>, correlation_id: string} */
function savedProductPublicationDraft(string $selectedCombinationId, ?string $partnerVersionPin = null): array
{
    $owner = User::factory()->create();
    $partner = savedPlanListing(User::factory()->create(), 'QA residential audit service', 9000);
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $owner->id, (string) $owner->id),
        [
            'title' => 'QA selected product publication',
            'description' => 'Product publication source for selection validation.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'price_amount_minor' => 12000,
            'currency' => 'PHP',
        ],
        $correlationId,
    );
    $combination = [
        'id' => 'product-audit',
        'title' => 'Product and audit',
        'planVersion' => 1,
        'nodes' => [
            ['id' => 'product', 'title' => 'Product', 'type' => 'store', 'isPrimary' => true, 'listingId' => $listing['id']],
            [
                'id' => 'audit', 'title' => 'Audit', 'type' => 'audit', 'isPrimary' => false,
                'listingId' => $partner['listing']['id'],
                'listingVersionId' => $partnerVersionPin ?? (string) $partner['version']->id,
            ],
        ],
        'dependencies' => [],
    ];
    $updated = app(UpdateListingDraft::class)->handle(
        (string) $listing['id'],
        new ResourceActor((string) $owner->id, (string) $owner->id),
        (int) $listing['expected_version'],
        [
            'deal_chain_combinations' => [$combination],
            'deal_chain_specification' => [
                'selected_combo_id' => $selectedCombinationId,
                'based_on_recipe_code' => 'direct',
                'based_on_catalog_version' => 1,
            ],
        ],
        $correlationId,
    );

    return ['listing' => $listing, 'owner_id' => (string) $owner->id, 'updated' => $updated, 'correlation_id' => $correlationId];
}

it('stages the exact saved graph and actual providers without substituting its catalog recipe', function (): void {
    $buyerId = $this->authenticateBuyer();
    $scenario = savedPlanScenario();

    $response = $this->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]]);

    $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerId)->orderByDesc('created_at')->first();
    $response->assertRedirect(route('deal-chains.show', ['dealChain' => $chain->id]));
    $needs = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->orderBy('ordinal')->get();
    expect($needs->pluck('node_key')->all())->toBe(['cooling', 'follow-up']);
    $edge = DB::table('deal_dependencies')->where('deal_chain_id', $chain->id)->sole();
    expect($edge->predecessor_need_id)->toBe($needs[0]->id)
        ->and($edge->successor_need_id)->toBe($needs[1]->id)
        ->and($edge->condition_code)->toBe('work_completed');
    $invitations = DB::table('deal_invitations')->whereIn('deal_need_id', $needs->pluck('id'))->get()->keyBy('deal_need_id');
    $primaryOffer = json_decode((string) $invitations[$needs[0]->id]->scope, true);
    $partnerOffer = json_decode((string) $invitations[$needs[1]->id]->scope, true);
    expect($primaryOffer)->toMatchArray([
        'listing_id' => $scenario['primary']['listing']['id'],
        'listing_version_id' => (string) $scenario['primary']['version']->id,
        'package_id' => 'duo', 'addon_ids' => ['rush'], 'quantity' => 2, 'amount_minor' => 190000,
        'deal_chain_combination_id' => 'with-follow-up',
    ]);
    expect($partnerOffer)->toMatchArray([
        'listing_id' => $scenario['partner']['listing']['id'],
        'listing_version_id' => (string) $scenario['partner']['version']->id,
        'quantity' => 2, 'amount_minor' => 15000,
    ]);
    expect((string) $invitations[$needs[1]->id]->invited_provider_user_id)->toBe((string) $scenario['partner']['listing']['owner_user_id']);
    $this->assertDatabaseMissing('orders', ['deal_chain_id' => $chain->id]);
    $this->assertDatabaseMissing('deal_need_confirmations', ['deal_chain_id' => $chain->id]);
});

it('replays the original saved plan after the source becomes unavailable', function (): void {
    $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $key = 'saved-replay-'.Str::uuid7();
    $payload = ['items' => [$scenario['item']]];
    $first = $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), $payload);
    $location = $first->headers->get('Location');
    $first->assertRedirect();
    DB::table('listings')->where('id', $scenario['primary']['listing']['id'])->update(['status' => 'archived', 'archived_at' => now()]);

    $second = $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), $payload);

    $second->assertRedirect($location);
    expect(DB::table('idempotency_keys')->where('key', $key)->count())->toBe(1);
    expect(DB::table('deal_needs')->where('source_listing_id', $scenario['primary']['listing']['id'])->count())->toBe(2);
});

it('rejects a stale saved listing version without reserving an operation', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $item = [...$scenario['item'], 'listing_version_id' => (string) Str::uuid7()];
    $key = 'saved-stale-'.Str::uuid7();
    $chains = DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count();

    $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), ['items' => [$item]])
        ->assertSessionHasErrors('items.0.listing_version_id');

    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    expect(DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count())->toBe($chains);
});

it('rejects a stale preferred-partner pin during product publication without completing submission', function (): void {
    $draft = savedProductPublicationDraft('product-audit', (string) Str::uuid7());
    $key = 'f04-publish-stale-pin-'.Str::uuid7();

    expect(fn () => app(SubmitListing::class)->handle(
        (string) $draft['listing']['id'],
        new ResourceActor($draft['owner_id'], $draft['owner_id']),
        (int) $draft['updated']['expected_version'],
        $key,
        $draft['correlation_id'],
    ))->toThrow(ListingError::class);

    $this->assertDatabaseHas('listings', ['id' => $draft['listing']['id'], 'status' => 'draft']);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
});

it('rejects an unknown selected combination during product publication', function (): void {
    $draft = savedProductPublicationDraft('stale-combo-id');
    $key = 'f04-publish-stale-combo-'.Str::uuid7();

    expect(fn () => app(SubmitListing::class)->handle(
        (string) $draft['listing']['id'],
        new ResourceActor($draft['owner_id'], $draft['owner_id']),
        (int) $draft['updated']['expected_version'],
        $key,
        $draft['correlation_id'],
    ))->toThrow(ListingError::class);

    $this->assertDatabaseHas('listings', ['id' => $draft['listing']['id'], 'status' => 'draft']);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
});

it('rejects a preferred partnership node without an authored listing binding at publication', function (): void {
    $draft = savedProductPublicationDraft('product-audit');
    $version = DB::table('listing_versions')
        ->where('listing_id', $draft['listing']['id'])
        ->where('version_number', $draft['updated']['expected_version'])
        ->firstOrFail();
    $terms = json_decode((string) $version->terms, true, 512, JSON_THROW_ON_ERROR);
    unset($terms['deal_chain_combinations'][0]['nodes'][1]['listingId']);
    unset($terms['deal_chain_combinations'][0]['nodes'][1]['listingVersionId']);
    $terms['deal_chain_combinations'][0]['nodes'][1]['assignmentMode'] = 'preferred_partner';
    DB::table('listing_versions')->where('id', $version->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);
    $key = 'f04-publish-unbound-preferred-'.Str::uuid7();

    expect(fn () => app(SubmitListing::class)->handle(
        (string) $draft['listing']['id'],
        new ResourceActor($draft['owner_id'], $draft['owner_id']),
        (int) $draft['updated']['expected_version'],
        $key,
        $draft['correlation_id'],
    ))->toThrow(ListingError::class);

    $this->assertDatabaseHas('listings', ['id' => $draft['listing']['id'], 'status' => 'draft']);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
});

it('rejects a stale preferred-partner version pin without staging partial state', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true);
    $terms['deal_chain_combinations'][0]['nodes'][1]['listingVersionId'] = (string) Str::uuid7();
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);
    $key = 'saved-stale-partner-'.Str::uuid7();

    $this->withHeader('X-Idempotency-Key', $key)
        ->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertSessionHasErrors('items.0.slot_overrides.follow-up.listing_version_id');

    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    $this->assertDatabaseMissing('deal_chains', ['coordinator_user_id' => $buyer]);
    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
});

it('rejects an explicitly chosen partner with a stale listing version without partial staging', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $item = [
        ...$scenario['item'],
        'slot_overrides' => [
            'follow-up' => [
                'listing_id' => (string) $scenario['partner']['listing']['id'],
                'listing_version_id' => (string) Str::uuid7(),
            ],
        ],
    ];
    $key = 'saved-stale-override-'.Str::uuid7();

    $this->withHeader('X-Idempotency-Key', $key)
        ->post(route('deal-chains.authorize'), ['items' => [$item]])
        ->assertSessionHasErrors('items.0.slot_overrides.follow-up.listing_version_id');

    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    $this->assertDatabaseMissing('deal_chains', ['coordinator_user_id' => $buyer]);
    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
});

it('does not let an outdated nonbinding preferred hint block a new explicit provider choice', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $choice = savedPlanListing(User::factory()->create(), 'QA replacement follow-up service', 8200);
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true);
    $terms['deal_chain_combinations'][0]['nodes'][1]['assignmentMode'] = 'buyer_choice';
    $terms['deal_chain_combinations'][0]['nodes'][1]['listingVersionId'] = (string) Str::uuid7();
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
    ]);
    $item = [
        ...$scenario['item'],
        'slot_overrides' => ['follow-up' => ['listing_id' => (string) $choice['listing']['id']]],
    ];

    $this->post(route('deal-chains.authorize'), ['items' => [$item]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyer)->firstOrFail();
    $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->where('node_key', 'follow-up')->firstOrFail();
    $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->firstOrFail();
    $scope = json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);
    expect((string) $invitation->invited_provider_user_id)->toBe((string) $choice['listing']['owner_user_id']);
    expect($scope['listing_id'])->toBe((string) $choice['listing']['id']);
    expect($scope['listing_version_id'])->toBe((string) $choice['version']->id);
});

it('stages selected product provenance with exact audit and recycle invitations', function (): void {
    $buyer = $this->authenticateBuyer();
    $productOwner = User::factory()->create();
    $audit = savedPlanListing(User::factory()->create(), 'QA residential audit service', 9000);
    $recycle = savedPlanListing(User::factory()->create(), 'QA appliance recycle service', 2500);
    $product = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $productOwner->id, (string) $productOwner->id),
        [
            'title' => 'QA product with provenance extras',
            'description' => 'Product source for selected combination staging.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'price_amount_minor' => 12500,
            'currency' => 'PHP',
        ],
        (string) Str::uuid7(),
    );
    $productVersion = DB::table('listing_versions')->where('listing_id', $product['id'])->first();
    $terms = json_decode((string) $productVersion->terms, true) ?: [];
    $terms['variants'] = [
        ['id' => 'standard', 'name' => 'Standard', 'price_amount_minor' => 12500, 'is_default' => true],
        ['id' => 'premium', 'name' => 'Premium', 'price_amount_minor' => 17500, 'is_default' => false],
    ];
    $terms['addons'] = [
        ['id' => 'gift-wrap', 'title' => 'Gift wrap', 'price_amount_minor' => 3000, 'status' => 'available'],
    ];
    $terms['deal_chain_combinations'] = [[
        'id' => 'product-audit-recycle',
        'title' => 'Product with audit and recycling',
        'planVersion' => 1,
        'nodes' => [
            ['id' => 'product', 'title' => 'Product', 'type' => 'store', 'isPrimary' => true, 'listingId' => $product['id'], 'listingVersionId' => (string) $productVersion->id],
            ['id' => 'audit', 'title' => 'Audit', 'type' => 'audit', 'isPrimary' => false, 'listingId' => $audit['listing']['id'], 'listingVersionId' => (string) $audit['version']->id],
            ['id' => 'recycle', 'title' => 'Recycle', 'type' => 'recycle', 'isPrimary' => false, 'listingId' => $recycle['listing']['id'], 'listingVersionId' => (string) $recycle['version']->id],
        ],
        'dependencies' => [],
    ]];
    DB::table('listing_versions')->where('id', $productVersion->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'published_at' => now(),
    ]);
    DB::table('listings')->where('id', $product['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
    ]);
    foreach ([$audit, $recycle] as $partner) {
        DB::table('listing_versions')->where('id', $partner['version']->id)->update(['published_at' => now()]);
    }

    $result = app(StageDealChain::class)->handle($buyer, [[
        'id' => (string) $product['id'],
        'listing_version_id' => (string) $productVersion->id,
        'variant_id' => 'premium',
        'addon_ids' => ['gift-wrap'],
        'deal_chain_combination_id' => 'product-audit-recycle',
        'quantity' => 2,
    ]], 'f04-selected-stage-'.Str::uuid7(), (string) Str::uuid7());
    $needs = DB::table('deal_needs')->where('deal_chain_id', $result['deal_chain_id'])->get()->keyBy('node_key');
    $invitations = DB::table('deal_invitations')->whereIn('deal_need_id', $needs->pluck('id'))->get()->keyBy(
        fn (object $invitation): string => (string) $needs->firstWhere('id', $invitation->deal_need_id)->node_key,
    );
    $productScope = json_decode((string) $invitations['product']->scope, true, 512, JSON_THROW_ON_ERROR);

    expect($needs->keys()->sort()->values()->all())->toBe(['audit', 'product', 'recycle']);
    expect($invitations)->toHaveCount(3);
    expect($productScope['listing_id'])->toBe((string) $product['id']);
    expect($productScope['listing_version_id'])->toBe((string) $productVersion->id);
    expect($productScope['variant_id'])->toBe('premium');
    expect($productScope['quantity'])->toBe(2);
    expect($productScope['unit_amount_minor'])->toBe(20500);
    expect($productScope['amount_minor'])->toBe(41000);
    expect($productScope['addon_ids'])->toBe(['gift-wrap']);
    foreach (['audit' => $audit, 'recycle' => $recycle] as $role => $partner) {
        $scope = json_decode((string) $invitations[$role]->scope, true, 512, JSON_THROW_ON_ERROR);
        expect($scope['listing_id'])->toBe((string) $partner['listing']['id']);
        expect($scope['listing_version_id'])->toBe((string) $partner['version']->id);
        expect($scope['unit_amount_minor'])->toBe($role === 'audit' ? 9000 : 2500);
        expect($scope['amount_minor'])->toBe(($role === 'audit' ? 9000 : 2500) * 2);
        expect((string) $invitations[$role]->invited_provider_user_id)->toBe((string) $partner['listing']['owner_user_id']);
    }
    $this->assertDatabaseMissing('orders', ['deal_chain_id' => $result['deal_chain_id']]);
});

it('rejects a saved graph cycle without a partial plan or invitation', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true);
    $terms['deal_chain_combinations'][0]['dependencies'][] = [
        'id' => 'cycle', 'predecessorId' => 'follow-up', 'successorId' => 'cooling',
        'conditionCode' => 'work_completed', 'dependencyType' => 'blocks',
    ];
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $key = 'saved-cycle-'.Str::uuid7();
    $chains = DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count();

    $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertSessionHasErrors('items.0.deal_chain_combination_id');

    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
    expect(DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count())->toBe($chains);
});

it('requires an explicit buyer-choice provider even when the saved display has a preferred listing', function (): void {
    $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true);
    $terms['deal_chain_combinations'][0]['nodes'][1]['assignmentMode'] = 'buyer_choice';
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);

    $this->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertSessionHasErrors('items.0.slot_overrides.follow-up.listing_id');

    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
});

it('rolls back a wrong-role selection and permits a corrected retry with the same key', function (): void {
    $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $courier = savedPlanListing(User::factory()->create(), 'QA delivery courier', 5000);
    $key = 'saved-role-'.Str::uuid7();
    $wrong = [...$scenario['item'], 'slot_overrides' => ['follow-up' => ['listing_id' => $courier['listing']['id']]]];

    $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), ['items' => [$wrong]])
        ->assertSessionHasErrors('items.0.slot_overrides.follow-up.listing_id');
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertRedirect();

    expect(DB::table('deal_needs')->where('source_listing_id', $scenario['primary']['listing']['id'])->count())->toBe(2);
    $this->assertDatabaseHas('idempotency_keys', ['key' => $key, 'status' => 'succeeded']);
});

it('does not mix a saved graph with a separate catalog graph selector', function (): void {
    $this->authenticateBuyer();
    $scenario = savedPlanScenario();

    $this->post(route('deal-chains.authorize'), ['items' => [[...$scenario['item'], 'deal_chain' => 'turnkey_parts']]])
        ->assertSessionHasErrors('items.0.deal_chain');

    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
});

it('forms independent child orders only after each provider accepts and the coordinator confirms', function (): void {
    $buyerId = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $this->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])->assertRedirect();
    $needs = DB::table('deal_needs')->where('source_listing_id', $scenario['primary']['listing']['id'])->orderBy('ordinal')->get();
    $formed = [];

    foreach ($needs as $need) {
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->sole();
        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $invitation->invited_provider_user_id,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $this->assertDatabaseMissing('orders', ['deal_need_id' => $need->id]);
        $scope = json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);
        $formed[] = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $need->deal_chain_id,
            dealNeedId: (string) $need->id,
            invitationId: (string) $invitation->id,
            expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $need->id)->value('version'),
            termsHash: (string) $scope['terms_hash'],
            capacityHash: (string) $scope['capacity_hash'],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
    }

    expect($formed[0]['order_id'])->not->toBe($formed[1]['order_id']);
    foreach ($formed as $index => $child) {
        $listing = $index === 0 ? $scenario['primary']['listing'] : $scenario['partner']['listing'];
        $this->assertDatabaseHas('orders', [
            'id' => $child['order_id'], 'buyer_user_id' => $buyerId,
            'provider_user_id' => $listing['owner_user_id'], 'deal_need_id' => $needs[$index]->id,
        ]);
        $this->assertDatabaseHas('work_instances', ['id' => $child['work_instance_id'], 'order_id' => $child['order_id']]);
        $this->assertDatabaseHas('payment_obligations', [
            'id' => $child['payment_obligation_id'], 'order_id' => $child['order_id'],
            'amount_minor' => $index === 0 ? 190000 : 15000,
        ]);
    }
    $this->assertDatabaseHas('work_step_dependency_gates', [
        'successor_work_instance_id' => $formed[1]['work_instance_id'],
        'predecessor_need_id' => $needs[0]->id, 'condition_code' => 'work_completed', 'status' => 'blocked',
    ]);
});

it('keeps an incomplete saved partnership as a draft instead of publishing an unexecutable plan', function (): void {
    $owner = User::factory()->create();
    $draft = savedPlanListing($owner, 'QA incomplete partnership', 45000, publish: false);
    $terms = json_decode((string) $draft['version']->terms, true, 512, JSON_THROW_ON_ERROR);
    $terms['deal_chain_combinations'] = [[
        'id' => 'incomplete', 'planVersion' => 1, 'nodes' => [], 'dependencies' => [],
    ]];
    DB::table('listing_versions')->where('id', $draft['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $key = 'saved-publish-'.Str::uuid7();

    expect(fn () => app(SubmitListing::class)->handle(
        $draft['listing']['id'],
        new ResourceActor((string) $owner->id, (string) $owner->id),
        (int) $draft['listing']['expected_version'],
        $key,
        (string) Str::uuid7(),
    ))->toThrow(ListingError::class);

    $this->assertDatabaseHas('listings', ['id' => $draft['listing']['id'], 'status' => 'draft', 'current_version' => 1]);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
});

it('rejects a primary repair listing mislabeled as a courier role', function (): void {
    $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true, 512, JSON_THROW_ON_ERROR);
    $terms['deal_chain_combinations'][0]['nodes'][0]['type'] = 'delivery';
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);

    $this->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertSessionHasErrors('items.0.deal_chain_combination_id');

    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
    DB::table('listings')->where('id', $scenario['primary']['listing']['id'])->update(['status' => 'draft']);
    $ownerId = (string) $scenario['primary']['listing']['owner_user_id'];
    expect(fn () => app(SubmitListing::class)->handle(
        $scenario['primary']['listing']['id'],
        new ResourceActor($ownerId, $ownerId),
        (int) $scenario['primary']['listing']['expected_version'],
        'saved-primary-role-'.Str::uuid7(),
        (string) Str::uuid7(),
    ))->toThrow(ListingError::class);
});
it('round-trips a deliberately edited sparse partnership through publication and staging', function (): void {
    $buyerId = $this->authenticateBuyer();
    $owner = User::factory()->create();
    $storeOwner = User::factory()->create();
    $laborOwner = User::factory()->create();
    $courierOwner = User::factory()->create();
    $deliveryOwner = User::factory()->create();
    $actor = new ResourceActor((string) $owner->id, (string) $owner->id);
    $correlationId = (string) Str::uuid7();
    $draft = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'QA cooling service',
        'description' => 'Service with preserved package details.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A1',
        'price_amount_minor' => 45000,
        'currency' => 'PHP',
        'package_tiers' => [['id' => 'duo', 'title' => 'Two units', 'price' => 850]],
        'addons' => [['id' => 'rush', 'title' => 'Rush scheduling', 'price_amount_minor' => 10000, 'status' => 'available']],
    ], $correlationId);
    $store = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $storeOwner->id, (string) $storeOwner->id),
        [
            'title' => 'QA cooling parts',
            'description' => 'Parts provider.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'price_amount_minor' => 12000,
            'currency' => 'PHP',
            'variants' => [['id' => 'parts', 'name' => 'Parts', 'price' => 120, 'stock' => 5, 'is_default' => true]],
        ],
        $correlationId,
    );
    $labor = savedPlanListing($laborOwner, 'QA installation service', 7000);
    $courier = savedPlanListing($courierOwner, 'QA courier delivery', 5000);
    $delivery = savedPlanListing($deliveryOwner, 'QA parcel delivery', 6000);
    foreach ([$store, $labor, $courier, $delivery] as $provider) {
        $listingId = $provider['id'] ?? $provider['listing']['id'];
        DB::table('listing_versions')->where('listing_id', $listingId)->update(['published_at' => now()]);
        DB::table('listings')->where('id', $listingId)->update(['status' => 'active', 'review_status' => 'approved']);
    }
    $storeListingId = (string) $store['id'];
    $combination = [
        'id' => 'sparse-pilot',
        'title' => 'Cooling service with parts and delivery',
        'planVersion' => 1,
        'recipeId' => 'turnkey_parts',
        'catalogVersion' => 1,
        'nodes' => [
            ['id' => 'supply', 'title' => 'Parts', 'type' => 'store', 'isPrimary' => false, 'listingId' => $storeListingId],
            ['id' => 'host', 'title' => 'Cooling service', 'type' => 'labor', 'isPrimary' => true, 'listingId' => $draft['id']],
            ['id' => 'delivery', 'title' => 'Delivery', 'type' => 'delivery', 'isPrimary' => false, 'listingId' => $delivery['listing']['id']],
            ['id' => 'follow-up', 'title' => 'Follow-up', 'type' => 'labor', 'isPrimary' => false, 'listingId' => $labor['listing']['id']],
        ],
        'dependencies' => [
            ['id' => 'supply-host', 'predecessorId' => 'supply', 'successorId' => 'host', 'conditionCode' => 'part_ready', 'dependencyType' => 'blocks', 'status' => 'active'],
            ['id' => 'host-follow-up', 'predecessorId' => 'host', 'successorId' => 'follow-up', 'conditionCode' => 'work_completed', 'dependencyType' => 'blocks', 'status' => 'active'],
        ],
    ];

    $initialVersionTerms = DB::table('listing_versions')->where('listing_id', $draft['id'])->where('version_number', 1)->value('terms');
    $updated = app(UpdateListingDraft::class)->handle(
        (string) $draft['id'],
        $actor,
        (int) $draft['expected_version'],
        ['deal_chain_combinations' => [$combination]],
        $correlationId,
    );
    $reopened = app(OwnerListingsQuery::class)->find((string) $draft['id'], (string) $owner->id, $correlationId);
    expect($reopened['deal_chain_combinations'][0]['nodes'])->toEqual($combination['nodes'])
        ->and($reopened['deal_chain_combinations'][0]['dependencies'])->toEqual($combination['dependencies'])
        ->and($reopened['package_tiers'])->toEqual([['id' => 'duo', 'title' => 'Two units', 'price' => 850]])
        ->and($reopened['addons'])->toEqual([['id' => 'rush', 'title' => 'Rush scheduling', 'price_amount_minor' => 10000, 'status' => 'available']]);

    $edited = $combination;
    $edited['nodes'][0]['type'] = 'delivery';
    $edited['nodes'][0]['listingId'] = $labor['listing']['id'];
    $edited['dependencies'][0]['conditionCode'] = 'work_completed';
    $invalid = app(UpdateListingDraft::class)->handle(
        (string) $draft['id'],
        $actor,
        (int) $updated['expected_version'],
        ['deal_chain_combinations' => [$edited]],
        $correlationId,
    );
    $roleEditReopened = app(OwnerListingsQuery::class)->find((string) $draft['id'], (string) $owner->id, $correlationId);
    expect($roleEditReopened['deal_chain_combinations'][0]['nodes'][0])->toMatchArray([
        'type' => 'delivery',
        'listingId' => $labor['listing']['id'],
    ])->and($roleEditReopened['deal_chain_combinations'][0]['dependencies'][0]['conditionCode'])->toBe('work_completed');
    $invalidKey = 'saved-role-publication-'.Str::uuid7();
    expect(fn () => app(SubmitListing::class)->handle(
        (string) $draft['id'],
        $actor,
        (int) $invalid['expected_version'],
        $invalidKey,
        $correlationId,
    ))->toThrow(ListingError::class);
    $this->assertDatabaseHas('listings', ['id' => $draft['id'], 'status' => 'draft']);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $invalidKey]);

    $edited['nodes'][0]['listingId'] = $courier['listing']['id'];
    $resolved = app(UpdateListingDraft::class)->handle(
        (string) $draft['id'],
        $actor,
        (int) $invalid['expected_version'],
        ['deal_chain_combinations' => [$edited]],
        $correlationId,
    );
    $resolvedReopened = app(OwnerListingsQuery::class)->find((string) $draft['id'], (string) $owner->id, $correlationId);
    expect($resolvedReopened['deal_chain_combinations'][0]['nodes'][0]['listingId'])->toBe($courier['listing']['id']);
    $submitted = app(SubmitListing::class)->handle(
        (string) $draft['id'],
        $actor,
        (int) $resolved['expected_version'],
        'saved-role-publication-'.Str::uuid7(),
        $correlationId,
    );
    expect($submitted['status'])->toBe('pending_review');
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $this->actingAs($staff)->post(route('admin.listings.approve', $draft['id']), [
        'expected_version' => $submitted['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));

    $published = app(OwnerListingsQuery::class)->find((string) $draft['id'], (string) $owner->id, $correlationId);
    expect($published['deal_chain_combinations'][0]['nodes'])->toEqual($edited['nodes'])
        ->and($published['deal_chain_combinations'][0]['dependencies'])->toEqual($edited['dependencies']);
    $publishedVersion = (string) DB::table('listing_versions')
        ->where('listing_id', $draft['id'])
        ->where('version_number', $published['current_version'])
        ->value('id');
    $this->actingAs(User::query()->findOrFail($buyerId))
        ->post(route('deal-chains.authorize'), ['items' => [[
            'id' => (string) $draft['id'],
            'listing_version_id' => $publishedVersion,
            'package_id' => 'duo',
            'addon_ids' => ['rush'],
            'deal_chain_combination_id' => 'sparse-pilot',
            'quantity' => 1,
            'deal_chain' => null,
            'slot_overrides' => null,
        ]]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerId)->orderByDesc('created_at')->firstOrFail();
    $needs = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->orderBy('ordinal')->get();
    expect($needs->pluck('node_key')->all())->toBe(['supply', 'host', 'delivery', 'follow-up']);
    $edges = DB::table('deal_dependencies')->where('deal_chain_id', $chain->id)->orderBy('predecessor_need_id')->get();
    expect($edges)->toHaveCount(2);
    $needIds = $needs->keyBy('node_key');
    expect($edges->map(fn (object $edge): array => [
        $needs->firstWhere('id', $edge->predecessor_need_id)->node_key,
        $needs->firstWhere('id', $edge->successor_need_id)->node_key,
        $edge->condition_code,
    ])->sort()->values()->all())->toBe([
        ['host', 'follow-up', 'work_completed'],
        ['supply', 'host', 'work_completed'],
    ]);
    $this->assertDatabaseHas('deal_needs', ['id' => $needIds['host']->id, 'node_key' => 'host']);
    $this->assertDatabaseHas('deal_invitations', [
        'deal_need_id' => $needIds['supply']->id,
        'invited_provider_user_id' => $courierOwner->id,
    ]);
    $this->assertDatabaseHas('deal_invitations', [
        'deal_need_id' => $needIds['host']->id,
        'invited_provider_user_id' => $owner->id,
        'purpose' => 'primary_listing_assignment',
    ]);
    $latestTerms = json_decode((string) DB::table('listing_versions')->where('id', $publishedVersion)->value('terms'), true, 512, JSON_THROW_ON_ERROR);
    expect($latestTerms['deal_chain_combinations'][0]['nodes'])->toEqual($edited['nodes'])
        ->and($latestTerms['package_tiers'][0]['id'])->toBe('duo')
        ->and($latestTerms['addons'][0]['id'])->toBe('rush');
    $this->assertDatabaseMissing('orders', ['deal_chain_id' => $chain->id]);
    expect(DB::table('listing_versions')->where('listing_id', $draft['id'])->where('version_number', 1)->value('terms'))->toBe($initialVersionTerms);
});

it('rejects a role-specific gate with no partial saved-plan staging', function (): void {
    $buyer = $this->authenticateBuyer();
    $scenario = savedPlanScenario();
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->value('terms'), true, 512, JSON_THROW_ON_ERROR);
    $terms['deal_chain_combinations'][0]['dependencies'][0]['conditionCode'] = 'part_ready';
    DB::table('listing_versions')->where('id', $scenario['primary']['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $before = DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count();
    $key = 'saved-invalid-gate-'.Str::uuid7();

    $this->withHeader('X-Idempotency-Key', $key)->post(route('deal-chains.authorize'), ['items' => [$scenario['item']]])
        ->assertSessionHasErrors('items.0.deal_chain_combination_id');

    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
    $this->assertDatabaseMissing('deal_needs', ['source_listing_id' => $scenario['primary']['listing']['id']]);
    expect(DB::table('deal_chains')->where('coordinator_user_id', $buyer)->count())->toBe($before);
});
it('rejects duplicate executable partnership IDs before listing publication', function (): void {
    $owner = User::factory()->create();
    $listing = savedPlanListing($owner, 'QA duplicate plan listing', 45000, publish: false);
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $listing['version']->id)->value('terms'), true, 512, JSON_THROW_ON_ERROR);
    $combination = [
        'id' => 'same-plan',
        'planVersion' => 1,
        'nodes' => [['id' => 'primary', 'type' => 'labor', 'isPrimary' => true, 'listingId' => $listing['listing']['id']]],
        'dependencies' => [],
    ];
    $terms['deal_chain_combinations'] = [$combination, $combination];
    DB::table('listing_versions')->where('id', $listing['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $key = 'saved-ambiguous-'.Str::uuid7();
    $ownerId = (string) $owner->id;

    expect(fn () => app(SubmitListing::class)->handle(
        $listing['listing']['id'],
        new ResourceActor($ownerId, $ownerId),
        (int) $listing['listing']['expected_version'],
        $key,
        (string) Str::uuid7(),
    ))->toThrow(ListingError::class);

    $this->assertDatabaseHas('listings', ['id' => $listing['listing']['id'], 'status' => 'draft']);
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);
});
it('publishes buyer-choice roles with stale hints but requires an explicit eligible staging choice', function (): void {
    $buyerId = $this->authenticateBuyer();
    $owner = User::factory()->create();
    $draft = savedPlanListing($owner, 'QA buyer-choice service', 45000, publish: false);
    $staleLabor = savedPlanListing(User::factory()->create(), 'QA installation service', 7000);
    $courier = savedPlanListing(User::factory()->create(), 'QA courier delivery', 5000);
    $terms = json_decode((string) DB::table('listing_versions')->where('id', $draft['version']->id)->value('terms'), true, 512, JSON_THROW_ON_ERROR);
    $combination = [
        'id' => 'buyer-choice-delivery',
        'planVersion' => 1,
        'nodes' => [
            ['id' => 'primary', 'title' => 'Service', 'type' => 'labor', 'isPrimary' => true, 'listingId' => $draft['listing']['id']],
            ['id' => 'delivery', 'title' => 'Delivery', 'type' => 'delivery', 'isPrimary' => false, 'listingId' => $staleLabor['listing']['id'], 'assignmentMode' => 'buyer_choice'],
        ],
        'dependencies' => [],
    ];
    $terms['deal_chain_combinations'] = [$combination];
    DB::table('listing_versions')->where('id', $draft['version']->id)->update(['terms' => json_encode($terms, JSON_THROW_ON_ERROR)]);
    $ownerId = (string) $owner->id;
    $submitted = app(SubmitListing::class)->handle(
        $draft['listing']['id'],
        new ResourceActor($ownerId, $ownerId),
        (int) $draft['listing']['expected_version'],
        'saved-buyer-choice-submit-'.Str::uuid7(),
        (string) Str::uuid7(),
    );
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $this->actingAs($staff)->post(route('admin.listings.approve', $draft['listing']['id']), [
        'expected_version' => $submitted['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));
    $versionId = (string) DB::table('listing_versions')
        ->where('listing_id', $draft['listing']['id'])
        ->where('version_number', DB::table('listings')->where('id', $draft['listing']['id'])->value('current_version'))
        ->value('id');
    $item = [
        'id' => $draft['listing']['id'],
        'listing_version_id' => $versionId,
        'deal_chain_combination_id' => 'buyer-choice-delivery',
        'quantity' => 1,
    ];
    $key = 'saved-buyer-choice-stage-'.Str::uuid7();
    $buyer = User::query()->findOrFail($buyerId);

    $this->actingAs($buyer)
        ->withHeader('X-Idempotency-Key', $key)
        ->post(route('deal-chains.authorize'), ['items' => [$item]])
        ->assertSessionHasErrors('items.0.slot_overrides.delivery.listing_id');
    $this->assertDatabaseMissing('idempotency_keys', ['key' => $key]);

    $this->actingAs($buyer)
        ->withHeader('X-Idempotency-Key', $key)
        ->post(route('deal-chains.authorize'), ['items' => [[
            ...$item,
            'slot_overrides' => ['delivery' => ['listing_id' => $courier['listing']['id']]],
        ]]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $need = DB::table('deal_needs')->where('source_listing_id', $draft['listing']['id'])->where('node_key', 'delivery')->sole();
    $this->assertDatabaseHas('deal_invitations', [
        'deal_need_id' => $need->id,
        'invited_provider_user_id' => $courier['listing']['owner_user_id'],
    ]);
});

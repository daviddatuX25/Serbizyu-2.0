<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\DealChainRecipeCatalogPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

final class DealChainAuthorizationTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootPhoneOtpAuth();
    }

    public function test_it_redirects_unauthenticated_users_to_phone_auth_when_authorizing_deal_chain(): void
    {
        $this->post(route('deal-chains.authorize'), [
            'items' => [
                ['id' => '0198a3b1-7c40-7abc-8def-5234567890b8', 'quantity' => 1],
            ],
        ])->assertRedirect(route('auth.sign-in'));
    }

    public function test_it_authorizes_a_multi_need_deal_chain_and_persists_parent_deal_chains_deal_needs_and_dependencies(): void
    {
        $buyerUserId = $this->authenticateBuyer();

        $response = $this->post(route('deal-chains.authorize'), [
            'items' => [
                [
                    'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                    'quantity' => 1,
                    'deal_chain' => 'turnkey_parts',
                ],
                [
                    'id' => '0198a3b1-7c40-7abc-8def-5234567890ba',
                    'quantity' => 1,
                ],
            ],
        ]);

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $buyerUserId)
            ->orderByDesc('created_at')
            ->first();

        expect($chain)->not->toBeNull()
            ->and($chain->status)->toBe('sourcing')
            ->and($chain->title)->toContain('Tagudin Deal Chain');

        $response->assertRedirect(route('deal-chains.show', ['dealChain' => $chain->id]));

        // Check deal_needs: 3 from turnkey_parts + 1 standalone = 4 slots
        $needs = DB::table('deal_needs')
            ->where('deal_chain_id', $chain->id)
            ->orderBy('ordinal')
            ->get();

        expect($needs)->toHaveCount(4)
            ->and($needs[0]->node_key)->toBe('part')
            ->and($needs[0]->node_role)->toBe('store')
            ->and($needs[0]->recipe_code)->toBe('turnkey_parts')
            ->and((int) $needs[0]->recipe_version)->toBe(1)
            ->and($needs[0]->source_listing_id)->toBe('0198a3b1-7c40-7abc-8def-5234567890b8')
            ->and($needs[1]->node_key)->toBe('courier')
            ->and($needs[2]->node_key)->toBe('labor')
            ->and($needs[3]->node_key)->toBe('primary')
            ->and($needs[3]->recipe_code)->toBe('direct_listing')
            ->and($needs[0]->title)->toBe('35uF AC Run Capacitor')
            ->and($needs[0]->need_kind)->toBe('product')
            ->and($needs[0]->status)->toBe('open')
            ->and($needs[1]->title)->toBe('Danny Express Motorcycle Courier')
            ->and($needs[1]->need_kind)->toBe('service')
            ->and($needs[1]->status)->toBe('open')
            ->and($needs[2]->title)->toBe('Inverter Split AC Deep Clean & Checkup')
            ->and($needs[2]->need_kind)->toBe('service')
            ->and($needs[2]->status)->toBe('open')
            ->and($needs[3]->title)->toBe('AC Run Capacitor (35uF 450V)')
            ->and($needs[3]->need_kind)->toBe('product')
            ->and($needs[3]->status)->toBe('open')
            ->and(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(0)
            ->and(DB::table('work_instances')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $chain->id))->count())->toBe(0)
            ->and(DB::table('payment_obligations')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $chain->id))->count())->toBe(0);

        // Check deal_dependencies: Part -> Courier, and Courier -> Labor
        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $chain->id)
            ->get();

        expect($dependencies)->toHaveCount(2)
            ->and($dependencies[0]->dependency_type)->toBe('blocks')
            ->and($dependencies[0]->condition_code)->toBe('part_ready')
            ->and($dependencies[0]->predecessor_need_id)->toBe($needs[0]->id)
            ->and($dependencies[0]->successor_need_id)->toBe($needs[1]->id)
            ->and($dependencies[1]->dependency_type)->toBe('blocks')
            ->and($dependencies[1]->condition_code)->toBe('delivery_signed')
            ->and($dependencies[1]->predecessor_need_id)->toBe($needs[1]->id)
            ->and($dependencies[1]->successor_need_id)->toBe($needs[2]->id);

        // Test GET deal-chains.show renders successfully with Inertia
        $showResponse = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-chains.show', ['dealChain' => $chain->id]));

        $showResponse->assertOk()
            ->assertJsonPath('component', 'Orders/DealChainDetail')
            ->assertJsonPath('props.chain.id', $chain->id)
            ->assertJsonCount(4, 'props.slots')
            ->assertJsonCount(2, 'props.dependencies');
    }

    public function test_it_authorizes_safety_audit_without_creating_orders_or_payment_obligations(): void
    {
        $buyerUserId = $this->authenticateBuyer();

        $response = $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'quantity' => 1,
                'deal_chain' => 'safety_audit',
            ]],
        ]);

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $buyerUserId)
            ->orderByDesc('created_at')
            ->first();

        expect($chain)->not->toBeNull();
        $response
            ->assertRedirect(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertSessionHas('notice', 'Deal Chain plan staged. No Order, Work record, or payment obligation was created.');

        $needs = DB::table('deal_needs')
            ->where('deal_chain_id', $chain->id)
            ->orderBy('ordinal')
            ->get();
        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $chain->id)
            ->get();

        expect($needs)->toHaveCount(2)
            ->and($dependencies)->toHaveCount(1)
            ->and($dependencies[0]->condition_code)->toBe('labor_ready')
            ->and(DB::table('payment_obligations')
                ->whereIn('order_id', DB::table('orders')
                    ->select('id')
                    ->where('deal_chain_id', $chain->id))
                ->count())->toBe(0);
    }

    public function test_it_rejects_a_recipe_that_does_not_match_the_listing_category(): void
    {
        $this->authenticateBuyer();

        $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => '0198a3b1-7c40-7abc-8def-5234567890ba',
                'quantity' => 1,
                'deal_chain' => 'turnkey_parts',
            ]],
        ])->assertSessionHasErrors(['items.0.deal_chain']);
    }

    public function test_it_hides_a_chain_from_an_unrelated_authenticated_user(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'quantity' => 1,
            ]],
        ]);

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $buyerUserId)
            ->orderByDesc('created_at')
            ->first();

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone('+639172222002');

        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertNotFound();
    }

    public function test_it_validates_and_stages_the_selected_listing_terms_without_creating_an_order(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $correlationId = (string) Str::uuid7();
        $listing = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Selected variant product for deal plan',
                'description' => 'A product need used to verify staged listing terms.',
                'category_code' => 'food',
                'listing_type' => 'product',
                'work_shape' => 'A4',
            ],
            $correlationId,
        );
        $version = DB::table('listing_versions')
            ->where('listing_id', $listing['id'])
            ->where('version_number', (int) $listing['current_version'])
            ->first();
        $terms = json_decode((string) $version->terms, true) ?: [];
        $terms['variants'] = [
            ['id' => 'variant-base', 'name' => 'Base', 'price_amount_minor' => 12000, 'is_default' => true],
            ['id' => 'variant-custom', 'name' => 'Custom', 'price_amount_minor' => 18400, 'is_default' => false],
        ];
        $terms['deal_chain_combinations'] = [
            ['id' => 'combo-market', 'title' => 'Market handoff', 'isDefault' => true, 'nodes' => []],
        ];
        DB::table('listing_versions')->where('id', $version->id)->update([
            'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
            'published_at' => now(),
        ]);
        DB::table('listings')->where('id', $listing['id'])->update([
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        $baseItem = [
            'id' => (string) $listing['id'],
            'listing_version_id' => (string) $version->id,
            'variant_id' => 'variant-custom',
            'package_id' => null,
            'addon_ids' => [],
            'deal_chain_combination_id' => 'combo-market',
            'quantity' => 3,
            'deal_chain' => null,
            'slot_overrides' => null,
        ];

        $this->post(route('deal-chains.authorize'), [
            'items' => [$baseItem + ['amount_minor' => 1]],
        ])->assertSessionHasErrors();

        $this->post(route('deal-chains.authorize'), [
            'items' => [$baseItem],
        ])->assertRedirect();

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $buyerUserId)
            ->orderByDesc('created_at')
            ->first();
        $needId = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->value('id');
        $scope = json_decode((string) DB::table('deal_invitations')
            ->where('deal_need_id', $needId)
            ->where('purpose', 'primary_listing_assignment')
            ->value('scope'), true);

        expect($scope)->toMatchArray([
            'listing_id' => (string) $listing['id'],
            'listing_version_id' => (string) $version->id,
            'variant_id' => 'variant-custom',
            'package_id' => null,
            'deal_chain_combination_id' => 'combo-market',
            'quantity' => 3,
            'unit_amount_minor' => 18400,
            'amount_minor' => 55200,
            'addon_ids' => [],
        ])->and(DB::table('orders')->where('listing_id', $listing['id'])->count())->toBe(0);
    }

    public function test_it_assigns_a_chain_slot_to_the_owner_of_the_active_partner_listing(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $primaryOwner = User::factory()->create();
        $partnerOwner = User::factory()->create();
        $createActiveListing = static function (User $owner, array $attributes): array {
            $listing = app(CreateListingDraft::class)->handle(
                new ResourceActor((string) $owner->id, (string) $owner->id),
                $attributes,
                (string) Str::uuid7(),
            );
            $version = DB::table('listing_versions')
                ->where('listing_id', $listing['id'])
                ->where('version_number', (int) $listing['current_version'])
                ->first();
            DB::table('listing_versions')->where('id', $version->id)->update([
                'published_at' => now(),
            ]);
            DB::table('listings')->where('id', $listing['id'])->update([
                'status' => 'active',
                'review_status' => 'approved',
            ]);

            return [$listing, $version];
        };

        [$primaryListing] = $createActiveListing($primaryOwner, [
            'title' => 'AC service with authored parts slot',
            'description' => 'A service offering used to stage a parts partner.',
            'category_code' => 'repairs',
            'listing_type' => 'service',
            'work_shape' => 'A3',
            'milestone_stages' => [
                ['id' => 'appointment-service', 'title' => 'Perform the appointment service', 'clearanceMode' => 'worker_direct', 'requiredProofs' => []],
                ['id' => 'appointment-approval', 'title' => 'Customer approves the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
            ],
        ]);
        [$partnerListing] = $createActiveListing($partnerOwner, [
            'title' => 'Seller-owned capacitor partner listing',
            'description' => 'An active product listing selected for the parts slot.',
            'category_code' => 'repairs',
            'listing_type' => 'product',
            'work_shape' => 'A4',
        ]);

        $baseItem = [
            'id' => (string) $primaryListing['id'],
            'quantity' => 1,
            'deal_chain' => 'turnkey_parts',
            'slot_overrides' => [
                'part' => [
                    'listing_id' => (string) $partnerListing['id'],
                ],
            ],
        ];

        $this->post(route('deal-chains.authorize'), [
            'items' => [
                array_replace_recursive($baseItem, [
                    'slot_overrides' => [
                        'part' => [
                            'provider_user_id' => $buyerUserId,
                        ],
                    ],
                ]),
            ],
        ])->assertSessionHasErrors();

        $this->post(route('deal-chains.authorize'), [
            'items' => [$baseItem],
        ])->assertRedirect();

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $buyerUserId)
            ->orderByDesc('created_at')
            ->first();
        $needId = DB::table('deal_needs')
            ->where('deal_chain_id', $chain->id)
            ->where('title', '35uF AC Run Capacitor')
            ->value('id');
        $invitation = DB::table('deal_invitations')
            ->where('deal_need_id', $needId)
            ->where('purpose', 'deal_need_assignment')
            ->first();
        $scope = json_decode((string) $invitation->scope, true);

        expect((string) $invitation->invited_provider_user_id)
            ->toBe((string) $partnerOwner->id)
            ->not->toBe($buyerUserId)
            ->and($scope)->toMatchArray([
                'listing_id' => (string) $partnerListing['id'],
                'listing_version' => 1,
            ])
            ->and(DB::table('orders')->where('listing_id', $primaryListing['id'])->count())->toBe(0);
    }

    public function test_provider_acceptance_waits_for_explicit_customer_confirmation_before_atomic_child_formation(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $providerOwner = User::factory()->create();
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $providerOwner->id, (string) $providerOwner->id),
            [
                'title' => 'Provider-authored service agreement',
                'description' => 'A direct A1 service agreement with exact provider-authored commercial terms.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A1',
                'price_amount_minor' => 45000,
                'currency' => 'PHP',
            ],
            (string) Str::uuid7(),
        );
        DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
        DB::table('listing_versions')->where('listing_id', $draft['id'])->update(['published_at' => now()]);
        $listing = DB::table('listings')->where('id', $draft['id'])->firstOrFail();

        $this->post(route('deal-chains.authorize'), [
            'items' => [['id' => (string) $listing->id, 'quantity' => 1]],
        ])->assertRedirect();

        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerUserId)->orderByDesc('created_at')->first();
        $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->first();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->first();
        $scope = json_decode((string) $invitation->scope, true);

        expect(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(0)
            ->and(DB::table('deal_needs')->where('id', $need->id)->value('status'))->toBe('open');

        $provider = User::query()->findOrFail($invitation->invited_provider_user_id);
        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ])->assertOk()->assertJsonPath('data.need_status', 'awaiting_customer_confirmation');

        expect(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(0)
            ->and(DB::table('work_instances')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $chain->id))->count())->toBe(0);

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $response = $this->postJson(route('deal-chains.needs.confirm-agreement', [
            'dealChain' => $chain->id,
            'need' => $need->id,
        ]), [
            'invitation_id' => (string) $invitation->id,
            'expected_need_version' => 2,
            'terms_hash' => $scope['terms_hash'],
            'capacity_hash' => $scope['capacity_hash'],
        ])->assertOk();

        $orderId = (string) $response->json('data.order_id');
        $workId = (string) $response->json('data.work_instance_id');
        $obligationId = (string) $response->json('data.payment_obligation_id');
        expect($orderId)->not->toBe('')
            ->and($workId)->not->toBe('')
            ->and($obligationId)->not->toBe('');

        $order = DB::table('orders')->where('id', $orderId)->first();
        expect($order->deal_chain_id)->toBe($chain->id)
            ->and($order->deal_need_id)->toBe($need->id)
            ->and($order->current_proposal_id)->not->toBeNull()
            ->and($order->current_terms_snapshot_id)->not->toBeNull();
        expect((int) DB::table('order_terms_snapshots')->where('order_id', $orderId)->value('amount_minor'))->toBe((int) $scope['amount_minor']);
        expect(DB::table('order_proposals')->where('id', $order->current_proposal_id)->value('status'))->toBe('accepted')
            ->and(DB::table('work_instances')->where('id', $workId)->value('status'))->toBe('not_started')
            ->and(DB::table('payment_obligations')->where('id', $obligationId)->value('status'))->toBe('not_due')
            ->and(DB::table('payment_obligations')->where('id', $obligationId)->value('settled_at'))->toBeNull()
            ->and(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(1);
    }

    public function test_stable_node_keys_keep_same_role_partner_overrides_separate_across_recipe_items(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $createActiveListing = static function (User $owner, string $title, string $type, int $price): array {
            $draft = app(CreateListingDraft::class)->handle(
                new ResourceActor((string) $owner->id, (string) $owner->id),
                [
                    'title' => $title,
                    'description' => 'Listing used to verify stable Deal Chain node selection.',
                    'category_code' => 'repairs',
                    'listing_type' => $type,
                    'work_shape' => $type === 'product' ? 'A4' : 'A1',
                ],
                (string) Str::uuid7(),
            );
            $version = DB::table('listing_versions')
                ->where('listing_id', $draft['id'])
                ->where('version_number', (int) $draft['current_version'])
                ->first();
            DB::table('listing_versions')->where('id', $version->id)->update([
                'price_amount_minor' => $price,
                'currency' => 'PHP',
                'published_at' => now(),
            ]);
            DB::table('listings')->where('id', $draft['id'])->update([
                'status' => 'active',
                'review_status' => 'approved',
            ]);

            return ['id' => (string) $draft['id'], 'owner_id' => (string) $owner->id];
        };

        $primaryA = $createActiveListing(User::factory()->create(), 'Primary repair A', 'service', 4000);
        $primaryB = $createActiveListing(User::factory()->create(), 'Primary repair B', 'service', 5000);
        $partners = [
            $createActiveListing(User::factory()->create(), 'Part A1', 'product', 1111),
            $createActiveListing(User::factory()->create(), 'Part A2', 'product', 2222),
            $createActiveListing(User::factory()->create(), 'Part B1', 'product', 3333),
            $createActiveListing(User::factory()->create(), 'Part B2', 'product', 4444),
        ];

        $catalog = new class implements DealChainRecipeCatalogPort
        {
            public function published(): array
            {
                return [
                    'same_role_test' => [
                        'recipe_code' => 'same_role_test',
                        'catalog_version' => 7,
                        'category_codes' => ['repairs'],
                        'listing_types' => ['service'],
                        'work_shapes' => ['A1'],
                        'definition' => [
                            'nodes' => [
                                ['key' => 'part_a', 'need_kind' => 'product', 'title' => 'Part A', 'frontend' => ['type' => 'store']],
                                ['key' => 'part_b', 'need_kind' => 'product', 'title' => 'Part B', 'frontend' => ['type' => 'store']],
                                ['key' => 'primary', 'need_kind_template' => 'primary_listing', 'title_template' => 'primary_listing', 'frontend' => ['type' => 'labor']],
                            ],
                            'dependencies' => [],
                        ],
                    ],
                ];
            }
        };
        $this->app->instance(DealChainRecipeCatalogPort::class, $catalog);
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => $primaryA['id'],
                    'quantity' => 1,
                    'deal_chain' => 'same_role_test',
                    'slot_overrides' => [
                        'part_a' => ['listing_id' => $partners[0]['id'], 'price_minor' => 1],
                        'part_b' => ['listing_id' => $partners[1]['id'], 'price_minor' => 1],
                    ],
                ],
                [
                    'id' => $primaryB['id'],
                    'quantity' => 1,
                    'deal_chain' => 'same_role_test',
                    'slot_overrides' => [
                        'part_a' => ['listing_id' => $partners[2]['id'], 'price_minor' => 1],
                        'part_b' => ['listing_id' => $partners[3]['id'], 'price_minor' => 1],
                    ],
                ],
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        expect($needs)->toHaveCount(6)
            ->and($needs->where('node_key', 'part_a')->pluck('node_role')->unique()->values()->all())->toBe(['store'])
            ->and($needs->where('node_key', 'part_a')->pluck('source_listing_id')->unique()->values()->all())->toContain($primaryA['id'], $primaryB['id'])
            ->and($needs->where('node_key', 'part_b')->pluck('node_role')->unique()->values()->all())->toBe(['store'])
            ->and($needs->pluck('recipe_version')->unique()->values()->all())->toBe([7]);

        $partnerInvitations = DB::table('deal_invitations')
            ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
            ->where('deal_needs.deal_chain_id', $staged['deal_chain_id'])
            ->whereIn('deal_needs.node_key', ['part_a', 'part_b'])
            ->get(['deal_needs.node_key', 'deal_needs.source_listing_id', 'deal_invitations.scope']);
        $resolved = [];
        foreach ($partnerInvitations as $invitation) {
            $scope = json_decode((string) $invitation->scope, true);
            $resolved[$invitation->source_listing_id][$invitation->node_key] = [(string) $scope['listing_id'], (int) $scope['amount_minor']];
        }
        expect($resolved[$primaryA['id']])->toBe([
            'part_a' => [$partners[0]['id'], 1111],
            'part_b' => [$partners[1]['id'], 2222],
        ])->and($resolved[$primaryB['id']])->toBe([
            'part_a' => [$partners[2]['id'], 3333],
            'part_b' => [$partners[3]['id'], 4444],
        ]);
    }

    public function test_a3_deal_need_confirmation_uses_customer_held_exact_appointment(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $listing = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'A3 Deal Chain appointment service',
                'description' => 'Pinned appointment terms for an independent Deal Chain child.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A3',
                'milestone_stages' => [
                    ['id' => 'appointment-service', 'title' => 'Perform the appointment service', 'clearanceMode' => 'worker_direct', 'requiredProofs' => []],
                    ['id' => 'appointment-approval', 'title' => 'Customer approves the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                ],
            ],
            (string) Str::uuid7(),
        );
        $version = DB::table('listing_versions')
            ->where('listing_id', $listing['id'])
            ->where('version_number', (int) $listing['current_version'])
            ->first();
        $terms = json_decode((string) $version->terms, true) ?: [];
        $terms['appointment_duration_minutes'] = 60;
        DB::table('listing_versions')->where('id', $version->id)->update([
            'price_amount_minor' => 65000,
            'currency' => 'PHP',
            'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
            'published_at' => now(),
        ]);
        DB::table('listings')->where('id', $listing['id'])->update([
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        $this->post(route('deal-chains.authorize'), [
            'items' => [['id' => (string) $listing['id'], 'quantity' => 1]],
        ])->assertRedirect();
        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerUserId)->orderByDesc('created_at')->first();
        $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->first();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->first();
        $scope = json_decode((string) $invitation->scope, true);

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ])->assertOk()->assertJsonPath('data.need_status', 'awaiting_customer_confirmation');

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $from = now()->addHours(3)->startOfHour();
        $to = $from->copy()->addDays(2);
        $slotsUrl = route('appointments.slots', ['listing' => $listing['id']]).'?'.http_build_query([
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'listing_version_id' => (string) $version->id,
        ]);
        $slotsResponse = $this->getJson($slotsUrl)->assertOk();
        $appointmentStart = (string) $slotsResponse->json('data.slots.0.starts_at');
        $holdResponse = $this->postJson(route('appointments.holds', ['listing' => $listing['id']]), [
            'starts_at' => $appointmentStart,
            'listing_version_id' => (string) $version->id,
            'idempotency_key' => 'deal-chain-a3-hold-'.Str::uuid7(),
        ])->assertCreated();
        $hold = $holdResponse->json('data');

        $response = $this->postJson(route('deal-chains.needs.confirm-agreement', [
            'dealChain' => $chain->id,
            'need' => $need->id,
        ]), [
            'invitation_id' => (string) $invitation->id,
            'expected_need_version' => 2,
            'terms_hash' => $scope['terms_hash'],
            'capacity_hash' => $scope['capacity_hash'],
            'appointment_reservation_id' => $hold['id'],
        ])->assertOk();
        $orderId = (string) $response->json('data.order_id');
        $workId = (string) $response->json('data.work_instance_id');
        $reservation = DB::table('appointment_reservations')->where('id', $hold['id'])->first();
        $work = DB::table('work_instances')->where('id', $workId)->first();

        expect($reservation->status)->toBe('committed')
            ->and($reservation->order_id)->toBe($orderId)
            ->and($reservation->work_instance_id)->toBe($workId)
            ->and(strtotime((string) $work->scheduled_at))->toBe(strtotime((string) $hold['starts_at']))
            ->and($work->status)->toBe('scheduled')
            ->and(DB::table('payment_obligations')->where('order_id', $orderId)->value('status'))->toBe('not_due')
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $need->id)->value('appointment_reservation_id'))->toBe($hold['id']);
    }
}

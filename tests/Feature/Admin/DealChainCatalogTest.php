<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Database\Seeders\DealChainCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DealChainCatalogTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        app(DealChainCatalogSeeder::class)->run();
    }

    private function createAdmin(): User
    {
        return User::factory()->create([
            'status' => 'active',
            'primary_access_tier' => 'L4',
            'locale' => 'en',
            'timezone' => 'Asia/Manila',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
        ]);
    }

    private function createRegularUser(): User
    {
        return User::factory()->create([
            'status' => 'active',
            'primary_access_tier' => 'L1',
            'locale' => 'en',
            'timezone' => 'Asia/Manila',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function executableRecipePayload(): array
    {
        return [
            'title' => 'Primary anchor regression recipe',
            'pattern' => 'repair',
            'description' => 'A published recipe with an explicitly selected primary.',
            'category_codes' => ['repairs'],
            'listing_types' => ['service'],
            'work_shapes' => ['A1'],
            'extra_fee_amount_minor' => 0,
            'nodes' => [
                [
                    'key' => 'support_step',
                    'need_kind' => 'service',
                    'title' => 'Supporting provider',
                    'is_primary' => false,
                    'frontend' => ['role' => 'Support', 'title' => 'Supporting provider', 'sub' => 'Support', 'type' => 'labor'],
                ],
                [
                    'key' => 'primary_step',
                    'need_kind' => 'service',
                    'title' => 'Primary provider',
                    'is_primary' => true,
                    'frontend' => ['role' => 'Primary', 'title' => 'Primary provider', 'sub' => 'Primary', 'type' => 'labor'],
                ],
            ],
            'dependencies' => [],
        ];
    }

    private function publishedVersionCount(string $recipeCode): int
    {
        return DB::table('deal_chain_catalog_versions')->where('recipe_code', $recipeCode)->count();
    }

    public function test_it_rejects_executable_recipes_without_exactly_one_explicit_primary(): void
    {
        $admin = $this->createAdmin();
        $recipeCode = 'turnkey_parts';
        $currentVersion = (int) DB::table('deal_chain_catalog_versions')->where('recipe_code', $recipeCode)->max('catalog_version');
        $originalCount = $this->publishedVersionCount($recipeCode);

        foreach (['zero', 'multiple', 'omitted'] as $case) {
            $payload = $this->executableRecipePayload();
            $payload['expected_catalog_version'] = $currentVersion;

            if ($case === 'zero') {
                $payload['nodes'][1]['is_primary'] = false;
            } elseif ($case === 'multiple') {
                $payload['nodes'][0]['is_primary'] = true;
            } else {
                unset($payload['nodes'][1]['is_primary']);
            }

            $response = $this->actingAs($admin)->postJson(
                "/admin/catalogs/deal-chains/recipes/{$recipeCode}/publish", $payload,
            );
            $errorField = $case === 'omitted' ? 'nodes.1.is_primary' : 'nodes';
            $response->assertUnprocessable()->assertJsonValidationErrors($errorField);
            self::assertSame($originalCount, $this->publishedVersionCount($recipeCode));
        }
    }

    public function test_it_rejects_unknown_destination_and_stale_expected_catalog_version_without_appending(): void
    {
        $admin = $this->createAdmin();
        $payload = $this->executableRecipePayload();
        $payload['expected_catalog_version'] = 1;
        $before = $this->publishedVersionCount('turnkey_parts');

        $this->actingAs($admin)
            ->postJson('/admin/catalogs/deal-chains/recipes/not_a_recipe/publish', $payload)
            ->assertNotFound();
        $this->actingAs($admin)
            ->postJson('/admin/catalogs/deal-chains/recipes/Turnkey_Parts/publish', $payload)
            ->assertNotFound();

        $payload['expected_catalog_version'] = (int) DB::table('deal_chain_catalog_versions')->where('recipe_code', 'turnkey_parts')->max('catalog_version') + 1;
        $this->actingAs($admin)
            ->postJson('/admin/catalogs/deal-chains/recipes/turnkey_parts/publish', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('expected_catalog_version');

        self::assertSame($before, $this->publishedVersionCount('turnkey_parts'));
    }

    public function test_it_rejects_new_recipe_code_collision_instead_of_appending_a_version(): void
    {
        $admin = $this->createAdmin();
        $payload = $this->executableRecipePayload();
        $payload['recipe_code'] = 'turnkey_parts';
        $before = $this->publishedVersionCount('turnkey_parts');

        $this->actingAs($admin)
            ->postJson('/admin/catalogs/deal-chains/recipes', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('recipe_code');

        self::assertSame($before, $this->publishedVersionCount('turnkey_parts'));
    }

    public function test_it_denies_suspended_staff_mutation_without_changing_recipe_history(): void
    {
        $admin = $this->createAdmin();
        $admin->forceFill(['status' => 'suspended'])->save();
        $recipeCode = 'turnkey_parts';
        $before = $this->publishedVersionCount($recipeCode);
        $payload = $this->executableRecipePayload();
        $payload['expected_catalog_version'] = (int) DB::table('deal_chain_catalog_versions')->where('recipe_code', $recipeCode)->max('catalog_version');

        $this->actingAs($admin)
            ->postJson("/admin/catalogs/deal-chains/recipes/{$recipeCode}/publish", $payload)
            ->assertForbidden();

        self::assertSame($before, $this->publishedVersionCount($recipeCode));
    }

    public function test_it_denies_regular_user_recipe_mutation_without_changing_history(): void
    {
        $user = $this->createRegularUser();
        $recipeCode = 'turnkey_parts';
        $before = $this->publishedVersionCount($recipeCode);
        $payload = $this->executableRecipePayload();
        $payload['expected_catalog_version'] = (int) DB::table('deal_chain_catalog_versions')->where('recipe_code', $recipeCode)->max('catalog_version');

        $this->actingAs($user)
            ->postJson("/admin/catalogs/deal-chains/recipes/{$recipeCode}/publish", $payload)
            ->assertForbidden();

        self::assertSame($before, $this->publishedVersionCount($recipeCode));
    }

    public function test_it_redirects_unauthenticated_guests_to_signin(): void
    {
        $response = $this->get('/admin/catalogs/deal-chains');

        $response->assertRedirect(route('auth.sign-in'));
    }

    public function test_it_denies_non_admin_users_with_403(): void
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user)->get('/admin/catalogs/deal-chains');

        $response->assertStatus(403);
    }

    public function test_it_allows_admin_to_view_catalog_studio_with_live_props(): void
    {
        $admin = $this->createAdmin();

        $manifestPath = public_path('build/manifest.json');
        $inertiaVersion = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : null;

        $response = $this->actingAs($admin)->withHeaders(array_filter([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => $inertiaVersion,
        ]))->get('/admin/catalogs/deal-chains');
        $response->assertStatus(200);
        self::assertSame('Admin/Catalogs/DealChainStudio', $response->json('component'));

        $props = $response->json('props');
        self::assertArrayHasKey('dealChainCatalog', $props);
        self::assertArrayHasKey('partnerCandidates', $props);
        self::assertArrayHasKey('availableCategories', $props);
        self::assertNotEmpty($props['dealChainCatalog']);
    }

    public function test_explicit_false_primary_is_not_overridden_by_legacy_primary_templates(): void
    {
        $recipeCode = 'explicit_false_legacy_marker';
        $now = now();
        DB::table('deal_chain_catalog_versions')->insert([
            'id' => (string) Str::uuid7(),
            'recipe_code' => $recipeCode,
            'catalog_version' => 1,
            'title' => 'Explicit marker precedence',
            'pattern' => 'repair',
            'description' => 'Explicit selection overrides legacy sentinels.',
            'status' => 'published',
            'category_codes' => json_encode(['repairs'], JSON_THROW_ON_ERROR),
            'listing_types' => json_encode(['service'], JSON_THROW_ON_ERROR),
            'work_shapes' => json_encode(['A1'], JSON_THROW_ON_ERROR),
            'extra_fee_amount_minor' => 0,
            'currency' => 'PHP',
            'rating' => 0,
            'booked_count' => 0,
            'definition' => json_encode([
                'nodes' => [
                    [
                        'key' => 'historical_template',
                        'is_primary' => false,
                        'title_template' => 'primary_listing',
                        'need_kind_template' => 'primary_listing',
                        'need_kind' => 'service',
                        'title' => 'Historical non-primary',
                        'frontend' => ['role' => 'Support', 'title' => 'Historical non-primary', 'type' => 'labor'],
                    ],
                    [
                        'key' => 'selected',
                        'is_primary' => true,
                        'need_kind' => 'service',
                        'title' => 'Selected primary',
                        'frontend' => ['role' => 'Primary', 'title' => 'Selected primary', 'type' => 'labor'],
                    ],
                ],
                'dependencies' => [],
            ], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $recipe = collect(app(DealChainCatalog::class)->frontend())
            ->firstWhere('recipeId', $recipeCode);

        self::assertFalse(collect($recipe['nodes'])->firstWhere('key', 'historical_template')['isPrimary']);
        self::assertSame('selected', collect($recipe['nodes'])->firstWhere('isPrimary', true)['key']);
    }

    public function test_it_publishes_a_new_version_of_an_existing_recipe_incrementing_catalog_version(): void
    {
        $admin = $this->createAdmin();

        $recipeCode = 'turnkey_parts';
        $currentMax = (int) DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->max('catalog_version');
        $previousVersion = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->where('catalog_version', $currentMax)
            ->first();

        $payload = [
            'expected_catalog_version' => $currentMax,
            'title' => 'Updated All-In Parts, Courier & Labor Relay',
            'pattern' => 'repair',
            'description' => 'Tested genuine parts sourced, transported by courier, and installed on site.',
            'category_codes' => ['repairs', 'local-services'],
            'listing_types' => ['service'],
            'work_shapes' => ['A1', 'A3'],
            'extra_fee_amount_minor' => 25000,
            'nodes' => [
                [
                    'key' => 'store_step',
                    'need_kind' => 'product',
                    'title' => '35uF AC Run Capacitor',
                    'description_template' => 'Counter pickup at Tagudin hardware',
                    'is_primary' => false,
                    'frontend' => [
                        'role' => 'Hardware Supply',
                        'title' => 'Tagudin Hardware Depot',
                        'sub' => 'Part supply required',
                        'type' => 'store',
                    ],
                ],
                [
                    'key' => 'transit_step',
                    'need_kind' => 'service',
                    'title' => 'Motorcycle Transit',
                    'description_template' => 'Doorstep parts delivery to site',
                    'is_primary' => false,
                    'frontend' => [
                        'role' => 'Courier Runner',
                        'title' => 'Danny Express Motorcycle Pool',
                        'sub' => 'Moto courier transit',
                        'type' => 'delivery',
                    ],
                ],
                [
                    'key' => 'labor_step',
                    'need_kind' => 'service',
                    'title' => 'AC Installation Labor',
                    'description_template' => 'Disassemble casing and wire capacitor',
                    'is_primary' => true,
                    'frontend' => [
                        'role' => 'AC Technician',
                        'title' => 'Arman Electric & Refrigeration',
                        'sub' => 'Trade labor required',
                        'type' => 'labor',
                    ],
                ],
            ],
            'dependencies' => [
                [
                    'predecessor' => 'store_step',
                    'successor' => 'transit_step',
                    'condition_code' => 'source_ready',
                    'allow_bypass' => false,
                ],
                [
                    'predecessor' => 'transit_step',
                    'successor' => 'labor_step',
                    'condition_code' => 'delivered_to_site',
                    'allow_bypass' => false,
                ],
            ],
        ];

        $response = $this->actingAs($admin)
            ->post("/admin/catalogs/deal-chains/recipes/{$recipeCode}/publish", $payload);

        $response->assertRedirect(route('admin.catalogs.deal-chains'));

        $newMax = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->max('catalog_version');

        self::assertSame($currentMax + 1, $newMax);

        $inserted = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->where('catalog_version', $newMax)
            ->first();

        self::assertNotNull($inserted);
        self::assertSame('published', $inserted->status);
        self::assertSame('Updated All-In Parts, Courier & Labor Relay', $inserted->title);
        self::assertSame(25000, (int) $inserted->extra_fee_amount_minor);

        $decodedDef = json_decode($inserted->definition, true);
        self::assertCount(3, $decodedDef['nodes']);
        self::assertCount(2, $decodedDef['dependencies']);
        self::assertSame('store_step', $decodedDef['dependencies'][0]['predecessor']);
        self::assertSame('transit_step', $decodedDef['dependencies'][0]['successor']);
        $decodedPrimary = collect($decodedDef['nodes'])->firstWhere('key', 'labor_step');
        self::assertTrue($decodedPrimary['is_primary']);

        $publicRecipe = collect(app(DealChainCatalog::class)->frontend())
            ->firstWhere('recipeId', $recipeCode);
        self::assertSame('labor_step', collect($publicRecipe['nodes'])->firstWhere('isPrimary', true)['key']);
        self::assertSame(
            $previousVersion->definition,
            DB::table('deal_chain_catalog_versions')
                ->where('recipe_code', $recipeCode)
                ->where('catalog_version', $currentMax)
                ->value('definition'),
        );

        $this->actingAs($admin)
            ->postJson("/admin/catalogs/deal-chains/recipes/{$recipeCode}/publish", $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('expected_catalog_version');
        self::assertSame((int) $newMax, (int) DB::table('deal_chain_catalog_versions')->where('recipe_code', $recipeCode)->max('catalog_version'));
    }

    public function test_it_creates_a_new_recipe_archetype_at_version_1(): void
    {
        $admin = $this->createAdmin();

        $newRecipeCode = 'tagudin_fresh_catch_relay';

        $payload = [
            'recipe_code' => $newRecipeCode,
            'title' => 'Coastal Fresh Fish Direct Shuttle & Processing',
            'pattern' => 'fishery',
            'description' => 'Direct port catch transit and market stall cleaning.',
            'category_codes' => ['local-food'],
            'listing_types' => ['product', 'service'],
            'work_shapes' => ['A2', 'A4'],
            'extra_fee_amount_minor' => 15000,
            'nodes' => [
                [
                    'key' => 'port_catch',
                    'need_kind' => 'product',
                    'title' => 'Tagudin Port Fresh Catch',
                    'description_template' => 'Direct from fisher landing',
                    'is_primary' => true,
                    'frontend' => [
                        'role' => 'Fisher Merchant',
                        'title' => 'Farola Fisherman Landing',
                        'sub' => 'Fresh catch supply',
                        'type' => 'store',
                    ],
                ],
                [
                    'key' => 'ice_transit',
                    'need_kind' => 'service',
                    'title' => 'Insulated Cooler Trike',
                    'description_template' => 'Cold transit to central market',
                    'is_primary' => false,
                    'frontend' => [
                        'role' => 'Cold Transit',
                        'title' => 'Tagudin Ice Runner Pool',
                        'sub' => 'Insulated freight',
                        'type' => 'delivery',
                    ],
                ],
            ],
            'dependencies' => [
                [
                    'predecessor' => 'port_catch',
                    'successor' => 'ice_transit',
                    'condition_code' => 'source_ready',
                    'allow_bypass' => false,
                ],
            ],
        ];

        $response = $this->actingAs($admin)
            ->post('/admin/catalogs/deal-chains/recipes', $payload);

        $response->assertRedirect(route('admin.catalogs.deal-chains'));

        $inserted = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $newRecipeCode)
            ->where('catalog_version', 1)
            ->first();

        self::assertNotNull($inserted);
        self::assertSame('published', $inserted->status);
        self::assertSame('Coastal Fresh Fish Direct Shuttle & Processing', $inserted->title);
    }

    public function test_it_rejects_cyclic_dependency_graphs(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'recipe_code' => 'cyclic_relay',
            'title' => 'Cyclic Broken Relay',
            'pattern' => 'broken',
            'description' => 'Should fail due to loop.',
            'category_codes' => ['repairs'],
            'listing_types' => ['service'],
            'work_shapes' => ['A1'],
            'extra_fee_amount_minor' => 5000,
            'nodes' => [
                [
                    'key' => 'node_a',
                    'need_kind' => 'service',
                    'title' => 'Node A',
                    'is_primary' => true,
                    'frontend' => ['role' => 'Labor', 'title' => 'A', 'type' => 'labor'],
                ],
                [
                    'key' => 'node_b',
                    'need_kind' => 'service',
                    'title' => 'Node B',
                    'is_primary' => false,
                    'frontend' => ['role' => 'Courier', 'title' => 'B', 'type' => 'delivery'],
                ],
            ],
            'dependencies' => [
                ['predecessor' => 'node_a', 'successor' => 'node_b', 'condition_code' => 'step_1_ready'],
                ['predecessor' => 'node_b', 'successor' => 'node_a', 'condition_code' => 'step_2_ready'], // CYCLE!
            ],
        ];

        $response = $this->actingAs($admin)
            ->post('/admin/catalogs/deal-chains/recipes', $payload);

        $response->assertSessionHasErrors('dependencies');
    }

    public function test_it_rejects_self_referencing_dependencies(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'recipe_code' => 'self_loop_relay',
            'title' => 'Self Loop Relay',
            'pattern' => 'broken',
            'description' => 'Should fail due to self-referencing dependency.',
            'category_codes' => ['repairs'],
            'listing_types' => ['service'],
            'work_shapes' => ['A1'],
            'extra_fee_amount_minor' => 5000,
            'nodes' => [
                [
                    'key' => 'node_a',
                    'need_kind' => 'service',
                    'title' => 'Node A',
                    'is_primary' => true,
                    'frontend' => ['role' => 'Labor', 'title' => 'A', 'type' => 'labor'],
                ],
                [
                    'key' => 'node_b',
                    'need_kind' => 'service',
                    'title' => 'Node B',
                    'is_primary' => false,
                    'frontend' => ['role' => 'Courier', 'title' => 'B', 'type' => 'delivery'],
                ],
            ],
            'dependencies' => [
                ['predecessor' => 'node_a', 'successor' => 'node_a', 'condition_code' => 'loop'],
            ],
        ];

        $response = $this->actingAs($admin)
            ->post('/admin/catalogs/deal-chains/recipes', $payload);

        $response->assertSessionHasErrors();
    }

    public function test_catalog_staging_uses_the_published_nonfirst_primary_for_source_assignment(): void
    {
        $admin = $this->createAdmin();
        $payload = $this->executableRecipePayload();
        $payload['recipe_code'] = 'explicit_primary_staging';
        $this->actingAs($admin)->postJson('/admin/catalogs/deal-chains/recipes', $payload)->assertCreated();
        $owner = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = app(CreateListingDraft::class)->handle(
            new ResourceActor($owner->id, $owner->id),
            [
                'title' => 'Actual source-owned service', 'description' => 'Synthetic published catalog staging regression.',
                'category_code' => 'repairs', 'listing_type' => 'service', 'work_shape' => 'A1',
                'package_tiers' => [['id' => 'standard', 'title' => 'Standard', 'price' => 250]],
            ],
            (string) Str::uuid7(),
        );
        DB::table('listings')->where('id', $listing['id'])->update(['status' => 'active', 'review_status' => 'approved']);
        DB::table('listing_versions')->where('listing_id', $listing['id'])->update(['published_at' => now()]);
        $version = DB::table('listing_versions')->where('listing_id', $listing['id'])->sole();

        $staged = app(StageDealChain::class)->handle($buyer->id, [[
            'id' => $listing['id'], 'listing_version_id' => $version->id,
            'quantity' => 1, 'package_id' => 'standard', 'deal_chain' => 'explicit_primary_staging',
        ]], 'catalog-primary-stage-'.Str::uuid7(), (string) Str::uuid7());

        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertSame(['support_step', 'primary_step'], $needs->pluck('node_key')->all());
        self::assertSame('Actual source-owned service', $needs[1]->title);
        $this->assertDatabaseHas('deal_invitations', [
            'deal_need_id' => $needs[1]->id, 'invited_provider_user_id' => $owner->id,
            'purpose' => 'primary_listing_assignment',
        ]);
        $this->assertDatabaseMissing('deal_invitations', ['deal_need_id' => $needs[0]->id]);
        $this->assertDatabaseMissing('orders', ['deal_chain_id' => $staged['deal_chain_id']]);
    }

    public function test_it_rejects_duplicate_node_keys(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'recipe_code' => 'dup_node_relay',
            'title' => 'Duplicate Node Relay',
            'pattern' => 'broken',
            'description' => 'Should fail due to duplicate keys.',
            'category_codes' => ['repairs'],
            'listing_types' => ['service'],
            'work_shapes' => ['A1'],
            'extra_fee_amount_minor' => 5000,
            'nodes' => [
                [
                    'key' => 'duplicate_key',
                    'need_kind' => 'service',
                    'title' => 'Node 1',
                    'is_primary' => true,
                    'frontend' => ['role' => 'Labor', 'title' => '1', 'type' => 'labor'],
                ],
                [
                    'key' => 'duplicate_key', // DUPLICATE!
                    'need_kind' => 'service',
                    'title' => 'Node 2',
                    'is_primary' => false,
                    'frontend' => ['role' => 'Courier', 'title' => '2', 'type' => 'delivery'],
                ],
            ],
            'dependencies' => [],
        ];

        $response = $this->actingAs($admin)
            ->post('/admin/catalogs/deal-chains/recipes', $payload);

        $response->assertSessionHasErrors('nodes.1.key');
    }

    public function test_partner_candidates_are_real_current_role_eligible_truthful_listings(): void
    {
        $owner = $this->createRegularUser();
        $actor = new ResourceActor($owner->id, $owner->id);
        $createActiveListing = function (string $title, ?int $priceAmountMinor) use ($actor): array {
            $attributes = [
                'title' => $title,
                'description' => 'Candidate supply regression fixture.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A1',
            ];
            if ($priceAmountMinor !== null) {
                $attributes['price_amount_minor'] = $priceAmountMinor;
            }

            $listing = app(CreateListingDraft::class)->handle($actor, $attributes, (string) Str::uuid7());
            DB::table('listings')->where('id', $listing['id'])->update([
                'status' => 'active',
                'review_status' => 'approved',
            ]);

            return $listing;
        };

        $audit = $createActiveListing('Residential safety audit service', 12500);
        $recycle = $createActiveListing('Appliance recycle pickup service', 0);
        $unpriced = $createActiveListing('Unpriced repair service', null);
        $candidates = app(DealChainCatalog::class)->partnerListings();
        $byId = collect($candidates)->keyBy('listingId');

        self::assertSame('audit', $byId[$audit['id']]['role']);
        self::assertSame('recycle', $byId[$recycle['id']]['role']);
        self::assertSame(0, $byId[$recycle['id']]['feeMinor']);
        self::assertSame(0, $byId[$recycle['id']]['price']);
        self::assertNull($byId[$unpriced['id']]['feeMinor']);
        self::assertNull($byId[$unpriced['id']]['price']);
        self::assertSame(
            DB::table('listing_versions')->where('listing_id', $audit['id'])->value('id'),
            $byId[$audit['id']]['listingVersionId'],
        );
        self::assertSame(0, $byId[$unpriced['id']]['reviewsCount']);
        self::assertTrue(collect($candidates)->every(
            fn (array $candidate): bool => Str::isUuid($candidate['listingId']),
        ));
        self::assertSame(
            count($candidates),
            DB::table('listings')->whereIn('id', array_column($candidates, 'listingId'))->count(),
        );
    }

    public function test_frontend_catalog_canonicalizes_historical_conditions_without_rewriting_them(): void
    {
        $recipes = collect(app(DealChainCatalog::class)->frontend())->keyBy('recipeId');
        $productDependencies = collect($recipes['courier_delivery']['dependencies']);
        $auditDependencies = collect($recipes['safety_audit']['dependencies']);

        self::assertSame('part_ready', $productDependencies
            ->firstWhere('predecessorId', 'store')['conditionCode']);
        self::assertSame('work_completed', $auditDependencies
            ->firstWhere('predecessorId', 'primary')['conditionCode']);
        self::assertSame('part_ready', collect($recipes['courier_delivery']['rawDefinition']['dependencies'])
            ->firstWhere('predecessor', 'store')['condition_code']);

        $storedProductDefinition = json_decode(
            (string) DB::table('deal_chain_catalog_versions')->where('recipe_code', 'courier_delivery')->where('catalog_version', 1)->value('definition'),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
        $storedAuditDefinition = json_decode(
            (string) DB::table('deal_chain_catalog_versions')->where('recipe_code', 'safety_audit')->where('catalog_version', 1)->value('definition'),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
        self::assertSame('source_ready', collect($storedProductDefinition['dependencies'])
            ->firstWhere('predecessor', 'store')['condition_code']);
        self::assertSame('labor_ready', collect($storedAuditDefinition['dependencies'])
            ->firstWhere('predecessor', 'primary')['condition_code']);
    }
}

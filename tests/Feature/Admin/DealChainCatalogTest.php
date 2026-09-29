<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
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

    public function test_it_publishes_a_new_version_of_an_existing_recipe_incrementing_catalog_version(): void
    {
        $admin = $this->createAdmin();

        $recipeCode = 'turnkey_parts';
        $currentMax = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->max('catalog_version') ?? 1;

        $payload = [
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
                    'frontend' => ['role' => 'Labor', 'title' => 'A', 'type' => 'labor'],
                ],
                [
                    'key' => 'node_b',
                    'need_kind' => 'service',
                    'title' => 'Node B',
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
                    'frontend' => ['role' => 'Labor', 'title' => 'A', 'type' => 'labor'],
                ],
                [
                    'key' => 'node_b',
                    'need_kind' => 'service',
                    'title' => 'Node B',
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
                    'frontend' => ['role' => 'Labor', 'title' => '1', 'type' => 'labor'],
                ],
                [
                    'key' => 'duplicate_key', // DUPLICATE!
                    'need_kind' => 'service',
                    'title' => 'Node 2',
                    'frontend' => ['role' => 'Courier', 'title' => '2', 'type' => 'delivery'],
                ],
            ],
            'dependencies' => [],
        ];

        $response = $this->actingAs($admin)
            ->post('/admin/catalogs/deal-chains/recipes', $payload);

        $response->assertSessionHasErrors('nodes.1.key');
    }
}

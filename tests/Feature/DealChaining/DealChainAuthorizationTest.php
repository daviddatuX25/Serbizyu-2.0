<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
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
            ->and($needs[3]->status)->toBe('open');

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
}

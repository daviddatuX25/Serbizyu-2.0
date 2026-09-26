<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * Edge B: Multi-Party Deal-Chain Interactive Flow & Verification.
 *
 * Verifies that the coordinator can inspect their staged Deal-Chain
 * on GET /deal-chains/{dealChain} with full slots, dependencies, and roles,
 * while unauthorized users are prevented from snooping.
 */
final class DealChainDetailViewTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Deal Chain Detail view tests require PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
        app(FixtureRepository::class)->ensure();
    }

    public function test_unauthenticated_user_is_redirected_to_sign_in(): void
    {
        $this->get('/deal-chains/'.Str::uuid7())
            ->assertRedirect(route('auth.sign-in'));
    }

    public function test_coordinator_views_their_deal_chain_with_slots_and_dependencies(): void
    {
        $buyerUserId = $this->authenticateBuyer();

        // 1. Authorize a multi-party Deal-Chain (AC clean + parts + courier)
        $authResponse = $this->post(route('deal-chains.authorize'), [
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

        self::assertNotNull($chain);
        $authResponse->assertRedirect(route('deal-chains.show', ['dealChain' => $chain->id]));

        // 2. Load the interactive DealChainDetail page via Inertia
        $response = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-chains.show', ['dealChain' => $chain->id]));

        $response->assertOk();
        self::assertSame('Orders/DealChainDetail', $response->json('component'));

        // 3. Verify props structure
        $props = $response->json('props');
        self::assertArrayHasKey('chain', $props);
        self::assertArrayHasKey('slots', $props);
        self::assertArrayHasKey('dependencies', $props);

        // Verify chain details
        self::assertSame((string) $chain->id, $props['chain']['id']);
        self::assertSame('sourcing', $props['chain']['status']);
        self::assertSame('pending_child_agreements', $props['chain']['financial_state']);

        // Verify slots: 3 from turnkey_parts (Labor, Parts, Padala) + 1 extra item = 4 slots
        $slots = $props['slots'];
        self::assertCount(4, $slots);
        $roles = collect($slots)->pluck('need_kind')->all();
        self::assertContains('service', $roles);
        self::assertContains('product', $roles);
        // Verify dependency DAG
        $dependencies = $props['dependencies'];
        self::assertNotEmpty($dependencies);
        foreach ($dependencies as $dep) {
            self::assertSame('blocks', $dep['dependency_type']);
            self::assertSame('active', $dep['status']);
        }
    }

    public function test_unrelated_user_cannot_view_another_buyers_deal_chain(): void
    {
        $coordinatorId = $this->authenticateBuyer();

        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $coordinatorId)
            ->first();

        if ($chain === null) {
            $this->post(route('deal-chains.authorize'), [
                'items' => [
                    [
                        'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                        'quantity' => 1,
                        'deal_chain' => 'turnkey_parts',
                    ],
                ],
            ]);

            $chain = DB::table('deal_chains')
                ->where('coordinator_user_id', $coordinatorId)
                ->orderByDesc('created_at')
                ->first();
        }

        self::assertNotNull($chain);

        // Create and authenticate an unrelated second buyer with unique random phone
        $strangerPhone = '+63917'.rand(2000000, 8999999);
        $strangerId = (string) Str::uuid7();
        $now = now();
        DB::table('users')->insert([
            'id' => $strangerId,
            'phone_e164' => $strangerPhone,
            'status' => 'active',
            'primary_access_tier' => 'L0',
            'locale' => 'en',
            'version' => 1,
            'phone_verified_at' => $now,
            'correlation_id' => $strangerId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $stranger = User::findOrFail($strangerId);

        // Stranger attempting to view coordinator's deal chain gets 404
        $this->actingAs($stranger)
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertNotFound();
    }
}

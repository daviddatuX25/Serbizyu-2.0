<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
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
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]).'?view=worker&worker=coordinator')
            ->assertNotFound();
    }

    public function test_formed_provider_receives_only_own_terms_and_shared_readiness_even_with_worker_query_spoof(): void
    {
        $coordinatorId = $this->authenticateBuyer();
        $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'quantity' => 1,
                'deal_chain' => 'turnkey_parts',
            ]],
        ]);
        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $coordinatorId)
            ->orderByDesc('created_at')
            ->firstOrFail();
        $needs = DB::table('deal_needs')
            ->where('deal_chain_id', $chain->id)
            ->orderBy('ordinal')
            ->limit(2)
            ->get();
        self::assertCount(2, $needs);

        $now = now();
        $providers = [];
        foreach (['+639170000241', '+639170000242'] as $index => $phone) {
            $providerId = (string) Str::uuid7();
            DB::table('users')->insert([
                'id' => $providerId,
                'phone_e164' => $phone,
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'en',
                'version' => 1,
                'phone_verified_at' => $now,
                'correlation_id' => $providerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $providers[] = User::findOrFail($providerId);

            $orderId = (string) Str::uuid7();
            DB::table('orders')->insert([
                'id' => $orderId,
                'buyer_user_id' => $coordinatorId,
                'provider_user_id' => $providerId,
                'status' => 'accepted',
                'version' => 1,
                'mechanism' => 'deal_chain',
                'origin' => 'deal_chain',
                'deal_chain_id' => $chain->id,
                'public_reference' => $index === 0 ? 'ORD-PRIVACY-OWN' : 'ORD-PRIVACY-SIBLING',
                'deal_need_id' => $needs[$index]->id,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $termsSnapshotId = (string) Str::uuid7();
            DB::table('order_terms_snapshots')->insert([
                'id' => $termsSnapshotId,
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'scope' => json_encode(['title' => 'private agreement '.$index], JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => 25000 + ($index * 13000),
                'currency' => 'PHP',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode([], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode([], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'accepted_by_user_id' => $providers[$index]->id,
                'accepted_at' => $now,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
            ]);
            DB::table('orders')->where('id', $orderId)->update([
                'current_terms_snapshot_id' => $termsSnapshotId,
                'accepted_at' => $now,
            ]);
            DB::table('payment_obligations')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'purpose' => 'primary_consideration',
                'status' => $index === 0 ? 'not_due' : 'due',
                'lane' => 'external_cash',
                'due_condition' => 'on_work_acceptance',
                'due_at' => $index === 0 ? null : $now,
                'amount_minor' => 25000 + ($index * 13000),
                'currency' => 'PHP',
                'payer_user_id' => $coordinatorId,
                'recipient_user_id' => $providerId,
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $this->actingAs($providers[0])
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]).'?view=project&worker='.$providers[1]->phone_e164)
            ->assertOk()
            ->assertJsonPath('props.view', 'worker')
            ->assertJsonPath('props.slots.0.can_view_order', true)
            ->assertJsonPath('props.slots.0.order_reference', 'ORD-PRIVACY-OWN')
            ->assertJsonPath('props.slots.0.payment_obligation_status', 'not_due')
            ->assertJsonPath('props.slots.0.listing_title', 'private agreement 0')
            ->assertJsonMissingPath('props.slots.1.amount_minor')
            ->assertJsonMissingPath('props.slots.1.payment_obligation_status')
            ->assertJsonMissingPath('props.slots.1.child_order_status')
            ->assertJsonMissingPath('props.slots.1.provider_phone')
            ->assertJsonMissingPath('props.slots.1.description')
            ->assertJsonMissingPath('props.slots.1.currency')
            ->assertJsonMissingPath('props.slots.1.amount_source')
            ->assertJsonMissingPath('props.chain.total_budget_amount')
            ->assertJsonMissingPath('props.chain.currency_code')
            ->assertJsonPath('props.slots.1.can_view_order', false);

        $rawProps = json_encode(
            $this->get(route('deal-chains.show', ['dealChain' => $chain->id]).'?view=worker&worker='.$providers[1]->phone_e164)
                ->json('props'),
            JSON_THROW_ON_ERROR,
        );
        self::assertStringNotContainsString('private agreement 1', $rawProps);
        self::assertStringNotContainsString('38000', $rawProps);
        self::assertStringNotContainsString($providers[1]->phone_e164, $rawProps);

        $this->actingAs($providers[1])
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertOk()
            ->assertJsonPath('props.slots.1.amount_minor', 38000)
            ->assertJsonPath('props.slots.1.listing_title', 'private agreement 1')
            ->assertJsonPath('props.slots.1.order_reference', 'ORD-PRIVACY-SIBLING')
            ->assertJsonMissingPath('props.slots.0.amount_minor');
        $this->actingAs(User::findOrFail($coordinatorId))
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertOk()
            ->assertJsonPath('props.view', 'project')
            ->assertJsonPath('props.chain.total_budget_amount', 630)
            ->assertJsonPath('props.slots.0.amount_minor', 25000)
            ->assertJsonPath('props.slots.1.amount_minor', 38000)
            ->assertJsonPath('props.slots.1.payment_obligation_status', 'due')
            ->assertJsonPath('props.slots.1.provider_phone', $providers[1]->phone_e164);
    }

    public function test_invitation_only_provider_cannot_open_chain_page_and_spoofed_worker_is_not_authority(): void
    {
        $coordinatorId = $this->authenticateBuyer();
        $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'quantity' => 1,
                'deal_chain' => 'turnkey_parts',
            ]],
        ]);
        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $coordinatorId)
            ->orderByDesc('created_at')
            ->firstOrFail();
        $providerId = (string) Str::uuid7();
        $now = now();
        DB::table('users')->insert([
            'id' => $providerId,
            'phone_e164' => '+639170000243',
            'status' => 'active',
            'primary_access_tier' => 'L1',
            'locale' => 'en',
            'version' => 1,
            'phone_verified_at' => $now,
            'correlation_id' => $providerId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $invitee = User::findOrFail($providerId);
        $needId = (string) DB::table('deal_needs')
            ->where('deal_chain_id', $chain->id)
            ->orderBy('ordinal')
            ->value('id');
        $invitationId = (string) Str::uuid7();
        DB::table('deal_invitations')->insert([
            'id' => $invitationId,
            'deal_need_id' => $needId,
            'invited_provider_user_id' => $providerId,
            'invited_by_user_id' => $coordinatorId,
            'purpose' => 'deal_need_assignment',
            'scope' => json_encode([
                'title' => 'invited provider own terms',
                'amount_minor' => 2400,
                'currency' => 'PHP',
                'work_shape' => 'A1',
                'quantity' => 1,
            ], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'status' => 'sent',
            'expires_at' => $now->copy()->addDay(),
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->actingAs($invitee)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get(route('deal-invitations.index'))
            ->assertOk()
            ->assertJsonPath('props.invitations.0.id', $invitationId)
            ->assertJsonPath('props.invitations.0.terms.amount_minor', 2400)
            ->assertJsonPath('props.invitations.0.terms.title', 'invited provider own terms')
            ->assertJsonMissingPath('props.invitations.0.terms.payment_obligation_status');

        $this->actingAs($invitee)
            ->get(route('deal-chains.show', ['dealChain' => $chain->id]).'?view=worker&worker=anyone')
            ->assertNotFound();
    }

    public function test_password_authenticated_formed_providers_receive_only_their_real_order_terms(): void
    {
        $password = 'PrivacyProof9!Controlled';
        $coordinator = User::factory()->withEmailPassword('privacy-coordinator@example.test', $password)->create();
        $providers = [
            User::factory()->withEmailPassword('privacy-provider-one@example.test', $password)->create(),
            User::factory()->withEmailPassword('privacy-provider-two@example.test', $password)->create(),
        ];
        $prices = [25_000, 38_000];
        $listings = [];

        foreach ($providers as $index => $provider) {
            $listing = app(CreateListingDraft::class)->handle(
                new ResourceActor((string) $provider->id, (string) $provider->id),
                [
                    'title' => 'Privacy proof service '.$index,
                    'description' => 'Provider-authored service terms '.$index,
                    'category_code' => 'repairs',
                    'listing_type' => 'service',
                    'work_shape' => 'A1',
                ],
                (string) Str::uuid7(),
            );
            $version = DB::table('listing_versions')
                ->where('listing_id', $listing['id'])
                ->where('version_number', (int) $listing['current_version'])
                ->firstOrFail();
            DB::table('listing_versions')->where('id', $version->id)->update([
                'price_amount_minor' => $prices[$index],
                'currency' => 'PHP',
                'published_at' => now(),
            ]);
            DB::table('listings')->where('id', $listing['id'])->update([
                'status' => 'active',
                'review_status' => 'approved',
            ]);
            $listings[] = (string) $listing['id'];
        }

        $this->passwordLogin($coordinator, $password);
        $this->post(route('deal-chains.authorize'), [
            'items' => array_map(static fn (string $id): array => ['id' => $id, 'quantity' => 1], $listings),
        ])->assertRedirect();
        $chain = DB::table('deal_chains')
            ->where('coordinator_user_id', $coordinator->id)
            ->orderByDesc('created_at')
            ->firstOrFail();
        $invitations = DB::table('deal_invitations as invitations')
            ->join('deal_needs as needs', 'needs.id', '=', 'invitations.deal_need_id')
            ->where('needs.deal_chain_id', $chain->id)
            ->whereIn('needs.source_listing_id', $listings)
            ->orderBy('needs.ordinal')
            ->get(['invitations.*', 'needs.id as need_id', 'needs.ordinal']);
        self::assertCount(2, $invitations);

        foreach ($invitations as $invitation) {
            $provider = User::findOrFail((string) $invitation->invited_provider_user_id);
            $this->passwordLogout();
            $this->passwordLogin($provider, $password);
            $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
                'decision' => 'accept',
                'expected_version' => (int) $invitation->version,
            ], ['X-Idempotency-Key' => 'privacy-proof-'.(string) $invitation->id])
                ->assertOk()
                ->assertJsonPath('data.need_status', 'awaiting_customer_confirmation');

            $this->passwordLogout();
            $this->passwordLogin($coordinator, $password);
            $need = DB::table('deal_needs')->where('id', $invitation->need_id)->firstOrFail();
            $scope = is_array($invitation->scope)
                ? $invitation->scope
                : json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);
            $this->postJson(route('deal-chains.needs.confirm-agreement', [
                'dealChain' => $chain->id,
                'need' => $need->id,
            ]), [
                'invitation_id' => (string) $invitation->id,
                'expected_need_version' => (int) $need->version,
                'terms_hash' => $scope['terms_hash'],
                'capacity_hash' => $scope['capacity_hash'],
            ])->assertOk();
        }

        $orders = DB::table('orders')->where('deal_chain_id', $chain->id)->get()->keyBy('deal_need_id');
        self::assertCount(2, $orders);
        foreach ($invitations as $index => $invitation) {
            self::assertSame($prices[$index], (int) DB::table('order_terms_snapshots')
                ->where('order_id', $orders->get($invitation->need_id)->id)
                ->value('amount_minor'));
        }

        foreach ($invitations as $index => $invitation) {
            $provider = User::findOrFail((string) $invitation->invited_provider_user_id);
            $this->passwordLogout();
            $this->passwordLogin($provider, $password);
            $response = $this->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])->get(route('deal-chains.show', ['dealChain' => $chain->id]).'?view=project&worker='.$providers[1 - $index]->phone_e164);

            $response->assertOk()
                ->assertJsonPath('props.view', 'worker')
                ->assertJsonPath('props.slots.'.($invitation->ordinal - 1).'.can_view_order', true)
                ->assertJsonPath('props.slots.'.($invitation->ordinal - 1).'.amount_minor', $prices[$index])
                ->assertJsonMissingPath('props.chain.total_budget_amount');
            $props = $response->json('props');
            foreach ($props['slots'] as $slot) {
                if ($slot['id'] === (string) $invitation->need_id) {
                    continue;
                }
                self::assertArrayNotHasKey('amount_minor', $slot);
                self::assertArrayNotHasKey('payment_obligation_status', $slot);
                self::assertArrayNotHasKey('provider_phone', $slot);
                self::assertFalse($slot['can_view_order']);
            }
            $rawProps = json_encode($props, JSON_THROW_ON_ERROR);
            self::assertStringNotContainsString((string) $prices[1 - $index], $rawProps);
            self::assertStringNotContainsString((string) $providers[1 - $index]->phone_e164, $rawProps);
        }

        $this->passwordLogout();
        $this->passwordLogin($coordinator, $password);
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-chains.show', ['dealChain' => $chain->id]))
            ->assertOk()
            ->assertJsonPath('props.view', 'project')
            ->assertJsonPath('props.chain.total_budget_amount', 630)
            ->assertJsonPath('props.slots.0.amount_minor', 25_000)
            ->assertJsonPath('props.slots.1.amount_minor', 38_000);
    }

    private function passwordLogin(User $user, string $password): void
    {
        $this->postJson(route('auth.phone.login'), [
            'phone' => (string) $user->phone_e164,
            'password' => $password,
        ])->assertOk()->assertJsonPath('data.status', 'authenticated');
    }

    private function passwordLogout(): void
    {
        $this->post(route('auth.logout'))->assertRedirect(route('home'));
    }
}

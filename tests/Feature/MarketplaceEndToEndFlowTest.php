<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * End-to-End Marketplace Flow Integration Test:
 *
 * 1. Provider logs in and creates a service listing draft.
 * 2. Provider submits the listing.
 * 3. Listing becomes active and searchable in Browse feed.
 * 4. Buyer logs in, opens Browse, and sees the listing.
 * 5. Buyer books the service -> Creates Order proposal.
 * 6. Provider/Buyer finalizes the Order -> Work instance created.
 * 7. Provider proposes work completion -> Buyer signs off -> Order fulfilled.
 */
final class MarketplaceEndToEndFlowTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Marketplace E2E flow requires PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
        app(FixtureRepository::class)->ensure();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_complete_provider_listing_to_buyer_booking_and_order_fulfillment(): void
    {
        // STEP 1: Set up Provider (Rosa Tagudin)
        $providerPhone = '+639178881234';
        $provider = User::where('phone_e164', $providerPhone)->first();
        if ($provider === null) {
            $providerId = (string) Str::uuid7();
            $now = now();
            DB::table('users')->insert([
                'id' => $providerId,
                'phone_e164' => $providerPhone,
                'email' => 'rosa@tagudin.ph',
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'fil',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'phone_verified_at' => $now,
                'correlation_id' => $providerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('user_profiles')->insert([
                'user_id' => $providerId,
                'display_name' => 'Rosa Tagudin',
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode([]),
                'language_preferences' => json_encode(['primary' => 'fil']),
                'version' => 1,
                'correlation_id' => $providerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $provider = User::findOrFail($providerId);
        }
        // Ensure provider role via RoleAssignmentService
        $roleService = app(RoleAssignmentService::class);
        $roleService->ensureActive($provider->id, 'provide', (string) Str::uuid7());
        // STEP 2: Set up Buyer (Juan Dela Cruz)
        $buyerPhone = '+639171234567';
        $buyer = User::where('phone_e164', $buyerPhone)->first();
        if ($buyer === null) {
            $buyerId = (string) Str::uuid7();
            $now = now();
            DB::table('users')->insert([
                'id' => $buyerId,
                'phone_e164' => $buyerPhone,
                'email' => 'juan@tagudin.ph',
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'fil',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'phone_verified_at' => $now,
                'correlation_id' => $buyerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('user_profiles')->insert([
                'user_id' => $buyerId,
                'display_name' => 'Juan Dela Cruz',
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode([]),
                'language_preferences' => json_encode(['primary' => 'fil']),
                'version' => 1,
                'correlation_id' => $buyerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $buyer = User::findOrFail($buyerId);
        }

        // STEP 3: Provider creates a new listing draft
        $createResponse = $this->actingAs($provider)->postJson('/listings', [
            'title' => 'Emergency Plumbing & Pipe Leak Fix',
            'description' => 'Fast residential plumbing repairs in Tagudin Centro.',
            'category_code' => 'repairs',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'price_amount_minor' => 35000,
            'currency' => 'PHP',
        ]);

        $createResponse->assertCreated();
        $listingId = (string) $createResponse->json('data.id');
        $expectedVersion = (int) $createResponse->json('data.version');

        self::assertNotNull($listingId);
        self::assertSame('draft', $createResponse->json('data.status'));

        // STEP 4: Provider submits the listing for review
        $submitKey = 'submit-key-'.Str::random(12);
        $submitResponse = $this->actingAs($provider)->postJson("/listings/{$listingId}/submit", [
            'expected_version' => $expectedVersion,
            'idempotency_key' => $submitKey,
        ]);

        $submitResponse->assertOk();
        self::assertSame('pending_review', $submitResponse->json('data.status'));

        // Admin approval cutover (make listing active on browse)
        DB::table('listings')->where('id', $listingId)->update([
            'status' => 'active',
            'review_status' => 'approved',
            'updated_at' => now(),
        ]);

        // STEP 5: Buyer opens Browse and sees Rosa's new active listing
        $browseResponse = $this->actingAs($buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get('/browse');

        $browseResponse->assertOk();
        $listings = $browseResponse->json('props.publicListings');
        $found = collect($listings)->firstWhere('id', $listingId);
        self::assertNotNull($found, 'Newly published listing must be present in Browse feed.');
        self::assertSame('Emergency Plumbing & Pipe Leak Fix', $found['title']);

        // STEP 6: Buyer opens listing detail and books the service
        $detailResponse = $this->actingAs($buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get("/listings/{$listingId}");

        $detailResponse->assertOk();
        self::assertTrue($detailResponse->json('props.booking.direct_booking_enabled'));
        self::assertTrue($detailResponse->json('props.booking.can_propose'));

        // Buyer clicks Book -> redirects to Order Proposal
        $bookResponse = $this->actingAs($buyer)->get("/listings/{$listingId}/book");
        $bookResponse->assertRedirect();

        $order = DB::table('orders')
            ->where('buyer_user_id', $buyer->id)
            ->where('listing_id', $listingId)
            ->first();
        self::assertNotNull($order, 'Order proposal must be created on book action.');
        self::assertSame('pending_acceptance', $order->status);

        // STEP 7: Finalize the Order (Contract Agreement)
        $finalizeKey = 'finalize-'.Str::random(12);
        $finalizeResponse = $this->actingAs($provider)->postJson("/orders/{$order->id}/finalize", [
            'expected_order_version' => (int) $order->version,
            'idempotency_key' => $finalizeKey,
        ]);

        $finalizeResponse->assertOk();
        self::assertSame('accepted', $finalizeResponse->json('data.status'));

        // Confirm work instance was provisioned
        $work = DB::table('work_instances')->where('order_id', $order->id)->first();
        self::assertNotNull($work, 'Work instance must be spawned upon order acceptance.');
        self::assertSame('not_started', $work->status);
        $structure = [
            'schema_version' => 1,
            'signature_hash' => hash('sha256', 'zero-proof-marketplace-e2e'),
            'work_shape' => 'A1',
            'active_node_id' => 'final-signoff',
            'active_ordinal' => 1,
            'pending_customer_confirmation' => false,
            'nodes' => [[
                'id' => 'final-signoff',
                'ordinal' => 1,
                'title' => 'Completion sign-off',
                'description' => 'Buyer reviews the provider declaration.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'dual_sign',
                'evidence_description' => 'Buyer app confirmation.',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => [],
                'approval_method' => 'app_confirm',
                'metric_unit' => null,
                'status' => 'active',
                'completed_at' => null,
                'completed_by_user_id' => null,
                'evidence_payload' => null,
                'customer_confirmed_at' => null,
            ]],
        ];
        DB::table('work_instances')->where('id', $work->id)->update([
            'status' => 'in_progress',
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
            'started_at' => now(),
            'updated_at' => now(),
        ]);

        // STEP 8: Provider proposes completion through the active final Work node.
        $completeResponse = $this->actingAs($provider)
            ->postJson("/orders/{$order->id}/work-nodes/final-signoff", [
                'action' => 'propose_completion',
                'payload' => [],
            ]);
        $completeResponse->assertOk();
        self::assertSame('awaiting_signoff', DB::table('work_instances')->where('order_id', $order->id)->value('status'));

        // STEP 9: Buyer signs off on completed work
        $signoffResponse = $this->actingAs($buyer)
            ->post("/orders/{$order->id}/work/signoff");
        $signoffResponse->assertRedirect();
        self::assertSame('completed', DB::table('work_instances')->where('order_id', $order->id)->value('status'));
        self::assertSame('closed', DB::table('orders')->where('id', $order->id)->value('status'));
    }
}

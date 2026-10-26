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
        $provider = User::factory()
            ->withEmailPassword('rosa+'.Str::uuid().'@example.test')
            ->create();
        app(RoleAssignmentService::class)->ensureActive(
            $provider->id,
            'provider',
            (string) Str::uuid7(),
        );

        $buyer = User::factory()
            ->withEmailPassword('juan+'.Str::uuid().'@example.test')
            ->create();

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
        self::assertSame('proposed', $order->status);

        $acceptKey = 'accept-'.Str::random(12);
        $acceptResponse = $this->actingAs($provider)->postJson("/orders/{$order->id}/accept", [
            'expected_order_version' => (int) $order->version,
            'idempotency_key' => $acceptKey,
        ]);

        $acceptResponse->assertOk();
        self::assertSame('accepted', $acceptResponse->json('data.status'));

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
        self::assertSame('completed', DB::table('orders')->where('id', $order->id)->value('status'));
    }
}

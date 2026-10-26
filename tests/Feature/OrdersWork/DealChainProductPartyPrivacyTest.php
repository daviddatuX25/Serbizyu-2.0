<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Shared\Application\ResourceActor;
use Database\Seeders\DealChainCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DealChainProductPartyPrivacyTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Deal Chain order privacy tests require PostgreSQL.');
        }

        $this->seed(DealChainCatalogSeeder::class);
    }

    public function test_active_courier_party_cannot_fetch_a_deal_chain_product_full_order(): void
    {
        $buyer = User::factory()->create();
        $laborOwner = User::factory()->create();
        $productOwner = User::factory()->create();
        $courier = User::factory()->create();
        $correlationId = (string) Str::uuid7();
        $labor = $this->createActiveListing($laborOwner, 'service', 'A1');
        $product = $this->createActiveListing($productOwner, 'product', 'A4');
        $courierListing = $this->createActiveListing($courier, 'service', 'A1');

        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: (string) $buyer->id,
            items: [[
                'id' => (string) $labor->id,
                'quantity' => 1,
                'deal_chain' => 'turnkey_parts',
                'slot_overrides' => [
                    'part' => ['listing_id' => (string) $product->id],
                    'courier' => ['listing_id' => (string) $courierListing->id],
                ],
            ]],
            idempotencyKey: 'privacy-stage-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $productNeed = DB::table('deal_needs')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('need_kind', 'product')
            ->firstOrFail();
        $invitation = DB::table('deal_invitations')
            ->where('deal_need_id', $productNeed->id)
            ->where('status', 'sent')
            ->firstOrFail();
        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $invitation->invited_provider_user_id,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: 'privacy-invite-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $updatedNeed = DB::table('deal_needs')->where('id', $productNeed->id)->firstOrFail();
        $invitationScope = is_array($invitation->scope)
            ? $invitation->scope
            : json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);
        $formed = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: (string) $buyer->id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $productNeed->id,
            invitationId: (string) $invitation->id,
            expectedNeedVersion: (int) $updatedNeed->version,
            termsHash: (string) $invitationScope['terms_hash'],
            capacityHash: (string) $invitationScope['capacity_hash'],
            idempotencyKey: 'privacy-form-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $productOrderId = (string) $formed['order_id'];
        $this->assertDatabaseHas('work_instances', [
            'order_id' => $productOrderId,
            'work_shape' => 'A4',
        ]);
        $this->assertDatabaseHas('deal_needs', [
            'id' => $productNeed->id,
            'need_kind' => 'product',
        ]);

        $now = now();
        DB::table('order_parties')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $productOrderId,
            'user_id' => $courier->id,
            'party_type' => 'courier',
            'responsibility' => 'delivery',
            'scope' => json_encode(['role' => 'courier'], JSON_THROW_ON_ERROR),
            'consent_grant_id' => null,
            'status' => 'active',
            'effective_at' => $now,
            'ended_at' => null,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->actingAs($courier)->getJson("/orders/{$productOrderId}")->assertForbidden();
    }

    private function createActiveListing(User $owner, string $listingType, string $workShape): object
    {
        $attributes = [
            'title' => 'Privacy test '.$listingType.' listing',
            'description' => 'Published source listing for a real Deal Chain privacy test.',
            'category_code' => $listingType === 'product' ? 'food' : 'repairs',
            'listing_type' => $listingType,
            'work_shape' => $workShape,
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
        ];
        if ($listingType === 'product') {
            $attributes['variants'] = [[
                'id' => 'privacy-product-variant',
                'name' => 'Standard item',
                'price_amount_minor' => 25000,
                'is_default' => true,
                'stock' => 5,
            ]];
        } else {
            $attributes['milestone_stages'] = [
                [
                    'id' => 'privacy-work-step',
                    'title' => 'Perform the accepted service',
                    'node_kind' => 'checkin_intake',
                    'control_mode' => 'provider_advance',
                    'approval_method' => 'none',
                    'required_proofs' => [],
                ],
                [
                    'id' => 'privacy-work-final',
                    'title' => 'Review the accepted service',
                    'node_kind' => 'final_signoff',
                    'control_mode' => 'customer_confirm',
                    'approval_method' => 'app_confirm',
                    'required_proofs' => [],
                ],
            ];
        }

        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $owner->id, (string) $owner->id),
            $attributes,
            (string) Str::uuid7(),
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $owner->id, (string) $owner->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: 'privacy-listing-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));

        return DB::table('listings')->where('id', $draft['id'])->firstOrFail();
    }
}

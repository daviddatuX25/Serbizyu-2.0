<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\DealInvitationInboxQuery;
use App\Modules\DealCoordination\Application\DealChainCourierAuthority;
use App\Modules\DealCoordination\Application\DealCoordinationError;
use App\Modules\DealCoordination\Application\DealWorkGateAdapter;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\A4HandoffService;
use App\Modules\OrdersWork\Application\A9DeliveryService;
use App\Modules\OrdersWork\Application\OrderError;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Modules\DealCoordination\Application\WithdrawDealPartner;
use App\Modules\DealCoordination\Application\ChooseDealReplacement;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\ResourceActor;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Http\UploadedFile;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

final class DealChainOrdersTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootPhoneOtpAuth();
    }

    public function test_stage_deal_chain_creates_chain_needs_and_dependencies_with_zero_orders(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);

        $listing = DB::table('listings')
            ->where('id', '0198a3b1-7c40-7abc-8def-5234567890b8')
            ->first();

        $this->assertNotNull($listing);

        $idempotencyKey = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();

        $result = $stageService->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => (string) $listing->id,
                    'quantity' => 1,
                    'deal_chain' => 'turnkey_parts',
                ],
            ],
            idempotencyKey: $idempotencyKey,
            correlationId: $correlationId,
        );

        expect($result)->toHaveKey('deal_chain_id')
            ->and($result['status'])->toBe('sourcing')
            ->and($result['needs_count'])->toBeGreaterThanOrEqual(1);

        $dealChainId = $result['deal_chain_id'];

        // Assert parent chain exists
        $chain = DB::table('deal_chains')->where('id', $dealChainId)->first();
        expect($chain)->not->toBeNull();
        expect($chain->coordinator_user_id)->toBe($buyerUserId);

        // Assert Needs exist
        $needs = DB::table('deal_needs')->where('deal_chain_id', $dealChainId)->get();
        expect($needs->count())->toBeGreaterThanOrEqual(1);

        // Assert Invitations exist
        $invitations = DB::table('deal_invitations')
            ->whereIn('deal_need_id', $needs->pluck('id'))
            ->get();
        expect($invitations->count())->toBeGreaterThanOrEqual(1);

        // CRITICAL INVARIANT: Zero Orders, Zero Work, Zero Payment Obligations created
        expect(DB::table('orders')->where('deal_chain_id', $dealChainId)->count())->toBe(0);
        expect(DB::table('work_instances')->whereIn('order_id', function ($query) use ($dealChainId) {
            $query->select('id')->from('orders')->where('deal_chain_id', $dealChainId);
        })->count())->toBe(0);
        expect(DB::table('payment_obligations')->whereIn('order_id', function ($query) use ($dealChainId) {
            $query->select('id')->from('orders')->where('deal_chain_id', $dealChainId);
        })->count())->toBe(0);
    }

    public function test_provider_can_accept_deal_invitation_and_need_waits_for_customer_confirmation(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);
        $respondService = app(RespondToDealInvitation::class);

        $listing = DB::table('listings')
            ->where('id', '0198a3b1-7c40-7abc-8def-5234567890b8')
            ->first();

        $this->assertNotNull($listing);

        $staged = $stageService->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => (string) $listing->id,
                    'quantity' => 1,
                    'deal_chain' => 'turnkey_parts',
                ],
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $dealChainId = $staged['deal_chain_id'];
        $invitation = DB::table('deal_invitations')
            ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
            ->where('deal_needs.deal_chain_id', $dealChainId)
            ->where('deal_invitations.status', 'sent')
            ->select('deal_invitations.*')
            ->first();

        $this->assertNotNull($invitation);

        $providerUserId = (string) $invitation->invited_provider_user_id;

        // Provider accepts invitation
        $response = $respondService->handle(
            actorUserId: $providerUserId,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
            responseNote: 'Ready to fulfill on schedule',
        );

        expect($response['status'])->toBe('accepted');
        expect($response['need_status'])->toBe('awaiting_customer_confirmation');

        $updatedInv = DB::table('deal_invitations')->where('id', $invitation->id)->first();
        expect($updatedInv->status)->toBe('accepted')
            ->and($updatedInv->response_note)->toBe('Ready to fulfill on schedule');

        $updatedNeed = DB::table('deal_needs')->where('id', $invitation->deal_need_id)->first();
        expect($updatedNeed->status)->toBe('awaiting_customer_confirmation');
        expect(DB::table('orders')->where('deal_chain_id', $dealChainId)->count())->toBe(0)
            ->and(DB::table('work_instances')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $dealChainId))->count())->toBe(0);

    }

    public function test_provider_can_decline_deal_invitation(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);
        $respondService = app(RespondToDealInvitation::class);

        $listing = DB::table('listings')
            ->where('id', '0198a3b1-7c40-7abc-8def-5234567890b8')
            ->first();

        $staged = $stageService->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => (string) $listing->id,
                    'quantity' => 1,
                    'deal_chain' => 'turnkey_parts',
                ],
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $dealChainId = $staged['deal_chain_id'];
        $invitation = DB::table('deal_invitations')
            ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
            ->where('deal_needs.deal_chain_id', $dealChainId)
            ->where('deal_invitations.status', 'sent')
            ->select('deal_invitations.*')
            ->first();

        $this->assertNotNull($invitation);

        $providerUserId = (string) $invitation->invited_provider_user_id;

        $response = $respondService->handle(
            actorUserId: $providerUserId,
            invitationId: (string) $invitation->id,
            decision: 'decline',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
            responseNote: 'Fully booked at requested window',
        );

        expect($response['status'])->toBe('declined');
        expect($response['need_status'])->toBe('open');

        $updatedInv = DB::table('deal_invitations')->where('id', $invitation->id)->first();
        expect($updatedInv->status)->toBe('declined');

        $updatedNeed = DB::table('deal_needs')->where('id', $invitation->deal_need_id)->first();
        expect($updatedNeed->status)->toBe('open');
    }

    public function test_courier_authority_is_limited_to_the_product_need_dependency_branch(): void
    {
        $coordinator = User::factory()->create();
        $productProviders = [User::factory()->create(), User::factory()->create()];
        $couriers = [User::factory()->create(), User::factory()->create()];
        $chainId = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();
        $now = now();

        DB::table('deal_chains')->insert([
            'id' => $chainId,
            'coordinator_user_id' => $coordinator->id,
            'status' => 'in_progress',
            'title' => 'Two product courier branches',
            'goal' => 'Deliver each product through its assigned courier branch.',
            'payload_version' => 1,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $productListingId = DealChainExecutionFixtures::LISTING_AC_CAPACITOR;
        $courierListingId = DealChainExecutionFixtures::LISTING_COURIER;
        $productVersionId = (string) DB::table('listing_versions')->where('listing_id', $productListingId)->orderByDesc('version_number')->value('id');
        $courierVersionId = (string) DB::table('listing_versions')->where('listing_id', $courierListingId)->orderByDesc('version_number')->value('id');
        $needIds = [];
        $orderIds = [];
        $productOrderIds = [];

        foreach ([0, 1] as $branch) {
            $productNeedId = (string) Str::uuid7();
            $courierNeedId = (string) Str::uuid7();
            $needIds[$branch] = $productNeedId;
            $productOrderId = (string) Str::uuid7();
            $courierOrderId = (string) Str::uuid7();
            $productOrderIds[$branch] = $productOrderId;
            $orderIds[$branch] = $courierOrderId;

            foreach ([
                [
                    'id' => $productNeedId,
                    'ordinal' => ($branch * 2) + 1,
                    'need_kind' => 'product',
                    'title' => 'Product branch '.($branch + 1),
                    'node_key' => 'product-'.($branch + 1),
                    'node_role' => 'store',
                    'source_listing_id' => $productListingId,
                ],
                [
                    'id' => $courierNeedId,
                    'ordinal' => ($branch * 2) + 2,
                    'need_kind' => 'service',
                    'title' => 'Courier branch '.($branch + 1),
                    'node_key' => 'courier-'.($branch + 1),
                    'node_role' => 'courier',
                    'source_listing_id' => $courierListingId,
                ],
            ] as $need) {
                DB::table('deal_needs')->insert([
                    ...$need,
                    'deal_chain_id' => $chainId,
                    'description' => $need['title'],
                    'status' => 'in_progress',
                    'requested_at' => $now,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'recipe_code' => 'test-product-courier',
                    'recipe_version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('deal_dependencies')->insert([
                'id' => (string) Str::uuid7(),
                'deal_chain_id' => $chainId,
                'predecessor_need_id' => $productNeedId,
                'successor_need_id' => $courierNeedId,
                'dependency_type' => 'blocks',
                'status' => 'active',
                'condition_code' => 'part_ready',
                'created_by_user_id' => $coordinator->id,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ([
                [
                    'need_id' => $productNeedId,
                    'order_id' => $productOrderId,
                    'provider_id' => $productProviders[$branch]->id,
                    'listing_id' => $productListingId,
                    'listing_version_id' => $productVersionId,
                ],
                [
                    'need_id' => $courierNeedId,
                    'order_id' => $courierOrderId,
                    'provider_id' => $couriers[$branch]->id,
                    'listing_id' => $courierListingId,
                    'listing_version_id' => $courierVersionId,
                ],
            ] as $child) {
                $invitationId = (string) Str::uuid7();
                DB::table('deal_invitations')->insert([
                    'id' => $invitationId,
                    'deal_need_id' => $child['need_id'],
                    'invited_provider_user_id' => $child['provider_id'],
                    'invited_by_user_id' => $coordinator->id,
                    'purpose' => 'deal_need_assignment',
                    'scope' => json_encode([], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'status' => 'accepted',
                    'expires_at' => $now->copy()->addDay(),
                    'responded_at' => $now,
                    'acceptance_idempotency_key' => 'branch-accepted-'.$child['need_id'],
                    'acceptance_correlation_id' => $correlationId,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('orders')->insert([
                    'id' => $child['order_id'],
                    'origin' => 'deal_chain',
                    'mechanism' => 'deal_chain',
                    'listing_id' => $child['listing_id'],
                    'buyer_user_id' => $coordinator->id,
                    'provider_user_id' => $child['provider_id'],
                    'status' => 'accepted',
                    'geography' => 'Tagudin',
                    'deal_chain_id' => $chainId,
                    'deal_need_id' => $child['need_id'],
                    'public_reference' => 'ORD-A4-BRANCH-'.$branch.'-'.substr(str_replace('-', '', $child['order_id']), -8),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                if ($child['need_id'] === $courierNeedId) {
                    $structure = app(WorkExecutionService::class)->initializeStructure([
                        'milestone_stages' => [
                            ['id' => 'courier-execution', 'title' => 'Collect and transport the product', 'clearanceMode' => 'worker_direct', 'requiredProofs' => []],
                            ['id' => 'courier-signoff', 'title' => 'Customer accepts delivery', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                        ],
                    ], 'A1');
                    DB::table('work_instances')->insert([
                        'id' => (string) Str::uuid7(),
                        'order_id' => $child['order_id'],
                        'work_shape' => 'A1',
                        'status' => 'not_started',
                        'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
                        'structure_payload_version' => 1,
                        'version' => 1,
                        'correlation_id' => $correlationId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
                DB::table('deal_need_confirmations')->insert([
                    'id' => (string) Str::uuid7(),
                    'deal_chain_id' => $chainId,
                    'deal_need_id' => $child['need_id'],
                    'invitation_id' => $invitationId,
                    'order_id' => $child['order_id'],
                    'confirmed_by_user_id' => $coordinator->id,
                    'listing_id' => $child['listing_id'],
                    'listing_version_id' => $child['listing_version_id'],
                    'terms_hash' => hash('sha256', 'terms-'.$child['need_id']),
                    'capacity_hash' => hash('sha256', 'capacity-'.$child['need_id']),
                    'payload_version' => 1,
                    'correlation_id' => $correlationId,
                    'confirmed_at' => $now,
                    'created_at' => $now,
                ]);
            }
        }

        $authority = app(DealChainCourierAuthority::class);
        $firstBranch = $authority->activeCourierCandidatesForProductNeed($chainId, $needIds[0]);
        $secondBranch = $authority->activeCourierCandidatesForProductNeed($chainId, $needIds[1]);

        expect($firstBranch)->toHaveCount(1)
            ->and($firstBranch[0]['user_id'])->toBe((string) $couriers[0]->id)
            ->and($firstBranch[0]['order_id'])->toBe($orderIds[0])
            ->and($firstBranch[0]['public_reference'])->toStartWith('ORD-A4-BRANCH-0-')
            ->and($secondBranch)->toHaveCount(1)
            ->and($secondBranch[0]['user_id'])->toBe((string) $couriers[1]->id)
            ->and($authority->isAuthorizedCourier($chainId, $needIds[0], (string) $couriers[0]->id))->toBeTrue()
            ->and($authority->isAuthorizedCourier($chainId, $needIds[0], (string) $couriers[1]->id))->toBeFalse();
        $this->authenticateWithPhone((string) $couriers[0]->phone_e164);
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-chains.show', ['dealChain' => $chainId]))
            ->assertOk()
            ->assertJsonPath('props.slots.1.handoff_url', '/orders/'.$productOrderIds[0].'/handoff')
            ->assertJsonPath('props.slots.3.handoff_url', null);

        $productOrderId = $productOrderIds[0];
        $workId = (string) Str::uuid7();
        $this->logoutAuthenticatedUser();
        $evidenceId = (string) Str::uuid7();
        DB::table('order_terms_snapshots')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $productOrderId,
            'snapshot_version' => 1,
            'source_listing_version_id' => $productVersionId,
            'scope' => json_encode(['listing_type' => 'product', 'quantity' => 1], JSON_THROW_ON_ERROR),
            'scope_payload_version' => 1,
            'amount_minor' => 1000,
            'currency' => 'PHP',
            'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'payment_lane_options_payload_version' => 1,
            'cancellation_rules' => json_encode([], JSON_THROW_ON_ERROR),
            'cancellation_rules_payload_version' => 1,
            'review_rules' => json_encode([], JSON_THROW_ON_ERROR),
            'review_rules_payload_version' => 1,
            'accepted_by_user_id' => $productProviders[0]->id,
            'accepted_at' => $now,
            'correlation_id' => $correlationId,
            'created_at' => $now,
        ]);
        $snapshotId = (string) DB::table('order_terms_snapshots')->where('order_id', $productOrderId)->value('id');
        DB::table('orders')->where('id', $productOrderId)->update(['current_terms_snapshot_id' => $snapshotId]);
        DB::table('work_instances')->insert([
            'id' => $workId,
            'order_id' => $productOrderId,
            'work_shape' => 'A4',
            'status' => 'in_progress',
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('evidence_files')->insert([
            'id' => $evidenceId,
            'owner_user_id' => $productProviders[0]->id,
            'storage_key' => 'evidence/work/'.$workId.'/branch-prepared.jpg',
            'media_type' => 'image/jpeg',
            'size_bytes' => 64,
            'content_hash' => hash('sha256', 'branch prepared evidence'),
            'evidence_type' => 'work_node_photo_proof',
            'data_class' => 'WORK_EXECUTION',
            'scan_status' => 'clean',
            'visibility' => 'order_parties',
            'retention_policy' => 'order_dispute_window',
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('work_events')->insert([
            'id' => (string) Str::uuid7(),
            'work_instance_id' => $workId,
            'previous_status' => 'not_started',
            'new_status' => 'in_progress',
            'event_type' => 'work.evidence.uploaded',
            'event_version' => 1,
            'actor_user_id' => $productProviders[0]->id,
            'evidence_file_id' => $evidenceId,
            'payload' => json_encode(['node_id' => 'a4-prepare', 'tool_key' => 'photo_proof'], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'branch-evidence-'.$workId,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);
        app(DealWorkGateAdapter::class)->registerConfirmedNeedWork(
            $chainId, $needIds[0], $productOrderId, $workId, $correlationId,
        );
        $handoff = app(A4HandoffService::class);
        $prepared = $handoff->markPrepared(
            $productOrderId, (string) $productProviders[0]->id, $evidenceId,
            'branch-prepared-'.$workId, 1, $correlationId,
        );
        $transferId = (string) $prepared['id'];
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(
            eventType: 'work.ready_for_collection',
            aggregateId: $workId,
        )->published);

        $handoffProjection = $handoff->projectForOrder($productOrderId, (string) $productProviders[0]->id, $correlationId);
        self::assertSame((string) $couriers[0]->id, $handoffProjection['couriers'][0]['id']);
        self::assertSame($firstBranch[0]['public_reference'], $handoffProjection['couriers'][0]['public_reference']);
        try {
            $handoff->offerCustody($productOrderId, (string) $productProviders[0]->id, 'courier_delivery', (string) $couriers[1]->id, 'branch-wrong-courier-'.$transferId, 1, $correlationId);
            self::fail('A courier assigned to the sibling product branch must not receive this custody offer.');
        } catch (OrderError $error) {
            self::assertSame(403, $error->status);
        }
        self::assertSame('prepared', DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'));
        $offered = $handoff->offerCustody($productOrderId, (string) $productProviders[0]->id, 'courier_delivery', (string) $couriers[0]->id, 'branch-correct-courier-'.$transferId, 1, $correlationId);
        self::assertSame('offered', $offered['status']);
        $handoffHeaders = [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ];
        $this->actingAs($couriers[1])
            ->getJson(route('orders.handoff.show', $productOrderId))
            ->assertForbidden();
        $this->actingAs($couriers[0])
            ->withHeaders($handoffHeaders)
            ->get(route('orders.handoff.show', $productOrderId))
            ->assertOk()
            ->assertJsonPath('component', 'Orders/Handoff')
            ->assertJsonPath('props.order.id', $productOrderId)
            ->assertJsonPath('props.order.public_reference', DB::table('orders')->where('id', $productOrderId)->value('public_reference'))
            ->assertJsonPath('props.a4Handoff.canAcceptCustody', true)
            ->assertJsonMissingPath('props.order.amount_minor')
            ->assertJsonMissingPath('props.order.buyer_user_id')
            ->assertJsonMissingPath('props.terms')
            ->assertJsonMissingPath('props.obligation')
            ->assertJsonMissingPath('props.financials')
            ->assertJsonMissingPath('props.work');
        $capacity = app(CapacityReservationService::class);
        $bucket = $capacity->ensureBucket(
            listingId: $productListingId,
            listingVersionId: $productVersionId,
            capacityType: 'quantity',
            quantity: 1,
            correlationId: $correlationId,
            resourceKey: 'a4-product-branch-variant',
        );
        $reservation = $capacity->commitForOrder(
            listingId: $productListingId,
            listingVersionId: $productVersionId,
            orderId: $productOrderId,
            quantity: 1,
            commandScope: 'test.a4.branch.capacity',
            idempotencyKey: 'branch-capacity-'.$productOrderId,
            correlationId: $correlationId,
            resourceKey: 'a4-product-branch-variant',
        );
        self::assertNotNull($reservation);
        $proposalId = (string) Str::uuid7();
        $proposalScope = [
            'listing_type' => 'product',
            'quantity' => 1,
            'capacity_reservation_id' => $reservation['reservation_id'],
        ];
        DB::table('order_proposals')->insert([
            'id' => $proposalId,
            'order_id' => $productOrderId,
            'proposal_version' => 1,
            'kind' => 'initial',
            'status' => 'accepted',
            'proposed_by_user_id' => $coordinator->id,
            'responded_by_user_id' => $productProviders[0]->id,
            'responded_at' => $now,
            'source_listing_version_id' => $productVersionId,
            'scope' => json_encode($proposalScope, JSON_THROW_ON_ERROR),
            'scope_payload_version' => 1,
            'amount_minor' => 1000,
            'currency' => 'PHP',
            'terms_hash' => hash('sha256', json_encode($proposalScope, JSON_THROW_ON_ERROR)),
            'capacity_reservation_id' => $reservation['reservation_id'],
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('orders')->where('id', $productOrderId)->update(['current_proposal_id' => $proposalId]);

        $this->actingAs($couriers[1])->postJson(route('orders.handoff.custody.accept', [$productOrderId, $transferId]), [
            'evidence_file_id' => $evidenceId,
            'expected_transfer_version' => 2,
            'idempotency_key' => 'branch-wrong-accept-'.$transferId,
        ])->assertForbidden();
        self::assertSame('offered', DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'));
        self::assertSame(0, DB::table('stock_movements')->where('order_id', $productOrderId)->where('movement_type', 'fulfillment')->count());

        $this->actingAs($couriers[0])->postJson(route('orders.handoff.custody.accept', [$productOrderId, $transferId]), [
            'evidence_file_id' => $evidenceId,
            'expected_transfer_version' => 2,
            'idempotency_key' => 'branch-correct-accept-'.$transferId,
        ])->assertOk()->assertJsonPath('data.status', 'departed');
        self::assertSame(1, DB::table('stock_movements')->where('order_id', $productOrderId)->where('movement_type', 'fulfillment')->count());
        self::assertSame(0, (int) DB::table('listing_capacity')->where('id', $bucket['id'])->value('quantity'));
    }

    public function test_native_a9_draft_cannot_start_before_its_confirmed_predecessor(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId, 'A9');
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderByDesc('ordinal')->firstOrFail();
        $courierNeed = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->skip(1)->firstOrFail();
        DB::table('deal_dependencies')->insert([
            'id' => (string) Str::uuid7(), 'deal_chain_id' => $staged['deal_chain_id'],
            'predecessor_need_id' => $courierNeed->id, 'successor_need_id' => $need->id,
            'dependency_type' => 'blocks', 'status' => 'active', 'condition_code' => 'delivery_signed',
            'created_by_user_id' => $buyerId, 'version' => 1, 'correlation_id' => (string) Str::uuid7(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $accepted = $this->acceptNeed($buyerId, $staged['deal_chain_id'], (string) $need->id);
        $formed = $this->confirmAcceptedNeed($buyerId, $staged['deal_chain_id'], (string) $need->id, $accepted);
        $order = DB::table('orders')->where('id', $formed['order_id'])->firstOrFail();
        $work = DB::table('work_instances')->where('id', $formed['work_instance_id'])->firstOrFail();
        self::assertSame('A9', $work->work_shape);
        self::assertSame('not_started', $work->status);
        $auditCount = DB::table('audit_events')->count();
        $outboxCount = DB::table('outbox_messages')->count();
        try {
            app(A9DeliveryService::class)->createDraft((string) $order->id, (string) $order->provider_user_id, (string) Str::uuid7());
            self::fail('Native digital delivery must not bypass its unconfirmed courier predecessor.');
        } catch (OrderError $error) {
            self::assertSame(409, $error->status);
            self::assertSame('PREDECESSOR_GATE_BLOCKED', $error->envelope->code);
        }
        self::assertEquals($order, DB::table('orders')->where('id', $order->id)->firstOrFail());
        self::assertEquals($work, DB::table('work_instances')->where('id', $work->id)->firstOrFail());
        self::assertSame(0, DB::table('work_deliveries')->where('work_instance_id', $work->id)->count());
        self::assertSame(0, DB::table('work_events')->where('work_instance_id', $work->id)->count());
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());
    }

    public function test_unconfirmed_courier_predecessor_blocks_labor_without_mutations(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerUserId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertCount(3, $needs);

        // Form labor while its courier predecessor has no customer-confirmed child Order.
        $laborNeed = $needs[2];
        $accepted = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $laborNeed->id);
        $labor = $this->confirmAcceptedNeed(
            $buyerUserId,
            (string) $staged['deal_chain_id'],
            (string) $laborNeed->id,
            $accepted,
        );
        $order = DB::table('orders')->where('id', $labor['order_id'])->first();
        $work = DB::table('work_instances')->where('id', $labor['work_instance_id'])->first();
        self::assertSame('A1', $work->work_shape);
        self::assertSame(0, DB::table('work_step_dependency_gates')->where('successor_work_instance_id', $work->id)->count());
        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        $nodeId = (string) $structure['active_node_id'];

        $orderBefore = DB::table('orders')->where('id', $order->id)->first();
        $workBefore = DB::table('work_instances')->where('id', $work->id)->first();
        $auditCount = DB::table('audit_events')->where('order_id', $order->id)->count();
        $workEventCount = DB::table('work_events')->where('work_instance_id', $work->id)->count();
        $stockMovementCount = DB::table('stock_movements')->where('order_id', $order->id)->count();
        try {
            app(WorkExecutionService::class)->advanceNode(
                orderId: (string) $order->id,
                actorUserId: (string) $order->provider_user_id,
                nodeId: $nodeId,
                action: 'complete_step',
                correlationId: (string) Str::uuid7(),
            );
            self::fail('Downstream labor must stay blocked until its exact courier predecessor is confirmed and signed.');
        } catch (OrderError $error) {
            self::assertSame(409, $error->status);
            self::assertSame('PREDECESSOR_GATE_BLOCKED', $error->envelope->code);
        }

        $orderAfter = DB::table('orders')->where('id', $order->id)->first();
        $workAfter = DB::table('work_instances')->where('id', $work->id)->first();
        self::assertSame($orderBefore->status, $orderAfter->status);
        self::assertSame($orderBefore->version, $orderAfter->version);
        self::assertSame($workBefore->status, $workAfter->status);
        self::assertSame($workBefore->version, $workAfter->version);
        self::assertSame($workBefore->structure, $workAfter->structure);
        self::assertSame($auditCount, DB::table('audit_events')->where('order_id', $order->id)->count());
        self::assertSame($workEventCount, DB::table('work_events')->where('work_instance_id', $work->id)->count());
        self::assertSame($stockMovementCount, DB::table('stock_movements')->where('order_id', $order->id)->count());
    }

    public function test_ready_fact_before_successor_confirmation_is_retained_and_applied(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerUserId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertCount(3, $needs);

        $acceptedPart = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $needs[0]->id);
        $part = $this->confirmAcceptedNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $needs[0]->id, $acceptedPart);
        $partOrder = DB::table('orders')->where('id', $part['order_id'])->first();
        $partWork = DB::table('work_instances')->where('id', $part['work_instance_id'])->first();
        $partEvidence = $this->createCleanWorkEvidence((string) $partOrder->provider_user_id, (string) $partWork->id);
        app(A4HandoffService::class)->markPrepared(
            (string) $partOrder->id,
            (string) $partOrder->provider_user_id,
            $partEvidence,
            'early-part-ready-'.(string) $partOrder->id,
            (int) $partOrder->version,
            (string) Str::uuid7(),
        );
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection')->published);
        self::assertSame(1, DB::table('work_dependency_source_facts')
            ->where('deal_need_id', $needs[0]->id)
            ->where('event_type', 'work.ready_for_collection')
            ->count());
        self::assertSame(0, DB::table('work_step_dependency_gates')->where('deal_chain_id', $staged['deal_chain_id'])->count());

        $acceptedCourier = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $needs[1]->id);
        $courier = $this->confirmAcceptedNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $needs[1]->id, $acceptedCourier);
        $gate = DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'part_ready')
            ->first();
        self::assertNotNull($gate);
        self::assertSame('cleared', $gate->status);
        self::assertSame($part['work_instance_id'], $gate->source_work_instance_id);
        self::assertSame($courier['work_instance_id'], $gate->successor_work_instance_id);
        self::assertSame('not_started', DB::table('work_instances')->where('id', $courier['work_instance_id'])->value('status'));
    }

    public function test_one_ready_fact_clears_every_formed_same_condition_successor_once(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerUserId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertCount(3, $needs);
        $correlationId = (string) Str::uuid7();
        $extraDependencyId = (string) Str::uuid7();
        $now = now();

        // Extend the trusted DAG before confirmation so both successors form through the real workflow.
        DB::table('deal_dependencies')->insert([
            'id' => $extraDependencyId,
            'deal_chain_id' => $staged['deal_chain_id'],
            'predecessor_need_id' => $needs[0]->id,
            'successor_need_id' => $needs[2]->id,
            'dependency_type' => 'blocks',
            'status' => 'active',
            'condition_code' => 'part_ready',
            'created_by_user_id' => $buyerUserId,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed(
                $buyerUserId,
                (string) $staged['deal_chain_id'],
                (string) $need->id,
                $accepted,
            );
        }

        $gates = DB::table('work_step_dependency_gates')
            ->where('dependency_id', $extraDependencyId)
            ->get();
        self::assertCount(1, $gates);
        self::assertSame('blocked', $gates[0]->status);
        self::assertSame($formed[(string) $needs[0]->id]['work_instance_id'], $gates[0]->source_work_instance_id);
        self::assertSame($formed[(string) $needs[2]->id]['work_instance_id'], $gates[0]->successor_work_instance_id);

        $sourceOrder = DB::table('orders')->where('id', $formed[(string) $needs[0]->id]['order_id'])->first();
        $sourceWork = DB::table('work_instances')->where('id', $formed[(string) $needs[0]->id]['work_instance_id'])->first();
        $evidenceId = $this->createCleanWorkEvidence((string) $sourceOrder->provider_user_id, (string) $sourceWork->id);
        app(A4HandoffService::class)->markPrepared(
            (string) $sourceOrder->id,
            (string) $sourceOrder->provider_user_id,
            $evidenceId,
            'fanout-ready-'.$sourceOrder->id,
            (int) $sourceOrder->version,
            $correlationId,
        );

        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection')->published);
        $fanoutGates = DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'part_ready')
            ->orderBy('successor_need_id')
            ->get();
        self::assertCount(2, $fanoutGates);
        self::assertSame(['cleared', 'cleared'], $fanoutGates->pluck('status')->all());
        self::assertCount(2, DB::table('audit_events')->where('action', 'deal_work_gate.cleared')
            ->whereIn('target_id', $fanoutGates->pluck('id'))->get());
        self::assertSame(0, app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection')->published);
        self::assertSame(2, DB::table('audit_events')->where('action', 'deal_work_gate.cleared')
            ->whereIn('target_id', $fanoutGates->pluck('id'))->count());
        foreach ($fanoutGates as $gate) {
            self::assertSame('not_started', DB::table('work_instances')->where('id', $gate->successor_work_instance_id)->value('status'));
        }
    }

    public function test_customer_final_signoff_clears_delivery_gate_but_provider_self_claim_does_not(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerUserId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertCount(3, $needs);
        $deliveryDependency = DB::table('deal_dependencies')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'delivery_signed')
            ->first();
        self::assertNotNull($deliveryDependency);
        // Make the existing delivery edge represent the supported service-to-courier DAG.
        DB::table('deal_dependencies')->where('id', $deliveryDependency->id)->update([
            'predecessor_need_id' => $needs[2]->id,
            'successor_need_id' => $needs[1]->id,
        ]);

        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed(
                $buyerUserId,
                (string) $staged['deal_chain_id'],
                (string) $need->id,
                $accepted,
            );
        }
        $labor = $formed[(string) $needs[2]->id];
        $courier = $formed[(string) $needs[1]->id];
        $gate = DB::table('work_step_dependency_gates')->where('dependency_id', $deliveryDependency->id)->first();
        self::assertNotNull($gate);
        self::assertSame('blocked', $gate->status);

        $correlationId = (string) Str::uuid7();
        app(OutboxWriter::class)->enqueue(
            eventType: 'work.completed',
            aggregateType: 'work_instance',
            aggregateId: $labor['work_instance_id'],
            payload: [
                'order_id' => $labor['order_id'],
                'work_instance_id' => $labor['work_instance_id'],
                'final_signoff' => true,
                'completion_actor_user_id' => DB::table('orders')->where('id', $labor['order_id'])->value('provider_user_id'),
            ],
            correlationId: $correlationId,
        );
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed')->published);
        self::assertSame('blocked', DB::table('work_step_dependency_gates')->where('id', $gate->id)->value('status'));

        app(OutboxWriter::class)->enqueue(
            eventType: 'work.completed',
            aggregateType: 'work_instance',
            aggregateId: $labor['work_instance_id'],
            payload: [
                'order_id' => $courier['order_id'],
                'work_instance_id' => $labor['work_instance_id'],
                'final_signoff' => true,
                'completion_actor_user_id' => $buyerUserId,
            ],
            correlationId: (string) Str::uuid7(),
        );
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed')->published);
        self::assertSame('blocked', DB::table('work_step_dependency_gates')->where('id', $gate->id)->value('status'));

        $laborOrder = DB::table('orders')->where('id', $labor['order_id'])->first();
        $laborWork = DB::table('work_instances')->where('id', $labor['work_instance_id'])->first();
        $structure = json_decode((string) $laborWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $activeNode = collect($structure['nodes'])->firstWhere('status', 'active');
        self::assertNotNull($activeNode);
        self::assertNotSame('final_signoff', $activeNode['node_kind']);
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $laborOrder->id,
            actorUserId: (string) $laborOrder->provider_user_id,
            nodeId: (string) $activeNode['id'],
            action: 'complete_step',
            correlationId: (string) Str::uuid7(),
        );
        $laborWork = DB::table('work_instances')->where('id', $labor['work_instance_id'])->first();
        $structure = json_decode((string) $laborWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $signoffNode = collect($structure['nodes'])->firstWhere('node_kind', 'final_signoff');
        self::assertNotNull($signoffNode);
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $laborOrder->id,
            actorUserId: (string) $laborOrder->provider_user_id,
            nodeId: (string) $signoffNode['id'],
            action: 'propose_completion',
            correlationId: (string) Str::uuid7(),
        );
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $laborOrder->id,
            actorUserId: $buyerUserId,
            nodeId: (string) $signoffNode['id'],
            action: 'signoff_completion',
            correlationId: (string) Str::uuid7(),
        );
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed')->published);
        self::assertSame('cleared', DB::table('work_step_dependency_gates')->where('id', $gate->id)->value('status'));
        self::assertSame('not_started', DB::table('work_instances')->where('id', $courier['work_instance_id'])->value('status'));
    }

    public function test_confirmed_need_graph_materializes_exact_persisted_work_gates(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerUserId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        self::assertCount(3, $needs);
        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerUserId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed(
                $buyerUserId,
                (string) $staged['deal_chain_id'],
                (string) $need->id,
                $accepted,
            );
        }

        $gates = DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->orderBy('condition_code')
            ->get();
        self::assertCount(2, $gates);
        self::assertSame(['delivery_signed', 'part_ready'], $gates->pluck('condition_code')->all());
        foreach ($gates as $gate) {
            self::assertSame('blocked', $gate->status);
            self::assertSame((int) DB::table('deal_dependencies')->where('id', $gate->dependency_id)->value('version'), (int) $gate->dependency_version);
            self::assertSame($formed[$gate->predecessor_need_id]['work_instance_id'], $gate->source_work_instance_id);
            self::assertSame($formed[$gate->successor_need_id]['work_instance_id'], $gate->successor_work_instance_id);
        }

        $unrelatedLabor = $formed[(string) $needs[2]->id];
        app(OutboxWriter::class)->enqueue(
            eventType: 'work.completed',
            aggregateType: 'work_instance',
            aggregateId: $unrelatedLabor['work_instance_id'],
            payload: [
                'order_id' => $unrelatedLabor['order_id'],
                'work_instance_id' => $unrelatedLabor['work_instance_id'],
            ],
            correlationId: (string) Str::uuid7(),
        );
        self::assertSame(1, app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed')->published);
        self::assertSame(2, DB::table('work_step_dependency_gates')->where('deal_chain_id', $staged['deal_chain_id'])->where('status', 'blocked')->count());

        try {
            app(DealWorkGateAdapter::class)->assertWorkCanAdvance((string) $gates->firstWhere('condition_code', 'part_ready')->successor_work_instance_id, (string) Str::uuid7());
            self::fail('The confirmed courier Work must remain blocked until its exact predecessor milestone is dispatched.');
        } catch (KernelException $error) {
            self::assertSame(409, $error->status);
            self::assertSame('PREDECESSOR_GATE_BLOCKED', $error->envelope->code);
        }
        $partWork = DB::table('work_instances')->where('id', $formed[(string) $needs[0]->id]['work_instance_id'])->first();
        self::assertSame('A4', $partWork->work_shape);
        $partOrder = DB::table('orders')->where('id', $formed[(string) $needs[0]->id]['order_id'])->first();
        $courierOrder = DB::table('orders')->where('id', $formed[(string) $needs[1]->id]['order_id'])->first();
        $courierWork = DB::table('work_instances')->where('id', $formed[(string) $needs[1]->id]['work_instance_id'])->first();
        self::assertSame('A1', $courierWork->work_shape);
        $partEvidenceId = $this->createCleanWorkEvidence((string) $partOrder->provider_user_id, (string) $partWork->id);
        $handoff = app(A4HandoffService::class);
        $correlationId = (string) Str::uuid7();
        $handoff->markPrepared(
            (string) $partOrder->id,
            (string) $partOrder->provider_user_id,
            $partEvidenceId,
            'gate-part-ready-'.(string) $partOrder->id,
            (int) $partOrder->version,
            $correlationId,
        );
        $offered = $handoff->offerCustody(
            (string) $partOrder->id,
            (string) $partOrder->provider_user_id,
            'courier_delivery',
            (string) $courierOrder->provider_user_id,
            'gate-courier-offer-'.(string) $partOrder->id,
            1,
            $correlationId,
        );

        $transferBefore = DB::table('order_handoff_transfers')->where('id', $offered['id'])->first();
        $partOrderBefore = DB::table('orders')->where('id', $partOrder->id)->first();
        $partWorkBefore = DB::table('work_instances')->where('id', $partWork->id)->first();
        $auditCount = DB::table('audit_events')->where('order_id', $partOrder->id)->count();
        $workEventCount = DB::table('work_events')->where('work_instance_id', $partWork->id)->count();
        $stockMovementCount = DB::table('stock_movements')->where('order_id', $partOrder->id)->count();
        try {
            $handoff->acceptCustody(
                (string) $partOrder->id,
                (string) $offered['id'],
                (string) $courierOrder->provider_user_id,
                $partEvidenceId,
                'gate-premature-pickup-'.(string) $partOrder->id,
                (int) $offered['version'],
                $correlationId,
            );
            self::fail('Courier pickup must remain blocked until the product ready fact is dispatched.');
        } catch (KernelException $error) {
            self::assertSame(409, $error->status);
            self::assertSame('PREDECESSOR_GATE_BLOCKED', $error->envelope->code);
        }

        $transferAfter = DB::table('order_handoff_transfers')->where('id', $offered['id'])->first();
        self::assertSame('offered', $transferAfter->status);
        self::assertNull($transferAfter->accept_idempotency_key);
        self::assertSame($transferBefore->version, $transferAfter->version);
        self::assertSame($partOrderBefore->version, DB::table('orders')->where('id', $partOrder->id)->value('version'));
        self::assertSame($partWorkBefore->version, DB::table('work_instances')->where('id', $partWork->id)->value('version'));
        self::assertSame($auditCount, DB::table('audit_events')->where('order_id', $partOrder->id)->count());
        self::assertSame($workEventCount, DB::table('work_events')->where('work_instance_id', $partWork->id)->count());
        self::assertSame($stockMovementCount, DB::table('stock_movements')->where('order_id', $partOrder->id)->count());

        $readyDispatch = app(OutboxDispatcher::class);
        $notificationQuery = DB::table('notifications')
            ->where('recipient_user_id', $courierOrder->provider_user_id)
            ->where('event_source_type', 'deal_need')
            ->where('event_source_id', $needs[1]->id)
            ->where('event_type', 'deal.predecessor_unlocked');
        $notificationsBefore = (clone $notificationQuery)->count();
        try {
            DB::transaction(function () use ($readyDispatch): void {
                self::assertSame(1, $readyDispatch->dispatch(eventType: 'work.ready_for_collection')->published);
                throw new \RuntimeException('rollback gate notification consumer transaction');
            });
            self::fail('The enclosing source transaction should roll back the gate and notification intent.');
        } catch (\RuntimeException $error) {
            self::assertSame('rollback gate notification consumer transaction', $error->getMessage());
        }
        self::assertSame('blocked', DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'part_ready')
            ->value('status'));
        self::assertSame($notificationsBefore, (clone $notificationQuery)->count());

        self::assertSame(1, $readyDispatch->dispatch(eventType: 'work.ready_for_collection')->published);
        $notice = $notificationQuery->first();
        self::assertNotNull($notice);
        self::assertSame((string) $needs[1]->id, (string) $notice->event_source_id);
        self::assertSame('needs_action', (string) $notice->attention);
        $noticePayload = json_decode((string) $notice->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('needs_action', $noticePayload['attention']);
        self::assertNotSame('', trim((string) $noticePayload['title']));
        self::assertNotSame('', trim((string) $noticePayload['body']));
        self::assertSame('/orders/'.$courierOrder->id, $noticePayload['action_url']);
        self::assertStringNotContainsString('amount_minor', (string) $notice->payload);
        self::assertStringNotContainsString('phone', (string) $notice->payload);
        self::assertStringNotContainsString('evidence', (string) $notice->payload);
        self::assertStringNotContainsString('code', (string) $notice->payload);
        self::assertSame(0, $readyDispatch->dispatch(eventType: 'work.ready_for_collection')->published);
        self::assertSame(1, (clone $notificationQuery)->count());
        self::assertSame('cleared', DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'part_ready')
            ->value('status'));
        self::assertSame('not_started', $courierWork->status);

        $departed = $handoff->acceptCustody(
            (string) $partOrder->id,
            (string) $offered['id'],
            (string) $courierOrder->provider_user_id,
            $partEvidenceId,
            'gate-valid-pickup-'.(string) $partOrder->id,
            (int) $offered['version'],
            (string) Str::uuid7(),
        );
        self::assertSame('departed', $departed['status']);

        $receiptEvidenceId = $this->createCleanWorkEvidence($buyerUserId, (string) $partWork->id);
        $handoff->recordReceipt(
            (string) $partOrder->id,
            $buyerUserId,
            $receiptEvidenceId,
            'gate-customer-receipt-'.(string) $partOrder->id,
            (int) $departed['version'],
            (string) Str::uuid7(),
        );
        $receiptDispatch = app(OutboxDispatcher::class);
        $receiptDispatch->dispatch();
        self::assertSame('cleared', DB::table('work_step_dependency_gates')
            ->where('deal_chain_id', $staged['deal_chain_id'])
            ->where('condition_code', 'delivery_signed')
            ->value('status'));

        $laborOrder = DB::table('orders')->where('id', $formed[(string) $needs[2]->id]['order_id'])->first();
        $laborWork = DB::table('work_instances')->where('id', $formed[(string) $needs[2]->id]['work_instance_id'])->first();
        self::assertSame('not_started', $laborWork->status);
        $structure = json_decode((string) $laborWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $activeNode = collect($structure['nodes'])->first(
            fn (array $node): bool => ($node['status'] ?? null) === 'active'
                && ($node['control_mode'] ?? 'provider_advance') === 'provider_advance',
        );
        self::assertNotNull($activeNode);
        $requiredProofs = (array) ($activeNode['required_proofs'] ?? []);
        $payload = [];
        if (in_array('photo_proof', $requiredProofs, true)) {
            $photoId = $this->createCleanWorkEvidence((string) $laborOrder->provider_user_id, (string) $laborWork->id, (string) $activeNode['id']);
            $payload['evidence_file_ids'] = [$photoId];
        }
        if (in_array('gps_checkin', $requiredProofs, true)) {
            $payload['location'] = [
                'latitude' => 46.0,
                'longitude' => -119.0,
                'source' => 'manual',
                'observed_at' => now()->toIso8601String(),
                'accuracy_m' => null,
            ];
        }
        if (in_array('metric_reading', $requiredProofs, true)) {
            foreach ((array) ($activeNode['metric_requirements'] ?? []) as $requirement) {
                if (! is_array($requirement) || ! ($requirement['required'] ?? true)) {
                    continue;
                }
                $value = isset($requirement['min'])
                    ? (float) $requirement['min']
                    : (isset($requirement['target']) ? (float) $requirement['target'] : (isset($requirement['max']) ? min(1.0, (float) $requirement['max']) : 1.0));
                $payload['metric_readings'][] = [
                    'id' => (string) $requirement['id'],
                    'value' => $value,
                    'unit' => (string) $requirement['unit'],
                    'observed_at' => now()->toIso8601String(),
                ];
            }
        }
        if (in_array('checklist_steps', $requiredProofs, true)) {
            $payload['checklist_responses'] = array_values(array_map(
                static fn (array $item): array => ['id' => (string) $item['id'], 'completed' => true],
                array_values(array_filter(
                    (array) ($activeNode['checklist_items'] ?? []),
                    static fn (mixed $item): bool => is_array($item) && ($item['required'] ?? true),
                )),
            ));
        }

        $advanced = app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $laborOrder->id,
            actorUserId: (string) $laborOrder->provider_user_id,
            nodeId: (string) $activeNode['id'],
            action: 'complete_step',
            payload: $payload,
            correlationId: (string) Str::uuid7(),
        );
        self::assertSame('in_progress', $advanced['work_status']);
        self::assertSame('in_progress', DB::table('work_instances')->where('id', $laborWork->id)->value('status'));
        $advancedStructure = json_decode((string) DB::table('work_instances')->where('id', $laborWork->id)->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('completed', $advancedStructure['nodes'][0]['status']);

    }
    public function test_withdrawing_an_unstarted_a3_partner_releases_its_committed_appointment(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId, 'A3');
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->where('node_role', 'labor')->firstOrFail();
        $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
        $invitation = DB::table('deal_invitations')->where('id', $accepted['invitation_id'])->firstOrFail();
        $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);
        $appointment = app(OrderCapacityPort::class)->appointmentDetailsForListing((string) $scope['listing_id'], (string) Str::uuid7());
        $hold = app(OrderCapacityPort::class)->holdAppointment(
            listingId: (string) $scope['listing_id'],
            listingVersionId: (string) $scope['listing_version_id'],
            providerUserId: (string) $invitation->invited_provider_user_id,
            customerUserId: $buyerId,
            startsAt: now()->addDays(4)->setTime(10, 0)->setSecond(0)->toIso8601String(),
            durationMinutes: (int) $appointment['duration_minutes'],
            ttlMinutes: 10,
            idempotencyKey: 'deal-partner-a3-hold-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $formed = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            invitationId: (string) $invitation->id,
            expectedNeedVersion: $accepted['expected_need_version'],
            termsHash: $accepted['terms_hash'],
            capacityHash: $accepted['capacity_hash'],
            idempotencyKey: 'deal-partner-a3-confirm-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
            appointmentReservationId: (string) $hold['id'],
        );
        $currentNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $reservationBefore = DB::table('appointment_reservations')->where('id', $hold['id'])->firstOrFail();
        self::assertSame('committed', $reservationBefore->status);
        self::assertSame('scheduled', DB::table('work_instances')->where('id', $formed['work_instance_id'])->value('status'));

        $withdraw = app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $currentNeed->version,
            idempotencyKey: 'deal-partner-a3-withdraw-once',
            correlationId: (string) Str::uuid7(),
        );
        $replay = app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $currentNeed->version,
            idempotencyKey: 'deal-partner-a3-withdraw-once',
            correlationId: (string) Str::uuid7(),
        );

        expect($withdraw)->toEqual($replay)
            ->and(DB::table('appointment_reservations')->where('id', $hold['id'])->value('status'))->toBe('released')
            ->and(DB::table('work_instances')->where('id', $formed['work_instance_id'])->value('status'))->toBe('cancelled')
            ->and(DB::table('payment_obligations')->where('order_id', $formed['order_id'])->value('status'))->toBe('not_due')
            ->and(DB::table('deal_needs')->where('id', $need->id)->value('status'))->toBe('replacement_needed');
    }
    public function test_withdrawing_unstarted_product_need_releases_only_its_committed_stock_reservation(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId, 'A1', withHardwareSibling: true);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        }
        $partNeed = $needs->firstWhere('node_key', 'part');
        $hardwareNeed = $needs->firstWhere('node_key', 'primary');
        $partOrder = DB::table('orders')->where('id', $formed[(string) $partNeed->id]['order_id'])->firstOrFail();
        $hardwareOrder = DB::table('orders')->where('id', $formed[(string) $hardwareNeed->id]['order_id'])->firstOrFail();
        $capacity = app(OrderCapacityPort::class);
        $capacityReservationFor = static function (object $order): object {
            return DB::table('order_proposals')->where('id', $order->current_proposal_id)->firstOrFail();
        };
        $partProposal = $capacityReservationFor($partOrder);
        $hardwareProposal = $capacityReservationFor($hardwareOrder);
        self::assertNotNull($partProposal->capacity_reservation_id);
        self::assertNotNull($hardwareProposal->capacity_reservation_id);
        $partSnapshot = DB::table('order_terms_snapshots')->where('order_id', $partOrder->id)->firstOrFail();
        $hardwareSnapshot = DB::table('order_terms_snapshots')->where('order_id', $hardwareOrder->id)->firstOrFail();
        $partScope = json_decode((string) $partSnapshot->scope, true, 512, JSON_THROW_ON_ERROR);
        $hardwareScope = json_decode((string) $hardwareSnapshot->scope, true, 512, JSON_THROW_ON_ERROR);
        $partListingId = (string) $partOrder->listing_id;
        $hardwareListingId = (string) $hardwareOrder->listing_id;
        $partListingVersionId = (string) $partSnapshot->source_listing_version_id;
        $hardwareListingVersionId = (string) $hardwareSnapshot->source_listing_version_id;
        $partResourceKey = (string) ($partScope['resource_key'] ?? '');
        $hardwareResourceKey = (string) ($hardwareScope['resource_key'] ?? '');
        $partBucketBefore = $capacity->findOpenQuantityBucket($partListingId, $partListingVersionId, $partResourceKey);
        $hardwareBucketBefore = $capacity->findOpenQuantityBucket($hardwareListingId, $hardwareListingVersionId, $hardwareResourceKey);
        self::assertNotNull($partBucketBefore);
        self::assertNotNull($hardwareBucketBefore);
        $partOnHandBefore = DB::table('listing_capacity')->where('listing_id', $partListingId)->value('quantity');
        $hardwareOnHandBefore = DB::table('listing_capacity')->where('listing_id', $hardwareListingId)->value('quantity');
        $partOrderBefore = (array) $partOrder;
        $hardwareOrderBefore = (array) $hardwareOrder;
        $partWorkBefore = (array) DB::table('work_instances')->where('order_id', $partOrder->id)->firstOrFail();
        $hardwareWorkBefore = (array) DB::table('work_instances')->where('order_id', $hardwareOrder->id)->firstOrFail();
        $partObligationBefore = (array) DB::table('payment_obligations')->where('order_id', $partOrder->id)->firstOrFail();
        $hardwareObligationBefore = (array) DB::table('payment_obligations')->where('order_id', $hardwareOrder->id)->firstOrFail();
        $hardwareReservationBefore = DB::table('listing_capacity_reservations')
            ->where('id', $hardwareProposal->capacity_reservation_id)
            ->firstOrFail();

        app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $partNeed->id,
            expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $partNeed->id)->value('version'),
            idempotencyKey: 'deal-unstarted-product-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $partReservation = DB::table('listing_capacity_reservations')->where('id', $partProposal->capacity_reservation_id)->firstOrFail();
        $hardwareReservation = DB::table('listing_capacity_reservations')->where('id', $hardwareProposal->capacity_reservation_id)->firstOrFail();
        $partBucketAfter = $capacity->findOpenQuantityBucket($partListingId, $partListingVersionId, $partResourceKey);
        $hardwareBucketAfter = $capacity->findOpenQuantityBucket($hardwareListingId, $hardwareListingVersionId, $hardwareResourceKey);
        expect($partReservation->status)->toBe('released')
            ->and($partBucketAfter['remaining_quantity'])->toBe($partBucketBefore['remaining_quantity'] + (int) $partReservation->quantity)
            ->and((int) DB::table('listing_capacity')->where('listing_id', $partListingId)->value('quantity'))->toBe((int) $partOnHandBefore)
            ->and((array) $hardwareReservation)->toEqual((array) $hardwareReservationBefore)
            ->and($hardwareBucketAfter)->toEqual($hardwareBucketBefore)
            ->and((int) DB::table('listing_capacity')->where('listing_id', $hardwareListingId)->value('quantity'))->toBe((int) $hardwareOnHandBefore)
            ->and((array) DB::table('orders')->where('id', $hardwareOrder->id)->firstOrFail())->toEqual($hardwareOrderBefore)
            ->and((array) DB::table('work_instances')->where('order_id', $hardwareOrder->id)->firstOrFail())->toEqual($hardwareWorkBefore)
            ->and((array) DB::table('payment_obligations')->where('order_id', $hardwareOrder->id)->firstOrFail())->toEqual($hardwareObligationBefore)
            ->and((array) DB::table('payment_obligations')->where('order_id', $partOrder->id)->firstOrFail())->toEqual($partObligationBefore)
            ->and(DB::table('work_events')->where('work_instance_id', $hardwareWorkBefore['id'])->whereNotNull('evidence_file_id')->count())->toBe(0);
    }
    public function test_replacement_prices_a_real_product_variant_stored_in_major_units(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId);
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->where('node_role', 'store')->firstOrFail();
        app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $need->version,
            idempotencyKey: 'variant-price-part-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $replacementOwner = User::factory()->create();
        $candidate = $this->createActiveProductVariantListing($replacementOwner, 'Variant-priced replacement part', 52.0);
        $replacementNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $replacement = app(ChooseDealReplacement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $replacementNeed->version,
            listingId: (string) $candidate->id,
            variantId: null,
            idempotencyKey: 'variant-price-part-replace-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $invitation = DB::table('deal_invitations')->where('id', $replacement['invitation_id'])->firstOrFail();
        $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);

        expect($scope['variant_id'])->toBe('variant-major-unit')
            ->and($scope['unit_amount_minor'])->toBe(5200)
            ->and($scope['amount_minor'])->toBe(5200)
            ->and(DB::table('orders')->where('deal_need_id', $replacement['replacement_need_id'])->count())->toBe(0);
    }

    public function test_zero_consideration_child_without_an_obligation_can_withdraw_from_its_immutable_zero_terms(): void
    {
        $buyerId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $listing = $this->createActiveListing($provider, 'Zero-consideration inspection', 'service', 'repairs', 'A1', 0);
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: $buyerId,
            items: [['id' => (string) $listing->id, 'quantity' => 1, 'deal_chain' => null]],
            idempotencyKey: 'zero-consideration-stage-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->firstOrFail();
        $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
        $formed = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        self::assertSame(0, (int) DB::table('order_terms_snapshots')->where('order_id', $formed['order_id'])->value('amount_minor'));
        self::assertSame(0, DB::table('payment_obligations')->where('order_id', $formed['order_id'])->count());
        $currentNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $detail = $this->actingAs($provider)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get(route('deal-chains.show', ['dealChain' => $staged['deal_chain_id']]))
            ->assertOk();
        self::assertTrue(collect($detail->json('props.slots'))->firstWhere('id', (string) $need->id)['can_withdraw']);

        $withdraw = app(WithdrawDealPartner::class)->handle(
            actorUserId: (string) $provider->id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $currentNeed->version,
            idempotencyKey: 'zero-consideration-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        expect($withdraw['status'])->toBe('replacement_needed')
            ->and(DB::table('orders')->where('id', $formed['order_id'])->value('status'))->toBe('cancelled')
            ->and(DB::table('work_instances')->where('id', $formed['work_instance_id'])->value('status'))->toBe('cancelled')
            ->and(DB::table('payment_obligations')->where('order_id', $formed['order_id'])->count())->toBe(0);
    }

    public function test_accepted_invitation_provider_can_withdraw_before_customer_confirmation(): void
    {
        $buyerId = $this->authenticateBuyer();
        $listingOwner = User::factory()->create();
        $listing = $this->createActiveListing($listingOwner, 'Provider awaiting customer consent', 'service', 'repairs', 'A1');
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: $buyerId,
            items: [['id' => (string) $listing->id, 'quantity' => 1, 'deal_chain' => null]],
            idempotencyKey: 'awaiting-customer-withdraw-stage-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->firstOrFail();
        $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
        $acceptedEntry = collect(app(DealInvitationInboxQuery::class)->forProvider((string) $listingOwner->id))
            ->firstWhere('id', $accepted['invitation_id']);
        self::assertNotNull($acceptedEntry);
        self::assertSame((string) $staged['deal_chain_id'], $acceptedEntry['deal_chain_id']);
        self::assertSame((string) $need->id, $acceptedEntry['deal_need_id']);
        self::assertSame((int) $accepted['expected_need_version'], $acceptedEntry['expected_need_version']);
        self::assertTrue($acceptedEntry['can_withdraw_need']);
        self::assertSame('awaiting_customer_confirmation', DB::table('deal_needs')->where('id', $need->id)->value('status'));
        self::assertSame(0, DB::table('orders')->where('deal_chain_id', $staged['deal_chain_id'])->count());

        $withdraw = app(WithdrawDealPartner::class)->handle(
            actorUserId: (string) $listingOwner->id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: $accepted['expected_need_version'],
            idempotencyKey: 'awaiting-customer-provider-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        expect($withdraw['status'])->toBe('replacement_needed')
            ->and(DB::table('deal_needs')->where('id', $need->id)->value('status'))->toBe('replacement_needed')
            ->and(DB::table('deal_invitations')->where('deal_need_id', $need->id)->value('status'))->toBe('revoked')
            ->and(DB::table('orders')->where('deal_chain_id', $staged['deal_chain_id'])->count())->toBe(0);
    }

    public function test_replacement_accepts_an_active_audit_listing_classified_by_the_existing_slot_picker(): void
    {
        $buyerId = $this->authenticateBuyer();
        $primaryOwner = User::factory()->create();
        $auditOwner = User::factory()->create();
        $primary = $this->createActiveListing($primaryOwner, 'Primary repair service', 'service', 'repairs', 'A1');
        $auditListing = $this->createActiveListing($auditOwner, 'Home Appliance Safety Audit', 'service', 'repairs', 'A1');
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: $buyerId,
            items: [['id' => (string) $primary->id, 'quantity' => 1, 'deal_chain' => 'safety_audit']],
            idempotencyKey: 'audit-replacement-stage-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->where('node_role', 'audit')->firstOrFail();
        $picker = $this->getJson('/api/deal-chains/slot-candidates?role=AUDIT')->assertOk();
        self::assertTrue(collect($picker->json('data'))->contains(fn (array $candidate): bool => $candidate['id'] === (string) $auditListing->id));
        app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $need->version,
            idempotencyKey: 'audit-slot-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $replacementNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $replacement = app(ChooseDealReplacement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $replacementNeed->version,
            listingId: (string) $auditListing->id,
            variantId: null,
            idempotencyKey: 'audit-slot-replace-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $invitation = DB::table('deal_invitations')->where('id', $replacement['invitation_id'])->firstOrFail();
        expect($invitation->status)->toBe('sent')
            ->and($invitation->invited_provider_user_id)->toBe($auditOwner->id)
            ->and(DB::table('deal_needs')->where('id', $replacement['replacement_need_id'])->value('node_role'))->toBe('audit');
    }

    public function test_unformed_withdrawal_notice_links_to_a_destination_accessible_to_the_invited_provider(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId);
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->where('node_role', 'courier')->firstOrFail();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->where('status', 'sent')->firstOrFail();
        self::assertSame(0, DB::table('orders')->where('deal_chain_id', $staged['deal_chain_id'])->count());

        app(WithdrawDealPartner::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            expectedNeedVersion: (int) $need->version,
            idempotencyKey: 'deal-unformed-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $notice = DB::table('notifications')
            ->where('recipient_user_id', $invitation->invited_provider_user_id)
            ->where('event_source_id', $need->id)
            ->where('event_type', 'deal.partner_withdrawn')
            ->firstOrFail();
        $payload = json_decode((string) $notice->payload, true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(route('deal-invitations.index', [], false), $payload['action_url']);
        $this->actingAs(User::findOrFail($invitation->invited_provider_user_id))
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
            ])
            ->get((string) $payload['action_url'])
            ->assertOk()
            ->assertJsonPath('component', 'DealInvitations/Index');
    }


    public function test_departed_product_custody_blocks_unstarted_courier_with_zero_withdrawal_effects(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        }
        $partOrder = DB::table('orders')->where('id', $formed[(string) $needs[0]->id]['order_id'])->firstOrFail();
        $partWork = DB::table('work_instances')->where('id', $formed[(string) $needs[0]->id]['work_instance_id'])->firstOrFail();
        $courierOrder = DB::table('orders')->where('id', $formed[(string) $needs[1]->id]['order_id'])->firstOrFail();
        $courierWork = DB::table('work_instances')->where('id', $formed[(string) $needs[1]->id]['work_instance_id'])->firstOrFail();
        $partNodes = json_decode((string) $partWork->structure, true, 512, JSON_THROW_ON_ERROR)['nodes'];
        $partEvidence = $this->uploadCleanWorkPhoto((string) $partOrder->provider_user_id, (string) $partOrder->id, (string) $partNodes[0]['id']);
        $handoff = app(A4HandoffService::class);
        $handoff->markPrepared(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            evidenceId: $partEvidence,
            idempotencyKey: 'late-custody-part-ready-'.(string) $partOrder->id,
            expectedOrderVersion: (int) $partOrder->version,
            correlationId: (string) Str::uuid7(),
            nodeId: (string) $partNodes[0]['id'],
            expectedWorkVersion: (int) $partWork->version,
        );
        app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection');
        $offer = $handoff->offerCustody(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            mode: 'courier_delivery',
            courierId: (string) $courierOrder->provider_user_id,
            idempotencyKey: 'late-custody-offer-'.(string) $partOrder->id,
            expectedTransferVersion: 1,
            correlationId: (string) Str::uuid7(),
        );
        $handoff->acceptCustody(
            orderId: (string) $partOrder->id,
            transferId: (string) $offer['id'],
            actorId: (string) $courierOrder->provider_user_id,
            evidenceId: $partEvidence,
            idempotencyKey: 'late-custody-depart-'.(string) $partOrder->id,
            expectedTransferVersion: (int) $offer['version'],
            correlationId: (string) Str::uuid7(),
        );

        $needBefore = DB::table('deal_needs')->where('id', $needs[1]->id)->firstOrFail();
        $orderBefore = (array) DB::table('orders')->where('id', $courierOrder->id)->firstOrFail();
        $workBefore = (array) DB::table('work_instances')->where('id', $courierWork->id)->firstOrFail();
        $obligationBefore = (array) DB::table('payment_obligations')->where('order_id', $courierOrder->id)->firstOrFail();
        $invitationBefore = (array) DB::table('deal_invitations')->where('deal_need_id', $needs[1]->id)->firstOrFail();
        $auditCount = DB::table('audit_events')->count();
        $outboxCount = DB::table('outbox_messages')->count();
        self::assertSame('not_started', $workBefore['status']);
        $this->actingAs(User::findOrFail($courierOrder->provider_user_id))
            ->postJson(route('deal-chains.needs.withdraw', [
                'dealChain' => $staged['deal_chain_id'],
                'need' => $needs[1]->id,
            ]), ['expected_need_version' => (int) $needBefore->version])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'WITHDRAWAL_IRREVERSIBLE');
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());

        try {
            app(WithdrawDealPartner::class)->handle(
                actorUserId: (string) $courierOrder->provider_user_id,
                dealChainId: (string) $staged['deal_chain_id'],
                dealNeedId: (string) $needs[1]->id,
                expectedNeedVersion: (int) $needBefore->version,
                idempotencyKey: 'late-custody-withdraw-'.Str::uuid7(),
                correlationId: (string) Str::uuid7(),
            );
            self::fail('A courier with departed custody must not be withdrawn.');
        } catch (KernelException $error) {
            self::assertSame('WITHDRAWAL_IRREVERSIBLE', $error->envelope->code);
        }

        self::assertSame($orderBefore, (array) DB::table('orders')->where('id', $courierOrder->id)->firstOrFail());
        self::assertSame($workBefore, (array) DB::table('work_instances')->where('id', $courierWork->id)->firstOrFail());
        self::assertSame($obligationBefore, (array) DB::table('payment_obligations')->where('order_id', $courierOrder->id)->firstOrFail());
        self::assertSame($invitationBefore, (array) DB::table('deal_invitations')->where('deal_need_id', $needs[1]->id)->firstOrFail());
        self::assertSame('in_progress', DB::table('deal_needs')->where('id', $needs[1]->id)->value('status'));
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());
        self::assertSame(0, DB::table('support_cases')->where('order_id', $courierOrder->id)->where('category', 'deal_partner_withdrawal_reconciliation')->count());
    }
    public function test_unauthorized_and_started_non_courier_withdrawal_attempts_have_zero_effects(): void
    {
        $buyerId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $outsider = User::factory()->create();
        $listing = $this->createActiveListing($provider, 'Independent started service', 'service', 'repairs', 'A1');
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: $buyerId,
            items: [['id' => (string) $listing->id, 'quantity' => 1, 'deal_chain' => null],
            ],
            idempotencyKey: 'started-provider-chain-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $need = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->firstOrFail();
        $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
        $formed = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        $order = DB::table('orders')->where('id', $formed['order_id'])->firstOrFail();
        $work = DB::table('work_instances')->where('id', $formed['work_instance_id'])->firstOrFail();
        $needBefore = (array) DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $orderBefore = (array) $order;
        $workBefore = (array) $work;
        $obligationBefore = (array) DB::table('payment_obligations')->where('order_id', $order->id)->firstOrFail();
        $auditCount = DB::table('audit_events')->count();
        $outboxCount = DB::table('outbox_messages')->count();
        $this->actingAs($outsider)
            ->withHeader('X-Idempotency-Key', 'http-outsider-deal-withdraw-'.Str::uuid7())
            ->postJson(route('deal-chains.needs.withdraw', [
                'dealChain' => $staged['deal_chain_id'],
                'need' => $need->id,
            ]), ['expected_need_version' => (int) $needBefore['version']])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');
        $this->postJson(route('deal-chains.needs.replace', [
            'dealChain' => $staged['deal_chain_id'],
            'need' => $need->id,
        ]), [
            'expected_need_version' => (int) $needBefore['version'],
            'listing_id' => $listing->id,
        ])->assertForbidden()->assertJsonPath('error.code', 'AUTHORIZATION_DENIED');


        try {
            app(WithdrawDealPartner::class)->handle(
                actorUserId: (string) $outsider->id,
                dealChainId: (string) $staged['deal_chain_id'],
                dealNeedId: (string) $need->id,
                expectedNeedVersion: (int) $need->version,
                idempotencyKey: 'outsider-deal-withdraw-'.Str::uuid7(),
                correlationId: (string) Str::uuid7(),
            );
            self::fail('A nonparticipant cannot withdraw this Deal Need.');
        } catch (DealCoordinationError $error) {
            self::assertSame('AUTHORIZATION_DENIED', $error->envelope->code);
        }
        self::assertSame($needBefore, (array) DB::table('deal_needs')->where('id', $need->id)->firstOrFail());
        self::assertSame($orderBefore, (array) DB::table('orders')->where('id', $order->id)->firstOrFail());
        self::assertSame($workBefore, (array) DB::table('work_instances')->where('id', $work->id)->firstOrFail());
        self::assertSame($obligationBefore, (array) DB::table('payment_obligations')->where('order_id', $order->id)->firstOrFail());
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());

        $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        $firstNode = $structure['nodes'][0];
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $order->id,
            actorUserId: (string) $provider->id,
            nodeId: (string) $firstNode['id'],
            action: 'complete_step',
            correlationId: (string) Str::uuid7(),
        );
        $startedNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $startedOrder = (array) DB::table('orders')->where('id', $order->id)->firstOrFail();
        $startedWork = (array) DB::table('work_instances')->where('id', $work->id)->firstOrFail();
        $startedObligation = (array) DB::table('payment_obligations')->where('order_id', $order->id)->firstOrFail();
        $eventsBefore = DB::table('work_events')->where('work_instance_id', $work->id)->pluck('id')->all();
        $auditCount = DB::table('audit_events')->count();
        $outboxCount = DB::table('outbox_messages')->count();

        try {
            app(WithdrawDealPartner::class)->handle(
                actorUserId: (string) $provider->id,
                dealChainId: (string) $staged['deal_chain_id'],
                dealNeedId: (string) $need->id,
                expectedNeedVersion: (int) $startedNeed->version,
                idempotencyKey: 'started-provider-withdraw-'.Str::uuid7(),
                correlationId: (string) Str::uuid7(),
            );
            self::fail('A started non-courier provider Work cannot be withdrawn.');
        } catch (KernelException $error) {
            self::assertSame('WITHDRAWAL_IRREVERSIBLE', $error->envelope->code);
        }
        self::assertSame($startedOrder, (array) DB::table('orders')->where('id', $order->id)->firstOrFail());
        self::assertSame($startedWork, (array) DB::table('work_instances')->where('id', $work->id)->firstOrFail());
        self::assertSame($startedObligation, (array) DB::table('payment_obligations')->where('order_id', $order->id)->firstOrFail());
        self::assertSame($eventsBefore, DB::table('work_events')->where('work_instance_id', $work->id)->pluck('id')->all());
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());
    }
    public function test_courier_withdrawal_leaves_a_completed_settled_hardware_sibling_byte_for_byte_unchanged(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId, 'A1', withHardwareSibling: true);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        }
        $hardwareNeed = $needs->firstWhere('node_key', 'primary');
        self::assertNotNull($hardwareNeed);
        $hardware = $formed[(string) $hardwareNeed->id];
        $hardwareOrder = DB::table('orders')->where('id', $hardware['order_id'])->firstOrFail();
        $hardwareWork = DB::table('work_instances')->where('id', $hardware['work_instance_id'])->firstOrFail();
        self::assertSame('A4', $hardwareWork->work_shape);
        $hardwareNodes = json_decode((string) $hardwareWork->structure, true, 512, JSON_THROW_ON_ERROR)['nodes'];
        $handoff = app(A4HandoffService::class);
        $providerPhoto = $this->uploadCleanWorkPhoto((string) $hardwareOrder->provider_user_id, (string) $hardwareOrder->id, (string) $hardwareNodes[0]['id']);
        $handoff->markPrepared(
            orderId: (string) $hardwareOrder->id,
            actorId: (string) $hardwareOrder->provider_user_id,
            evidenceId: $providerPhoto,
            idempotencyKey: 'settled-hardware-prepared-'.(string) $hardwareOrder->id,
            expectedOrderVersion: (int) $hardwareOrder->version,
            correlationId: (string) Str::uuid7(),
            nodeId: (string) $hardwareNodes[0]['id'],
            expectedWorkVersion: (int) $hardwareWork->version,
        );
        $hardwareTransfer = $handoff->offerCustody(
            orderId: (string) $hardwareOrder->id,
            actorId: (string) $hardwareOrder->provider_user_id,
            mode: 'counter_pickup',
            courierId: null,
            idempotencyKey: 'settled-hardware-offer-'.(string) $hardwareOrder->id,
            expectedTransferVersion: 1,
            correlationId: (string) Str::uuid7(),
        );
        $buyerCustodyPhoto = $this->uploadCleanWorkPhoto($buyerId, (string) $hardwareOrder->id, (string) $hardwareNodes[1]['id']);
        $departed = $handoff->acceptCustody(
            orderId: (string) $hardwareOrder->id,
            transferId: (string) $hardwareTransfer['id'],
            actorId: $buyerId,
            evidenceId: $buyerCustodyPhoto,
            idempotencyKey: 'settled-hardware-depart-'.(string) $hardwareOrder->id,
            expectedTransferVersion: (int) $hardwareTransfer['version'],
            correlationId: (string) Str::uuid7(),
            nodeId: (string) $hardwareNodes[1]['id'],
            expectedWorkVersion: (int) DB::table('work_instances')->where('id', $hardwareWork->id)->value('version'),
        );
        $receiptPhoto = $this->uploadCleanWorkPhoto($buyerId, (string) $hardwareOrder->id, (string) $hardwareNodes[2]['id']);
        $handoff->recordReceipt(
            orderId: (string) $hardwareOrder->id,
            actorId: $buyerId,
            evidenceId: $receiptPhoto,
            idempotencyKey: 'settled-hardware-receipt-'.(string) $hardwareOrder->id,
            expectedTransferVersion: (int) $departed['version'],
            correlationId: (string) Str::uuid7(),
            expectedWorkVersion: (int) DB::table('work_instances')->where('id', $hardwareWork->id)->value('version'),
            nodeId: (string) $hardwareNodes[2]['id'],
        );
        $payments = app(\App\Shared\Contracts\OrderPaymentObligationPort::class);
        $hardwareObligation = DB::table('payment_obligations')->where('order_id', $hardwareOrder->id)->firstOrFail();
        $payments->reportCashPayment(
            (string) $hardwareOrder->id,
            (string) $hardwareObligation->id,
            $buyerId,
            (string) Str::uuid7(),
            'settled-hardware-cash-report-'.Str::uuid7(),
        );
        $payments->acknowledgeCashReceipt(
            (string) $hardwareOrder->id,
            (string) $hardwareObligation->id,
            (string) $hardwareOrder->provider_user_id,
            (string) $hardwareOrder->provider_user_id,
            null,
            (string) Str::uuid7(),
            'settled-hardware-cash-ack-'.Str::uuid7(),
        );
        $hardwareOrderBefore = (array) DB::table('orders')->where('id', $hardwareOrder->id)->firstOrFail();
        $hardwareWorkBefore = (array) DB::table('work_instances')->where('id', $hardwareWork->id)->firstOrFail();
        $hardwareObligationBefore = (array) DB::table('payment_obligations')->where('id', $hardwareObligation->id)->firstOrFail();
        self::assertSame('completed', $hardwareOrderBefore['status']);
        self::assertSame('completed', $hardwareWorkBefore['status']);
        self::assertSame('settled', $hardwareObligationBefore['status']);

        $partNeed = $needs->firstWhere('node_key', 'part');
        $courierNeed = $needs->firstWhere('node_key', 'courier');
        $part = $formed[(string) $partNeed->id];
        $courier = $formed[(string) $courierNeed->id];
        $partOrder = DB::table('orders')->where('id', $part['order_id'])->firstOrFail();
        $partWork = DB::table('work_instances')->where('id', $part['work_instance_id'])->firstOrFail();
        $partNodes = json_decode((string) $partWork->structure, true, 512, JSON_THROW_ON_ERROR)['nodes'];
        $partPhoto = $this->uploadCleanWorkPhoto((string) $partOrder->provider_user_id, (string) $partOrder->id, (string) $partNodes[0]['id']);
        $handoff->markPrepared(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            evidenceId: $partPhoto,
            idempotencyKey: 'other-part-prepared-'.(string) $partOrder->id,
            expectedOrderVersion: (int) $partOrder->version,
            correlationId: (string) Str::uuid7(),
            nodeId: (string) $partNodes[0]['id'],
            expectedWorkVersion: (int) $partWork->version,
        );
        app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection');
        $courierOrder = DB::table('orders')->where('id', $courier['order_id'])->firstOrFail();
        $courierWork = DB::table('work_instances')->where('id', $courier['work_instance_id'])->firstOrFail();
        $courierNode = json_decode((string) $courierWork->structure, true, 512, JSON_THROW_ON_ERROR)['nodes'][0];
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $courierOrder->id,
            actorUserId: (string) $courierOrder->provider_user_id,
            nodeId: (string) $courierNode['id'],
            action: 'complete_step',
            correlationId: (string) Str::uuid7(),
        );
        $courierObligation = DB::table('payment_obligations')->where('order_id', $courierOrder->id)->firstOrFail();
        $payments->markDueFromWorkFact((string) $courierOrder->id, (string) $courierWork->id, (string) Str::uuid7());
        $payments->reportCashPayment(
            (string) $courierOrder->id,
            (string) $courierObligation->id,
            $buyerId,
            (string) Str::uuid7(),
            'other-courier-cash-report-'.Str::uuid7(),
        );
        $currentCourierNeed = DB::table('deal_needs')->where('id', $courierNeed->id)->firstOrFail();
        app(WithdrawDealPartner::class)->handle(
            actorUserId: (string) $courierOrder->provider_user_id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $courierNeed->id,
            expectedNeedVersion: (int) $currentCourierNeed->version,
            idempotencyKey: 'other-courier-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        expect((array) DB::table('orders')->where('id', $hardwareOrder->id)->firstOrFail())->toEqual($hardwareOrderBefore)
            ->and((array) DB::table('work_instances')->where('id', $hardwareWork->id)->firstOrFail())->toEqual($hardwareWorkBefore)
            ->and((array) DB::table('payment_obligations')->where('id', $hardwareObligation->id)->firstOrFail())->toEqual($hardwareObligationBefore);
    }
    public function test_uncollected_courier_work_is_withdrawn_with_a_child_scoped_reconciliation_case_and_fresh_replacement_invite(): void
    {
        $buyerId = $this->authenticateBuyer();
        $staged = $this->stageRealTurnkeyParts($buyerId);
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        $formed = [];
        foreach ($needs as $need) {
            $accepted = $this->acceptNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id);
            $formed[(string) $need->id] = $this->confirmAcceptedNeed($buyerId, (string) $staged['deal_chain_id'], (string) $need->id, $accepted);
        }
        $part = $formed[(string) $needs[0]->id];
        $courier = $formed[(string) $needs[1]->id];
        $partOrder = DB::table('orders')->where('id', $part['order_id'])->firstOrFail();
        $partWork = DB::table('work_instances')->where('id', $part['work_instance_id'])->firstOrFail();
        $partStructure = json_decode((string) $partWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $partNode = $partStructure['nodes'][0];
        $evidenceId = $this->uploadCleanWorkPhoto((string) $partOrder->provider_user_id, (string) $partOrder->id, (string) $partNode['id']);
        app(A4HandoffService::class)->markPrepared(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            evidenceId: $evidenceId,
            idempotencyKey: 'deal-partner-part-ready-'.(string) $partOrder->id,
            expectedOrderVersion: (int) $partOrder->version,
            correlationId: (string) Str::uuid7(),
            nodeId: (string) $partNode['id'],
            expectedWorkVersion: (int) $partWork->version,
        );
        app(OutboxDispatcher::class)->dispatch(eventType: 'work.ready_for_collection');
        $courierOrder = DB::table('orders')->where('id', $courier['order_id'])->firstOrFail();
        $partOffer = app(A4HandoffService::class)->offerCustody(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            mode: 'courier_delivery',
            courierId: (string) $courierOrder->provider_user_id,
            idempotencyKey: 'deal-partner-original-courier-offer-'.Str::uuid7(),
            expectedTransferVersion: 1,
            correlationId: (string) Str::uuid7(),
        );

        $courierWork = DB::table('work_instances')->where('id', $courier['work_instance_id'])->firstOrFail();
        $courierStructure = json_decode((string) $courierWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $firstNode = $courierStructure['nodes'][0];
        app(WorkExecutionService::class)->advanceNode(
            orderId: (string) $courierOrder->id,
            actorUserId: (string) $courierOrder->provider_user_id,
            nodeId: (string) $firstNode['id'],
            action: 'complete_step',
            correlationId: (string) Str::uuid7(),
        );
        $startedWork = DB::table('work_instances')->where('id', $courierWork->id)->firstOrFail();
        $courierObligationId = (string) DB::table('payment_obligations')->where('order_id', $courierOrder->id)->value('id');
        $payments = app(\App\Shared\Contracts\OrderPaymentObligationPort::class);
        $payments->markDueFromWorkFact((string) $courierOrder->id, (string) $courierWork->id, (string) Str::uuid7());
        $payments->reportCashPayment(
            (string) $courierOrder->id,
            $courierObligationId,
            $buyerId,
            (string) Str::uuid7(),
            'deal-partial-courier-cash-report-'.Str::uuid7(),
        );
        $workEventsBefore = DB::table('work_events')->where('work_instance_id', $courierWork->id)->pluck('id')->all();
        $termsBefore = DB::table('order_terms_snapshots')->where('order_id', $courierOrder->id)->orderBy('snapshot_version')->get()->toArray();
        $obligationBefore = DB::table('payment_obligations')->where('order_id', $courierOrder->id)->firstOrFail();
        self::assertSame('payer_reported_cash', $obligationBefore->status);
        self::assertSame(0, DB::table('order_handoff_transfers')->whereIn('order_id', [$courierOrder->id, $partOrder->id])->whereIn('status', ['departed', 'received'])->count());

        $currentNeed = DB::table('deal_needs')->where('id', $needs[1]->id)->firstOrFail();
        $withdraw = app(WithdrawDealPartner::class)->handle(
            actorUserId: (string) $courierOrder->provider_user_id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $needs[1]->id,
            expectedNeedVersion: (int) $currentNeed->version,
            idempotencyKey: 'deal-partial-courier-withdraw-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $case = DB::table('support_cases')->where('order_id', $courierOrder->id)->where('category', 'deal_partner_withdrawal_reconciliation')->first();

        $replacementOwner = User::factory()->create();
        $replacementListing = $this->createActiveListing($replacementOwner, 'Replacement local courier', 'service', 'courier', 'A1');
        $replacement = app(ChooseDealReplacement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $needs[1]->id,
            expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $needs[1]->id)->value('version'),
            listingId: (string) $replacementListing->id,
            variantId: null,
            idempotencyKey: 'deal-partial-courier-replacement-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $newNeedId = $replacement['replacement_need_id'];
        $newInvitation = DB::table('deal_invitations')->where('id', $replacement['invitation_id'])->firstOrFail();
        $ordersBeforeConsent = DB::table('orders')->where('deal_chain_id', $staged['deal_chain_id'])->count();
        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $replacementOwner->id,
            invitationId: (string) $newInvitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $newInvitation->version,
            idempotencyKey: 'deal-partial-courier-replacement-accept-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        self::assertSame($ordersBeforeConsent, DB::table('orders')->where('deal_chain_id', $staged['deal_chain_id'])->count());
        $updatedInvite = DB::table('deal_invitations')->where('id', $newInvitation->id)->firstOrFail();
        $updatedNeed = DB::table('deal_needs')->where('id', $newNeedId)->firstOrFail();
        $newScope = is_array($updatedInvite->scope) ? $updatedInvite->scope : json_decode((string) $updatedInvite->scope, true, 512, JSON_THROW_ON_ERROR);
        $formedReplacement = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: $buyerId,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: $newNeedId,
            invitationId: (string) $updatedInvite->id,
            expectedNeedVersion: (int) $updatedNeed->version,
            termsHash: (string) $newScope['terms_hash'],
            capacityHash: (string) $newScope['capacity_hash'],
            idempotencyKey: 'deal-partial-courier-replacement-confirm-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $transferAfterWithdraw = DB::table('order_handoff_transfers')->where('order_id', $partOrder->id)->firstOrFail();
        $replacementOffer = app(A4HandoffService::class)->offerCustody(
            orderId: (string) $partOrder->id,
            actorId: (string) $partOrder->provider_user_id,
            mode: 'courier_delivery',
            courierId: (string) $replacementOwner->id,
            idempotencyKey: 'deal-partner-replacement-courier-offer-'.Str::uuid7(),
            expectedTransferVersion: (int) $transferAfterWithdraw->version,
            correlationId: (string) Str::uuid7(),
        );

        $currentObligation = DB::table('payment_obligations')->where('id', $obligationBefore->id)->firstOrFail();
        $finalEvents = DB::table('work_events')->where('work_instance_id', $courierWork->id)->pluck('id')->all();
        expect($withdraw['status'])->toBe('replacement_needed')
            ->and(DB::table('orders')->where('id', $courierOrder->id)->value('status'))->toBe('cancelled')
            ->and(DB::table('work_instances')->where('id', $courierWork->id)->value('status'))->toBe('cancelled')
            ->and(DB::table('order_terms_snapshots')->where('order_id', $courierOrder->id)->orderBy('snapshot_version')->get()->toArray())->toEqual($termsBefore)
            ->and((array) $currentObligation)->toEqual((array) $obligationBefore)
            ->and(array_diff($workEventsBefore, $finalEvents))->toBe([])
            ->and(count($finalEvents))->toBe(count($workEventsBefore) + 1)
            ->and($case)->not->toBeNull()
            ->and($case->work_instance_id)->toBe($courierWork->id)
            ->and($case->payment_obligation_id)->toBe($obligationBefore->id)
            ->and(DB::table('support_cases')->where('order_id', '!=', $courierOrder->id)->where('category', 'deal_partner_withdrawal_reconciliation')->count())->toBe(0)
            ->and($newNeedId)->not->toBe($needs[1]->id)
            ->and(DB::table('deal_needs')->where('id', $newNeedId)->value('replaces_deal_need_id'))->toBe($needs[1]->id)
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $newNeedId)->value('order_id'))->toBe($formedReplacement['order_id'])
            ->and(DB::table('work_step_dependency_gates')->where('deal_chain_id', $staged['deal_chain_id'])->where('successor_need_id', $newNeedId)->where('condition_code', 'part_ready')->value('status'))->toBe('cleared')
            ->and($transferAfterWithdraw->status)->toBe('prepared')
            ->and($transferAfterWithdraw->offered_to_user_id)->toBeNull()
            ->and($replacementOffer['status'])->toBe('offered')
            ->and(DB::table('order_handoff_transfers')->where('id', $transferAfterWithdraw->id)->value('offered_to_user_id'))->toBe($replacementOwner->id);
        $laborOrder = DB::table('orders')->where('id', $formed[(string) $needs[2]->id]['order_id'])->firstOrFail();
        $laborWork = DB::table('work_instances')->where('order_id', $laborOrder->id)->firstOrFail();
        $laborBefore = (array) $laborWork;
        $laborOrderBefore = (array) $laborOrder;
        $laborEventIds = DB::table('work_events')->where('work_instance_id', $laborWork->id)->pluck('id')->all();
        $auditCount = DB::table('audit_events')->count();
        $outboxCount = DB::table('outbox_messages')->count();
        $laborStructure = json_decode((string) $laborWork->structure, true, 512, JSON_THROW_ON_ERROR);
        $laborNode = collect($laborStructure['nodes'])->firstWhere('status', 'active');
        self::assertNotNull($laborNode);
        try {
            app(WorkExecutionService::class)->advanceNode(
                orderId: (string) $laborOrder->id,
                actorUserId: (string) $laborOrder->provider_user_id,
                nodeId: (string) $laborNode['id'],
                action: 'complete_step',
                correlationId: (string) Str::uuid7(),
            );
            self::fail('The current successor Work remains blocked until the replacement courier produces its own delivery milestone.');
        } catch (OrderError $error) {
            self::assertSame('PREDECESSOR_GATE_BLOCKED', $error->envelope->code);
        }
        self::assertSame($laborOrderBefore, (array) DB::table('orders')->where('id', $laborOrder->id)->firstOrFail());
        self::assertSame($laborBefore, (array) DB::table('work_instances')->where('id', $laborWork->id)->firstOrFail());
        self::assertSame($laborEventIds, DB::table('work_events')->where('work_instance_id', $laborWork->id)->pluck('id')->all());
        self::assertSame($auditCount, DB::table('audit_events')->count());
        self::assertSame($outboxCount, DB::table('outbox_messages')->count());
    }

    private function uploadCleanWorkPhoto(string $actorId, string $orderId, string $nodeId): string
    {
        $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
        $response = $this->actingAs(User::findOrFail($actorId))
            ->withHeader('Accept', 'application/json')
            ->post(route('orders.work-evidence.store', ['order' => $orderId, 'node' => $nodeId]), [
                'file' => UploadedFile::fake()->createWithContent('deal-partner-proof.png', (string) $image),
                'tool_key' => 'photo_proof',
            ])->assertCreated();
        $evidenceId = (string) $response->json('data.id');
        app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
        return $evidenceId;
    }

    private function createActiveListing(User $owner, string $title, string $listingType, string $category, string $workShape, int $priceMinor = 3500): object
    {
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $owner->id, (string) $owner->id),
            [
                'title' => $title,
                'description' => 'Published active candidate listing for a Deal Chain replacement regression.',
                'category_code' => $category,
                'listing_type' => $listingType,
                'work_shape' => $workShape,
                'price_amount_minor' => $priceMinor,
                'currency' => 'PHP',
                'milestone_stages' => [
                    ['id' => 'courier-perform', 'title' => 'Perform the agreed courier service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                    ['id' => 'courier-signoff', 'title' => 'Customer confirms courier service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                ],
            ],
            (string) Str::uuid7(),
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $owner->id, (string) $owner->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: 'deal-partner-replacement-listing-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));

        return DB::table('listings')->where('id', $draft['id'])->firstOrFail();
    }

    private function createActiveProductVariantListing(User $owner, string $title, float $price): object
    {
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $owner->id, (string) $owner->id),
            [
                'title' => $title,
                'description' => 'Published product listing with authored major-unit variant price.',
                'category_code' => 'repairs',
                'listing_type' => 'product',
                'work_shape' => 'A4',
                'price_amount_minor' => (int) round($price * 100),
                'currency' => 'PHP',
                'variants' => [[
                    'id' => 'variant-major-unit',
                    'name' => 'Standard part',
                    'price' => $price,
                    'stock' => 5,
                    'is_default' => true,
                ]],
            ],
            (string) Str::uuid7(),
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $owner->id, (string) $owner->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: 'deal-variant-listing-'.Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));

        return DB::table('listings')->where('id', $draft['id'])->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function stageRealTurnkeyParts(string $coordinatorId, string $primaryShape = 'A1', bool $withHardwareSibling = false): array
    {
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $createActiveListing = function (string $title, string $type, string $shape, int $priceMinor) use ($reviewer): object {
            $owner = User::factory()->create();
            $attributes = [
                'title' => $title,
                'description' => 'Published seller-authored terms for a staged Deal Chain gate scenario.',
                'category_code' => 'repairs',
                'listing_type' => $type,
                'work_shape' => $shape,
                'price_amount_minor' => $priceMinor,
                'currency' => 'PHP',
            ];
            if ($type === 'product') {
                $attributes['variants'] = [['id' => 'turnkey-product-variant', 'name' => 'Standard unit', 'price' => $priceMinor / 100, 'stock' => 5, 'is_default' => true]];
            } else {
                $attributes['milestone_stages'] = [
                    ['id' => 'execute-service', 'title' => 'Perform the agreed service', ...($shape === 'A3' ? ['dur' => '30m'] : []), 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                    ['id' => 'customer-signoff', 'title' => 'Customer accepts the service', ...($shape === 'A3' ? ['dur' => '30m'] : []), 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
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
                idempotencyKey: (string) Str::uuid7(),
                correlationId: (string) Str::uuid7(),
            );
            $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
                'expected_version' => $submitted['expected_version'],
            ])->assertRedirect(route('admin.listings.index'));

            return DB::table('listings')->where('id', $draft['id'])->firstOrFail();
        };

        $labor = $createActiveListing('Turnkey primary service agreement', 'service', $primaryShape, 45000);
        $part = $createActiveListing('Turnkey capacitor product', 'product', 'A4', 18000);
        $courier = $createActiveListing('Turnkey local courier', 'service', 'A1', 3500);
        $this->actingAs(User::findOrFail($coordinatorId));
        $items = $primaryShape === 'A9' ? [
            ['id' => (string) $part->id, 'quantity' => 1],
            ['id' => (string) $courier->id, 'quantity' => 1],
            ['id' => (string) $labor->id, 'quantity' => 1],
        ] : [[
            'id' => (string) $labor->id,
            'quantity' => 1,
            'deal_chain' => 'turnkey_parts',
            'slot_overrides' => [
                'part' => ['listing_id' => (string) $part->id],
                'courier' => ['listing_id' => (string) $courier->id],
            ],
        ]];
        if ($withHardwareSibling) {
            $hardware = $createActiveListing('Independent completed hardware sibling', 'product', 'A4', 5200);
            $items[] = ['id' => (string) $hardware->id, 'quantity' => 1, 'deal_chain' => null];
        }

        return app(StageDealChain::class)->handle(
            coordinatorUserId: $coordinatorId,
            items: $items,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
    }

    public function test_child_order_formation_port_creates_atomic_child_order_with_lineage(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);

        $listing = $this->independentServiceListing();

        $staged = $stageService->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => (string) $listing->id,
                    'quantity' => 1,
                    'deal_chain' => null,
                ],
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $dealChainId = $staged['deal_chain_id'];
        $primaryNeed = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChainId)
            ->orderBy('ordinal')
            ->first();

        $this->assertNotNull($primaryNeed);

        $accepted = $this->acceptNeed($buyerUserId, $dealChainId, (string) $primaryNeed->id);
        $orderResult = $this->confirmAcceptedNeed($buyerUserId, $dealChainId, (string) $primaryNeed->id, $accepted);

        expect($orderResult)->toHaveKey('order_id');
        expect($orderResult['status'])->toBe('accepted');
        expect($orderResult['deal_chain_id'])->toBe($dealChainId);
        expect($orderResult['deal_need_id'])->toBe((string) $primaryNeed->id);

        $orderId = $orderResult['order_id'];

        // Assert Order table has origin='deal_chain' and both lineage fields set
        $order = DB::table('orders')->where('id', $orderId)->first();
        expect($order)->not->toBeNull();
        expect($order->origin)->toBe('deal_chain');
        expect($order->status)->toBe('accepted');
        expect($order->deal_chain_id)->toBe($dealChainId);
        expect($order->deal_need_id)->toBe((string) $primaryNeed->id);

        // Assert Order Parties created
        $parties = DB::table('order_parties')->where('order_id', $orderId)->get();
        expect($parties->pluck('party_type')->all())->toContain('buyer', 'provider');

        // Assert Terms Snapshot created
        $snapshot = DB::table('order_terms_snapshots')->where('order_id', $orderId)->first();
        expect($snapshot)->not->toBeNull();
        expect((int) $snapshot->amount_minor)->toBe(45000);
        expect($snapshot->currency)->toBe('PHP');

        // Assert Deal Need advanced to in_progress
        $updatedNeed = DB::table('deal_needs')->where('id', $primaryNeed->id)->first();
        expect($updatedNeed->status)->toBe('in_progress');

        // Assert Parent Deal Chain advanced to in_progress
        $updatedChain = DB::table('deal_chains')->where('id', $dealChainId)->first();
        expect($updatedChain->status)->toBe('in_progress');
    }

    public function test_child_order_formation_rejects_duplicate_active_child_order(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);

        $listing = $this->independentServiceListing();

        $staged = $stageService->handle(
            coordinatorUserId: $buyerUserId,
            items: [
                [
                    'id' => (string) $listing->id,
                    'quantity' => 1,
                    'deal_chain' => null,
                ],
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        $dealChainId = $staged['deal_chain_id'];
        $primaryNeed = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChainId)
            ->orderBy('ordinal')
            ->first();

        $accepted = $this->acceptNeed($buyerUserId, $dealChainId, (string) $primaryNeed->id);
        $this->confirmAcceptedNeed($buyerUserId, $dealChainId, (string) $primaryNeed->id, $accepted);

        $this->expectException(DealCoordinationError::class);
        $this->confirmAcceptedNeed($buyerUserId, $dealChainId, (string) $primaryNeed->id, $accepted);
    }

    private function independentServiceListing(): object
    {
        $provider = User::factory()->create();
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Independent service agreement',
                'description' => 'A provider-authored service used to exercise bilateral Deal Chain formation.',
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

        return DB::table('listings')->where('id', $draft['id'])->firstOrFail();
    }

    private function createCleanWorkEvidence(string $ownerId, string $workId, ?string $nodeId = null): string
    {
        $evidenceId = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();
        $now = now();
        DB::table('evidence_files')->insert([
            'id' => $evidenceId,
            'owner_user_id' => $ownerId,
            'storage_key' => 'evidence/work/'.$workId.'/gate-milestone-'.$evidenceId.'.jpg',
            'media_type' => 'image/jpeg',
            'size_bytes' => 64,
            'content_hash' => hash('sha256', $evidenceId),
            'evidence_type' => 'work_node_photo_proof',
            'data_class' => 'WORK_EXECUTION',
            'scan_status' => 'clean',
            'visibility' => 'order_parties',
            'retention_policy' => 'order_dispute_window',
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('work_events')->insert([
            'id' => (string) Str::uuid7(),
            'work_instance_id' => $workId,
            'previous_status' => 'not_started',
            'new_status' => 'not_started',
            'event_type' => 'work.evidence.uploaded',
            'event_version' => 1,
            'actor_user_id' => $ownerId,
            'evidence_file_id' => $evidenceId,
            'payload' => json_encode(['node_id' => $nodeId ?? 'a4-prepare', 'tool_key' => 'photo_proof'], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'idempotency_key' => 'gate-evidence-'.$workId.'-'.$evidenceId,
            'correlation_id' => $correlationId,
            'occurred_at' => $now,
            'effective_at' => $now,
            'created_at' => $now,
        ]);

        return $evidenceId;
    }

    /** @return array{invitation_id: string, expected_need_version: int, terms_hash: string, capacity_hash: string} */
    private function acceptNeed(string $buyerUserId, string $dealChainId, string $dealNeedId): array
    {
        $invitation = DB::table('deal_invitations')
            ->where('deal_need_id', $dealNeedId)
            ->where('status', 'sent')
            ->first();
        $this->assertNotNull($invitation);

        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $invitation->invited_provider_user_id,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $need = DB::table('deal_needs')->where('id', $dealNeedId)->first();
        $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true);

        return [
            'invitation_id' => (string) $invitation->id,
            'expected_need_version' => (int) $need->version,
            'terms_hash' => (string) $scope['terms_hash'],
            'capacity_hash' => (string) $scope['capacity_hash'],
        ];
    }

    /** @param array{invitation_id: string, expected_need_version: int, terms_hash: string, capacity_hash: string} $accepted
     * @return array{order_id: string, status: string, deal_chain_id: string, deal_need_id: string, work_instance_id: string|null, payment_obligation_id: string|null, version: int}
     */
    private function confirmAcceptedNeed(string $buyerUserId, string $dealChainId, string $dealNeedId, array $accepted): array
    {
        return app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: $buyerUserId,
            dealChainId: $dealChainId,
            dealNeedId: $dealNeedId,
            invitationId: $accepted['invitation_id'],
            expectedNeedVersion: $accepted['expected_need_version'],
            termsHash: $accepted['terms_hash'],
            capacityHash: $accepted['capacity_hash'],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
    }
}

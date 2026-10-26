<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\ChooseDealReplacement;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\DealCoordination\Application\WithdrawDealPartner;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait CreatesSettledDealChainReview
{

    protected function createReviewActiveServiceListing(User $owner, string $title, string $category = 'repairs'): string
    {
        $correlationId = (string) Str::uuid7();
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $owner->id, (string) $owner->id),
            [
                'title' => $title,
                'description' => 'Published A1 service contract used by the review eligibility feature flow.',
                'category_code' => $category,
                'listing_type' => 'service',
                'work_shape' => 'A1',
                'price_amount_minor' => 25000,
                'currency' => 'PHP',
                'milestone_stages' => [
                    ['id' => 'perform-service', 'title' => 'Perform the agreed service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                    ['id' => 'customer-signoff', 'title' => 'Customer accepts the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                ],
            ],
            $correlationId,
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $owner->id, (string) $owner->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: 'review-listing-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));

        return (string) $draft['id'];
    }
    /** @return array{buyer:User,provider:User,order_id:string,work_id:string} */
    protected function createSettledReviewableStandaloneOrder(): array
    {
        $buyer = User::factory()->create();
        $provider = User::factory()->create();
        $correlationId = (string) Str::uuid7();
        $listingId = $this->createReviewActiveServiceListing($provider, 'Review test standalone service');
        $listing = DB::table('listings')->where('id', $listingId)->firstOrFail();
        $version = DB::table('listing_versions')
            ->where('listing_id', $listingId)
            ->where('version_number', $listing->current_version)
            ->firstOrFail();
        $proposal = app(SubmitOrderProposal::class)->handle(
            buyerUserId: (string) $buyer->id,
            listingId: $listingId,
            expectedListingVersion: (int) $listing->current_version,
            idempotencyKey: 'review-standalone-proposal-'.Str::uuid7(),
            correlationId: $correlationId,
            input: [
                'amount_minor' => 25000,
                'currency' => 'PHP',
                'quantity' => 1,
                'listing_version_id' => (string) $version->id,
            ],
        );
        app(FinalizeOrderAgreement::class)->handle(
            actorUserId: (string) $provider->id,
            orderId: (string) $proposal['order_id'],
            expectedOrderVersion: (int) $proposal['version'],
            idempotencyKey: 'review-standalone-finalize-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $workId = (string) DB::table('work_instances')->where('order_id', $proposal['order_id'])->value('id');
        $this->completeAndSettleReviewChild([
            'order_id' => (string) $proposal['order_id'],
            'work_id' => $workId,
            'provider' => $provider,
        ], $buyer, $correlationId);

        return [
            'buyer' => $buyer,
            'provider' => $provider,
            'order_id' => (string) $proposal['order_id'],
            'work_id' => $workId,
        ];
    }
    /** @return array{buyer:User,chain_id:string,children:list<array{need_id:string,order_id:string,work_id:string,provider:User,invitation_id:string}>} */
    protected function createReviewableDealChain(bool $settleBoth = true): array
    {
        $buyer = User::factory()->create();
        $primaryProvider = User::factory()->create();
        $secondProvider = User::factory()->create();
        $correlationId = (string) Str::uuid7();

        $primaryListingId = $this->createReviewActiveServiceListing($primaryProvider, 'Review test primary service');
        $secondListingId = $this->createReviewActiveServiceListing($secondProvider, 'Review test second service');
        $this->actingAs($buyer);
        $staged = app(StageDealChain::class)->handle(
            coordinatorUserId: (string) $buyer->id,
            items: [
                ['id' => $primaryListingId, 'quantity' => 1],
                ['id' => $secondListingId, 'quantity' => 1],
            ],
            idempotencyKey: 'review-chain-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
        $children = [];
        foreach ($needs as $need) {
            $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->where('status', 'sent')->firstOrFail();
            app(RespondToDealInvitation::class)->handle(
                actorUserId: (string) $invitation->invited_provider_user_id,
                invitationId: (string) $invitation->id,
                decision: 'accept',
                expectedInvitationVersion: (int) $invitation->version,
                idempotencyKey: 'review-accept-'.Str::uuid7(),
                correlationId: $correlationId,
                responseNote: 'Accepted the pinned review fixture agreement.',
            );
            $updatedInvitation = DB::table('deal_invitations')->where('id', $invitation->id)->firstOrFail();
            $scope = is_array($updatedInvitation->scope)
                ? $updatedInvitation->scope
                : json_decode((string) $updatedInvitation->scope, true, flags: JSON_THROW_ON_ERROR);
            $formed = app(ConfirmDealNeedAgreement::class)->handle(
                actorUserId: (string) $buyer->id,
                dealChainId: (string) $staged['deal_chain_id'],
                dealNeedId: (string) $need->id,
                invitationId: (string) $invitation->id,
                expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $need->id)->value('version'),
                termsHash: (string) $scope['terms_hash'],
                capacityHash: (string) $scope['capacity_hash'],
                idempotencyKey: 'review-confirm-'.Str::uuid7(),
                correlationId: $correlationId,
            );
            $children[] = [
                'need_id' => (string) $need->id,
                'order_id' => (string) $formed['order_id'],
                'work_id' => (string) $formed['work_instance_id'],
                'provider' => User::findOrFail((string) $invitation->invited_provider_user_id),
                'invitation_id' => (string) $invitation->id,
            ];
        }

        if ($settleBoth) {
            foreach ($children as $child) {
                $this->completeAndSettleReviewChild($child, $buyer, $correlationId);
            }
        }

        $this->actingAs($buyer);

        return [
            'buyer' => $buyer,
            'chain_id' => (string) $staged['deal_chain_id'],
            'children' => $children,
        ];
    }

    /** @param array{need_id:string,order_id:string,work_id:string,provider:User} $oldChild
     * @return array{need_id:string,order_id:string,work_id:string,provider:User,invitation_id:string}
     */
    protected function replaceUnstartedReviewChild(array $chain, array $oldChild): array
    {
        $correlationId = (string) Str::uuid7();
        $oldNeed = DB::table('deal_needs')->where('id', $oldChild['need_id'])->firstOrFail();
        app(WithdrawDealPartner::class)->handle(
            actorUserId: (string) $oldChild['provider']->id,
            dealChainId: $chain['chain_id'],
            dealNeedId: $oldChild['need_id'],
            expectedNeedVersion: (int) $oldNeed->version,
            idempotencyKey: 'review-withdraw-'.Str::uuid7(),
            correlationId: $correlationId,
        );

        $replacementProvider = User::factory()->create();
        $listingId = $this->createReviewActiveServiceListing($replacementProvider, 'Replacement review service');
        $replacement = app(ChooseDealReplacement::class)->handle(
            actorUserId: (string) $chain['buyer']->id,
            dealChainId: $chain['chain_id'],
            dealNeedId: $oldChild['need_id'],
            expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $oldChild['need_id'])->value('version'),
            listingId: $listingId,
            variantId: null,
            idempotencyKey: 'review-replacement-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $invitation = DB::table('deal_invitations')->where('id', $replacement['invitation_id'])->firstOrFail();
        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $replacementProvider->id,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: 'review-replacement-accept-'.Str::uuid7(),
            correlationId: $correlationId,
            responseNote: 'Accepted the replacement terms.',
        );
        $updatedInvitation = DB::table('deal_invitations')->where('id', $invitation->id)->firstOrFail();
        $scope = is_array($updatedInvitation->scope)
            ? $updatedInvitation->scope
            : json_decode((string) $updatedInvitation->scope, true, flags: JSON_THROW_ON_ERROR);
        $formed = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: (string) $chain['buyer']->id,
            dealChainId: $chain['chain_id'],
            dealNeedId: (string) $replacement['replacement_need_id'],
            invitationId: (string) $invitation->id,
            expectedNeedVersion: (int) DB::table('deal_needs')->where('id', $replacement['replacement_need_id'])->value('version'),
            termsHash: (string) $scope['terms_hash'],
            capacityHash: (string) $scope['capacity_hash'],
            idempotencyKey: 'review-replacement-confirm-'.Str::uuid7(),
            correlationId: $correlationId,
        );

        return [
            'need_id' => (string) $replacement['replacement_need_id'],
            'order_id' => (string) $formed['order_id'],
            'work_id' => (string) $formed['work_instance_id'],
            'provider' => $replacementProvider,
            'invitation_id' => (string) $invitation->id,
        ];
    }

    /** @param array{order_id:string,work_id:string,provider:User} $child */
    protected function completeAndSettleReviewChild(array $child, User $buyer, string $correlationId): void
    {
        $workService = app(WorkExecutionService::class);
        while (true) {
            $work = DB::table('work_instances')->where('id', $child['work_id'])->firstOrFail();
            if ((string) $work->status === 'completed') {
                break;
            }
            $structure = is_array($work->structure)
                ? $work->structure
                : json_decode((string) $work->structure, true, flags: JSON_THROW_ON_ERROR);
            $activeNode = collect($structure['nodes'])->firstWhere('status', 'active');
            if ($activeNode === null) {
                throw new \RuntimeException('A1 review fixture has no active Work Node before completion.');
            }

            if (($activeNode['node_kind'] ?? null) === 'final_signoff') {
                $workService->advanceNode(
                    orderId: $child['order_id'],
                    actorUserId: (string) $child['provider']->id,
                    nodeId: (string) $activeNode['id'],
                    action: 'propose_completion',
                    correlationId: $correlationId,
                );
                $workService->advanceNode(
                    orderId: $child['order_id'],
                    actorUserId: (string) $buyer->id,
                    nodeId: (string) $activeNode['id'],
                    action: 'signoff_completion',
                    correlationId: $correlationId,
                );
            } else {
                $workService->advanceNode(
                    orderId: $child['order_id'],
                    actorUserId: (string) $child['provider']->id,
                    nodeId: (string) $activeNode['id'],
                    action: 'complete_step',
                    correlationId: $correlationId,
                );
            }
        }

        app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed');
        $obligation = DB::table('payment_obligations')->where('order_id', $child['order_id'])->firstOrFail();
        $payments = app(OrderPaymentObligationPort::class);
        $payments->reportCashPayment(
            orderId: $child['order_id'],
            obligationId: (string) $obligation->id,
            payerUserId: (string) $buyer->id,
            correlationId: $correlationId,
            idempotencyKey: 'review-cash-report-'.Str::uuid7(),
        );
        $payments->acknowledgeCashReceipt(
            orderId: $child['order_id'],
            obligationId: (string) $obligation->id,
            actorUserId: (string) $child['provider']->id,
            recipientUserId: (string) $child['provider']->id,
            consentGrantId: null,
            correlationId: $correlationId,
            idempotencyKey: 'review-cash-confirm-'.Str::uuid7(),
        );
    }
}

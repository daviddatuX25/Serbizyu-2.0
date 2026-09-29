<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Shared\Contracts\ChildOrderFormationPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

    public function test_provider_can_accept_deal_invitation_transitioning_need_to_accepted(): void
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
        expect($response['need_status'])->toBe('accepted');

        // Assert DB state updated
        $updatedInv = DB::table('deal_invitations')->where('id', $invitation->id)->first();
        expect($updatedInv->status)->toBe('accepted');
        expect($updatedInv->response_note)->toBe('Ready to fulfill on schedule');

        $updatedNeed = DB::table('deal_needs')->where('id', $invitation->deal_need_id)->first();
        expect($updatedNeed->status)->toBe('accepted');

        // INVARIANT: Accepting an invitation still creates zero orders
        expect(DB::table('orders')->where('deal_chain_id', $dealChainId)->count())->toBe(0);
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

    public function test_child_order_formation_port_creates_atomic_child_order_with_lineage(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $stageService = app(StageDealChain::class);
        $childOrderPort = app(ChildOrderFormationPort::class);

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
        $primaryNeed = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChainId)
            ->orderBy('ordinal')
            ->first();

        $this->assertNotNull($primaryNeed);

        $orderResult = $childOrderPort->formChildOrder(
            actorUserId: $buyerUserId,
            params: [
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => (string) $primaryNeed->id,
                'listing_id' => (string) $listing->id,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => (string) $listing->owner_user_id,
                'amount_minor' => 45000,
                'currency' => 'PHP',
                'quantity' => 1,
                'lane' => 'external_cash',
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

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
        $childOrderPort = app(ChildOrderFormationPort::class);

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
        $primaryNeed = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChainId)
            ->orderBy('ordinal')
            ->first();

        // 1st formation succeeds
        $childOrderPort->formChildOrder(
            actorUserId: $buyerUserId,
            params: [
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => (string) $primaryNeed->id,
                'listing_id' => (string) $listing->id,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => (string) $listing->owner_user_id,
                'amount_minor' => 45000,
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );

        // 2nd formation with different key MUST fail
        $this->expectException(\RuntimeException::class);

        $childOrderPort->formChildOrder(
            actorUserId: $buyerUserId,
            params: [
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => (string) $primaryNeed->id,
                'listing_id' => (string) $listing->id,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => (string) $listing->owner_user_id,
                'amount_minor' => 45000,
            ],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
    }
}

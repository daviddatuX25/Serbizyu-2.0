<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Carbon\CarbonImmutable;
use App\Modules\DealCoordination\Application\WithdrawDealPartner;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, CreatesSettledDealChainReview::class);
 

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL baseline required.');
    }
    app(FixtureRepository::class)->ensure();
    $this->withoutMiddleware(ThrottleRequests::class);
});
it('quarantines held child reviews while allowing sibling publication and timeout processing', function (): void {
    $chain = $this->createReviewableDealChain();
    $held = $chain['children'][0];
    $sibling = $chain['children'][1];

    $caseId = $this->actingAs($chain['buyer'])->postJson('/support-cases', [
        'order_id' => $held['order_id'],
        'category' => 'fulfillment',
        'content' => 'Review the held order.',
        'idempotency_key' => 'review-hold-case-'.Str::uuid7(),
    ])->assertCreated()->json('data.id');
    $maker = \App\Models\User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $checker = \App\Models\User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $approval = $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $caseId,
        'command_type' => 'administrative_hold.place',
        'checker_user_id' => $checker->id,
        'target_kind' => 'order',
        'target_id' => $held['order_id'],
        'expected_target_version' => (int) DB::table('orders')->where('id', $held['order_id'])->value('version'),
        'reason_class' => 'dispute',
        'reason' => 'Quarantine review publication while the order is under review.',
        'idempotency_key' => 'review-hold-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approval['id'].'/approve', [])->assertOk();
    $heldHold = $this->actingAs($checker)->postJson('/admin/command-approvals/'.$approval['id'].'/execute', [])->assertOk()->json('data');

    foreach ([$held, $sibling] as $child) {
        $this->actingAs($chain['buyer'])->postJson("/orders/{$child['order_id']}/reviews", [
            'rating' => 5,
            'content' => 'The completed work was excellent.',
            'attribute_chips' => ['on_time'],
        ])->assertCreated();
    }
    foreach ([$held, $sibling] as $child) {
        $this->actingAs($child['provider'])->postJson("/orders/{$child['order_id']}/reviews", [
            'rating' => 5,
            'content' => 'The buyer coordinated well.',
            'attribute_chips' => ['respectful_communication'],
        ])->assertCreated();
    }

    $heldReviews = DB::table('reviews')->where('order_id', $held['order_id'])->get();
    $siblingReviews = DB::table('reviews')->where('order_id', $sibling['order_id'])->get();
    expect($heldReviews)->toHaveCount(2)
        ->and($heldReviews->every(fn ($review): bool => $review->moderation_status === 'sealed' && $review->unblinded_at === null))->toBeTrue()
        ->and($siblingReviews->every(fn ($review): bool => $review->moderation_status === 'approved' && $review->unblinded_at !== null))->toBeTrue();

    $listingId = (string) DB::table('orders')->where('id', $sibling['order_id'])->value('listing_id');
    expect(app(\App\Modules\TrustSupport\Application\ListingReviewService::class)->reviewsForListing($listingId))
        ->toHaveCount(2);

    DB::table('reviews')->where('order_id', $held['order_id'])->update(['sealed_until' => now()->subMinute()]);
    DB::table('reviews')->where('order_id', $sibling['order_id'])->update(['sealed_until' => now()->subMinute()]);
    $this->travel(1)->minutes();
    $this->artisan('reviews:unblind-expired')->assertSuccessful();
    expect(DB::table('reviews')->where('order_id', $held['order_id'])->whereNotNull('unblinded_at')->count())->toBe(0)
        ->and(DB::table('reviews')->where('order_id', $sibling['order_id'])->whereNotNull('unblinded_at')->count())->toBe(2);
    $releaseApproval = $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $caseId,
        'command_type' => 'administrative_hold.release',
        'checker_user_id' => $checker->id,
        'target_kind' => 'order',
        'target_id' => $held['order_id'],
        'expected_target_version' => (int) DB::table('orders')->where('id', $held['order_id'])->value('version'),
        'hold_id' => $heldHold['hold_id'],
        'expected_hold_version' => $heldHold['hold_version'],
        'reason_class' => 'dispute',
        'reason' => 'Release the exact hold after timeout quarantine.',
        'idempotency_key' => 'review-hold-release-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$releaseApproval['id'].'/approve', [])->assertOk();
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$releaseApproval['id'].'/execute', [])->assertOk();
    $this->artisan('reviews:unblind-expired')->assertSuccessful();
    expect(DB::table('reviews')->where('order_id', $held['order_id'])->whereNotNull('unblinded_at')->count())->toBe(2);

    $siblingCaseId = $this->actingAs($chain['buyer'])->postJson('/support-cases', [
        'order_id' => $sibling['order_id'],
        'category' => 'fulfillment',
        'content' => 'Review the published sibling order.',
        'idempotency_key' => 'review-sibling-hold-case-'.Str::uuid7(),
    ])->assertCreated()->json('data.id');
    $siblingApproval = $this->actingAs($maker)->postJson('/admin/command-approvals', [
        'case_id' => $siblingCaseId,
        'command_type' => 'administrative_hold.place',
        'checker_user_id' => $checker->id,
        'target_kind' => 'order',
        'target_id' => $sibling['order_id'],
        'expected_target_version' => (int) DB::table('orders')->where('id', $sibling['order_id'])->value('version'),
        'reason_class' => 'dispute',
        'reason' => 'Quarantine previously published review ratings.',
        'idempotency_key' => 'review-sibling-hold-'.Str::uuid7(),
    ])->assertCreated()->json('data');
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$siblingApproval['id'].'/approve', [])->assertOk();
    $this->actingAs($checker)->postJson('/admin/command-approvals/'.$siblingApproval['id'].'/execute', [])->assertOk();

    $listingReviews = app(\App\Modules\TrustSupport\Application\ListingReviewService::class);
    expect($listingReviews->reviewsForListing($listingId))->toBe([])
        ->and($listingReviews->summaryForListing($listingId)['reviews_count'])->toBe(0)
        ->and($listingReviews->summariesForListings([$listingId])[$listingId]['reviews_count'])->toBe(0)
        ->and(DB::table('reviews')->where('order_id', $sibling['order_id'])->where('moderation_status', 'approved')->count())->toBe(2);
});

it('submits unified deal chain reviews across completed and settled current children', function (): void {
    $chain = $this->createReviewableDealChain();
    $firstOrderId = $chain['children'][0]['order_id'];
    $secondOrderId = $chain['children'][1]['order_id'];

    $response = $this->postJson("/deal-chains/{$chain['chain_id']}/reviews", [
        'submission_id' => (string) Str::uuid7(),
        'mode' => 'cascade',
        'unified_review' => [
            'rating' => 5,
            'content' => 'Outstanding team coordination!',
            'attribute_chips' => ['on_time', 'clean_workspace'],
        ],
    ])->assertCreated();

    expect($response->json('data.submitted_count'))->toBe(2);
    $reviews = DB::table('reviews')->where('deal_chain_id', $chain['chain_id'])->get();
    expect($reviews)->toHaveCount(2)
        ->and($reviews->pluck('order_id')->all())->toContain($firstOrderId, $secondOrderId);

    foreach ($reviews as $review) {
        $settledAt = DB::table('payment_obligations')->where('order_id', $review->order_id)->value('settled_at');
        expect((int) $review->rating)->toBe(5)
            ->and($review->submission_mode)->toBe('cascade')
            ->and($review->moderation_status)->toBe('sealed')
            ->and($review->unblinded_at)->toBeNull()
            ->and(CarbonImmutable::parse($review->sealed_until)->equalTo(CarbonImmutable::parse((string) $settledAt)->addHours(72)))->toBeTrue();
    }
});

it('submits granular ratings for separately completed current Deal Chain children', function (): void {
    $chain = $this->createReviewableDealChain();
    $primaryOrderId = $chain['children'][0]['order_id'];
    $secondOrderId = $chain['children'][1]['order_id'];

    $response = $this->postJson("/deal-chains/{$chain['chain_id']}/reviews", [
        'mode' => 'granular',
        'granular_reviews' => [
            [
                'order_id' => $primaryOrderId,
                'rating' => 5,
                'content' => 'Master technician, completed the agreed work.',
                'attribute_chips' => ['expert_fix', 'clean_workspace'],
            ],
            [
                'order_id' => $secondOrderId,
                'rating' => 4,
                'content' => 'The second service was delivered as agreed.',
                'attribute_chips' => ['fair_pricing'],
            ],
        ],
    ])->assertCreated();

    expect($response->json('data.submitted_count'))->toBe(2);
    $primaryReview = DB::table('reviews')->where('order_id', $primaryOrderId)->first();
    $secondReview = DB::table('reviews')->where('order_id', $secondOrderId)->first();
    expect((int) $primaryReview->rating)->toBe(5)
        ->and($primaryReview->submission_mode)->toBe('granular')
        ->and($primaryReview->content)->toContain('Master technician')
        ->and((int) $secondReview->rating)->toBe(4)
        ->and($secondReview->submission_mode)->toBe('granular')
        ->and($secondReview->content)->toContain('second service');
});

it('unblinds each current child review pair independently', function (): void {
    $chain = $this->createReviewableDealChain();
    $primary = $chain['children'][0];
    $second = $chain['children'][1];

    $this->postJson("/deal-chains/{$chain['chain_id']}/reviews", [
        'mode' => 'cascade',
        'unified_review' => [
            'rating' => 5,
            'content' => 'Great work team!',
            'attribute_chips' => ['on_time'],
        ],
    ])->assertCreated();

    expect(DB::table('reviews')->where('deal_chain_id', $chain['chain_id'])->where('moderation_status', 'sealed')->count())->toBe(2);

    $this->actingAs($primary['provider']);
    $this->postJson("/orders/{$primary['order_id']}/reviews", [
        'attribute_chips' => ['cash_ready_on_site', 'respectful_communication'],
        'content' => 'Buyer coordinated the work well.',
        'rating' => 5,
    ])->assertCreated();

    $primaryBuyerReview = DB::table('reviews')->where('order_id', $primary['order_id'])->where('author_role', 'buyer')->first();
    $primaryProviderReview = DB::table('reviews')->where('order_id', $primary['order_id'])->where('author_role', 'provider')->first();
    $secondBuyerReview = DB::table('reviews')->where('order_id', $second['order_id'])->where('author_role', 'buyer')->first();

    expect($primaryBuyerReview->moderation_status)->toBe('approved')
        ->and($primaryBuyerReview->unblinded_at)->not->toBeNull()
        ->and($primaryProviderReview->moderation_status)->toBe('approved')
        ->and($primaryProviderReview->rating)->toBeNull()
        ->and($secondBuyerReview->moderation_status)->toBe('sealed')
        ->and($secondBuyerReview->unblinded_at)->toBeNull();
});

it('does not cascade a buyer review onto an uncompleted current replacement child', function (): void {
    $chain = $this->createReviewableDealChain(settleBoth: false);
    $primary = $chain['children'][0];
    $withdrawn = $chain['children'][1];
    $this->completeAndSettleReviewChild($primary, $chain['buyer'], (string) Str::uuid7());
    $replacement = $this->replaceUnstartedReviewChild($chain, $withdrawn);
    $this->actingAs($chain['buyer']);

    $response = $this->postJson("/orders/{$primary['order_id']}/reviews", [
        'rating' => 5,
        'content' => 'The completed primary work was good.',
        'cascade' => true,
    ])->assertCreated();

    expect($response->json('data.cascaded_count'))->toBe(0)
        ->and(DB::table('deal_needs')->where('id', $replacement['need_id'])->value('replaces_deal_need_id'))->toBe($withdrawn['need_id'])
        ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $replacement['need_id'])->value('order_id'))->toBe($replacement['order_id'])
        ->and(DB::table('orders')->where('id', $replacement['order_id'])->value('status'))->toBe('accepted')
        ->and(DB::table('reviews')->where('order_id', $replacement['order_id'])->count())->toBe(0);
});

it('rejects direct review submission for a withdrawn historical child', function (): void {
    $chain = $this->createReviewableDealChain(settleBoth: false);
    $historical = $chain['children'][1];
    $need = DB::table('deal_needs')->where('id', $historical['need_id'])->firstOrFail();
    app(WithdrawDealPartner::class)->handle(
        actorUserId: (string) $historical['provider']->id,
        dealChainId: $chain['chain_id'],
        dealNeedId: $historical['need_id'],
        expectedNeedVersion: (int) $need->version,
        idempotencyKey: 'review-withdraw-'.Str::uuid7(),
        correlationId: (string) Str::uuid7(),
    );

    $response = $this->actingAs($chain['buyer'])->postJson("/orders/{$historical['order_id']}/reviews", [
        'rating' => 5,
        'content' => 'A withdrawn child is not reviewable.',
    ]);

    $response->assertStatus(409);
    expect(DB::table('reviews')->where('order_id', $historical['order_id'])->count())->toBe(0);
});

it('unblinds sealed reviews when the real settlement window elapses', function (): void {
    $chain = $this->createReviewableDealChain();
    $this->postJson("/deal-chains/{$chain['chain_id']}/reviews", [
        'mode' => 'cascade',
        'unified_review' => [
            'rating' => 5,
            'content' => 'The verified work was excellent.',
            'attribute_chips' => ['on_time'],
        ],
    ])->assertCreated();

    $this->travel(73)->hours();
    $this->artisan('reviews:unblind-expired')->assertSuccessful();

    $reviews = DB::table('reviews')->where('deal_chain_id', $chain['chain_id'])->get();
    expect($reviews)->toHaveCount(2);
    foreach ($reviews as $review) {
        expect($review->moderation_status)->toBe('approved')
            ->and($review->sealed_until)->toBeNull()
            ->and($review->unblinded_at)->not->toBeNull();
    }
});

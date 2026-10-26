<?php

declare(strict_types=1);

use App\Modules\IdentityAccess\Application\ConsentGrantService;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    $this->bootPhoneOtpAuth();
    $this->withoutMiddleware(ThrottleRequests::class);
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Payment settlement behavior requires PostgreSQL.');
    }
    $this->seed(DealChainExecutionSeeder::class);
    DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->update([
        'status' => 'due',
        'due_at' => now(),
        'lane' => 'external_cash',
        'settled_at' => null,
    ]);
});

it('supersedes a due obligation when the payer selects an eligible lane', function (): void {
    $buyerId = $this->authenticateBuyer();
    $order = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
    $listingVersion = DB::table('listing_versions')->where('listing_id', $order->listing_id)->first();
    $profileId = DB::table('listings')->where('id', $order->listing_id)->value('capability_profile_id');
    DB::table('listing_versions')->where('id', $listingVersion->id)->update([
        'payment_lane_availability' => json_encode(['external_cash', 'p2p_transfer'], JSON_THROW_ON_ERROR),
    ]);
    DB::table('capability_profiles')->where('id', $profileId)->update([
        'allowed_payment_lanes' => json_encode(['external_cash', 'p2p_transfer'], JSON_THROW_ON_ERROR),
    ]);
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();

    $laneRequest = [
        'lane' => 'p2p_transfer',
        'idempotency_key' => 'lane-switch-'.Str::uuid7(),
    ];
    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), $laneRequest)
        ->assertOk();
    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), $laneRequest)
        ->assertOk();

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('superseded');
    $successor = DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->first();
    expect($successor)->not->toBeNull()
        ->and($successor->status)->toBe('due')
        ->and($successor->lane)->toBe('p2p_transfer')
        ->and((string) $successor->payer_user_id)->toBe($buyerId)
        ->and((int) $successor->amount_minor)->toBe((int) $obligation->amount_minor);
    $page = $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])->get('/orders/'.Fix::ORDER_ID_TRANSIT);
    $page->assertOk()
        ->assertJsonPath('component', 'Orders/Show')
        ->assertJsonPath('props.obligation.id', (string) $successor->id)
        ->assertJsonPath('props.obligation.status', 'due')
        ->assertJsonPath('props.obligation.lane', 'p2p_transfer');
});

it('records the payer cash report once and only the recipient can settle it', function (): void {
    $buyerId = $this->authenticateBuyer();
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
    $reportKey = 'cash-report-'.Str::uuid7();

    $this->postJson(route('orders.payment-obligations.cash.report', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => $reportKey,
    ])->assertOk();
    $this->postJson(route('orders.payment-obligations.cash.report', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => $reportKey,
    ])->assertOk();

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('payer_reported_cash')
        ->and(DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.reported')->count())->toBe(1)
        ->and((string) DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.reported')->value('actor_user_id'))->toBe($buyerId);
    $cashIntent = DB::table('notifications')
        ->where('recipient_user_id', $obligation->recipient_user_id)
        ->where('event_source_type', 'payment_obligation')
        ->where('event_source_id', $obligation->id)
        ->where('event_type', 'payment.cash.reported')
        ->first();
    expect($cashIntent)->not->toBeNull();
    $cashPayload = json_decode((string) $cashIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($cashIntent->priority)->toBe('needs_action')
        ->and($cashPayload['attention'])->toBe('needs_action')
        ->and($cashPayload['title'])->toBeString()
        ->and($cashPayload['body'])->toBeString()
        ->and($cashPayload['action_url'])->toBe(route('orders.show', ['order' => Fix::ORDER_ID_TRANSIT], false))
        ->and(DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.cash.reported')->count())->toBe(1);


    $this->postJson(route('orders.payment-obligations.cash.acknowledge', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => 'self-ack-'.Str::uuid7(),
    ])->assertForbidden();
    expect(DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->count())->toBe(0);


    $this->authenticateWithPhone(Fix::COURIER_PHONE);
    $this->postJson(route('orders.payment-obligations.cash.acknowledge', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => 'recipient-ack-'.Str::uuid7(),
    ])->assertOk();
    $this->postJson(route('orders.payment-obligations.cash.acknowledge', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => 'recipient-ack-retry-'.Str::uuid7(),
    ])->assertOk();

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('settled')
        ->and(DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->count())->toBe(1);
    $acknowledgmentIntent = DB::table('notifications')
        ->where('recipient_user_id', $obligation->payer_user_id)
        ->where('event_source_type', 'payment_obligation')
        ->where('event_source_id', $obligation->id)
        ->where('event_type', 'payment.cash.receipt_acknowledged')
        ->first();
    expect($acknowledgmentIntent)->not->toBeNull();
    $acknowledgmentPayload = json_decode((string) $acknowledgmentIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($acknowledgmentIntent->priority)->toBe('updates')
        ->and($acknowledgmentPayload['attention'])->toBe('updates')
        ->and($acknowledgmentPayload['title'])->toBeString()
        ->and($acknowledgmentPayload['body'])->toBeString()
        ->and($acknowledgmentPayload['action_url'])->toBe(route('orders.show', ['order' => Fix::ORDER_ID_TRANSIT], false))
        ->and(DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->count())->toBe(1);

});

it('does not allow changing a lane after the payer has reported cash', function (): void {
    $this->authenticateBuyer();
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
    DB::table('payment_obligations')->where('id', $obligation->id)->update(['status' => 'payer_reported_cash']);

    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'lane' => 'p2p_transfer',
        'idempotency_key' => 'locked-lane-'.Str::uuid7(),
    ])->assertStatus(409);

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('payer_reported_cash')
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->exists())->toBeFalse();
});
it('locks lane selection once a P2P proof is active', function (): void {
    $this->authenticateBuyer();
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
    DB::table('payment_obligations')->where('id', $obligation->id)->update([
        'lane' => 'p2p_transfer',
        'status' => 'payer_submitted_p2p_proof',
    ]);

    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'lane' => 'external_cash',
        'idempotency_key' => 'locked-p2p-proof-'.Str::uuid7(),
    ])->assertStatus(409);

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('payer_submitted_p2p_proof')
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->exists())->toBeFalse();
});
it('rejects a lane that is not available on the accepted listing', function (): void {
    $this->authenticateBuyer();
    $order = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
    $version = DB::table('listing_versions')->where('listing_id', $order->listing_id)->first();
    DB::table('listing_versions')->where('id', $version->id)->update([
        'payment_lane_availability' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
    ]);
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();

    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'lane' => 'p2p_transfer',
        'idempotency_key' => 'ineligible-lane-'.Str::uuid7(),
    ])->assertUnprocessable();

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('due')
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->exists())->toBeFalse();
});

it('rejects protected digital outside a disposable sandbox cohort', function (): void {
    $this->authenticateBuyer();
    config()->set('app.env', 'production');
    $order = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
    $version = DB::table('listing_versions')->where('listing_id', $order->listing_id)->first();
    $profileId = DB::table('listings')->where('id', $order->listing_id)->value('capability_profile_id');
    DB::table('listing_versions')->where('id', $version->id)->update([
        'payment_lane_availability' => json_encode(['external_cash', 'protected_digital'], JSON_THROW_ON_ERROR),
    ]);
    DB::table('capability_profiles')->where('id', $profileId)->update([
        'allowed_payment_lanes' => json_encode(['external_cash', 'protected_digital'], JSON_THROW_ON_ERROR),
    ]);
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();

    $this->postJson(route('orders.payment-obligations.lane', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'lane' => 'protected_digital',
        'idempotency_key' => 'protected-lane-'.Str::uuid7(),
    ])->assertUnprocessable();

    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('due')
        ->and(DB::table('payment_obligations')->where('supersedes_obligation_id', $obligation->id)->exists())->toBeFalse();
});
it('allows a recipient delegate to acknowledge only with active obligation-scoped consent', function (): void {
    $payerId = $this->authenticateBuyer();
    $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
    $this->postJson(route('orders.payment-obligations.cash.report', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'idempotency_key' => 'delegate-cash-report-'.Str::uuid7(),
    ])->assertOk();

    $this->logoutAuthenticatedUser();
    $recipientId = $this->authenticateWithPhone(Fix::COURIER_PHONE);
    $this->logoutAuthenticatedUser();
    $agentId = $this->authenticateWithPhone('+639179999991');


    $this->postJson(route('orders.payment-obligations.cash.acknowledge', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'acting_for_user_id' => $recipientId,
        'idempotency_key' => 'delegate-no-grant-'.Str::uuid7(),
    ])->assertForbidden();
    expect(DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->count())->toBe(0);


    $grantId = app(ConsentGrantService::class)->grant(
        grantorUserId: $recipientId,
        granteeUserId: $agentId,
        resourceType: 'payment_obligation',
        resourceId: (string) $obligation->id,
        permissionScope: ['actions' => ['acknowledge_cash_receipt']],
        correlationId: (string) Str::uuid7(),
        expiresAt: now()->addHour(),
    );
    $this->postJson(route('orders.payment-obligations.cash.acknowledge', [Fix::ORDER_ID_TRANSIT, $obligation->id]), [
        'acting_for_user_id' => $recipientId,
        'consent_grant_id' => $grantId,
        'idempotency_key' => 'delegate-ack-'.Str::uuid7(),
    ])->assertOk();
    $ackIntent = DB::table('notifications')
        ->where('recipient_user_id', $payerId)
        ->where('event_source_type', 'payment_obligation')
        ->where('event_source_id', $obligation->id)
        ->where('event_type', 'payment.cash.receipt_acknowledged')
        ->first();
    expect($ackIntent)->not->toBeNull();
    $ackPayload = json_decode((string) $ackIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($ackIntent->priority)->toBe('updates')
        ->and($ackPayload['attention'])->toBe('updates')
        ->and($ackPayload['action_url'])->toBe(route('orders.show', ['order' => Fix::ORDER_ID_TRANSIT], false))
        ->and(DB::table('notifications')->where('event_source_id', $obligation->id)->where('recipient_user_id', $agentId)->count())->toBe(0);


    expect(DB::table('payment_obligations')->where('id', $obligation->id)->value('status'))->toBe('settled')
        ->and((string) DB::table('payment_events')->where('payment_obligation_id', $obligation->id)->where('event_type', 'payment.cash.receipt_acknowledged')->value('actor_user_id'))->toBe($agentId);
});

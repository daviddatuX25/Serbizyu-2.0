<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\StockLedgerService;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

final class DealConsentIntegrityTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootPhoneOtpAuth();
    }

    public function test_changed_accepted_terms_reject_customer_confirmation_without_creating_child_effects(): void
    {
        [$buyerId, $chain, $need, $invitation, $scope] = $this->acceptedA1Need();

        $scope['amount_minor']++;
        DB::table('deal_invitations')->where('id', $invitation->id)->update([
            'scope' => json_encode($scope, JSON_THROW_ON_ERROR),
        ]);

        $this->confirm($chain, $need, $invitation, $scope, $buyerId)->assertStatus(409);
        $this->assertNoConfirmationEffects((string) $chain->id, (string) $need->id);
    }

    public function test_unowned_actor_cannot_confirm_or_create_an_idempotency_reservation(): void
    {
        [$buyerId, $chain, $need, $invitation, $scope] = $this->acceptedA1Need();
        $other = User::factory()->create();
        $key = 'foreign-confirm-'.Str::uuid7();

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $other->phone_e164);
        $this->postJson(route('deal-chains.needs.confirm-agreement', [
            'dealChain' => $chain->id,
            'need' => $need->id,
        ]), [
            'invitation_id' => (string) $invitation->id,
            'expected_need_version' => (int) $need->version,
            'terms_hash' => $scope['terms_hash'],
            'capacity_hash' => $scope['capacity_hash'],
        ], ['X-Idempotency-Key' => $key])->assertForbidden();

        expect(DB::table('idempotency_keys')->where('scope', 'deal_need.confirm_agreement:'.$other->id.':'.$need->id)->where('key', $key)->exists())->toBeFalse();
        $this->assertNoConfirmationEffects((string) $chain->id, (string) $need->id);
    }

    public function test_successful_confirmation_replay_returns_original_order_even_with_stale_need_version(): void
    {
        [$buyerId, $chain, $need, $invitation, $scope] = $this->acceptedA1Need();
        $key = 'consent-replay-'.Str::uuid7();
        $first = $this->confirm($chain, $need, $invitation, $scope, $buyerId, $key)->assertOk();
        $originalOrderId = $first->json('data.order_id');

        $replay = $this->confirm($chain, $need, $invitation, $scope, $buyerId, $key)->assertOk();

        expect($replay->json('data.order_id'))->toBe($originalOrderId)
            ->and(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(1)
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $need->id)->count())->toBe(1)
            ->and(DB::table('work_instances')->where('order_id', $originalOrderId)->count())->toBe(1)
            ->and(DB::table('payment_obligations')->where('order_id', $originalOrderId)->count())->toBe(1);
    }

    public function test_new_active_listing_version_invalidates_the_accepted_provider_terms(): void
    {
        [$buyerId, $chain, $need, $invitation, $scope] = $this->acceptedA1Need();
        $previous = DB::table('listing_versions')->where('id', $scope['listing_version_id'])->firstOrFail();
        $nextVersion = get_object_vars($previous);
        $nextVersion['id'] = (string) Str::uuid7();
        $nextVersion['version_number'] = (int) $previous->version_number + 1;
        $nextVersion['price_amount_minor'] = (int) $previous->price_amount_minor + 1000;
        $terms = json_decode((string) $previous->terms, true) ?: [];
        $terms['price_amount_minor'] = $nextVersion['price_amount_minor'];
        $nextVersion['terms'] = json_encode($terms, JSON_THROW_ON_ERROR);
        $nextVersion['created_at'] = now();
        $nextVersion['updated_at'] = now();
        DB::table('listing_versions')->insert($nextVersion);
        DB::table('listings')->where('id', $previous->listing_id)->update([
            'current_version' => $nextVersion['version_number'],
            'version' => $nextVersion['version_number'],
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        $this->confirm($chain, $need, $invitation, $scope, $buyerId)->assertStatus(409);
        $this->assertNoConfirmationEffects((string) $chain->id, (string) $need->id);
    }

    public function test_tampered_stored_offer_hash_is_rejected_before_any_child_effects(): void
    {
        [$buyerId, $chain, $need, $invitation, $scope] = $this->acceptedA1Need();
        $tampered = $scope;
        $tampered['terms_hash'] = str_repeat('a', 64);
        DB::table('deal_invitations')->where('id', $invitation->id)->update([
            'scope' => json_encode($tampered, JSON_THROW_ON_ERROR),
        ]);

        $this->confirm($chain, $need, $invitation, $scope, $buyerId)->assertStatus(409);
        $this->assertNoConfirmationEffects((string) $chain->id, (string) $need->id);
    }

    public function test_changed_stock_capacity_rejects_confirmation_and_same_key_can_succeed_after_stock_is_restored(): void
    {
        $buyerId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Consent integrity stock product',
                'description' => 'A provider-authored product with a tracked variant.',
                'category_code' => 'food',
                'listing_type' => 'product',
                'work_shape' => 'A4',
                'currency' => 'PHP',
                'variants' => [['id' => 'consent-variant', 'name' => 'Consent variant', 'price' => 12, 'stock' => 5]],
            ],
            (string) Str::uuid7(),
        );
        $version = DB::table('listing_versions')->where('listing_id', $draft['id'])->firstOrFail();
        $terms = json_decode((string) $version->terms, true) ?: [];
        $terms['variants'] = [['id' => 'consent-variant', 'name' => 'Consent variant', 'price_amount_minor' => 1200, 'is_default' => true]];
        DB::table('listing_versions')->where('id', $version->id)->update([
            'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
            'price_amount_minor' => 1200,
            'currency' => 'PHP',
            'published_at' => now(),
        ]);
        DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);
        $bucket = app(StockLedgerService::class)->provisionVariant(
            listingId: (string) $draft['id'],
            listingVersionId: (string) $version->id,
            ownerUserId: (string) $provider->id,
            resourceKey: 'consent-variant',
            openingQuantity: 5,
            correlationId: (string) Str::uuid7(),
        );

        $this->post(route('deal-chains.authorize'), [
            'items' => [[
                'id' => (string) $draft['id'],
                'listing_version_id' => (string) $version->id,
                'variant_id' => 'consent-variant',
                'quantity' => 2,
            ]],
        ])->assertRedirect();
        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerId)->orderByDesc('created_at')->firstOrFail();
        $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->firstOrFail();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->firstOrFail();
        $scope = json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);
        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ])->assertOk();
        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $need = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $key = 'capacity-retry-'.Str::uuid7();

        $changed = app(StockLedgerService::class)->adjust(
            capacityId: $bucket['id'],
            actorUserId: (string) $provider->id,
            ownerUserId: (string) $provider->id,
            expectedRowVersion: 1,
            movementType: 'recount',
            quantity: 4,
            idempotencyKey: 'deal-consent-recount-'.Str::uuid7(),
            reason: 'Recount stock before confirming the accepted offer.',
            reference: null,
            correlationId: (string) Str::uuid7(),
        );
        expect($changed['available'])->toBe(4);
        $this->confirm($chain, $need, $invitation, $scope, $buyerId, $key)->assertStatus(409);
        expect(DB::table('idempotency_keys')->where('scope', 'deal_need.confirm_agreement:'.$buyerId.':'.$need->id)->where('key', $key)->exists())->toBeFalse()
            ->and(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(0)
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $need->id)->count())->toBe(0);

        app(StockLedgerService::class)->adjust(
            capacityId: $bucket['id'],
            actorUserId: (string) $provider->id,
            ownerUserId: (string) $provider->id,
            expectedRowVersion: 2,
            movementType: 'receiving',
            quantity: 1,
            idempotencyKey: 'deal-consent-receive-'.Str::uuid7(),
            reason: 'Restore the supplier stock after recount.',
            reference: null,
            correlationId: (string) Str::uuid7(),
        );
        $this->confirm($chain, $need, $invitation, $scope, $buyerId, $key)->assertOk();
        expect(DB::table('orders')->where('deal_chain_id', $chain->id)->count())->toBe(1)
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $need->id)->count())->toBe(1)
            ->and(DB::table('work_instances')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $chain->id))->count())->toBe(1)
            ->and(DB::table('payment_obligations')->whereIn('order_id', DB::table('orders')->select('id')->where('deal_chain_id', $chain->id))->count())->toBe(1);
    }

    public function test_a3_confirmation_without_a_valid_appointment_hold_has_no_partial_effects(): void
    {
        $buyerId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Consent appointment service',
                'description' => 'A provider-authored appointment service.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A3',
                'milestone_stages' => [
                    ['id' => 'appointment-service', 'title' => 'Perform the appointment service', 'clearanceMode' => 'worker_direct', 'requiredProofs' => []],
                    ['id' => 'appointment-approval', 'title' => 'Customer approves the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                ],
            ],
            (string) Str::uuid7(),
        );
        $version = DB::table('listing_versions')->where('listing_id', $draft['id'])->firstOrFail();
        $terms = json_decode((string) $version->terms, true) ?: [];
        $terms['appointment_duration_minutes'] = 60;
        DB::table('listing_versions')->where('id', $version->id)->update([
            'price_amount_minor' => 65000,
            'currency' => 'PHP',
            'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
            'published_at' => now(),
        ]);
        DB::table('listings')->where('id', $draft['id'])->update(['status' => 'active', 'review_status' => 'approved']);

        $this->post(route('deal-chains.authorize'), [
            'items' => [['id' => (string) $draft['id'], 'quantity' => 1]],
        ])->assertRedirect();
        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerId)->orderByDesc('created_at')->firstOrFail();
        $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->firstOrFail();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->firstOrFail();
        $scope = json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ])->assertOk();

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $need = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $this->confirm($chain, $need, $invitation, $scope, $buyerId)->assertUnprocessable();
        $this->assertNoConfirmationEffects((string) $chain->id, (string) $need->id);
        expect(DB::table('appointment_reservations')->where('listing_id', $draft['id'])->count())->toBe(0);
    }

    /** @return array{string, object, object, object, array<string, mixed>} */
    private function acceptedA1Need(): array
    {
        $buyerId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Consent integrity service agreement',
                'description' => 'A provider-authored A1 service with a fixed PHP price.',
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

        $this->post(route('deal-chains.authorize'), [
            'items' => [['id' => (string) $draft['id'], 'quantity' => 1]],
        ])->assertRedirect();
        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerId)->orderByDesc('created_at')->firstOrFail();
        $need = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->firstOrFail();
        $invitation = DB::table('deal_invitations')->where('deal_need_id', $need->id)->firstOrFail();
        $scope = json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ])->assertOk();

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $need = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();

        return [$buyerId, $chain, $need, $invitation, $scope];
    }

    private function confirm(object $chain, object $need, object $invitation, array $scope, string $buyerId, ?string $key = null): TestResponse
    {
        $this->logoutAuthenticatedUser();
        $buyer = User::query()->findOrFail($buyerId);
        $this->authenticateWithPhone((string) $buyer->phone_e164);

        return $this->postJson(route('deal-chains.needs.confirm-agreement', [
            'dealChain' => $chain->id,
            'need' => $need->id,
        ]), [
            'invitation_id' => (string) $invitation->id,
            'expected_need_version' => (int) $need->version,
            'terms_hash' => $scope['terms_hash'],
            'capacity_hash' => $scope['capacity_hash'],
        ], $key === null ? [] : ['X-Idempotency-Key' => $key]);
    }

    private function assertNoConfirmationEffects(string $chainId, string $needId): void
    {
        $orderIds = DB::table('orders')->where('deal_chain_id', $chainId)->pluck('id');
        expect($orderIds)->toBeEmpty()
            ->and(DB::table('deal_need_confirmations')->where('deal_need_id', $needId)->count())->toBe(0)
            ->and(DB::table('work_instances')->whereIn('order_id', $orderIds)->count())->toBe(0)
            ->and(DB::table('payment_obligations')->whereIn('order_id', $orderIds)->count())->toBe(0);
    }
}

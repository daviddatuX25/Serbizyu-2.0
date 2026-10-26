<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

final class DealInvitationInboxTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootPhoneOtpAuth();
    }

    public function test_invited_provider_can_discover_private_terms_and_accept_from_inbox(): void
    {
        $buyerUserId = $this->authenticateBuyer();
        $provider = User::factory()->create();
        $listing = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Inbox private invitation service',
                'description' => 'Terms shown only to the provider invited to this need.',
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
            'price_amount_minor' => 12500,
            'currency' => 'PHP',
            'published_at' => now(),
        ]);
        DB::table('listings')->where('id', $listing['id'])->update(['status' => 'active', 'review_status' => 'approved']);
        $this->post(route('deal-chains.authorize'), [
            'items' => [['id' => (string) $listing['id'], 'quantity' => 1]],
        ])->assertRedirect();

        $chain = DB::table('deal_chains')->where('coordinator_user_id', $buyerUserId)->orderByDesc('created_at')->firstOrFail();
        $invitation = DB::table('deal_invitations')
            ->join('deal_needs', 'deal_needs.id', '=', 'deal_invitations.deal_need_id')
            ->where('deal_needs.deal_chain_id', $chain->id)
            ->where('deal_invitations.status', 'sent')
            ->first(['deal_invitations.*']);

        $this->assertNotNull($invitation);
        $provider = DB::table('users')->where('id', $invitation->invited_provider_user_id)->firstOrFail();

        $missingId = (string) Str::uuid7();
        $missingKey = 'missing-'.str_replace('-', '', $missingId);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $missingId]), [
            'decision' => 'accept',
            'expected_version' => 1,
        ], ['X-Idempotency-Key' => $missingKey])->assertNotFound();
        self::assertFalse(DB::table('idempotency_keys')->where('key', $missingKey)->exists());
        $wrongActorKey = 'wrong-actor-'.str_replace('-', '', (string) $invitation->id);
        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ], ['X-Idempotency-Key' => $wrongActorKey])->assertForbidden();
        self::assertFalse(DB::table('idempotency_keys')
            ->where('scope', 'deal_invitation.respond:'.$buyerUserId.':'.$invitation->id)
            ->where('key', $wrongActorKey)
            ->exists());

        $this->logoutAuthenticatedUser();
        $this->authenticateWithPhone((string) $provider->phone_e164);
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-invitations.index'))
            ->assertOk()
            ->assertJsonPath('component', 'DealInvitations/Index')
            ->assertJsonFragment(['id' => (string) $invitation->id, 'actionable' => true]);

        $expiredKey = 'expired-offer-'.str_replace('-', '', (string) $invitation->id);
        DB::table('deal_invitations')->where('id', $invitation->id)->update(['created_at' => now()->subDay(), 'expires_at' => now()]);
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-invitations.index'))
            ->assertJsonFragment(['id' => (string) $invitation->id, 'actionable' => false]);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ], ['X-Idempotency-Key' => $expiredKey])->assertStatus(410);
        self::assertFalse(DB::table('idempotency_keys')
            ->where('scope', 'deal_invitation.respond:'.$provider->id.':'.$invitation->id)
            ->where('key', $expiredKey)
            ->exists());
        DB::table('deal_invitations')->where('id', $invitation->id)->update(['expires_at' => now()->addDays(2)]);

        $staleKey = 'stale-offer-'.str_replace('-', '', (string) $invitation->id);
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version + 1,
        ], ['X-Idempotency-Key' => $staleKey])->assertStatus(409);
        self::assertFalse(DB::table('idempotency_keys')
            ->where('scope', 'deal_invitation.respond:'.$provider->id.':'.$invitation->id)
            ->where('key', $staleKey)
            ->exists());

        $acceptanceKey = 'inbox-accept-'.str_replace('-', '', (string) $invitation->id);
        $acceptedResponse = $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ], ['X-Idempotency-Key' => $acceptanceKey])
            ->assertOk()
            ->assertJsonPath('data.need_status', 'awaiting_customer_confirmation');
        $this->postJson(route('deal-invitations.respond', ['invitation' => $invitation->id]), [
            'decision' => 'accept',
            'expected_version' => (int) $invitation->version,
        ], ['X-Idempotency-Key' => $acceptanceKey])
            ->assertOk()
            ->assertExactJson($acceptedResponse->json());
        $this->assertSame(0, DB::table('orders')->where('deal_chain_id', $chain->id)->count());

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();
        $need = DB::table('deal_needs')->where('id', $invitation->deal_need_id)->firstOrFail();
        $scope = json_decode((string) $invitation->scope, true, flags: JSON_THROW_ON_ERROR);
        $this->postJson(route('deal-chains.needs.confirm-agreement', [
            'dealChain' => $chain->id,
            'need' => $need->id,
        ]), [
            'invitation_id' => (string) $invitation->id,

            'expected_need_version' => (int) $need->version,
            'terms_hash' => $scope['terms_hash'],
            'capacity_hash' => $scope['capacity_hash'],
        ])->assertOk();
        $this->assertSame(1, DB::table('orders')->where('deal_chain_id', $chain->id)->count());
    }

    public function test_authenticated_non_invited_provider_sees_an_empty_private_inbox(): void
    {
        $this->authenticateBuyer();
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])->get(route('deal-invitations.index'))
            ->assertOk()
            ->assertJsonPath('component', 'DealInvitations/Index')
            ->assertJsonCount(0, 'props.invitations');
    }

    public function test_guest_is_redirected_and_other_provider_cannot_read_an_invitation_in_inbox(): void
    {
        $this->get(route('deal-invitations.index'))->assertRedirect(route('auth.sign-in'));
    }
}

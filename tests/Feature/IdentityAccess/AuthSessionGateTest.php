<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AuthSessionGateTest extends TestCase
{
    use DatabaseTransactions;

    public function test_guest_my_listings_redirects_to_sign_in_and_preserves_return_path(): void
    {
        $this->get('/my-listings')
            ->assertRedirect(route('auth.sign-in'));

        $this->assertSame('/my-listings', session('auth_return_to'));
    }

    public function test_auth_phone_deep_link_redirects_to_the_single_sign_in_hub(): void
    {
        $this->get('/auth/phone')
            ->assertRedirect(route('auth.sign-in'));
    }

    public function test_authenticated_user_is_redirected_away_from_phone_auth(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Authenticated auth-phone redirect requires PostgreSQL.');
        }

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/auth/phone')
            ->assertRedirect(route('home'));
    }
}

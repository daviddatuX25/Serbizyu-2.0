<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use Tests\TestCase;

final class AuthSessionGateTest extends TestCase
{
    public function test_guest_my_listings_redirects_to_phone_auth_and_preserves_return_path(): void
    {
        $this->get('/my-listings')
            ->assertRedirect(route('auth.phone'));

        $this->assertSame('/my-listings', session('auth_return_to'));
    }

    public function test_auth_phone_page_is_available_to_guests(): void
    {
        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ])
            ->get('/auth/phone')
            ->assertOk()
            ->assertJsonPath('component', 'Auth/Phone')
            ->assertJsonPath('props.session.status', 'phone_required');
    }
}

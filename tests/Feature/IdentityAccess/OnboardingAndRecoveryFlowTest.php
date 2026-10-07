<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Application\StartSignup;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL required for onboarding and recovery flow tests.');
    }

    $this->bootPhoneOtpAuth();
});
function onboardingInertiaHeaders(): array
{
    return [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ];
}

it('requires authentication to view onboarding', function (): void {
    $this->get('/onboarding')->assertRedirect('/auth/sign-in');
});

it('renders the onboarding page for an authenticated user', function (): void {
    $user = User::factory()->create([
        'status' => 'active',
        'primary_access_tier' => 'L1',
    ]);

    $this->actingAs($user)
        ->withHeaders(onboardingInertiaHeaders())
        ->get('/onboarding')
        ->assertOk()
        ->assertJsonPath('component', 'Auth/Onboarding')
        ->assertJsonPath('props.returnTo', route('home'));
});

it('redirects new signups to onboarding upon web OTP verification', function (): void {
    $phone = '+639174445566';
    $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
    $code = $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);

    $this->post('/auth/register/verify', [
        'phone' => $phone,
        'code' => $code,
    ])->assertRedirect(route('onboarding'));

    $this->assertAuthenticated();
});

it('completes onboarding through POST /onboarding and activates user', function (): void {
    $user = User::factory()->create([
        'status' => 'pending',
        'phone_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post('/onboarding', [
            'provider_intent' => true,
            'display_name' => 'Mang Pedro Repairs',
            'area_code' => 'Tagudin Centro',
            'language_code' => 'fil',
            'password' => 'SafePass123!',
            'password_confirmation' => 'SafePass123!',
        ])
        ->assertRedirect();

    $fresh = $user->fresh();
    expect($fresh->status)->toBe('active');
    expect(DB::table('user_profiles')->where('user_id', $user->id)->value('display_name'))->toBe('Mang Pedro Repairs');
    expect(DB::table('user_profiles')->where('user_id', $user->id)->value('service_area_display'))->toBe('Tagudin');
});

it('renders forgot password page with recovery session and dev preview props', function (): void {
    $this->withHeaders(onboardingInertiaHeaders())
        ->get('/auth/password/forgot')
        ->assertOk()
        ->assertJsonPath('component', 'Auth/ForgotPassword')
        ->assertJsonPath('props.session.status', 'method_picker');
});

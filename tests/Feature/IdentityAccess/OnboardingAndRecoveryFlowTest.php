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

it('preserves existing language preferences when completing English onboarding', function (array $preferences, array $languageInput): void {
    $user = User::factory()->create(['locale' => 'ilo', 'status' => 'pending', 'phone_verified_at' => now()]);
    DB::table('user_profiles')->where('user_id', $user->id)->update([
        'language_preferences' => json_encode($preferences, JSON_THROW_ON_ERROR),
    ]);

    $this->actingAs($user)->post('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Preference preservation',
        'area_code' => 'Tagudin',
        'password' => 'SafePass123!',
        'password_confirmation' => 'SafePass123!',
        ...$languageInput,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($user->fresh()->locale)->toBe('ilo');
    expect(json_decode((string) DB::table('user_profiles')->where('user_id', $user->id)->value('language_preferences'), true))
        ->toBe($preferences);
    $this->withHeaders(onboardingInertiaHeaders())->get('/onboarding')
        ->assertOk()->assertJsonPath('props.readiness.language_code', 'ilo');
})->with([
    'stored primary with omitted choice' => [['primary' => 'ilo', 'secondary' => ['en']], []],
    'legacy list with omitted choice' => [['ilo', 'en'], []],
    'existing Ilocano submitted explicitly' => [['primary' => 'ilo'], ['language_code' => 'ilo']],
]);

it('does not reset fixture language preferences when browsing', function (): void {
    $fixtures = app(\App\Modules\IdentityAccess\Infrastructure\FixtureRepository::class);
    $fixtures->ensure();
    $userId = $fixtures::PROVIDER_ID;
    DB::table('users')->where('id', $userId)->update(['locale' => 'ilo']);
    DB::table('user_profiles')->where('user_id', $userId)->update([
        'language_preferences' => json_encode(['ilo', 'en'], JSON_THROW_ON_ERROR),
    ]);

    $this->get('/')->assertOk();

    expect(DB::table('users')->where('id', $userId)->value('locale'))->toBe('ilo');
    expect(json_decode((string) DB::table('user_profiles')->where('user_id', $userId)->value('language_preferences'), true))
        ->toBe(['ilo', 'en']);
});

it('renders forgot password page with recovery session and dev preview props', function (): void {
    $this->withHeaders(onboardingInertiaHeaders())
        ->get('/auth/password/forgot')
        ->assertOk()
        ->assertJsonPath('component', 'Auth/ForgotPassword')
        ->assertJsonPath('props.session.status', 'method_picker');
});

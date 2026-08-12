<?php

declare(strict_types=1);

use App\Mail\Auth\EmailCredentialsSet;
use App\Models\User;
use App\Modules\IdentityAccess\Application\StartSignup;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Hybrid auth P0 requires PostgreSQL.');
    }

    $this->bootPhoneOtpAuth();
});

it('H2-S01 blocks signup completion without phone OTP', function (): void {
    $phone = '+639173000101';

    $this->postJson('/auth/register/request', ['phone' => $phone])
        ->assertOk()
        ->assertJsonPath('data.status', 'code_pending');

    expect(DB::table('users')->where('phone_e164', $phone)->value('phone_verified_at'))->toBeNull();
    expect(DB::table('users')->where('phone_e164', $phone)->value('status'))->toBe('pending');
    $this->assertGuest();
});

it('H2-S02 completes signup when signup_verify OTP succeeds once', function (): void {
    $phone = '+639173000102';

    $this->postJson('/auth/register/request', [
        'phone' => $phone,
        'display_name' => 'Ana Tagudin',
    ])->assertOk();

    $code = $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);
    expect($code)->not->toBeNull();
    expect(DB::table('auth_otps')->where('phone_e164', $phone)->value('purpose'))->toBe(StartSignup::PURPOSE);

    $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])
        ->assertOk()
        ->assertJsonPath('data.status', 'authenticated');

    $this->assertAuthenticated();
    expect(DB::table('users')->where('phone_e164', $phone)->value('phone_verified_at'))->not->toBeNull();
    expect(DB::table('users')->where('phone_e164', $phone)->value('status'))->toBe('active');
    expect(DB::table('auth_otps')->where('phone_e164', $phone)->value('consumed_at'))->not->toBeNull();

    $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])
        ->assertStatus(422)
        ->assertJsonPath('code', 'OTP_INVALID');
});

it('H2-O01 blocks onboarding without a password', function (): void {
    $this->postJson('/auth/register/request', ['phone' => '+639173000103'])->assertOk();
    $code = $this->otpDelivery->lastCodeFor('+639173000103', StartSignup::PURPOSE);
    $this->postJson('/auth/register/verify', [
        'phone' => '+639173000103',
        'code' => $code,
    ])->assertOk();

    $this->postJson('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Rosa',
        'area_code' => 'Tagudin',
        'language_code' => 'fil',
        'help_preference' => 'self_managed',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['password']);

    expect(DB::table('users')->where('phone_e164', '+639173000103')->value('password'))->toBeNull();
});

it('H2-I00 signs in with phone+password without invoking OTP delivery', function (): void {
    $phone = '+639173000104';
    $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
    $code = $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);
    $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])->assertOk();

    $this->postJson('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Rosa',
        'area_code' => 'Tagudin',
        'language_code' => 'fil',
        'help_preference' => 'self_managed',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ])->assertOk()
        ->assertJsonPath('data.ready', true)
        ->assertJsonPath('data.password_set', true)
        ->assertJsonPath('data.email_attached', false);

    $this->post('/auth/logout')->assertRedirect();
    $this->assertGuest();
    $this->otpDelivery->flush();

    $this->postJson('/auth/phone/login', [
        'phone' => $phone,
        'password' => 'Password1!',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'authenticated');

    $this->assertAuthenticated();
    expect($this->otpDelivery->lastCodeFor($phone))->toBeNull();
});

it('H2-I01 signs in with email/password without invoking OTP delivery', function (): void {
    Mail::fake();

    $user = User::factory()->withEmailPassword('ana@serbizyu.test', 'Password1!')->create();
    $this->otpDelivery->flush();

    $this->postJson('/auth/email/login', [
        'email' => 'ana@serbizyu.test',
        'password' => 'Password1!',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'authenticated')
        ->assertJsonPath('data.user_id', $user->id);

    $this->assertAuthenticatedAs($user);
    expect($this->otpDelivery->lastCodeFor((string) $user->phone_e164))->toBeNull();
});

it('H2-I02 signs in with SMS OTP as fallback for a phone-verified user', function (): void {
    $user = User::factory()->create([
        'phone_e164' => '+639173000105',
        'status' => 'active',
        'phone_verified_at' => now(),
    ]);
    $this->otpDelivery->flush();

    $this->postJson('/auth/phone/request', ['phone' => '+639173000105'])
        ->assertOk()
        ->assertJsonPath('data.status', 'code_pending');

    $code = $this->otpDelivery->lastCodeFor('+639173000105');
    expect($code)->not->toBeNull();

    $this->postJson('/auth/phone/verify', ['phone' => '+639173000105', 'code' => $code])
        ->assertOk()
        ->assertJsonPath('data.status', 'authenticated')
        ->assertJsonPath('data.user_id', $user->id);

    $this->assertAuthenticatedAs($user);
});

it('H2-C01 exposes only phone and email on the single sign-in page', function (): void {
    $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])
        ->get('/auth/sign-in')
        ->assertOk()
        ->assertJsonPath('component', 'Auth/SignIn')
        ->assertJsonPath('props.methods.phone_password', true)
        ->assertJsonPath('props.methods.email', true)
        ->assertJsonMissingPath('props.methods.sms')
        ->assertJsonMissingPath('props.methods.google');
});

it('H2-U01 surfaces the phone OTP challenge on the single sign-in page after a code request', function (): void {
    User::factory()->create([
        'phone_e164' => '+639173000107',
        'status' => 'active',
        'phone_verified_at' => now(),
    ]);
    $this->otpDelivery->flush();

    // Non-JSON request (as the unified sign-in page sends): server stores the
    // pending phone OTP challenge on the session and the sign-in page re-renders it.
    $this->post('/auth/phone/request', ['phone' => '+639173000107'])->assertRedirect();

    $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])
        ->get('/auth/sign-in')
        ->assertOk()
        ->assertJsonPath('component', 'Auth/SignIn')
        ->assertJsonPath('props.session.status', 'challenge_pending')
        ->assertJsonPath('props.session.phone', '+639173000107');
});

it('links optional email after password is set and queues Mailpit mail', function (): void {
    Mail::fake();

    $user = User::factory()->create([
        'password' => 'Password1!',
    ]);
    $this->actingAs($user);

    $this->postJson('/auth/email/link', [
        'email' => 'provider@serbizyu.test',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'email_linked');

    expect(DB::table('users')->where('id', $user->id)->value('email'))->toBe('provider@serbizyu.test');
    Mail::assertQueued(EmailCredentialsSet::class);
});

it('rejects email sign-in when the account never completed mobile verification', function (): void {
    $user = User::factory()->pending()->withEmailPassword('ghost@serbizyu.test', 'Password1!')->create([
        'phone_verified_at' => null,
    ]);

    expect($user->fresh()?->phone_verified_at)->toBeNull();

    $this->postJson('/auth/email/login', [
        'email' => 'ghost@serbizyu.test',
        'password' => 'Password1!',
    ])->assertStatus(403)
        ->assertJsonPath('code', 'PHONE_VERIFICATION_REQUIRED');

    $this->assertGuest();
});

it('completes onboarding with password and optional email then allows email login', function (): void {
    Mail::fake();

    $this->postJson('/auth/register/request', [
        'phone' => '+639173000202',
    ])->assertOk();
    $code = $this->otpDelivery->lastCodeFor('+639173000202', StartSignup::PURPOSE);
    $this->postJson('/auth/register/verify', [
        'phone' => '+639173000202',
        'code' => $code,
    ])->assertOk();

    $this->postJson('/onboarding', [
        'provider_intent' => true,
        'display_name' => 'Ana',
        'area_code' => 'Tagudin',
        'language_code' => 'en',
        'help_preference' => 'self_managed',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
        'email' => 'ana.return@serbizyu.test',
    ])->assertOk()
        ->assertJsonPath('data.ready', true)
        ->assertJsonPath('data.email_attached', true)
        ->assertJsonPath('data.password_set', true);

    Mail::assertQueued(EmailCredentialsSet::class);

    $this->post('/auth/logout')->assertRedirect();
    $this->postJson('/auth/email/login', [
        'email' => 'ana.return@serbizyu.test',
        'password' => 'Password1!',
    ])->assertOk()->assertJsonPath('data.status', 'authenticated');
});

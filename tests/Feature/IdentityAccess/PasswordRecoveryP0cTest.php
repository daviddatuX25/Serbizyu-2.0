<?php

declare(strict_types=1);

use App\Mail\Auth\PasswordResetLink;
use App\Models\User;
use App\Modules\IdentityAccess\Application\RequestResetSmsOtp;
use App\Modules\IdentityAccess\Application\StartSignup;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Password recovery P0c requires PostgreSQL.');
    }

    $this->bootPhoneOtpAuth();
});

it('H2-R03 registers auth-password-reset limiters and wires reset routes', function (): void {
    expect(RateLimiter::limiter('auth-password-reset'))->not->toBeNull();
    expect(RateLimiter::limiter('auth-password-reset-confirm'))->not->toBeNull();

    $expected = [
        'auth.password.email' => 'throttle:auth-password-reset',
        'auth.password.phone' => 'throttle:auth-password-reset',
        'auth.password.reset.submit' => 'throttle:auth-password-reset-confirm',
        'auth.password.phone.verify' => 'throttle:auth-password-reset-confirm',
    ];

    foreach ($expected as $routeName => $middleware) {
        $route = collect(Route::getRoutes())->first(
            fn ($route): bool => $route->getName() === $routeName
        );
        expect($route)->not->toBeNull();
        expect(implode(',', $route->gatherMiddleware()))->toContain($middleware);
    }
});

it('H2-R04 email reset link is single-use and changes the password', function (): void {
    Mail::fake();

    $user = User::factory()->withEmailPassword('ana@serbizyu.test', 'Password1!')->create();
    $oldHash = DB::table('users')->where('id', $user->id)->value('password');
    $this->postJson('/auth/password/email', ['email' => 'ana@serbizyu.test'])
        ->assertOk()
        ->assertJsonPath('data.status', 'reset_link_sent');

    Mail::assertQueued(PasswordResetLink::class);
    $mailable = Mail::queued(PasswordResetLink::class)->first();
    $resetUrl = $mailable->resetUrl;
    parse_str((string) parse_url((string) $resetUrl, PHP_URL_QUERY), $query);
    $token = (string) ($query['token'] ?? '');

    expect($token)->not->toBe('');

    $this->postJson('/auth/password/reset', [
        'email' => 'ana@serbizyu.test',
        'token' => $token,
        'password' => 'NewPass1!',
        'password_confirmation' => 'NewPass1!',
    ])->assertOk()->assertJsonPath('data.status', 'password_reset');

    expect(DB::table('users')->where('id', $user->id)->value('password'))->not->toBe($oldHash);

    // Token is consumed — replay fails generically, password unchanged.
    $this->postJson('/auth/password/reset', [
        'email' => 'ana@serbizyu.test',
        'token' => $token,
        'password' => 'Another1!',
        'password_confirmation' => 'Another1!',
    ])->assertStatus(422)->assertJsonPath('code', 'RESET_INVALID');

    // New password signs in.
    $this->postJson('/auth/email/login', [
        'email' => 'ana@serbizyu.test',
        'password' => 'NewPass1!',
    ])->assertOk()->assertJsonPath('data.status', 'authenticated');
});

it('H2-R05 SMS reset for a phone-only account', function (): void {
    $phone = '+639173000301';
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
    ])->assertOk()->assertJsonPath('data.ready', true);

    $this->post('/auth/logout')->assertRedirect();
    $this->otpDelivery->flush();

    $this->postJson('/auth/password/phone', ['phone' => $phone])
        ->assertOk()
        ->assertJsonPath('data.status', 'code_pending');

    $resetCode = $this->otpDelivery->lastCodeFor($phone, RequestResetSmsOtp::PURPOSE);
    expect($resetCode)->not->toBeNull();

    $this->postJson('/auth/password/phone/verify', [
        'phone' => $phone,
        'code' => $resetCode,
        'password' => 'NewPass2!',
        'password_confirmation' => 'NewPass2!',
    ])->assertOk()->assertJsonPath('data.status', 'password_reset');

    // Old password no longer works (generic AUTH_FAILED, 422); new one does.
    $this->postJson('/auth/phone/login', [
        'phone' => $phone,
        'password' => 'Password1!',
    ])->assertStatus(422)->assertJsonPath('code', 'AUTH_FAILED');

    $this->postJson('/auth/phone/login', [
        'phone' => $phone,
        'password' => 'NewPass2!',
    ])->assertOk()->assertJsonPath('data.status', 'authenticated');
});

it('H2-R06 reset request for an unknown identifier is non-enumerating', function (): void {
    $this->postJson('/auth/password/email', ['email' => 'ghost@serbizyu.test'])
        ->assertOk()
        ->assertJsonPath('data.status', 'reset_link_sent');

    $this->postJson('/auth/password/phone', ['phone' => '+639173099999'])
        ->assertOk()
        ->assertJsonPath('data.status', 'code_pending');

    expect(DB::table('password_reset_tokens')->count())->toBe(0);
    expect($this->otpDelivery->lastCodeFor('+639173099999'))->toBeNull();
});

it('H2-R07 reset cannot complete for a non-verified account', function (): void {
    $this->postJson('/auth/password/phone', ['phone' => '+639173000302'])->assertOk();
    $this->postJson('/auth/password/phone/verify', [
        'phone' => '+639173000302',
        'code' => '000000',
        'password' => 'NewPass3!',
        'password_confirmation' => 'NewPass3!',
    ])->assertStatus(422)->assertJsonPath('code', 'RESET_INVALID');
});

it('H2-R08 reset never logs the user in', function (): void {
    Mail::fake();

    $user = User::factory()->withEmailPassword('ana@serbizyu.test', 'Password1!')->create();
    $this->postJson('/auth/password/email', ['email' => 'ana@serbizyu.test'])->assertOk();

    Mail::assertQueued(PasswordResetLink::class);
    $mailable = Mail::queued(PasswordResetLink::class)->first();
    parse_str((string) parse_url((string) $mailable->resetUrl, PHP_URL_QUERY), $query);

    $this->postJson('/auth/password/reset', [
        'email' => 'ana@serbizyu.test',
        'token' => (string) $query['token'],
        'password' => 'NewPass4!',
        'password_confirmation' => 'NewPass4!',
    ])->assertOk()->assertJsonPath('data.status', 'password_reset');

    $this->assertGuest();
    $this->assertSame('', (string) auth()->id());
});

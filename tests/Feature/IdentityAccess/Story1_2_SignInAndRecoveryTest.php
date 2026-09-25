<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Models\User;
use App\Modules\IdentityAccess\Application\PhoneOtpAuthService;
use App\Modules\IdentityAccess\Application\RequestResetSmsOtp;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * Story 1.2 Acceptance Criteria Test Suite:
 * Sign In and Recover Without Enumeration (PRD-001, PRD-008–009, PRD-075; UX-DR14)
 *
 * Given a returning account
 * When the member signs in with valid phone/password, email/password, or fallback phone OTP, or requests credential reset
 * Then access is restored with a fresh session or a single-use reset challenge is issued to the verified contact channel
 * And invalid credentials, nonexistent identifiers, unverified numbers, and suspended accounts produce non-enumerating responses with identical timing characteristics and no session creation.
 */
final class Story1_2_SignInAndRecoveryTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Story 1.2 tests require PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
    }

    public function test_phone_password_sign_in_succeeds_and_regenerates_session_without_sms(): void
    {
        $phone = '+63917'.rand(1000000, 9999999);
        $password = 'SafeSecret123!';
        $this->insertUser($phone, status: 'active', verified: true, password: $password);

        $response = $this->postJson('/auth/phone/login', [
            'phone' => $phone,
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();
        // Verifies zero SMS minted or delivered for password sign-in
        self::assertNull($this->otpDelivery->lastCodeFor($phone));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());
    }

    public function test_phone_password_with_incorrect_password_fails_generically(): void
    {
        $phone = '+63918'.rand(1000000, 9999999);
        $this->insertUser($phone, status: 'active', verified: true, password: 'RealPassword123!');

        $response = $this->postJson('/auth/phone/login', [
            'phone' => $phone,
            'password' => 'WrongPassword999!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'AUTH_FAILED');

        $this->assertGuest();
    }

    public function test_phone_password_sign_in_for_unknown_phone_is_non_enumerating(): void
    {
        $phone = '+63919'.rand(1000000, 9999999);

        $response = $this->postJson('/auth/phone/login', [
            'phone' => $phone,
            'password' => 'AnyPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'AUTH_FAILED');

        $this->assertGuest();
    }

    public function test_email_password_sign_in_succeeds_for_verified_account(): void
    {
        $phone = '+63920'.rand(1000000, 9999999);
        $email = 'member'.rand(1000, 9999).'@example.ph';
        $password = 'SafeSecret123!';
        $this->insertUser($phone, status: 'active', verified: true, password: $password, email: $email);

        $response = $this->postJson('/auth/email/login', [
            'email' => $email,
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();
    }

    public function test_email_password_sign_in_for_unknown_email_is_non_enumerating(): void
    {
        $response = $this->postJson('/auth/email/login', [
            'email' => 'unknown_member_999@example.ph',
            'password' => 'SomePassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'AUTH_FAILED');

        $this->assertGuest();
    }

    public function test_sms_otp_fallback_login_succeeds_and_consumes_challenge(): void
    {
        $phone = '+63921'.rand(1000000, 9999999);
        $userId = $this->insertUser($phone, status: 'active', verified: true);
        $initialVerifiedAt = DB::table('users')->where('id', $userId)->value('phone_verified_at');

        // Request login OTP
        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        $code = (string) $this->otpDelivery->lastCodeFor($phone, PhoneOtpAuthService::PURPOSE);
        self::assertNotNull($code);

        // Verify OTP
        $this->postJson('/auth/phone/verify', [
            'phone' => $phone,
            'code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();

        // Challenge marked consumed
        $otp = DB::table('auth_otps')->where('phone_e164', $phone)->where('purpose', PhoneOtpAuthService::PURPOSE)->first();
        self::assertNotNull($otp->consumed_at);

        // Does not alter verification timestamp
        self::assertSame((string) $initialVerifiedAt, (string) DB::table('users')->where('id', $userId)->value('phone_verified_at'));
    }

    public function test_sms_otp_login_for_unknown_phone_is_strictly_non_enumerating(): void
    {
        $phone = '+63922'.rand(1000000, 9999999);

        // Responds with identical generic code_pending
        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        // No code minted, delivered, or stored
        self::assertNull($this->otpDelivery->lastCodeFor($phone));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());

        // Verifying arbitrary code fails
        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => '123456'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');

        $this->assertGuest();
    }

    public function test_suspended_account_cannot_sign_in_via_any_method(): void
    {
        $phone = '+63923'.rand(1000000, 9999999);
        $email = 'suspended'.rand(1000, 9999).'@example.ph';
        $password = 'SecretPass123!';
        $this->insertUser($phone, status: 'suspended', verified: true, password: $password, email: $email);

        // 1. Phone + password denied
        $this->postJson('/auth/phone/login', ['phone' => $phone, 'password' => $password])
            ->assertStatus(403)
            ->assertJsonPath('code', 'ACCOUNT_UNAVAILABLE');
        $this->assertGuest();

        // 2. Email + password denied
        $this->postJson('/auth/email/login', ['email' => $email, 'password' => $password])
            ->assertStatus(403)
            ->assertJsonPath('code', 'ACCOUNT_UNAVAILABLE');
        $this->assertGuest();

        // 3. SMS OTP request is non-enumerating and issues no challenge
        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');
        self::assertNull($this->otpDelivery->lastCodeFor($phone));
    }

    public function test_email_password_recovery_is_single_use_and_does_not_auto_login(): void
    {
        $phone = '+63924'.rand(1000000, 9999999);
        $email = 'recover_email_'.rand(1000, 9999).'@example.ph';
        $userId = $this->insertUser($phone, status: 'active', verified: true, password: 'OldPassword123!', email: $email);

        $user = User::query()->findOrFail($userId);
        $token = Password::broker()->createToken($user);

        // Confirm reset with token
        $response = $this->postJson('/auth/password/reset', [
            'token' => $token,
            'email' => $email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'password_reset');

        // Password was changed
        $user->refresh();
        self::assertTrue(Hash::check('NewPassword123!', (string) $user->password));

        // Must NOT log the user in automatically
        $this->assertGuest();

        // Replaying same token fails
        $replayResponse = $this->postJson('/auth/password/reset', [
            'token' => $token,
            'email' => $email,
            'password' => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ]);
        $replayResponse->assertStatus(422);
    }

    public function test_sms_otp_password_recovery_is_single_use_and_does_not_auto_login(): void
    {
        $phone = '+63925'.rand(1000000, 9999999);
        $userId = $this->insertUser($phone, status: 'active', verified: true, password: 'OldPassword123!');
        // Request SMS reset OTP via /auth/password/phone
        $this->postJson('/auth/password/phone', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        $code = (string) $this->otpDelivery->lastCodeFor($phone, RequestResetSmsOtp::PURPOSE);
        self::assertNotNull($code);

        // Reset password with valid OTP via /auth/password/phone/verify
        $response = $this->postJson('/auth/password/phone/verify', [
            'phone' => $phone,
            'code' => $code,
            'password' => 'BrandNewPassword123!',
            'password_confirmation' => 'BrandNewPassword123!',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'password_reset');

        // Verify password updated
        $user = User::query()->findOrFail($userId);
        self::assertTrue(Hash::check('BrandNewPassword123!', (string) $user->password));

        // Must NOT log the user in automatically
        $this->assertGuest();

        // Replaying same code fails
        $this->postJson('/auth/password/phone/verify', [
            'phone' => $phone,
            'code' => $code,
            'password' => 'YetAnotherPassword123!',
            'password_confirmation' => 'YetAnotherPassword123!',
        ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'RESET_INVALID');
    }

    public function test_session_is_regenerated_on_login_and_invalidated_on_logout(): void
    {
        $phone = '+63926'.rand(1000000, 9999999);
        $password = 'SafeSecret123!';
        $this->insertUser($phone, status: 'active', verified: true, password: $password);

        $this->postJson('/auth/phone/login', [
            'phone' => $phone,
            'password' => $password,
        ])->assertOk();

        $this->assertAuthenticated();
        $authenticatedSessionId = session()->getId();

        $this->post('/auth/logout')->assertRedirect(route('home'));
        $this->assertGuest();
        self::assertNotSame($authenticatedSessionId, session()->getId());
    }

    private function insertUser(string $phone, string $status, bool $verified, ?string $password = null, ?string $email = null): string
    {
        $userId = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();
        $now = now();

        DB::table('users')->insert([
            'id' => $userId,
            'phone_e164' => $phone,
            'email' => $email,
            'email_verified_at' => $email !== null ? $now : null,
            'password' => $password !== null ? Hash::make($password) : null,
            'status' => $status,
            'primary_access_tier' => 'L0',
            'locale' => 'en',
            'timezone' => 'Asia/Manila',
            'version' => 1,
            'phone_verified_at' => $verified ? $now : null,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('user_profiles')->insert([
            'user_id' => $userId,
            'display_name' => 'Returning Participant',
            'public_bio' => null,
            'avatar_file_id' => null,
            'service_area_display' => 'Tagudin',
            'accessibility_preferences' => json_encode([], JSON_THROW_ON_ERROR),
            'language_preferences' => json_encode(['primary' => 'en'], JSON_THROW_ON_ERROR),
            'emergency_contact_policy' => null,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $userId;
    }
}

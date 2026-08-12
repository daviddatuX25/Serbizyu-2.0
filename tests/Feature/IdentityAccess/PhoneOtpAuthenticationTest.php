<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * SMS OTP return sign-in (P1): `/auth/phone/*` is a return-login fallback for
 * phone-verified accounts only. Unknown, unverified, and suspended numbers are
 * non-enumerating (generic shape, no OTP minted). Signup lives in the register
 * flow (HybridAuthP0Test H2-S01/S02).
 */
final class PhoneOtpAuthenticationTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Phone OTP authentication requires PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
    }

    public function test_sms_login_for_unknown_phone_is_non_enumerating(): void
    {
        $phone = '+639171000001';

        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending')
            ->assertJsonPath('data.phone_e164', $phone);

        self::assertNull($this->otpDelivery->lastCodeFor($phone));
        self::assertSame(0, DB::table('users')->where('phone_e164', $phone)->count());
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => '123456'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
        $this->assertGuest();
    }

    public function test_sms_login_for_pending_unverified_user_does_not_mint_code(): void
    {
        $phone = '+639171000002';
        $this->insertUser($phone, status: 'pending', verified: false);

        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        // Signup must finish through /auth/register — SMS login never activates.
        self::assertNull($this->otpDelivery->lastCodeFor($phone));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());
    }

    public function test_verified_user_requests_and_uses_sms_code_to_sign_in(): void
    {
        $phone = '+639171000003';
        $userId = $this->insertUser($phone, status: 'active', verified: true);
        $verifiedAt = DB::table('users')->where('id', $userId)->value('phone_verified_at');

        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        $code = $this->otpDelivery->lastCodeFor($phone);
        self::assertNotNull($code);
        self::assertSame(6, strlen((string) $code));

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();
        // Return login must not re-verify or activate anything.
        self::assertSame((string) $verifiedAt, (string) DB::table('users')->where('id', $userId)->value('phone_verified_at'));
        self::assertSame('active', DB::table('users')->where('id', $userId)->value('status'));
        self::assertNotNull(DB::table('auth_otps')->where('phone_e164', $phone)->value('consumed_at'));
    }

    public function test_invalid_verification_increments_attempts_and_fifth_failure_locks(): void
    {
        $phone = '+639171000004';
        $this->insertUser($phone, status: 'active', verified: true);

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $otpId = DB::table('auth_otps')->where('phone_e164', $phone)->whereNull('consumed_at')->value('id');

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => '000000'])
                ->assertStatus(422)
                ->assertJsonPath('code', 'OTP_INVALID');
        }

        self::assertSame(5, (int) DB::table('auth_otps')->where('id', $otpId)->value('attempts'));

        $realCode = (string) $this->otpDelivery->lastCodeFor($phone);
        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $realCode])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
        $this->assertGuest();
    }

    public function test_expired_otp_is_rejected(): void
    {
        $phone = '+639171000005';
        $this->insertUser($phone, status: 'active', verified: true);

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone);

        DB::table('auth_otps')->where('phone_e164', $phone)->update([
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
        $this->assertGuest();
    }

    public function test_duplicate_request_invalidates_prior_pending_challenge(): void
    {
        $phone = '+639171000006';
        $this->insertUser($phone, status: 'active', verified: true);

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $firstCode = (string) $this->otpDelivery->lastCodeFor($phone);
        $firstId = DB::table('auth_otps')->where('phone_e164', $phone)->whereNull('consumed_at')->value('id');

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $secondCode = (string) $this->otpDelivery->lastCodeFor($phone);

        self::assertNotSame($firstCode, $secondCode);
        self::assertNotNull(DB::table('auth_otps')->where('id', $firstId)->value('consumed_at'));

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $firstCode])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $secondCode])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');
    }

    public function test_suspended_account_cannot_authenticate(): void
    {
        $phone = '+639171000007';
        $this->insertUser($phone, status: 'suspended', verified: true);

        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending');

        self::assertNull($this->otpDelivery->lastCodeFor($phone));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => '123456'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
        $this->assertGuest();
    }

    public function test_session_is_regenerated_on_login_and_invalidated_on_logout(): void
    {
        $phone = '+639171000008';
        $this->insertUser($phone, status: 'active', verified: true);

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone);

        $verify = $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code]);
        $verify->assertOk();
        $this->assertAuthenticated();
        $sessionId = session()->getId();

        $this->post('/auth/logout')->assertRedirect(route('home'));
        $this->assertGuest();
        self::assertNotSame($sessionId, session()->getId());
    }

    private function insertUser(string $phone, string $status, bool $verified): string
    {
        $userId = (string) Str::uuid7();
        $correlationId = (string) Str::uuid7();
        $now = now();

        DB::table('users')->insert([
            'id' => $userId,
            'phone_e164' => $phone,
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
            'display_name' => 'Test User',
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

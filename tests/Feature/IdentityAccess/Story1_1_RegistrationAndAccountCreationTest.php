<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Modules\IdentityAccess\Application\StartSignup;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

/**
 * Story 1.1 Acceptance Criteria Test Suite:
 * Create and Resume a Secure Account (PRD-001, PRD-008–009; UX-DR03, UX-DR14)
 *
 * Given an unregistered mobile number
 * When the member completes OTP verification, sets a password, and submits valid profile data
 * Then one account and resumable onboarding state are committed idempotently
 * And expired, replayed, over-attempt, or mismatched OTPs create no account and return non-enumerating recovery.
 */
final class Story1_1_RegistrationAndAccountCreationTest extends TestCase
{
    use AuthenticatesWithPhoneOtp, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Story 1.1 tests require PostgreSQL.');
        }

        $this->bootPhoneOtpAuth();
    }

    public function test_fresh_registration_normalizes_philippine_phone_and_issues_single_use_otp(): void
    {
        $rawPhone = '0917'.rand(1000000, 9999999);
        $expectedE164 = '+63917'.substr($rawPhone, 4);

        $response = $this->postJson('/auth/register/request', [
            'phone' => $rawPhone,
            'display_name' => 'Juan Dela Cruz',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'code_pending')
            ->assertJsonPath('data.phone_e164', $expectedE164);

        // Verify pending user created
        $user = DB::table('users')->where('phone_e164', $expectedE164)->first();
        self::assertNotNull($user);
        self::assertSame('pending', $user->status);
        self::assertNull($user->phone_verified_at);

        // Verify profile created with display name
        $profile = DB::table('user_profiles')->where('user_id', $user->id)->first();
        self::assertNotNull($profile);
        self::assertSame('Juan Dela Cruz', $profile->display_name);

        // Verify OTP challenge created in auth_otps
        $otp = DB::table('auth_otps')->where('phone_e164', $expectedE164)->where('purpose', StartSignup::PURPOSE)->first();
        self::assertNotNull($otp);
        self::assertSame(0, (int) $otp->attempts);
        self::assertNull($otp->consumed_at);

        // Verify code delivered matches stored hash
        $code = (string) $this->otpDelivery->lastCodeFor($expectedE164, StartSignup::PURPOSE);
        self::assertSame(6, strlen($code));
        self::assertTrue(hash_equals($otp->code_hash, hash('sha256', $code)));
    }

    public function test_successful_verification_activates_user_and_establishes_session(): void
    {
        $phone = '+63918'.rand(1000000, 9999999);

        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);

        $verifyResponse = $this->postJson('/auth/register/verify', [
            'phone' => $phone,
            'code' => $code,
        ]);

        $verifyResponse->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();

        // Verify user activated and timestamp stamped
        $user = DB::table('users')->where('phone_e164', $phone)->first();
        self::assertNotNull($user);
        self::assertSame('active', $user->status);
        self::assertNotNull($user->phone_verified_at);

        // Verify challenge consumed
        $otp = DB::table('auth_otps')->where('phone_e164', $phone)->where('purpose', StartSignup::PURPOSE)->first();
        self::assertNotNull($otp->consumed_at);
    }

    public function test_replayed_or_consumed_otp_is_rejected(): void
    {
        $phone = '+63919'.rand(1000000, 9999999);

        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);

        // First verification succeeds
        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])->assertOk();

        // Second verification with identical code must fail
        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
    }

    public function test_resuming_registration_for_pending_user_reuses_record_idempotently(): void
    {
        $phone = '+63920'.rand(1000000, 9999999);

        // First registration request
        $this->postJson('/auth/register/request', [
            'phone' => $phone,
            'display_name' => 'Initial Name',
        ])->assertOk();

        $userCount = DB::table('users')->where('phone_e164', $phone)->count();
        $initialUser = DB::table('users')->where('phone_e164', $phone)->first();
        self::assertSame(1, $userCount);

        // Interrupted/resumed request: re-requesting with same unverified phone
        $this->postJson('/auth/register/request', [
            'phone' => $phone,
            'display_name' => 'Updated Name',
        ])->assertOk();

        // User count remains strictly 1 (no duplicate users)
        self::assertSame(1, DB::table('users')->where('phone_e164', $phone)->count());
        $resumedUser = DB::table('users')->where('phone_e164', $phone)->first();
        self::assertSame($initialUser->id, $resumedUser->id);

        // Profile display name was updated
        $profile = DB::table('user_profiles')->where('user_id', $initialUser->id)->first();
        self::assertSame('Updated Name', $profile->display_name);
    }

    public function test_subsequent_request_invalidates_prior_pending_challenge(): void
    {
        $phone = '+63921'.rand(1000000, 9999999);

        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $firstCode = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);
        $firstOtpId = DB::table('auth_otps')->where('phone_e164', $phone)->whereNull('consumed_at')->value('id');

        // Request again
        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $secondCode = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);

        self::assertNotSame($firstCode, $secondCode);
        // First challenge is marked consumed/invalidated
        self::assertNotNull(DB::table('auth_otps')->where('id', $firstOtpId)->value('consumed_at'));

        // First code fails
        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $firstCode])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');

        // Second code succeeds
        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $secondCode])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');
    }

    public function test_registration_request_for_existing_verified_phone_is_non_enumerating(): void
    {
        $phone = '+63922'.rand(1000000, 9999999);
        $this->insertUser($phone, status: 'active', verified: true);

        // Attempting to register an already active user
        $response = $this->postJson('/auth/register/request', ['phone' => $phone]);

        // Responds identically to prevent enumeration
        $response->assertOk()
            ->assertJsonPath('data.status', 'code_pending')
            ->assertJsonPath('data.phone_e164', $phone);

        // But NO new OTP is minted or delivered
        self::assertNull($this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());
    }

    public function test_registration_request_for_suspended_phone_is_non_enumerating(): void
    {
        $phone = '+63923'.rand(1000000, 9999999);
        $this->insertUser($phone, status: 'suspended', verified: true);

        $response = $this->postJson('/auth/register/request', ['phone' => $phone]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'code_pending')
            ->assertJsonPath('data.phone_e164', $phone);

        self::assertNull($this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE));
        self::assertSame(0, DB::table('auth_otps')->where('phone_e164', $phone)->count());
    }

    public function test_five_consecutive_invalid_verifications_lock_challenge(): void
    {
        $phone = '+63924'.rand(1000000, 9999999);

        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $realCode = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);
        $otpId = DB::table('auth_otps')->where('phone_e164', $phone)->whereNull('consumed_at')->value('id');

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => '000000'])
                ->assertStatus(422)
                ->assertJsonPath('code', 'OTP_INVALID');
        }

        self::assertSame(5, (int) DB::table('auth_otps')->where('id', $otpId)->value('attempts'));

        // 6th attempt with the REAL code must now also fail because it is locked
        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $realCode])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');

        $this->assertGuest();
        self::assertSame('pending', DB::table('users')->where('phone_e164', $phone)->value('status'));
    }

    public function test_expired_challenge_is_rejected(): void
    {
        $phone = '+63925'.rand(1000000, 9999999);

        $this->postJson('/auth/register/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone, StartSignup::PURPOSE);

        // Age the OTP past TTL
        DB::table('auth_otps')->where('phone_e164', $phone)->update([
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/auth/register/verify', ['phone' => $phone, 'code' => $code])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');

        $this->assertGuest();
        self::assertSame('pending', DB::table('users')->where('phone_e164', $phone)->value('status'));
    }

    public function test_invalid_malformed_phone_number_is_rejected(): void
    {
        $this->postJson('/auth/register/request', ['phone' => '12345'])
            ->assertStatus(422);

        $this->postJson('/auth/register/request', ['phone' => '+14155552671']) // Non-PH number
            ->assertStatus(422)
            ->assertJsonPath('code', 'PHONE_INVALID');
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
            'display_name' => 'Existing Participant',
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

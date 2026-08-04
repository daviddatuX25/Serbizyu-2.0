<?php

declare(strict_types=1);

namespace Tests\Feature\IdentityAccess;

use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class PhoneOtpAuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    private FakeOtpDelivery $otpDelivery;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Phone OTP authentication requires the PostgreSQL baseline.');
        }

        config()->set('serbizyu.providers.notifications.mode', 'fake');
        $this->otpDelivery = $this->app->make(FakeOtpDelivery::class);
        $this->otpDelivery->flush();
        $this->app->instance(FakeOtpDelivery::class, $this->otpDelivery);
        $this->app->instance(OtpDeliveryChannel::class, $this->otpDelivery);
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_new_phone_registration_requests_and_verifies_otp(): void
    {
        $phone = '+639171000001';

        $this->postJson('/auth/phone/request', ['phone' => $phone])
            ->assertOk()
            ->assertJsonPath('data.status', 'code_pending')
            ->assertJsonPath('data.phone_e164', $phone);

        $code = $this->otpDelivery->lastCodeFor($phone);
        self::assertNotNull($code);
        self::assertSame(6, strlen((string) $code));

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.status', 'authenticated');

        $this->assertAuthenticated();
        self::assertSame('active', DB::table('users')->where('phone_e164', $phone)->value('status'));
        self::assertNotNull(DB::table('users')->where('phone_e164', $phone)->value('phone_verified_at'));
        self::assertNotNull(DB::table('auth_otps')->where('phone_e164', $phone)->value('consumed_at'));
    }

    public function test_existing_phone_login_reuses_user_row(): void
    {
        $phone = '+639171000002';
        $userId = $this->insertUser($phone, status: 'active');

        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone);

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.user_id', $userId);

        self::assertSame(1, DB::table('users')->where('phone_e164', $phone)->count());
    }

    public function test_invalid_verification_increments_attempts_and_fifth_failure_locks(): void
    {
        $phone = '+639171000003';
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
        $phone = '+639171000004';
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

    public function test_consumed_otp_cannot_be_reused(): void
    {
        $phone = '+639171000005';
        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $code = (string) $this->otpDelivery->lastCodeFor($phone);

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])->assertOk();
        $this->post('/auth/logout')->assertRedirect();

        $this->postJson('/auth/phone/verify', ['phone' => $phone, 'code' => $code])
            ->assertStatus(422)
            ->assertJsonPath('code', 'OTP_INVALID');
        $this->assertGuest();
    }

    public function test_duplicate_request_invalidates_prior_pending_challenge(): void
    {
        $phone = '+639171000006';
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
        $this->insertUser($phone, status: 'suspended');

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

    public function test_fake_delivery_records_recipient_and_purpose(): void
    {
        $phone = '+639171000009';
        $this->postJson('/auth/phone/request', ['phone' => '09171000009'])->assertOk();

        $delivery = $this->otpDelivery->lastDelivery();
        self::assertNotNull($delivery);
        self::assertSame($phone, $delivery['phone_e164']);
        self::assertSame('login', $delivery['purpose']);
        self::assertSame(600, $delivery['expires_in_seconds']);
        self::assertMatchesRegularExpression('/^\d{6}$/', $delivery['code']);
    }

    public function test_auth_phone_page_does_not_expose_otp_or_demo_fixtures(): void
    {
        $response = $this->get('/auth/phone');
        $response->assertOk();
        $content = $response->getContent() ?: '';

        self::assertStringNotContainsString('DemoFixtures', $content);
        self::assertStringNotContainsString('fictional', strtolower($content));
        self::assertStringNotContainsString('challenge_code', $content);
    }

    private function insertUser(string $phone, string $status): string
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

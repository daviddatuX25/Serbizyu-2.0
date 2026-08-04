<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

/**
 * @mixin TestCase
 */
trait AuthenticatesWithPhoneOtp
{
    private FakeOtpDelivery $otpDelivery;

    protected function bootPhoneOtpAuth(): void
    {
        config()->set('serbizyu.providers.notifications.mode', 'fake');
        $this->otpDelivery = $this->app->make(FakeOtpDelivery::class);
        $this->otpDelivery->flush();
        $this->app->instance(FakeOtpDelivery::class, $this->otpDelivery);
        $this->app->instance(OtpDeliveryChannel::class, $this->otpDelivery);
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    protected function authenticateWithPhone(string $phone): string
    {
        $this->postJson('/auth/phone/request', ['phone' => $phone])->assertOk();
        $code = $this->otpDelivery->lastCodeFor($this->normalizePhone($phone));
        self::assertNotNull($code);

        $this->postJson('/auth/phone/verify', [
            'phone' => $phone,
            'code' => $code,
        ])->assertOk();

        $userId = (string) auth()->id();
        self::assertNotSame('', $userId);

        return $userId;
    }

    protected function authenticateProvider(): string
    {
        return $this->authenticateWithPhone('+639171111001');
    }

    protected function authenticateBuyer(): string
    {
        return $this->authenticateWithPhone('+639172222001');
    }

    protected function logoutAuthenticatedUser(): void
    {
        $this->post('/auth/logout')->assertRedirect();
        $this->assertGuest();
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s().-]+/', '', trim($phone)) ?? '';
        if (preg_match('/^09\d{9}$/', $phone) === 1) {
            return '+63'.substr($phone, 1);
        }

        return $phone;
    }
}

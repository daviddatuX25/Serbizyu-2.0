<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\User;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * @mixin TestCase
 */
trait AuthenticatesWithPhoneOtp
{
    protected FakeOtpDelivery $otpDelivery;

    protected function bootPhoneOtpAuth(): void
    {
        config()->set('serbizyu.providers.notifications.mode', 'fake');
        $this->otpDelivery = $this->app->make(FakeOtpDelivery::class);
        $this->otpDelivery->flush();
        $this->app->instance(FakeOtpDelivery::class, $this->otpDelivery);
        $this->app->instance(OtpDeliveryChannel::class, $this->otpDelivery);
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    /**
     * Deterministic authenticated setup: a phone-verified active user via the
     * native factory (reused if the same phone is authenticated again within a
     * test). The SMS/register HTTP journeys have their own suites.
     */
    protected function authenticateWithPhone(string $phone): string
    {
        $phone = $this->normalizePhone($phone);
        $user = User::query()->where('phone_e164', $phone)->first()
            ?? User::factory()->create([
                'phone_e164' => $phone,
                'status' => 'active',
                'phone_verified_at' => now(),
            ]);
        $this->actingAs($user);

        return (string) $user->id;
    }

    protected function authenticateProvider(): string
    {
        $userId = $this->authenticateWithPhone('+639171111001');

        $user = User::query()->find($userId);
        if ($user !== null && ! filled($user->password)) {
            $user->forceFill(['password' => Hash::make('Password123!')])->save();
        }

        $now = now();
        DB::table('role_assignments')->updateOrInsert(
            ['user_id' => $userId, 'role_code' => 'provide', 'status' => 'active'],
            [
                'id' => (string) Str::uuid7(),
                'granted_by_user_id' => $userId,
                'effective_at' => $now,
                'scope' => '{}',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        return $userId;
    }

    protected function authenticateBuyer(): string
    {
        $userId = $this->authenticateWithPhone('+639172222001');

        $user = User::query()->find($userId);
        if ($user !== null && ! filled($user->password)) {
            $user->forceFill(['password' => Hash::make('Password123!')])->save();
        }

        $now = now();
        DB::table('role_assignments')->updateOrInsert(
            ['user_id' => $userId, 'role_code' => 'buy', 'status' => 'active'],
            [
                'id' => (string) Str::uuid7(),
                'granted_by_user_id' => $userId,
                'effective_at' => $now,
                'scope' => '{}',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        return $userId;
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

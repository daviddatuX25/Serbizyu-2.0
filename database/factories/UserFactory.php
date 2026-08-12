<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
final class UserFactory extends Factory
{
    protected $model = User::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $suffix = fake()->unique()->numerify('#######');

        return [
            'id' => (string) Str::uuid7(),
            'phone_e164' => '+63917'.$suffix,
            'status' => 'active',
            'primary_access_tier' => 'L1',
            'locale' => 'en',
            'timezone' => 'Asia/Manila',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'phone_verified_at' => now(),
            'last_login_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (User $user): void {
            if (DB::table('user_profiles')->where('user_id', $user->id)->exists()) {
                return;
            }

            DB::table('user_profiles')->insert([
                'user_id' => $user->id,
                'display_name' => 'Factory '.substr((string) $user->phone_e164, -4),
                'public_bio' => null,
                'avatar_file_id' => null,
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode([], JSON_THROW_ON_ERROR),
                'language_preferences' => json_encode(['primary' => 'en'], JSON_THROW_ON_ERROR),
                'emergency_contact_policy' => null,
                'version' => 1,
                'correlation_id' => (string) $user->correlation_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function pending(): static
    {
        return $this->state(fn (): array => [
            'status' => 'pending',
            'primary_access_tier' => 'L0',
            'phone_verified_at' => null,
            'last_login_at' => null,
        ]);
    }

    public function withEmailPassword(string $email = 'neighbor@example.test', string $password = 'Password1!'): static
    {
        return $this->state(fn (): array => [
            'email' => strtolower($email),
            'email_verified_at' => now(),
            'password' => $password,
        ]);
    }
}

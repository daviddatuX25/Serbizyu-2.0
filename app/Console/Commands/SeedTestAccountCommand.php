<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class SeedTestAccountCommand extends Command
{
    protected $signature = 'serbizyu:seed-test-account
                            {--password=password : Password to set for test accounts}';

    protected $description = 'Seed deterministic citizen and provider test accounts for local/UAT login testing';

    public function handle(): int
    {
        $password = (string) $this->option('password');
        $hashedPassword = Hash::make($password);
        $now = now();

        $accounts = [
            [
                'phone' => '+639171234567',
                'display_phone' => '09171234567',
                'email' => 'juan@tagudin.ph',
                'name' => 'Juan Dela Cruz',
                'role' => 'buyer',
                'bio' => 'Citizen resident in Tagudin looking for local services.',
            ],
            [
                'phone' => '+639178881234',
                'display_phone' => '09178881234',
                'email' => 'rosa@tagudin.ph',
                'name' => 'Rosa Tagudin',
                'role' => 'provide',
                'bio' => 'Verified home repair and tailoring provider in Poblacion, Tagudin.',
            ],
        ];

        foreach ($accounts as $acc) {
            $user = User::where('phone_e164', $acc['phone'])->first();
            if ($user === null) {
                $userId = (string) Str::uuid7();
                DB::table('users')->insert([
                    'id' => $userId,
                    'phone_e164' => $acc['phone'],
                    'email' => $acc['email'],
                    'password' => $hashedPassword,
                    'status' => 'active',
                    'primary_access_tier' => 'L1',
                    'locale' => 'fil',
                    'timezone' => 'Asia/Manila',
                    'phone_verified_at' => $now,
                    'email_verified_at' => $now,
                    'version' => 1,
                    'correlation_id' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                $userId = (string) $user->id;
                DB::table('users')->where('id', $userId)->update([
                    'email' => $acc['email'],
                    'password' => $hashedPassword,
                    'status' => 'active',
                    'phone_verified_at' => $user->phone_verified_at ?? $now,
                    'email_verified_at' => $user->email_verified_at ?? $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('user_profiles')->upsert([
                'user_id' => $userId,
                'display_name' => $acc['name'],
                'public_bio' => $acc['bio'],
                'service_area_display' => 'Tagudin',
                'accessibility_preferences' => json_encode(['low_data_mode' => false, 'help_preference' => 'self_managed'], JSON_THROW_ON_ERROR),
                'language_preferences' => json_encode(['primary' => 'fil'], JSON_THROW_ON_ERROR),
                'version' => 1,
                'correlation_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ], ['user_id'], ['display_name', 'public_bio', 'service_area_display', 'updated_at']);

            if ($acc['role'] === 'provide') {
                $hasRole = DB::table('role_assignments')
                    ->where('user_id', $userId)
                    ->where('role_code', 'provide')
                    ->exists();

                if (! $hasRole) {
                    DB::table('role_assignments')->insert([
                        'id' => (string) Str::uuid7(),
                        'user_id' => $userId,
                        'role_code' => 'provide',
                        'status' => 'active',
                        'granted_by_user_id' => $userId,
                        'effective_at' => $now,
                        'scope' => json_encode(['area' => 'Tagudin'], JSON_THROW_ON_ERROR),
                        'version' => 1,
                        'correlation_id' => $userId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        $this->info('✓ Serbizyu test accounts seeded successfully!');
        $this->table(
            ['Role', 'Display Name', 'Mobile (09XX / +63)', 'Email', 'Password'],
            [
                ['Citizen Buyer', 'Juan Dela Cruz', '09171234567 (+639171234567)', 'juan@tagudin.ph', $password],
                ['Service Provider', 'Rosa Tagudin', '09178881234 (+639178881234)', 'rosa@tagudin.ph', $password],
            ]
        );

        $this->comment('Ready for testing at: /auth/sign-in');

        return self::SUCCESS;
    }
}

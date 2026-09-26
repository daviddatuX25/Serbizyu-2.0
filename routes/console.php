<?php

use App\Models\User;
use App\Modules\Listings\Application\SeedTagudinBrowseCatalog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('serbizyu:seed-test-account {--password=password : Password to set for test accounts}', function () {
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

    return 0;
})->purpose('Seed deterministic citizen and provider test accounts for local/UAT login testing');
Artisan::command('serbizyu:seed-tagudin-browse', function () {
    $result = app(SeedTagudinBrowseCatalog::class)->handle();
    $this->info("✓ Seeded {$result['seeded']} Tagudin browse catalog listings successfully!");
})->purpose('Seed rich Tagudin service and product listings for the Browse marketplace');
Artisan::command('serbizyu:seed-tagudin-requests', function () {
    $now = now();
    $juan = User::where('phone_e164', '+639171234567')->first();
    $rosa = User::where('phone_e164', '+639178881234')->first();

    if ($juan === null || $rosa === null) {
        $this->error('Run serbizyu:seed-test-account first.');
        return 1;
    }

    $category = DB::table('categories')->first();
    $categoryId = $category?->id ?? (string) Str::uuid7();

    $requestsData = [
        [
            'id' => '0198a3b1-7c40-7abc-8def-6234567890a1',
            'title' => 'Kitchen Sub-Breaker Tripping & Load Diagnostic',
            'description' => 'Kitchen sub-breaker trips when refrigerator compressor and rice cooker operate simultaneously. Sub-panel is accessible in utility room. Need diagnostic and replacement 20A single-pole DIN-rail breaker.',
            'budget_minor' => 40000,
            'urgency' => 'today',
            'photo' => '/photos/req-electrician.jpg',
            'area' => 'Barangay Centro, Tagudin',
            'scope' => 'Circuit Breaker Diagnostic · 20A Single-Pole Breaker',
        ],
        [
            'id' => '0198a3b1-7c40-7abc-8def-6234567890a2',
            'title' => 'Bathroom Water Pipe Joint Leak Repair',
            'description' => 'PVC pipe connection below the sink is leaking water continuously. Need replacement fitting and teflon sealing before water damage occurs.',
            'budget_minor' => 35000,
            'urgency' => 'today',
            'photo' => '/photos/ac-clean.jpg',
            'area' => 'Barangay Quirino, Tagudin',
            'scope' => 'Pipe Fitting Replacement · Leak Test',
        ],
        [
            'id' => '0198a3b1-7c40-7abc-8def-6234567890a3',
            'title' => 'Wooden Dining Chair Leg Reinforcement',
            'description' => 'Two narra dining chairs have loose joint mortises and wobble under weight. Need dowel reinforcement and wood glue clamping.',
            'budget_minor' => 25000,
            'urgency' => 'this_week',
            'photo' => '/photos/greeting.jpg',
            'area' => 'Barangay Poblacion, Tagudin',
            'scope' => 'Wood Joint Repair · Two Chairs',
        ],
        [
            'id' => '0198a3b1-7c40-7abc-8def-6234567890a4',
            'title' => 'Urgent Document Courier to Municipal Hall',
            'description' => 'Need same-day motorcycle pickup of legal barangay documents from Centro and delivery to Tagudin Municipal Hall before 4 PM.',
            'budget_minor' => 15000,
            'urgency' => 'today',
            'photo' => '/photos/courier.jpg',
            'area' => 'Barangay Centro, Tagudin',
            'scope' => 'Same-Day Dispatch · Direct Handoff',
        ],
    ];

    foreach ($requestsData as $r) {
        DB::table('requests')->updateOrInsert(
            ['id' => $r['id']],
            [
                'requester_user_id' => $juan->id,
                'listing_id' => null,
                'category_id' => $categoryId,
                'capability_profile_id' => null,
                'description' => $r['description'],
                'item_list' => json_encode([
                    'title' => $r['title'],
                    'photo' => $r['photo'],
                    'task_scope' => $r['scope'],
                    'preferred_fulfillment' => 'direct',
                ], JSON_THROW_ON_ERROR),
                'budget_amount_minor' => $r['budget_minor'],
                'budget_currency' => 'PHP',
                'timing' => json_encode([
                    'urgency' => $r['urgency'],
                    'scheduled_for' => null,
                ], JSON_THROW_ON_ERROR),
                'location' => json_encode(['area_code' => $r['area']], JSON_THROW_ON_ERROR),
                'status' => 'published',
                'expires_at' => now()->addDays(7),
                'privacy_preferences' => json_encode(['hide_exact_address' => true], JSON_THROW_ON_ERROR),
                'safety_preferences' => json_encode(['verified_providers_only' => true], JSON_THROW_ON_ERROR),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    // Seed realistic quotes on Request 1 from Rosa (Service Provider)
    DB::table('quotes')->updateOrInsert(
        ['id' => '0198a3b1-7c40-7abc-8def-6234567890b1'],
        [
            'request_id' => '0198a3b1-7c40-7abc-8def-6234567890a1',
            'listing_id' => null,
            'provider_user_id' => $rosa->id,
            'quote_version' => 1,
            'amount_minor' => 38000,
            'currency' => 'PHP',
            'amount_components' => json_encode(['labor' => 30000, 'parts' => 8000], JSON_THROW_ON_ERROR),
            'scope' => json_encode([
                'proposal' => 'Can inspect electrical panel today at 2:00 PM. Includes 20A DIN breaker and full load test.',
                'estimated_duration' => '1.5 hours',
            ], JSON_THROW_ON_ERROR),
            'inclusions' => json_encode(['20A DIN-rail circuit breaker', 'Panel load testing', 'Clean utility area'], JSON_THROW_ON_ERROR),
            'exclusions' => json_encode(['Main service drop replacement'], JSON_THROW_ON_ERROR),
            'expires_at' => now()->addDays(2),
            'work_shape' => 'A1',
            'payment_lane_options' => json_encode(['cash', 'digital'], JSON_THROW_ON_ERROR),
            'status' => 'submitted',
            'deal_chain_id' => null,
            'deal_need_id' => null,
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    $this->info('✓ Seeded 4 Tagudin community requests and active quotes successfully!');
    return 0;
})->purpose('Seed rich Tagudin citizen requests and bidding quotes for QA testing');

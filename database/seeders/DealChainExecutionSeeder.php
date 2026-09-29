<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class DealChainExecutionSeeder extends Seeder
{
    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        $correlationId = '0198a3b1-7c40-7abc-8def-c01100000001';

        // 1. Personas / Users
        $users = [
            [
                'id' => Fix::BUYER_USER_ID,
                'phone_e164' => Fix::BUYER_PHONE,
                'name' => 'Maria Demo Resident',
                'bio' => 'Resident and community buyer in Barangay Centro, Tagudin.',
                'roles' => ['buy'],
            ],
            [
                'id' => Fix::STORE_USER_ID,
                'phone_e164' => Fix::STORE_PHONE,
                'name' => 'Tagudin Hardware Supply',
                'bio' => 'Certified local hardware and replacement parts merchant.',
                'roles' => ['provide', 'merchant'],
            ],
            [
                'id' => Fix::COURIER_USER_ID,
                'phone_e164' => Fix::COURIER_PHONE,
                'name' => 'Danny Express Motorcycle Pool',
                'bio' => 'Verified on-demand motorcycle delivery runner pool.',
                'roles' => ['provide'],
            ],
            [
                'id' => Fix::TECH_USER_ID,
                'phone_e164' => Fix::TECH_PHONE,
                'name' => 'Kuya Ben Aircon Services',
                'bio' => 'Licensed master trade technician and AC refrigeration specialist.',
                'roles' => ['provide'],
            ],
        ];

        $userMap = [];
        foreach ($users as $u) {
            $existing = DB::table('users')->where('phone_e164', $u['phone_e164'])->first();
            $userId = $existing ? (string) $existing->id : $u['id'];
            $userMap[$u['phone_e164']] = $userId;

            DB::table('users')->updateOrInsert(
                ['id' => $userId],
                [
                    'phone_e164' => $u['phone_e164'],
                    'password' => Hash::make('Password123!'),
                    'status' => 'active',
                    'primary_access_tier' => 'L1',
                    'locale' => 'fil',
                    'timezone' => 'Asia/Manila',
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'phone_verified_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            DB::table('user_profiles')->updateOrInsert(
                ['user_id' => $userId],
                [
                    'display_name' => $u['name'],
                    'public_bio' => $u['bio'],
                    'service_area_display' => 'Tagudin Centro',
                    'accessibility_preferences' => json_encode(['low_data_mode' => false], JSON_THROW_ON_ERROR),
                    'language_preferences' => json_encode(['primary' => 'fil'], JSON_THROW_ON_ERROR),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            foreach ($u['roles'] as $roleCode) {
                DB::table('role_assignments')->updateOrInsert(
                    ['user_id' => $userId, 'role_code' => $roleCode],
                    [
                        'id' => (string) Str::uuid7(),
                        'granted_by_user_id' => $userId,
                        'status' => 'active',
                        'effective_at' => $now,
                        'scope' => '{}',
                        'version' => 1,
                        'correlation_id' => $correlationId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }
        }

        $buyerId = $userMap[Fix::BUYER_PHONE];
        $storeId = $userMap[Fix::STORE_PHONE];
        $courierId = $userMap[Fix::COURIER_PHONE];
        $techId = $userMap[Fix::TECH_PHONE];

        // 2. Active Ongoing Coordinated Deal Chain (#DC-892)
        DB::table('deal_chains')->updateOrInsert(
            ['id' => Fix::CHAIN_ID_ONGOING],
            [
                'coordinator_user_id' => $buyerId,
                'status' => 'in_progress',
                'title' => 'Fiesta AC Overhaul & Clean · Deal Chain #DC-892',
                'goal' => 'Turnkey replacement part sourcing, courier delivery, and on-site cleaning labor',
                'payload_version' => 1,
                'version' => 2,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now,
            ]
        );

        // 3. Deal Needs
        $needs = [
            [
                'id' => Fix::NEED_ID_PART,
                'ordinal' => 1,
                'need_kind' => 'product',
                'title' => '35uF AC Run Capacitor',
                'description' => 'Genuine replacement capacitor from Tagudin Hardware counter',
                'status' => 'completed',
            ],
            [
                'id' => Fix::NEED_ID_TRANSIT,
                'ordinal' => 2,
                'need_kind' => 'service',
                'title' => 'Parts Transit to Site',
                'description' => 'Motorcycle courier delivery straight to customer doorstep',
                'status' => 'in_progress',
            ],
            [
                'id' => Fix::NEED_ID_LABOR,
                'ordinal' => 3,
                'need_kind' => 'service',
                'title' => 'Inverter Split AC Deep Clean & Checkup',
                'description' => 'Licensed master technician installation labor',
                'status' => 'invited',
            ],
        ];

        foreach ($needs as $n) {
            DB::table('deal_needs')->updateOrInsert(
                ['id' => $n['id']],
                [
                    'deal_chain_id' => Fix::CHAIN_ID_ONGOING,
                    'ordinal' => $n['ordinal'],
                    'need_kind' => $n['need_kind'],
                    'title' => $n['title'],
                    'description' => $n['description'],
                    'status' => $n['status'],
                    'requested_at' => $now->subHours(2),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now->subHours(2),
                    'updated_at' => $now,
                ]
            );
        }

        // 4. Dependencies
        DB::table('deal_dependencies')->updateOrInsert(
            ['deal_chain_id' => Fix::CHAIN_ID_ONGOING, 'predecessor_need_id' => Fix::NEED_ID_PART, 'successor_need_id' => Fix::NEED_ID_TRANSIT],
            [
                'id' => '0198a3b1-7c40-7abc-8def-deb000000001',
                'dependency_type' => 'blocks',
                'status' => 'active',
                'condition_code' => 'part_ready',
                'created_by_user_id' => $buyerId,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now,
            ]
        );
        DB::table('deal_dependencies')->updateOrInsert(
            ['deal_chain_id' => Fix::CHAIN_ID_ONGOING, 'predecessor_need_id' => Fix::NEED_ID_TRANSIT, 'successor_need_id' => Fix::NEED_ID_LABOR],
            [
                'id' => '0198a3b1-7c40-7abc-8def-deb000000002',
                'dependency_type' => 'blocks',
                'status' => 'active',
                'condition_code' => 'delivery_signed',
                'created_by_user_id' => $buyerId,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now,
            ]
        );

        // 5. Invitations
        DB::table('deal_invitations')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-111100000001'],
            [
                'deal_need_id' => Fix::NEED_ID_PART,
                'invited_provider_user_id' => $storeId,
                'invited_by_user_id' => $buyerId,
                'purpose' => 'deal_need_assignment',
                'scope' => json_encode(['listing_id' => Fix::LISTING_AC_CAPACITOR, 'price_minor' => 18000], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'status' => 'accepted',
                'expires_at' => $now->addDays(2),
                'responded_at' => $now->subHours(1),
                'version' => 2,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(1),
            ]
        );
        DB::table('deal_invitations')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-111100000002'],
            [
                'deal_need_id' => Fix::NEED_ID_TRANSIT,
                'invited_provider_user_id' => $courierId,
                'invited_by_user_id' => $buyerId,
                'purpose' => 'deal_need_assignment',
                'scope' => json_encode(['listing_id' => Fix::LISTING_COURIER, 'price_minor' => 3500], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'status' => 'accepted',
                'expires_at' => $now->addDays(2),
                'responded_at' => $now->subMinutes(45),
                'version' => 2,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subMinutes(45),
            ]
        );
        DB::table('deal_invitations')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-111100000003'],
            [
                'deal_need_id' => Fix::NEED_ID_LABOR,
                'invited_provider_user_id' => $techId,
                'invited_by_user_id' => $buyerId,
                'purpose' => 'deal_need_assignment',
                'scope' => json_encode(['listing_id' => Fix::LISTING_AC_CLEAN, 'price_minor' => 45000], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'status' => 'sent',
                'expires_at' => $now->addDays(2),
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ]
        );

        // 6. Child Orders (for Formed Needs)
        // Child Order 1: Store Part (Completed)
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_PART,
            origin: 'deal_chain',
            dealChainId: Fix::CHAIN_ID_ONGOING,
            dealNeedId: Fix::NEED_ID_PART,
            buyerId: $buyerId,
            providerId: $storeId,
            listingId: Fix::LISTING_AC_CAPACITOR,
            title: '35uF AC Run Capacitor',
            amountMinor: 18000,
            status: 'accepted',
            workStatus: 'completed',
            workShape: 'A4',
            now: $now->subHours(1),
            correlationId: $correlationId,
        );

        // Child Order 2: Courier Transit (In Transit)
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_TRANSIT,
            origin: 'deal_chain',
            dealChainId: Fix::CHAIN_ID_ONGOING,
            dealNeedId: Fix::NEED_ID_TRANSIT,
            buyerId: $buyerId,
            providerId: $courierId,
            listingId: Fix::LISTING_COURIER,
            title: 'Parts Transit to Site',
            amountMinor: 3500,
            status: 'accepted',
            workStatus: 'in_progress',
            workShape: 'A2',
            now: $now->subMinutes(30),
            correlationId: $correlationId,
        );

        // 7. Standalone Ongoing Orders
        // Standalone Direct Order 1: Pending Acceptance
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_PENDING_DIRECT,
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $buyerId,
            providerId: $courierId,
            listingId: Fix::LISTING_COURIER,
            title: 'Tagudin Express Motorcycle Delivery',
            amountMinor: 4500,
            status: 'pending_acceptance',
            workStatus: null,
            workShape: null,
            now: $now->subMinutes(15),
            correlationId: $correlationId,
        );

        // Standalone Direct Order 2: Awaiting Signoff
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_AWAITING_SIGNOFF,
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $buyerId,
            providerId: $storeId,
            listingId: Fix::LISTING_BIBINGKA,
            title: 'Weekend bibingka tray (Box of 6)',
            amountMinor: 16000,
            status: 'accepted',
            workStatus: 'awaiting_signoff',
            workShape: 'A4',
            now: $now->subHours(3),
            correlationId: $correlationId,
        );

        // 8. Historical Completed Orders
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_HIST_1,
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $buyerId,
            providerId: $courierId,
            listingId: Fix::LISTING_COURIER,
            title: 'Tricycle Poblacion Route',
            amountMinor: 4500,
            status: 'closed',
            workStatus: 'completed',
            workShape: 'A2',
            now: $now->subDays(7),
            correlationId: $correlationId,
        );

        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_HIST_2,
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $buyerId,
            providerId: $storeId,
            listingId: Fix::LISTING_BIBINGKA,
            title: 'Fresh Tagudin Bibingka (2 Packs)',
            amountMinor: 16000,
            status: 'closed',
            workStatus: 'completed',
            workShape: 'A4',
            now: $now->subDays(10),
            correlationId: $correlationId,
        );

        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_HIST_3,
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $buyerId,
            providerId: $techId,
            listingId: Fix::LISTING_SUB_BREAKER,
            title: 'Emergency Sub-Breaker Replacement',
            amountMinor: 22000,
            status: 'closed',
            workStatus: 'completed',
            workShape: 'A1',
            now: $now->subDays(24),
            correlationId: $correlationId,
        );
    }

    private function seedOrderWithTerms(
        string $orderId,
        string $origin,
        ?string $dealChainId,
        ?string $dealNeedId,
        string $buyerId,
        string $providerId,
        string $listingId,
        string $title,
        int $amountMinor,
        string $status,
        ?string $workStatus,
        ?string $workShape,
        CarbonImmutable $now,
        string $correlationId,
    ): void {
        DB::table('orders')->updateOrInsert(
            ['id' => $orderId],
            [
                'origin' => $origin,
                'mechanism' => 'direct_booking',
                'listing_id' => $listingId,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => $buyerId,
                'provider_user_id' => $providerId,
                'status' => $status,
                'geography' => 'Tagudin Centro',
                'deal_chain_id' => $dealChainId,
                'deal_need_id' => $dealNeedId,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('order_parties')->updateOrInsert(
            ['order_id' => $orderId, 'user_id' => $buyerId, 'party_type' => 'buyer'],
            [
                'id' => (string) Str::uuid7(),
                'responsibility' => 'primary',
                'scope' => json_encode(['role' => 'buyer'], JSON_THROW_ON_ERROR),
                'status' => 'active',
                'effective_at' => $now,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('order_parties')->updateOrInsert(
            ['order_id' => $orderId, 'user_id' => $providerId, 'party_type' => 'provider'],
            [
                'id' => (string) Str::uuid7(),
                'responsibility' => 'primary',
                'scope' => json_encode(['role' => 'provider'], JSON_THROW_ON_ERROR),
                'status' => 'active',
                'effective_at' => $now,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        if ($status !== 'pending_acceptance') {
            $listingVersion = DB::table('listing_versions')->where('listing_id', $listingId)->orderByDesc('version_number')->first();
            $versionId = $listingVersion ? (string) $listingVersion->id : null;

            DB::table('order_terms_snapshots')->updateOrInsert(
                ['order_id' => $orderId, 'snapshot_version' => 1],
                [
                    'id' => (string) Str::uuid7(),
                    'source_listing_version_id' => $versionId,
                    'scope' => json_encode(['title' => $title], JSON_THROW_ON_ERROR),
                    'scope_payload_version' => 1,
                    'amount_minor' => $amountMinor,
                    'currency' => 'PHP',
                    'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                    'payment_lane_options_payload_version' => 1,
                    'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                    'cancellation_rules_payload_version' => 1,
                    'review_rules' => json_encode(['review_window_days' => 14], JSON_THROW_ON_ERROR),
                    'review_rules_payload_version' => 1,
                    'policy_version_id' => null,
                    'accepted_by_user_id' => $buyerId,
                    'accepted_at' => $now,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                ]
            );

            $workId = (string) Str::uuid7();
            if ($workShape !== null) {
                DB::table('work_instances')->updateOrInsert(
                    ['order_id' => $orderId],
                    [
                        'id' => $workId,
                        'work_shape' => $workShape,
                        'shape_contract_version' => 1,
                        'payload_schema_version' => 1,
                        'row_version' => 1,
                        'status' => $workStatus ?? 'not_started',
                        'scheduled_at' => null,
                        'started_at' => $workStatus !== 'not_started' ? $now : null,
                        'completion_proposed_at' => $workStatus === 'awaiting_signoff' ? $now : null,
                        'completed_at' => $workStatus === 'completed' ? $now : null,
                        'structure' => json_encode(['stages' => []], JSON_THROW_ON_ERROR),
                        'structure_payload_version' => 1,
                        'correlation_id' => $correlationId,
                        'version' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }

            DB::table('payment_obligations')->updateOrInsert(
                ['order_id' => $orderId],
                [
                    'id' => (string) Str::uuid7(),
                    'work_instance_id' => $workId,
                    'purpose' => 'primary_consideration',
                    'amount_minor' => $amountMinor,
                    'currency' => 'PHP',
                    'payer_user_id' => $buyerId,
                    'recipient_user_id' => $providerId,
                    'lane' => 'external_cash',
                    'status' => $status === 'closed' ? 'paid_out' : 'created',
                    'due_condition' => 'on_acceptance',
                    'policy_version_id' => null,
                    'platform_fee_amount_minor' => 0,
                    'processor_cost_amount_minor' => 0,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}

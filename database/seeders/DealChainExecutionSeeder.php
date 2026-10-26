<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\OrdersWork\Application\WorkContractDefinition;
use App\Modules\OrdersWork\Application\WorkContractRegistry;
use App\Modules\OrdersWork\Application\WorkContractSelector;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

final class DealChainExecutionSeeder extends Seeder
{
    private WorkExecutionService $workExecution;

    private WorkContractRegistry $workRegistry;

    public function run(WorkExecutionService $workExecution, WorkContractRegistry $workRegistry): void
    {
        $this->workExecution = $workExecution;
        $this->workRegistry = $workRegistry;
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
                $existingRole = DB::table('role_assignments')
                    ->where('user_id', $userId)
                    ->where('role_code', $roleCode)
                    ->first();
                if ($existingRole === null) {
                    DB::table('role_assignments')->insert([
                        'id' => (string) Str::uuid7(),
                        'user_id' => $userId,
                        'role_code' => $roleCode,
                        'granted_by_user_id' => $userId,
                        'status' => 'active',
                        'effective_at' => $now,
                        'scope' => '{}',
                        'version' => 1,
                        'correlation_id' => $correlationId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        $buyerId = $userMap[Fix::BUYER_PHONE];
        $storeId = $userMap[Fix::STORE_PHONE];
        $courierId = $userMap[Fix::COURIER_PHONE];
        $techId = $userMap[Fix::TECH_PHONE];

        // Ensure Kuya Ben owns the AC service listings so /my-listings displays his active offerings
        DB::table('listings')->whereIn('id', [
            Fix::LISTING_AC_CLEAN,
            Fix::LISTING_AC_CAPACITOR_INSTALLATION,
            Fix::LISTING_AC_SAFETY_AUDIT,
        ])->update(['owner_user_id' => $techId]);

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
                    'node_key' => match ($n['ordinal']) {
                        1 => 'part', 2 => 'courier', default => 'labor'
                    },
                    'node_role' => match ($n['ordinal']) {
                        1 => 'store', 2 => 'courier', default => 'labor'
                    },
                    'recipe_code' => 'turnkey_parts',
                    'recipe_version' => 1,
                    'source_listing_id' => Fix::LISTING_AC_CLEAN,
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
            workShape: 'A1',
            now: $now->subMinutes(30),
            correlationId: $correlationId,
        );

        // Child Order 3: Technician Labor (Kuya Ben, Gated by Transit in #DC-892)
        $this->seedOrderWithTerms(
            orderId: Fix::ORDER_ID_LABOR,
            origin: 'deal_chain',
            dealChainId: Fix::CHAIN_ID_ONGOING,
            dealNeedId: Fix::NEED_ID_LABOR,
            buyerId: $buyerId,
            providerId: $techId,
            listingId: Fix::LISTING_AC_CLEAN,
            title: 'Inverter Split AC Deep Clean & Checkup',
            amountMinor: 45000,
            status: 'accepted',
            workStatus: 'in_progress',
            workShape: 'A3',
            now: $now->subMinutes(25),
            correlationId: $correlationId,
        );

        // Coordinated Deal Chain for Tech Persona (#DC-414: Workshop Solar Inverter Setup)
        DB::table('deal_chains')->updateOrInsert(
            ['id' => Fix::CHAIN_ID_TECH_DEMO],
            [
                'coordinator_user_id' => $techId,
                'status' => 'in_progress',
                'title' => 'Workshop Solar Inverter Setup · Deal Chain #DC-414',
                'goal' => 'Component procurement, logistics, and technical grid-tie integration',
                'payload_version' => 1,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(3),
                'updated_at' => $now,
            ]
        );

        $techChainNeeds = [
            [
                'id' => '0198a3b1-7c40-7abc-8def-4eed00000001',
                'ordinal' => 1,
                'need_kind' => 'product',
                'title' => 'Solar Hybrid Inverter 3.5kVA',
                'description' => 'Tested hardware from Tagudin Depot',
                'status' => 'completed',
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-4eed00000002',
                'ordinal' => 2,
                'need_kind' => 'service',
                'title' => 'Flatbed Heavy Transit to Workshop',
                'description' => 'Motorcycle or Multicab delivery to Barangay Centro',
                'status' => 'in_progress',
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-4eed00000003',
                'ordinal' => 3,
                'need_kind' => 'service',
                'title' => 'Grid-Tie Breaker & Earthing Labor',
                'description' => 'Licensed master trade installation labor',
                'status' => 'invited',
            ],
        ];

        foreach ($techChainNeeds as $tn) {
            DB::table('deal_needs')->updateOrInsert(
                ['id' => $tn['id']],
                [
                    'deal_chain_id' => Fix::CHAIN_ID_TECH_DEMO,
                    'ordinal' => $tn['ordinal'],
                    'node_key' => match ($tn['ordinal']) {
                        1 => 'primary', 2 => 'courier', default => 'installation'
                    },
                    'node_role' => match ($tn['ordinal']) {
                        1 => 'store', 2 => 'courier', default => 'labor'
                    },
                    'recipe_code' => 'product_install',
                    'recipe_version' => 1,
                    'source_listing_id' => Fix::LISTING_AC_CAPACITOR_INSTALLATION,
                    'need_kind' => $tn['need_kind'],
                    'title' => $tn['title'],
                    'description' => $tn['description'],
                    'status' => $tn['status'],
                    'requested_at' => $now->subHours(3),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now->subHours(3),
                    'updated_at' => $now,
                ]
            );
        }

        DB::table('deal_dependencies')->updateOrInsert(
            ['deal_chain_id' => Fix::CHAIN_ID_TECH_DEMO, 'predecessor_need_id' => '0198a3b1-7c40-7abc-8def-4eed00000001', 'successor_need_id' => '0198a3b1-7c40-7abc-8def-4eed00000002'],
            [
                'id' => '0198a3b1-7c40-7abc-8def-4deb00000001',
                'dependency_type' => 'blocks',
                'status' => 'active',
                'condition_code' => 'part_ready',
                'created_by_user_id' => $techId,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(3),
                'updated_at' => $now,
            ]
        );
        DB::table('deal_dependencies')->updateOrInsert(
            ['deal_chain_id' => Fix::CHAIN_ID_TECH_DEMO, 'predecessor_need_id' => '0198a3b1-7c40-7abc-8def-4eed00000002', 'successor_need_id' => '0198a3b1-7c40-7abc-8def-4eed00000003'],
            [
                'id' => '0198a3b1-7c40-7abc-8def-4deb00000002',
                'dependency_type' => 'blocks',
                'status' => 'active',
                'condition_code' => 'delivery_signed',
                'created_by_user_id' => $techId,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now->subHours(3),
                'updated_at' => $now,
            ]
        );

        // Child Order for Solar Supply
        $this->seedOrderWithTerms(
            orderId: '0198a3b1-7c40-7abc-8def-4ede00000001',
            origin: 'deal_chain',
            dealChainId: Fix::CHAIN_ID_TECH_DEMO,
            dealNeedId: '0198a3b1-7c40-7abc-8def-4eed00000001',
            buyerId: $techId,
            providerId: $storeId,
            listingId: Fix::LISTING_AC_CAPACITOR,
            title: 'Solar Hybrid Inverter 3.5kVA',
            amountMinor: 18000,
            status: 'accepted',
            workStatus: 'completed',
            workShape: 'A4',
            now: $now->subHours(2),
            correlationId: $correlationId,
        );

        // Child Order for Flatbed Transit
        $this->seedOrderWithTerms(
            orderId: '0198a3b1-7c40-7abc-8def-4ede00000002',
            origin: 'deal_chain',
            dealChainId: Fix::CHAIN_ID_TECH_DEMO,
            dealNeedId: '0198a3b1-7c40-7abc-8def-4eed00000002',
            buyerId: $techId,
            providerId: $courierId,
            listingId: Fix::LISTING_COURIER,
            title: 'Flatbed Heavy Transit to Workshop',
            amountMinor: 3500,
            status: 'accepted',
            workStatus: 'in_progress',
            workShape: 'A1',
            now: $now->subMinutes(20),
            correlationId: $correlationId,
        );

        // Standalone Customer Direct Order for Kuya Ben (Ordering Bibingka from Bakery)
        $this->seedOrderWithTerms(
            orderId: '0198a3b1-7c40-7abc-8def-4ede00000777',
            origin: 'listing',
            dealChainId: null,
            dealNeedId: null,
            buyerId: $techId,
            providerId: $storeId,
            listingId: Fix::LISTING_BIBINGKA,
            title: 'Weekend bibingka tray (Fresh Batch)',
            amountMinor: 16000,
            status: 'accepted',
            workStatus: 'in_progress',
            workShape: 'A4',
            now: $now->subMinutes(40),
            correlationId: $correlationId,
        );

        // 7. Standalone Ongoing Orders for Maria (Buyer Persona)
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
            status: 'proposed',
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
            providerId: $techId,
            listingId: Fix::LISTING_AC_CLEAN,
            title: 'Inverter Split AC Emergency Service',
            amountMinor: 25000,
            status: 'accepted',
            workStatus: 'awaiting_signoff',
            workShape: 'A3',
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
            status: 'completed',
            workStatus: 'completed',
            workShape: null,
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
            status: 'completed',
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
            status: 'completed',
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

        $existingBuyerParty = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('party_type', 'buyer')
            ->first();
        DB::table('order_parties')->updateOrInsert(
            ['order_id' => $orderId, 'party_type' => 'buyer'],
            [
                'id' => $existingBuyerParty ? (string) $existingBuyerParty->id : (string) Str::uuid7(),
                'user_id' => $buyerId,
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

        $existingProviderParty = DB::table('order_parties')
            ->where('order_id', $orderId)
            ->where('party_type', 'provider')
            ->first();
        DB::table('order_parties')->updateOrInsert(
            ['order_id' => $orderId, 'party_type' => 'provider'],
            [
                'id' => $existingProviderParty ? (string) $existingProviderParty->id : (string) Str::uuid7(),
                'user_id' => $providerId,
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
        $listingSource = DB::table('listings')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('capability_profiles', function ($join): void {
                $join->on('capability_profiles.profile_family_code', '=', 'listing_versions.capability_profile_family_code')
                    ->on('capability_profiles.business_version', '=', 'listing_versions.capability_profile_business_version');
            })
            ->where('listings.id', $listingId)
            ->select('listing_versions.*', 'capability_profiles.work_shape as listing_work_shape')
            ->first();
        $listingVersion = $listingSource;
        $listingShape = $listingSource?->listing_work_shape;
        $listingTerms = $listingVersion === null
            ? []
            : (is_string($listingVersion->terms) ? json_decode($listingVersion->terms, true, 512, JSON_THROW_ON_ERROR) : (array) $listingVersion->terms);
        $workStages = is_array($listingTerms['milestone_stages'] ?? null) ? $listingTerms['milestone_stages'] : [];
        $workSpecification = is_array($listingTerms['work_specification'] ?? null) ? $listingTerms['work_specification'] : null;
        $workContract = null;
        if ($workShape !== null) {
            if (is_string($listingShape) && $listingShape !== '' && $listingShape !== $workShape) {
                throw new RuntimeException('Seeded Work shape must match its persisted listing shape.');
            }
            $workContract = WorkContractSelector::resolve(
                $this->workRegistry,
                $workShape,
                $workSpecification,
                $workStages,
                $correlationId,
            );
            $workSpecification ??= [];
            $workSpecification['shape_contract_version'] = $workContract->shapeContractVersion;
            $workSpecification['payload_schema_version'] = $workContract->payloadSchemaVersion;
            $workSpecification['nodes'] ??= $workStages;
            $listingTerms['work_specification'] = $workSpecification;
        }
        $versionId = $listingVersion ? (string) $listingVersion->id : null;
        $proposalScope = [
            'title' => $title,
            'amount_minor' => $amountMinor,
            'unit_amount_minor' => $amountMinor,
            'currency' => 'PHP',
            'quantity' => 1,
            'listing_version_id' => $versionId,
            'listing_version_number' => $listingVersion ? (int) $listingVersion->version_number : 1,
            'lane' => 'external_cash',
            'work_specification' => $workSpecification,
            'milestone_stages' => $workStages,
        ];
        $proposalJson = json_encode($proposalScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $existingProposal = DB::table('order_proposals')->where('order_id', $orderId)->where('proposal_version', 1)->first();
        $proposalId = $existingProposal ? (string) $existingProposal->id : (string) Str::uuid7();
        $existingTerms = DB::table('order_terms_snapshots')->where('order_id', $orderId)->where('snapshot_version', 1)->first();
        $termsSnapshotId = $existingTerms ? (string) $existingTerms->id : (string) Str::uuid7();
        DB::table('order_parties')->where('order_id', $orderId)->where('party_type', 'buyer')->update([
            'scope' => json_encode(['role' => 'buyer', 'proposal' => $proposalScope], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        if ($status !== 'proposed') {

            DB::table('order_terms_snapshots')->updateOrInsert(
                ['order_id' => $orderId, 'snapshot_version' => 1],
                [
                    'id' => $termsSnapshotId,
                    'source_listing_version_id' => $versionId,
                    'scope' => json_encode([
                        'title' => $title,
                        'quantity' => 1,
                        'amount_minor' => $amountMinor,
                        'unit_amount_minor' => $amountMinor,
                        'resource_key' => null,
                        'work_specification' => $workSpecification,
                        'milestone_stages' => $workStages,
                    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
                    'accepted_by_user_id' => $providerId,
                    'accepted_at' => $now,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                ]
            );
            $existingWork = DB::table('work_instances')->where('order_id', $orderId)->first();

            $workId = $workShape !== null
                ? ($existingWork ? (string) $existingWork->id : (string) Str::uuid7())
                : null;
            if ($workShape !== null) {
                $workStructure = $this->seedWorkStructure(
                    $workShape,
                    $workStatus,
                    $now,
                    $listingTerms,
                    $workContract,
                    $correlationId,
                );
                DB::table('work_instances')->updateOrInsert(
                    ['order_id' => $orderId],
                    [
                        'id' => $workId,
                        'work_shape' => $workShape,
                        'shape_contract_version' => $workContract->shapeContractVersion,
                        'payload_schema_version' => $workContract->payloadSchemaVersion,
                        'row_version' => 1,
                        'status' => $workStatus ?? 'not_started',
                        'scheduled_at' => null,
                        'started_at' => $workStatus !== 'not_started' ? $now : null,
                        'completion_proposed_at' => $workStatus === 'awaiting_signoff' ? $now : null,
                        'completed_at' => $workStatus === 'completed' ? $now : null,
                        'structure' => json_encode($workStructure, JSON_THROW_ON_ERROR),
                        'structure_payload_version' => 1,
                        'correlation_id' => $correlationId,
                        'version' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }

            $existingObligation = DB::table('payment_obligations')->where('order_id', $orderId)->first();
            $obligationId = $existingObligation ? (string) $existingObligation->id : (string) Str::uuid7();
            DB::table('payment_obligations')->updateOrInsert(
                ['order_id' => $orderId],
                [
                    'id' => $obligationId,
                    'work_instance_id' => $workId,
                    'purpose' => 'primary_consideration',
                    'amount_minor' => $amountMinor,
                    'currency' => 'PHP',
                    'payer_user_id' => $buyerId,
                    'recipient_user_id' => $providerId,
                    'lane' => 'external_cash',
                    'status' => $status === 'completed' ? 'disputed_mismatch' : 'not_due',
                    'due_condition' => 'on_work_acceptance',
                    'due_at' => $status === 'completed' ? now() : null,
                    'policy_version_id' => null,
                    'platform_fee_amount_minor' => 0,
                    'processor_cost_amount_minor' => 0,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            DB::table('order_proposals')->updateOrInsert(
                ['order_id' => $orderId, 'proposal_version' => 1],
                [
                    'id' => $proposalId,
                    'parent_proposal_id' => null,
                    'kind' => 'initial',
                    'status' => $status === 'proposed' ? 'proposed' : 'accepted',
                    'proposed_by_user_id' => $buyerId,
                    'responded_by_user_id' => $status === 'proposed' ? null : $providerId,
                    'responded_at' => $status === 'proposed' ? null : $now,
                    'source_listing_version_id' => $versionId,
                    'scope' => $proposalJson,
                    'scope_payload_version' => 1,
                    'amount_minor' => $amountMinor,
                    'currency' => 'PHP',
                    'terms_hash' => hash('sha256', $proposalJson),
                    'note' => null,
                    'capacity_reservation_id' => null,
                    'expires_at' => null,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
            DB::table('orders')->where('id', $orderId)->update([
                'current_proposal_id' => $proposalId,
                'current_terms_snapshot_id' => $status === 'proposed' ? null : $termsSnapshotId,
                'accepted_at' => $status === 'proposed' ? null : $now,
                'completed_at' => $status === 'completed' ? $now : null,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function seedWorkStructure(
        string $workShape,
        ?string $workStatus,
        CarbonImmutable $now,
        array $sourceTerms,
        WorkContractDefinition $workContract,
        string $correlationId,
    ): array {
        $structure = $this->workExecution->initializeStructure(
            $sourceTerms,
            $workShape,
            $correlationId,
            $workContract->shapeContractVersion,
            $workContract->payloadSchemaVersion,
        );
        $nodes = $structure['nodes'];

        if ($workStatus === 'awaiting_signoff' && $nodes !== []) {
            $finalIndex = count($nodes) - 1;
            foreach ($nodes as $index => &$node) {
                if ($index < $finalIndex) {
                    $node['status'] = 'completed';
                    $node['completed_at'] = $now->subMinutes(count($nodes) - $index)->toIso8601String();
                } else {
                    $node['status'] = 'awaiting_customer_confirmation';
                    $node['evidence_payload'] = [
                        'notes' => 'Fixture Work completed; awaiting the buyer review.',
                    ];
                }
            }
            unset($node);
            $structure['pending_customer_confirmation'] = true;
            $structure['active_node_id'] = $nodes[$finalIndex]['id'];
            $structure['active_ordinal'] = $nodes[$finalIndex]['ordinal'];
        } elseif ($workStatus === 'completed') {
            foreach ($nodes as &$node) {
                $node['status'] = 'completed';
                $node['completed_at'] = $now->toIso8601String();
            }
            unset($node);
            $structure['pending_customer_confirmation'] = false;
        }

        $structure['nodes'] = $nodes;

        return $structure;
    }
}

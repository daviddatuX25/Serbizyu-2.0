<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class AdminWorkspaceSeeder extends Seeder
{
    public const CASE_0412 = '0198a3b1-7c40-7abc-8def-ca5e00000412';
    public const CASE_0413 = '0198a3b1-7c40-7abc-8def-ca5e00000413';
    public const CASE_0414 = '0198a3b1-7c40-7abc-8def-ca5e00000414';
    public const CASE_0415 = '0198a3b1-7c40-7abc-8def-ca5e00000415';
    public const CASE_0416 = '0198a3b1-7c40-7abc-8def-ca5e00000416';
    public const CASE_0417 = '0198a3b1-7c40-7abc-8def-ca5e00000417';
    public const CASE_0418 = '0198a3b1-7c40-7abc-8def-ca5e00000418';

    public const CONV_ORDER = '0198a3b1-7c40-7abc-8def-c01100000001';
    public const CONV_RELAY = '0198a3b1-7c40-7abc-8def-c01100000002';
    public const CONV_AGENT = '0198a3b1-7c40-7abc-8def-c01100000003';
    public const CONV_CASE = '0198a3b1-7c40-7abc-8def-c01100000004';

    public const GRANT_CARLO = '0198a3b1-7c40-7abc-8def-90a100000001';

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        $publicEnvironment = (string) config('serbizyu.public_environment', 'local');
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)
            || in_array($publicEnvironment, ['production', 'genuine', 'genuine_tagudin'], true)) {
            return;
        }

        if (! Schema::hasTable('support_cases') || ! Schema::hasTable('conversations')) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        $buyerId = Fix::BUYER_USER_ID;
        $storeId = Fix::STORE_USER_ID;
        $courierId = Fix::COURIER_USER_ID;
        $techId = Fix::TECH_USER_ID;
        $carloId = Fix::CARLO_AGENT_USER_ID;
        $staffId = Fix::STAFF_USER_ID;

        // Ensure Staff and Carlo users exist
        DB::table('users')->updateOrInsert(
            ['id' => $staffId],
            [
                'phone_e164' => Fix::STAFF_PHONE,
                'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                'status' => 'active',
                'primary_access_tier' => 'L4',
                'locale' => 'fil',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'phone_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('users')->updateOrInsert(
            ['id' => Fix::CHECKER_STAFF_USER_ID],
            [
                'phone_e164' => Fix::CHECKER_STAFF_PHONE,
                'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                'status' => 'active',
                'primary_access_tier' => 'L4',
                'locale' => 'fil',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'phone_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('users')->updateOrInsert(
            ['id' => $carloId],
            [
                'phone_e164' => Fix::CARLO_AGENT_PHONE,
                'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
                'status' => 'active',
                'primary_access_tier' => 'L1',
                'locale' => 'fil',
                'timezone' => 'Asia/Manila',
                'version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'phone_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        if (Schema::hasTable('role_assignments')) {
            DB::table('role_assignments')->updateOrInsert(
                ['user_id' => $staffId, 'role_code' => 'admin'],
                [
                    'id' => (string) Str::uuid7(),
                    'status' => 'active',
                    'granted_by_user_id' => $staffId,
                    'effective_at' => $now,
                    'scope' => '{}',
                    'version' => 1,
                    'correlation_id' => (string) Str::uuid7(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            DB::table('role_assignments')->updateOrInsert(
                ['user_id' => Fix::CHECKER_STAFF_USER_ID, 'role_code' => 'admin'],
                [
                    'id' => (string) Str::uuid7(),
                    'status' => 'active',
                    'granted_by_user_id' => Fix::CHECKER_STAFF_USER_ID,
                    'effective_at' => $now,
                    'scope' => '{}',
                    'version' => 1,
                    'correlation_id' => (string) Str::uuid7(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            DB::table('role_assignments')->updateOrInsert(
                ['user_id' => $carloId, 'role_code' => 'agent'],
                [
                    'id' => (string) Str::uuid7(),
                    'status' => 'active',
                    'granted_by_user_id' => $storeId,
                    'effective_at' => $now,
                    'scope' => '{}',
                    'version' => 1,
                    'correlation_id' => (string) Str::uuid7(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        // 1. Admin Inbox Cases: 6 open (4 waiting on me/staff, 2 waiting on others), 1 closed
        $cases = [
            // 4 waiting on me (staff)
            [
                'id' => self::CASE_0412,
                'public_reference' => 'CASE-0412',
                'reporter_user_id' => $buyerId,
                'requester_user_id' => $buyerId,
                'category' => 'delivery_dispute',
                'severity' => 'medium',
                'order_id' => Fix::ORDER_ID_TRANSIT,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'open',
                'owner_user_id' => $staffId,
                'resolution' => null,
                'opened_at' => $now->subHours(5),
                'opened_by_user_id' => $buyerId,
                'principal_user_id' => $buyerId,
                'current_responsibility_party' => 'staff',
                'current_responsibility_user_id' => null,
                'version' => 1,
                'correlation_id' => self::CASE_0412,
                'created_at' => $now->subHours(5),
                'updated_at' => $now->subHours(1),
            ],
            [
                'id' => self::CASE_0413,
                'public_reference' => 'CASE-0413',
                'reporter_user_id' => $buyerId,
                'requester_user_id' => $buyerId,
                'category' => 'payment_mismatch_cash',
                'severity' => 'high',
                'order_id' => '0198a3b1-7c40-7abc-8def-0ede00000731',
                'work_instance_id' => null,
                'payment_obligation_id' => '0198a3b1-7c40-7abc-8def-0b1000001088',
                'status' => 'open',
                'owner_user_id' => $staffId,
                'resolution' => null,
                'opened_at' => $now->subHours(2),
                'opened_by_user_id' => $buyerId,
                'principal_user_id' => $buyerId,
                'current_responsibility_party' => 'staff',
                'current_responsibility_user_id' => null,
                'version' => 2,
                'correlation_id' => self::CASE_0413,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ],
            [
                'id' => self::CASE_0414,
                'public_reference' => 'CASE-0414',
                'reporter_user_id' => $techId,
                'requester_user_id' => $techId,
                'category' => 'evidence_verification',
                'severity' => 'low',
                'order_id' => Fix::ORDER_ID_LABOR,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'open',
                'owner_user_id' => $staffId,
                'resolution' => null,
                'opened_at' => $now->subHours(4),
                'opened_by_user_id' => $techId,
                'principal_user_id' => $techId,
                'current_responsibility_party' => 'staff',
                'current_responsibility_user_id' => null,
                'version' => 1,
                'correlation_id' => self::CASE_0414,
                'created_at' => $now->subHours(4),
                'updated_at' => $now->subHours(4),
            ],
            [
                'id' => self::CASE_0415,
                'public_reference' => 'CASE-0415',
                'reporter_user_id' => $storeId,
                'requester_user_id' => $storeId,
                'category' => 'barangay_lupon_handoff',
                'severity' => 'medium',
                'order_id' => null,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'open',
                'owner_user_id' => $staffId,
                'resolution' => null,
                'opened_at' => $now->subHours(3),
                'opened_by_user_id' => $storeId,
                'principal_user_id' => $storeId,
                'current_responsibility_party' => 'staff',
                'current_responsibility_user_id' => null,
                'version' => 1,
                'correlation_id' => self::CASE_0415,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subHours(3),
            ],
            // 2 waiting on others
            [
                'id' => self::CASE_0416,
                'public_reference' => 'CASE-0416',
                'reporter_user_id' => $buyerId,
                'requester_user_id' => $buyerId,
                'category' => 'provider_credential_check',
                'severity' => 'low',
                'order_id' => null,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'open',
                'owner_user_id' => null,
                'resolution' => null,
                'opened_at' => $now->subDays(1),
                'opened_by_user_id' => $buyerId,
                'principal_user_id' => $buyerId,
                'current_responsibility_party' => 'participant',
                'current_responsibility_user_id' => $techId,
                'version' => 1,
                'correlation_id' => self::CASE_0416,
                'created_at' => $now->subDays(1),
                'updated_at' => $now->subHours(6),
            ],
            [
                'id' => self::CASE_0417,
                'public_reference' => 'CASE-0417',
                'reporter_user_id' => $courierId,
                'requester_user_id' => $courierId,
                'category' => 'customer_absence',
                'severity' => 'medium',
                'order_id' => Fix::ORDER_ID_TRANSIT,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'open',
                'owner_user_id' => null,
                'resolution' => null,
                'opened_at' => $now->subHours(8),
                'opened_by_user_id' => $courierId,
                'principal_user_id' => $courierId,
                'current_responsibility_party' => 'participant',
                'current_responsibility_user_id' => $buyerId,
                'version' => 1,
                'correlation_id' => self::CASE_0417,
                'created_at' => $now->subHours(8),
                'updated_at' => $now->subHours(4),
            ],
            // 1 closed
            [
                'id' => self::CASE_0418,
                'public_reference' => 'CASE-0418',
                'reporter_user_id' => $buyerId,
                'requester_user_id' => $buyerId,
                'category' => 'billing_inquiry',
                'severity' => 'low',
                'order_id' => Fix::ORDER_ID_PART,
                'work_instance_id' => null,
                'payment_obligation_id' => null,
                'status' => 'closed',
                'owner_user_id' => $staffId,
                'resolution' => 'External cash receipt confirmed by Tagudin Hardware staff. Consideration settled bilaterally.',
                'opened_at' => $now->subDays(3),
                'opened_by_user_id' => $buyerId,
                'principal_user_id' => $buyerId,
                'current_responsibility_party' => 'none',
                'current_responsibility_user_id' => null,
                'version' => 3,
                'correlation_id' => self::CASE_0418,
                'created_at' => $now->subDays(3),
                'updated_at' => $now->subDays(1),
            ],
        ];

        foreach ($cases as $c) {
            DB::table('support_cases')->updateOrInsert(['id' => $c['id']], $c);
        }

        // 2. Consent Grant for Carlo Agent Acting-For Tagudin Hardware
        DB::table('consent_grants')->updateOrInsert(
            ['id' => self::GRANT_CARLO],
            [
                'grantor_user_id' => $storeId,
                'grantee_user_id' => $carloId,
                'resource_type' => 'order',
                'resource_id' => Fix::ORDER_ID_PART,
                'permission_scope' => json_encode(['actions' => ['order.conversation.read', 'order.conversation.write', 'conversation:read', 'conversation:send', 'order:communicate']], JSON_THROW_ON_ERROR),
                'status' => 'active',
                'starts_at' => now()->subDays(5),
                'expires_at' => now()->addDays(30),
                'suspended_at' => null,
                'consent_evidence_file_id' => null,
                'version' => 1,
                'correlation_id' => self::GRANT_CARLO,
                'created_at' => $now->subDays(10),
                'updated_at' => $now->subDays(10),
            ]
        );

        // 3. Persisted Conversations + Messages
        // A) Order 1:1 Conversation: Maria Santos and Kuya Ben
        DB::table('conversations')->updateOrInsert(
            ['id' => self::CONV_ORDER],
            [
                'participants' => json_encode([$buyerId, $techId], JSON_THROW_ON_ERROR),
                'participants_payload_version' => 1,
                'access_policy' => json_encode(['policy' => 'order_parties'], JSON_THROW_ON_ERROR),
                'access_policy_payload_version' => 1,
                'order_id' => Fix::ORDER_ID_LABOR,
                'work_instance_id' => null,
                'created_by_user_id' => $buyerId,
                'status' => 'active',
                'scope_type' => 'order',
                'scope_id' => Fix::ORDER_ID_LABOR,
                'next_sequence' => 3,
                'correlation_id' => self::CONV_ORDER,
                'version' => 3,
                'created_at' => $now->subHours(4),
                'updated_at' => $now->subMinutes(20),
            ]
        );

        DB::table('messages')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-ba0100000001'],
            [
                'conversation_id' => self::CONV_ORDER,
                'actor_user_id' => $buyerId,
                'owner_user_id' => $buyerId,
                'content' => 'Hello Kuya Ben, is the 10:00 AM slot confirmed for our split AC cleaning?',
                'delivery_state' => 'delivered',
                'sequence' => 1,
                'audience' => 'participants',
                'actor_display_name' => 'Maria Demo Resident',
                'owner_display_name' => 'Maria Demo Resident',
                'payload_hash' => hash('sha256', 'msg-1'),
                'idempotency_key' => 'msg-order-1',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ba0100000001',
                'created_at' => $now->subHours(3),
            ]
        );

        DB::table('messages')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-ba0100000002'],
            [
                'conversation_id' => self::CONV_ORDER,
                'actor_user_id' => $techId,
                'owner_user_id' => $techId,
                'content' => 'Yes ma’am Maria! Waiting on the replacement capacitor delivery from Tagudin Hardware first.',
                'delivery_state' => 'delivered',
                'sequence' => 2,
                'audience' => 'participants',
                'actor_display_name' => 'Kuya Ben Aircon Services',
                'owner_display_name' => 'Kuya Ben Aircon Services',
                'payload_hash' => hash('sha256', 'msg-2'),
                'idempotency_key' => 'msg-order-2',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ba0100000002',
                'created_at' => $now->subHours(2),
            ]
        );

        // B) Deal Chain Relay Conversation: Cool Again
        DB::table('conversations')->updateOrInsert(
            ['id' => self::CONV_RELAY],
            [
                'participants' => json_encode([$buyerId, $storeId, $courierId, $techId], JSON_THROW_ON_ERROR),
                'participants_payload_version' => 1,
                'access_policy' => json_encode(['policy' => 'deal_chain_participants'], JSON_THROW_ON_ERROR),
                'access_policy_payload_version' => 1,
                'order_id' => null,
                'work_instance_id' => null,
                'created_by_user_id' => $buyerId,
                'status' => 'active',
                'scope_type' => 'deal_chain_relay',
                'scope_id' => Fix::CHAIN_ID_ONGOING,
                'next_sequence' => 2,
                'correlation_id' => self::CONV_RELAY,
                'version' => 2,
                'created_at' => $now->subHours(3),
                'updated_at' => $now->subHours(1),
            ]
        );

        DB::table('messages')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-ba0200000001'],
            [
                'conversation_id' => self::CONV_RELAY,
                'actor_user_id' => $courierId,
                'owner_user_id' => $courierId,
                'content' => 'Part collected from Tagudin Hardware counter. Departing to resident site now.',
                'delivery_state' => 'delivered',
                'sequence' => 1,
                'audience' => 'participants',
                'actor_display_name' => 'Danny Express',
                'owner_display_name' => 'Danny Express',
                'payload_hash' => hash('sha256', 'msg-relay-1'),
                'idempotency_key' => 'msg-relay-1',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ba0200000001',
                'created_at' => $now->subMinutes(45),
            ]
        );

        // C) Carlo Agent Acting-For Conversation
        DB::table('conversations')->updateOrInsert(
            ['id' => self::CONV_AGENT],
            [
                'participants' => json_encode([$buyerId, $storeId, $carloId], JSON_THROW_ON_ERROR),
                'participants_payload_version' => 1,
                'access_policy' => json_encode(['policy' => 'delegated_agent'], JSON_THROW_ON_ERROR),
                'access_policy_payload_version' => 1,
                'order_id' => Fix::ORDER_ID_PART,
                'work_instance_id' => null,
                'created_by_user_id' => $buyerId,
                'status' => 'active',
                'scope_type' => 'order',
                'scope_id' => Fix::ORDER_ID_PART,
                'next_sequence' => 2,
                'correlation_id' => self::CONV_AGENT,
                'version' => 2,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subMinutes(50),
            ]
        );

        DB::table('messages')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-ba0300000001'],
            [
                'conversation_id' => self::CONV_AGENT,
                'actor_user_id' => $carloId,
                'owner_user_id' => $storeId,
                'consent_grant_id' => self::GRANT_CARLO,
                'content' => 'Carlo here assisting Tagudin Hardware. The 35uF capacitor has been bench-tested and bagged for pickup.',
                'delivery_state' => 'delivered',
                'sequence' => 1,
                'audience' => 'participants',
                'actor_display_name' => 'Carlo Agent',
                'owner_display_name' => 'Tagudin Hardware Supply',
                'payload_hash' => hash('sha256', 'msg-agent-1'),
                'idempotency_key' => 'msg-agent-1',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ba0300000001',
                'created_at' => $now->subHours(1),
            ]
        );

        // D) Case Conversation for CASE-0413
        DB::table('conversations')->updateOrInsert(
            ['id' => self::CONV_CASE],
            [
                'participants' => json_encode([$buyerId, $techId, $staffId], JSON_THROW_ON_ERROR),
                'participants_payload_version' => 1,
                'access_policy' => json_encode(['policy' => 'case_inquiry'], JSON_THROW_ON_ERROR),
                'access_policy_payload_version' => 1,
                'order_id' => null,
                'work_instance_id' => null,
                'created_by_user_id' => $staffId,
                'status' => 'active',
                'scope_type' => 'support_case',
                'scope_id' => self::CASE_0413,
                'next_sequence' => 2,
                'correlation_id' => self::CONV_CASE,
                'version' => 2,
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(1),
            ]
        );

        DB::table('messages')->updateOrInsert(
            ['id' => '0198a3b1-7c40-7abc-8def-ba0400000001'],
            [
                'conversation_id' => self::CONV_CASE,
                'actor_user_id' => $staffId,
                'owner_user_id' => $staffId,
                'content' => 'Municipal desk review: please provide the written cash acknowledgement signed during work turnover.',
                'delivery_state' => 'delivered',
                'sequence' => 1,
                'audience' => 'participants',
                'actor_display_name' => 'Officer Santos',
                'owner_display_name' => 'Officer Santos',
                'payload_hash' => hash('sha256', 'msg-case-1'),
                'idempotency_key' => 'msg-case-1',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ba0400000001',
                'created_at' => $now->subHours(1),
            ]
        );

        // 4. Delivered In-App Notifications
        $notifs = [
            [
                'id' => '0198a3b1-7c40-7abc-8def-ea1000000001',
                'recipient_user_id' => $buyerId,
                'event_source_type' => 'order',
                'event_source_id' => Fix::ORDER_ID_LABOR,
                'event_type' => 'order.schedule_updated',
                'priority' => 'high',
                'status' => 'delivered',
                'attention' => 'needs_action',
                'payload' => json_encode([
                    'title' => 'Appointment reschedule requested',
                    'body' => 'Kuya Ben proposed rescheduling your AC service to 2:00 PM.',
                    'action_url' => '/orders/'.Fix::ORDER_ID_LABOR,
                ], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'read_at' => null,
                'idempotency_key' => 'notif-resched-buyer',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ea1000000001',
                'created_at' => $now->subMinutes(30),
                'updated_at' => $now->subMinutes(30),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ea1000000002',
                'recipient_user_id' => $techId,
                'event_source_type' => 'payment_obligation',
                'event_source_id' => '0198a3b1-7c40-7abc-8def-0b1000001088',
                'event_type' => 'payment.mismatch_reported',
                'priority' => 'high',
                'status' => 'delivered',
                'attention' => 'needs_action',
                'payload' => json_encode([
                    'title' => 'Cash payment discrepancy noted',
                    'body' => 'Customer reported ₱650 cash payment vs ₱500 acknowledged.',
                    'action_url' => '/orders/0198a3b1-7c40-7abc-8def-0ede00000731',
                ], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'read_at' => null,
                'idempotency_key' => 'notif-mismatch-tech',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ea1000000002',
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-ea1000000003',
                'recipient_user_id' => $staffId,
                'event_source_type' => 'support_case',
                'event_source_id' => self::CASE_0413,
                'event_type' => 'case.assigned',
                'priority' => 'normal',
                'status' => 'delivered',
                'attention' => 'updates',
                'payload' => json_encode([
                    'title' => 'New case assigned to your desk',
                    'body' => 'CASE-0413 Cash mismatch assigned for staff review.',
                    'action_url' => '/admin/inspect?ref=CASE-0413',
                ], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'read_at' => null,
                'idempotency_key' => 'notif-case-staff',
                'correlation_id' => '0198a3b1-7c40-7abc-8def-ea1000000003',
                'created_at' => $now->subHours(2),
                'updated_at' => $now->subHours(2),
            ],
        ];

        foreach ($notifs as $n) {
            DB::table('notifications')->updateOrInsert(['id' => $n['id']], $n);
            if (Schema::hasTable('notification_deliveries')) {
                DB::table('notification_deliveries')->updateOrInsert(
                    ['notification_id' => $n['id'], 'channel' => 'in_app'],
                    [
                        'id' => (string) Str::uuid7(),
                        'provider_reference' => 'in-app-demo',
                        'status' => 'delivered',
                        'retry_count' => 0,
                        'attempt_number' => 1,
                        'failure_reason' => null,
                        'delivered_at' => $n['created_at'],
                        'next_attempt_at' => null,
                        'correlation_id' => $n['correlation_id'],
                        'created_at' => $n['created_at'],
                        'updated_at' => $n['updated_at'],
                    ]
                );
            }
        }
    }
}

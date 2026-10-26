<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DatabaseCatalogContractTest extends TestCase
{
    public function test_postgresql_catalog_contains_the_canonical_application_tables_and_e0s2_objects(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('The E0-S2 catalog contract is PostgreSQL-only.');
        }

        $actualTables = collect(DB::select(<<<'SQL'
            SELECT tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = current_schema()
              AND tablename <> 'migrations'
              AND tablename <> 'spatial_ref_sys'
            ORDER BY tablename
            SQL
        ))->pluck('tablename')->all();

        self::assertSame($this->canonicalTables(), $actualTables);

        $objects = collect(DB::select(<<<'SQL'
            SELECT name
            FROM (
                SELECT indexname AS name
                FROM pg_catalog.pg_indexes
                WHERE schemaname = current_schema()
                UNION
                SELECT conname AS name
                FROM pg_catalog.pg_constraint
                WHERE connamespace = current_schema()::regnamespace
                UNION
                SELECT sequencename AS name
                FROM pg_catalog.pg_sequences
                WHERE schemaname = current_schema()
                UNION
                SELECT tgname AS name
                FROM pg_catalog.pg_trigger
                WHERE NOT tgisinternal
            ) catalog_objects
            WHERE name IN (
                'cohort_classifications_classified_at_idx',
                'outbox_messages_pending_delivery_idx',
                'retention_holds_active_evidence_idx',
                'idempotency_keys_scope_key_uq',
                'outbox_messages_status_ck',
                'retention_holds_status_ck',
                'uq_category_versions_category_business',
                'uq_inbox_messages_consumer_event',
                'uq_listing_capacity_reservations_command',
                'uq_integration_credentials_selector',
                'excl_capability_activations_fingerprint_range',
                'uq_command_approvals_idempotency',
                'ck_listing_capacity_reservations_quantity',
                'ck_command_approvals_maker_checker',
                'orders_public_reference_uq',
                'payment_obligations_public_reference_uq',
                'support_cases_public_reference_uq',
                'disputes_public_reference_uq',
                'chk_order_proposals_amount',
                'chk_order_proposals_kind',
                'chk_order_proposals_status',
                'chk_payment_obligations_lane',
                'chk_payment_obligations_status',
                'chk_payment_obligations_external_fee',
                'fk_payment_obligations_supersedes',
                'chk_payment_obligations_settled_at',
                'chk_payment_obligations_due_at',
                'chk_payment_events_lane',
                'chk_payment_events_new_status',
                'chk_payment_events_previous_status',
                'uq_listing_capacity_variant_bucket',
                'uq_listing_capacity_default_bucket',
                'ck_listing_capacity_stock_policy',
                'ck_listing_capacity_availability_status',
                'ck_stock_movements_type',
                'ck_stock_movements_balances',
                'trg_stock_movements_append_only',
                'ck_work_deliveries_status',
                'ck_work_deliveries_manifest',
                'uq_work_deliveries_work_version',
                'uq_work_deliveries_single_draft',
                'uq_work_deliverable_files_ordinal',
                'uq_work_deliverable_files_evidence',
                'uq_work_revision_requests_number',
                'fk_order_proposals_listing_version',
                'fk_order_proposals_order',
                'fk_order_proposals_parent',
                'fk_order_proposals_proposer',
                'fk_order_proposals_reservation',
                'fk_order_proposals_responder',
                'fk_orders_current_proposal',
                'fk_orders_current_terms_snapshot',
                'idx_order_proposals_order_status',
                'uq_order_proposals_one_current',
                'uq_order_proposals_order_version'
            )
            ORDER BY name
            SQL
        ))->pluck('name')->all();

        self::assertSame([
            'chk_order_proposals_amount',
            'chk_order_proposals_kind',
            'chk_order_proposals_status',
            'chk_payment_events_lane',
            'chk_payment_events_new_status',
            'chk_payment_events_previous_status',
            'chk_payment_obligations_due_at',
            'chk_payment_obligations_external_fee',
            'chk_payment_obligations_lane',
            'chk_payment_obligations_settled_at',
            'chk_payment_obligations_status',
            'ck_command_approvals_maker_checker',
            'ck_listing_capacity_availability_status',
            'ck_listing_capacity_reservations_quantity',
            'ck_listing_capacity_stock_policy',
            'ck_stock_movements_balances',
            'ck_stock_movements_type',
            'ck_work_deliveries_manifest',
            'ck_work_deliveries_status',
            'cohort_classifications_classified_at_idx',
            'disputes_public_reference_uq',
            'excl_capability_activations_fingerprint_range',
            'fk_order_proposals_listing_version',
            'fk_order_proposals_order',
            'fk_order_proposals_parent',
            'fk_order_proposals_proposer',
            'fk_order_proposals_reservation',
            'fk_order_proposals_responder',
            'fk_orders_current_proposal',
            'fk_orders_current_terms_snapshot',
            'fk_payment_obligations_supersedes',
            'idempotency_keys_scope_key_uq',
            'idx_order_proposals_order_status',
            'orders_public_reference_uq',
            'outbox_messages_pending_delivery_idx',
            'outbox_messages_status_ck',
            'payment_obligations_public_reference_uq',
            'retention_holds_active_evidence_idx',
            'retention_holds_status_ck',
            'support_cases_public_reference_uq',
            'trg_stock_movements_append_only',
            'uq_category_versions_category_business',
            'uq_command_approvals_idempotency',
            'uq_inbox_messages_consumer_event',
            'uq_integration_credentials_selector',
            'uq_listing_capacity_default_bucket',
            'uq_listing_capacity_reservations_command',
            'uq_listing_capacity_variant_bucket',
            'uq_order_proposals_one_current',
            'uq_order_proposals_order_version',
            'uq_work_deliverable_files_evidence',
            'uq_work_deliverable_files_ordinal',
            'uq_work_deliveries_single_draft',
            'uq_work_deliveries_work_version',
            'uq_work_revision_requests_number',
        ], $objects);
        $canonicalCheckpoints = collect(DB::select(<<<'SQL'
            SELECT batch
            FROM migration_checkpoints
            WHERE migration_version = 'canonical-58-v1'
              AND status = 'completed'
            ORDER BY batch
            SQL
        ))->pluck('batch')->all();

        self::assertSame([
            '000', '001', '002', '003', '004', '005', '006', '007', '008', '009',
        ], $canonicalCheckpoints);
    }

    public function test_operational_handoff_consent_and_scheduling_constraints_are_present(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('Operational schema contracts require PostgreSQL.');
        }

        $objects = collect(DB::select(<<<'SQL'
            SELECT indexname AS name FROM pg_catalog.pg_indexes
            WHERE schemaname = current_schema()
            UNION
            SELECT conname AS name FROM pg_catalog.pg_constraint
            WHERE connamespace = current_schema()::regnamespace
            UNION
            SELECT sequencename AS name FROM pg_catalog.pg_sequences
            WHERE schemaname = current_schema()
            SQL))->pluck('name')->all();

        foreach ([
            'order_handoff_status_ck',
            'order_handoff_mode_ck',
            'order_handoff_version_ck',
            'order_handoff_prepared_idempotency_uq',
            'order_handoff_status_updated_idx',
            'idx_deal_needs_chain_source_node',
            'fk_deal_needs_source_listing',
            'uq_deal_need_confirmation_need',
            'uq_deal_need_confirmation_invitation',
            'ck_deal_need_confirmations_payload_version',
            'ck_deal_need_confirmations_hashes',
            'fk_deal_need_confirmations_appointment',
            'uq_provider_schedule_resources_provider',
            'idx_appointment_reservations_interval',
            'idx_appointment_reservations_expiry',
            'idx_appointment_reservations_quote_source',
            'fk_appointment_reservations_quote',
            'uq_appointment_reservations_customer_key',
            'uq_appointment_reservation_order',
            'ck_appointment_reservations_status',
            'ck_appointment_reservations_interval',
            'ck_appointment_reservations_state',
            'ck_appointment_reservations_source',
            'idx_provider_agenda_blocks_interval',
            'ck_provider_agenda_blocks_interval',
            'idx_schedule_changes_order_created',
            'uq_schedule_changes_single_pending',
            'ck_schedule_changes_status',
            'uq_schedule_history_request',
            'fk_order_proposals_appointment_reservation',
            'uq_order_proposals_appointment_reservation',
            'uq_work_dependency_source_facts_event',
            'ck_work_dependency_source_facts_event_type',
            'ck_work_dependency_source_facts_versions',
            'uq_work_step_dependency_gate_target',
            'idx_work_step_dependency_gate_work_status',
            'ck_work_step_dependency_gates_condition',
            'ck_work_step_dependency_gates_status',
            'ck_work_step_dependency_gates_clearance',
            'fk_work_step_dependency_gates_source_fact',
            'fk_work_challenges_work',
            'fk_work_challenges_verifier',
            'fk_work_challenges_consumer',
            'ck_work_challenges_kind_length',
            'ck_work_challenges_attempt_bounds',
            'ck_work_challenges_consumption',
            'ck_work_challenges_active_signature',
            'uq_work_challenges_active_node',
            'idx_notifications_recipient_unread',
            'chk_notifications_attention',
            'idx_conversations_scope',
            'uq_conversations_scope',
            'fk_messages_owner',
            'fk_messages_consent_grant',
            'uq_messages_actor_owner_idempotency',
            'uq_messages_conversation_sequence',
            'idx_messages_audience_sequence',
            'fk_support_cases_opened_by',
            'fk_support_cases_principal',
            'fk_support_cases_consent_grant',
            'uq_support_cases_actor_principal_idempotency',
            'chk_conversations_scope_type',
            'chk_conversations_next_sequence',
            'chk_messages_audience',
            'chk_messages_sequence',
            'chk_messages_attribution',
            'chk_support_cases_open_attribution',
            'deal_chains_public_reference_uq',
            'listings_public_reference_uq',
            'identity_verifications_public_reference_uq',
            'deal_chains_public_reference_seq',
            'listings_public_reference_seq',
            'identity_verifications_public_reference_seq',
            'fk_support_cases_responsibility_user',
            'idx_support_cases_staff_responsibility',
            'ck_support_cases_responsibility',
            'fk_command_approvals_case',
            'ck_command_approvals_command_version',
            'fk_administrative_holds_case',
            'fk_administrative_holds_placement_approval',
            'fk_administrative_holds_release_approval',
            'ck_administrative_holds_source_kind',
            'uq_lupon_packets_idempotency',
            'idx_lupon_packets_case_created',
            'fk_lupon_packets_transmitter',
            'fk_lupon_packets_return_evidence',
            'fk_lupon_packets_archiver',
            'uq_lupon_artifacts_storage_key',
            'uq_lupon_artifacts_packet_kind',
            'idx_lupon_artifacts_packet_created',
            'uq_lupon_packet_events_idempotency',
            'fk_lupon_packet_events_actor',
            'ck_lupon_packets_status',
            'ck_lupon_packets_version',
            'ck_lupon_packets_return_state',
            'ck_lupon_packets_transmission_state',
            'ck_lupon_packets_return_status',
            'ck_lupon_packets_archive_state',
            'ck_lupon_artifacts_kind',
            'ck_lupon_artifacts_size',
        ] as $name) {
            self::assertContains($name, $objects, "Missing operational schema object {$name}.");
        }
    }

    /** @return list<string> */
    private function canonicalTables(): array
    {
        $tables = [
            'administrative_holds',
            'audit_events',
            'auth_otps',
            'capability_activations',
            'capability_profiles',
            'categories',
            'category_versions',
            'cohort_classifications',
            'command_approvals',
            'consent_grants',
            'conversations',
            'deal_chain_catalog_versions',
            'deal_chains',
            'deal_dependencies',
            'deal_invitations',
            'deal_needs',
            'dispute_events',
            'disputes',
            'evidence_files',
            'financial_accounts',
            'financial_adjustments',
            'financial_entries',
            'financial_transactions',
            'idempotency_keys',
            'identity_verifications',
            'inbox_messages',
            'integration_clients',
            'integration_credentials',
            'integration_object_mappings',
            'integration_sync_cursors',
            'integration_webhook_deliveries',
            'integration_webhook_subscriptions',
            'listing_capacity',
            'listing_capacity_reservations',
            'listing_versions',
            'listings',
            'messages',
            'migration_checkpoints',
            'notification_deliveries',
            'notifications',
            'oauth_identities',
            'order_parties',
            'order_proposals',
            'order_terms_snapshots',
            'orders',
            'outbox_messages',
            'password_reset_tokens',
            'payment_events',
            'payment_obligations',
            'policy_versions',
            'provider_events',
            'quotes',
            'requests',
            'retention_holds',
            'reviews',
            'role_assignments',
            'safety_incidents',
            'support_cases',
            't4_work_migration_audits',
            'user_profiles',
            'users',
            'work_catalog_versions',
            'work_deliverable_files',
            'work_deliveries',
            'work_events',
            'work_instances',
            'work_revision_requests',
        ];
        $tables[] = 'stock_movements';
        $tables[] = 'listing_daily_metrics';
        $tables[] = 'outbox_streams';
        $tables[] = 'order_handoff_transfers';
        $tables[] = 'deal_need_confirmations';
        $tables[] = 'provider_schedule_resources';
        $tables[] = 'appointment_reservations';
        $tables[] = 'provider_agenda_blocks';
        $tables[] = 'work_schedule_change_requests';
        $tables[] = 'work_schedule_history';
        $tables[] = 'work_dependency_source_facts';
        $tables[] = 'work_step_dependency_gates';
        $tables[] = 'work_clearance_challenges';
        $tables[] = 'lupon_packets';
        $tables[] = 'lupon_packet_artifacts';
        $tables[] = 'lupon_packet_events';
        sort($tables);

        return $tables;
    }
}

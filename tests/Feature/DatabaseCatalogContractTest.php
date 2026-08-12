<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DatabaseCatalogContractTest extends TestCase
{
    public function test_postgresql_catalog_contains_the_canonical_58_application_tables_and_e0s2_objects(): void
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
                'ck_command_approvals_maker_checker'
            )
            ORDER BY name
            SQL
        ))->pluck('name')->all();

        self::assertSame([
            'ck_command_approvals_maker_checker',
            'ck_listing_capacity_reservations_quantity',
            'cohort_classifications_classified_at_idx',
            'excl_capability_activations_fingerprint_range',
            'idempotency_keys_scope_key_uq',
            'outbox_messages_pending_delivery_idx',
            'outbox_messages_status_ck',
            'retention_holds_active_evidence_idx',
            'retention_holds_status_ck',
            'uq_category_versions_category_business',
            'uq_command_approvals_idempotency',
            'uq_inbox_messages_consumer_event',
            'uq_integration_credentials_selector',
            'uq_listing_capacity_reservations_command',
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

    /** @return list<string> */
    private function canonicalTables(): array
    {
        return [
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
            'user_profiles',
            'users',
            'work_events',
            'work_instances',
        ];
    }
}

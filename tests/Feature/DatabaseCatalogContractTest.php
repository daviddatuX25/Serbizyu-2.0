<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DatabaseCatalogContractTest extends TestCase
{
    public function test_postgresql_catalog_contains_the_canonical_application_tables_and_batch_006_007_objects(): void
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
                'retention_holds_status_ck'
            )
            ORDER BY name
            SQL
        ))->pluck('name')->all();

        self::assertSame([
            'cohort_classifications_classified_at_idx',
            'idempotency_keys_scope_key_uq',
            'outbox_messages_pending_delivery_idx',
            'outbox_messages_status_ck',
            'retention_holds_active_evidence_idx',
            'retention_holds_status_ck',
        ], $objects);
    }

    /** @return list<string> */
    private function canonicalTables(): array
    {
        return [
            'administrative_holds',
            'audit_events',
            'capability_profiles',
            'categories',
            'cohort_classifications',
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
            'listing_capacity',
            'listing_versions',
            'listings',
            'messages',
            'migration_checkpoints',
            'notification_deliveries',
            'notifications',
            'order_parties',
            'order_terms_snapshots',
            'orders',
            'outbox_messages',
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

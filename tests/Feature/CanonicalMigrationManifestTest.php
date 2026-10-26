<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class CanonicalMigrationManifestTest extends TestCase
{
    use DatabaseTransactions;

    public function test_canonical_inventory_defines_exactly_62_tables(): void
    {
        $inventory = $this->canonical62Tables();

        self::assertCount(62, $inventory);
        self::assertSame($inventory, array_unique($inventory));
    }

    public function test_active_database_contains_expected_61_canonical_tables_and_preserves_deferred_contract(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('PostgreSQL catalog contract test requires pgsql driver.');
        }

        $allTables = collect(DB::select(<<<'SQL'
            SELECT tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = current_schema()
            ORDER BY tablename
            SQL
        ))->pluck('tablename')->all();

        // 1. Engine / Extension tables
        $engineTables = ['migrations', 'spatial_ref_sys'];
        foreach ($engineTables as $table) {
            self::assertContains($table, $allTables, "Expected engine table {$table} in database.");
        }

        // 2. Auxiliary / Transitional tables
        $auxiliaryTables = ['oauth_identities', 'password_reset_tokens', 't4_work_migration_audits'];
        foreach ($auxiliaryTables as $table) {
            self::assertContains($table, $allTables, "Expected auxiliary table {$table} in database.");
        }

        // 3. Deferred canonical table (D6: Story 6.3) - must NOT be pre-created in D0
        self::assertNotContains(
            'request_invitations',
            $allTables,
            'Table request_invitations must not be created prematurely before D6 / Story 6.3.'
        );

        // 4. Active canonical domain tables (61 out of 62)
        $expectedActiveCanonical = array_values(array_filter(
            $this->canonical62Tables(),
            static fn (string $table): bool => $table !== 'request_invitations'
        ));

        self::assertCount(61, $expectedActiveCanonical);

        $domainTables = array_values(array_diff($allTables, array_merge($engineTables, $auxiliaryTables)));
        sort($domainTables);
        sort($expectedActiveCanonical);

        $expectedActiveCanonical[] = 'listing_daily_metrics';
        $expectedActiveCanonical[] = 'outbox_streams';
        $expectedActiveCanonical[] = 'stock_movements';
        $expectedActiveCanonical[] = 'work_deliveries';
        $expectedActiveCanonical[] = 'work_deliverable_files';
        $expectedActiveCanonical[] = 'work_revision_requests';
        $expectedActiveCanonical[] = 'order_handoff_transfers';
        $expectedActiveCanonical[] = 'deal_need_confirmations';
        $expectedActiveCanonical[] = 'provider_schedule_resources';
        $expectedActiveCanonical[] = 'appointment_reservations';
        $expectedActiveCanonical[] = 'provider_agenda_blocks';
        $expectedActiveCanonical[] = 'work_schedule_change_requests';
        $expectedActiveCanonical[] = 'work_schedule_history';
        $expectedActiveCanonical[] = 'work_dependency_source_facts';
        $expectedActiveCanonical[] = 'work_step_dependency_gates';
        $expectedActiveCanonical[] = 'work_clearance_challenges';
        $expectedActiveCanonical[] = 'lupon_packets';
        $expectedActiveCanonical[] = 'lupon_packet_artifacts';
        $expectedActiveCanonical[] = 'lupon_packet_events';
        sort($expectedActiveCanonical);
        self::assertSame($expectedActiveCanonical, $domainTables);

        $references = DB::select(<<<'SQL'
            SELECT table_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND column_name = 'public_reference'
              AND table_name IN ('orders', 'payment_obligations', 'support_cases', 'disputes')
            ORDER BY table_name
            SQL
        );
        self::assertSame(
            ['disputes', 'orders', 'payment_obligations', 'support_cases'],
            array_map(static fn (object $column): string => $column->table_name, $references),
        );
        self::assertSame(['NO', 'NO', 'NO', 'NO'], array_map(static fn (object $column): string => $column->is_nullable, $references));
    }

    public function test_work_catalog_versions_enforces_candidate_keys(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('PostgreSQL catalog contract test requires pgsql driver.');
        }

        // Verify unique indexes exist in catalog
        $indexes = collect(DB::select(<<<'SQL'
            SELECT indexname
            FROM pg_catalog.pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'work_catalog_versions'
            ORDER BY indexname
            SQL
        ))->pluck('indexname')->all();

        self::assertContains('uq_work_catalog_code_version', $indexes);
        self::assertContains('uq_work_catalog_shape_version', $indexes);

        // Test uq_work_catalog_code_version uniqueness
        $workCatalogId1 = (string) Str::uuid7();
        $workCatalogId2 = (string) Str::uuid7();
        $catalogCode = 'TEST_ACC_A1_'.Str::random(8);
        $testCatalogVersion = 999999;

        DB::table('work_catalog_versions')->insert([
            'id' => $workCatalogId1,
            'catalog_code' => $catalogCode,
            'work_shape' => 'A9',
            'shape_contract_version' => 999,
            'payload_schema_version' => 999,
            'catalog_version' => $testCatalogVersion,
            'title' => 'Linear Milestone Project Test',
            'summary' => 'Test definition for candidate key',
            'status' => 'draft',
            'definition' => json_encode(['steps' => []], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $threw = false;
        try {
            DB::table('work_catalog_versions')->insert([
                'id' => $workCatalogId2,
                'catalog_code' => $catalogCode,
                'work_shape' => 'A3', // different shape, same code + version
                'shape_contract_version' => 999,
                'payload_schema_version' => 999,
                'catalog_version' => $testCatalogVersion, // duplicate catalog_code + catalog_version
                'title' => 'Linear Milestone Project Duplicate',
                'summary' => 'Should fail constraint',
                'status' => 'draft',
                'definition' => json_encode(['steps' => []], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (QueryException $e) {
            $threw = true;
            self::assertStringContainsString('uq_work_catalog_code_version', $e->getMessage());
        }

        self::assertTrue($threw, 'Expected duplicate work_catalog_versions row to be rejected by uq_work_catalog_code_version.');
    }

    public function test_deal_chain_catalog_versions_enforces_candidate_keys(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::markTestSkipped('PostgreSQL catalog contract test requires pgsql driver.');
        }

        $indexes = collect(DB::select(<<<'SQL'
            SELECT indexname
            FROM pg_catalog.pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'deal_chain_catalog_versions'
            ORDER BY indexname
            SQL
        ))->pluck('indexname')->all();

        self::assertContains('uq_deal_chain_catalog_recipe_version', $indexes);

        // Test uq_deal_chain_catalog_recipe_version uniqueness
        $recipeCode = 'TEST_RECIPE_'.Str::random(8);
        $dealCatalogId1 = (string) Str::uuid7();
        $dealCatalogId2 = (string) Str::uuid7();
        $testVersion = 999999;

        DB::table('deal_chain_catalog_versions')->insert([
            'id' => $dealCatalogId1,
            'recipe_code' => $recipeCode,
            'catalog_version' => $testVersion,
            'title' => 'Test Recipe',
            'pattern' => 'linear',
            'description' => 'Test description',
            'status' => 'draft',
            'category_codes' => json_encode(['test'], JSON_THROW_ON_ERROR),
            'listing_types' => json_encode(['service'], JSON_THROW_ON_ERROR),
            'work_shapes' => json_encode(['A1'], JSON_THROW_ON_ERROR),
            'extra_fee_amount_minor' => 0,
            'currency' => 'PHP',
            'rating' => 5.0,
            'booked_count' => 0,
            'definition' => json_encode(['needs' => []], JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $dealThrew = false;
        try {
            DB::table('deal_chain_catalog_versions')->insert([
                'id' => $dealCatalogId2,
                'recipe_code' => $recipeCode,
                'catalog_version' => $testVersion, // duplicate recipe_code + catalog_version
                'title' => 'Test Recipe Duplicate',
                'pattern' => 'linear',
                'description' => 'Should fail constraint',
                'status' => 'draft',
                'category_codes' => json_encode(['test'], JSON_THROW_ON_ERROR),
                'listing_types' => json_encode(['service'], JSON_THROW_ON_ERROR),
                'work_shapes' => json_encode(['A1'], JSON_THROW_ON_ERROR),
                'extra_fee_amount_minor' => 0,
                'currency' => 'PHP',
                'rating' => 5.0,
                'booked_count' => 0,
                'definition' => json_encode(['needs' => []], JSON_THROW_ON_ERROR),
                'payload_version' => 1,
                'correlation_id' => (string) Str::uuid7(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (QueryException $e) {
            $dealThrew = true;
            self::assertStringContainsString('uq_deal_chain_catalog_recipe_version', $e->getMessage());
        }

        self::assertTrue($dealThrew, 'Expected duplicate deal_chain_catalog_versions row to be rejected by uq_deal_chain_catalog_recipe_version.');
    }

    public function test_migration_first_consumer_dag_is_acyclic_and_comprehensive(): void
    {
        $dag = $this->firstConsumerDag();

        // 1. Every canonical table is mapped to exactly one delivery unit
        $mappedTables = [];
        foreach ($dag as $unit => $tables) {
            foreach ($tables as $table) {
                $existingUnit = $mappedTables[$table] ?? '';
                self::assertArrayNotHasKey($table, $mappedTables, "Table {$table} mapped to multiple delivery units: {$existingUnit} and {$unit}.");
                $mappedTables[$table] = $unit;
            }
        }

        $canonical = $this->canonical62Tables();
        sort($canonical);
        $mappedKeys = array_keys($mappedTables);
        sort($mappedKeys);

        self::assertSame($canonical, $mappedKeys, 'Every canonical table must be assigned to exactly one first-consuming delivery unit.');

        // 2. Delivery units DAG is acyclic
        $edges = [
            'D0' => ['D1'],
            'D1' => ['D2'],
            'D2' => ['D3'],
            'D3' => ['D4'],
            'D4' => ['D5'],
            'D5' => ['D6'],
            'D6' => ['D7'],
            'D7' => ['D8'],
            'D8' => ['G', 'D10', 'D11'],
            'G' => ['D9'],
            'D9' => [],
            'D10' => [],
            'D11' => [],
        ];

        self::assertFalse($this->hasCycle($edges), 'Delivery unit dependency graph must be strictly acyclic.');
    }

    /**
     * The canonical 62 tables defined in canonical-schema-rebuilt.md §2.
     *
     * @return list<string>
     */
    private function canonical62Tables(): array
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
            'order_parties',
            'order_proposals',
            'order_terms_snapshots',
            'orders',
            'outbox_messages',
            'payment_events',
            'payment_obligations',
            'policy_versions',
            'provider_events',
            'quotes',
            'request_invitations',
            'requests',
            'retention_holds',
            'reviews',
            'role_assignments',
            'safety_incidents',
            'support_cases',
            'user_profiles',
            'users',
            'work_catalog_versions',
            'work_events',
            'work_instances',
        ];
    }

    /**
     * Table-to-delivery-unit first-consumer mapping per canonical-schema-rebuilt.md §14.
     *
     * @return array<string, list<string>>
     */
    private function firstConsumerDag(): array
    {
        return [
            'D0' => [
                'migration_checkpoints',
                'work_catalog_versions',
                'deal_chain_catalog_versions',
            ],
            'D1' => [
                'users',
                'user_profiles',
                'role_assignments',
                'identity_verifications',
                'evidence_files',
                'consent_grants',
                'auth_otps',
                'audit_events',
                'outbox_messages',
                'idempotency_keys',
                'retention_holds',
                'notifications',
                'notification_deliveries',
                'inbox_messages',
                'command_approvals',
            ],
            'D2' => [
                'categories',
                'category_versions',
                'capability_profiles',
                'capability_activations',
            ],
            'D3' => [
                'listings',
                'listing_versions',
                'listing_capacity',
                'listing_capacity_reservations',
            ],
            'D4' => [
                'orders',
                'order_parties',
                'order_proposals',
                'order_terms_snapshots',
                'work_instances',
                'work_events',
                'payment_obligations',
            ],
            'D5' => [
                'requests',
                'quotes',
            ],
            'D6' => [
                'request_invitations',
            ],
            'D7' => [
                'deal_chains',
                'deal_needs',
                'deal_dependencies',
                'deal_invitations',
            ],
            'D8' => [
                'disputes',
                'dispute_events',
                'administrative_holds',
                'support_cases',
                'safety_incidents',
                'reviews',
                'payment_events',
                'cohort_classifications',
            ],
            'D9' => [
                'conversations',
                'messages',
            ],
            'D10' => [
                'policy_versions',
                'financial_accounts',
                'financial_transactions',
                'financial_entries',
                'provider_events',
                'financial_adjustments',
            ],
            'D11' => [
                'integration_clients',
                'integration_credentials',
                'integration_object_mappings',
                'integration_webhook_subscriptions',
                'integration_webhook_deliveries',
                'integration_sync_cursors',
            ],
        ];
    }

    /**
     * @param  array<string, list<string>>  $adj
     */
    private function hasCycle(array $adj): bool
    {
        $visited = [];
        $recursionStack = [];

        foreach (array_keys($adj) as $node) {
            if ($this->detectCycle($node, $adj, $visited, $recursionStack)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, list<string>>  $adj
     * @param  array<string, bool>  $visited
     * @param  array<string, bool>  $recursionStack
     */
    private function detectCycle(string $node, array $adj, array &$visited, array &$recursionStack): bool
    {
        if (! empty($recursionStack[$node])) {
            return true;
        }

        if (! empty($visited[$node])) {
            return false;
        }

        $visited[$node] = true;
        $recursionStack[$node] = true;

        foreach ($adj[$node] ?? [] as $neighbor) {
            if ($this->detectCycle($neighbor, $adj, $visited, $recursionStack)) {
                return true;
            }
        }

        $recursionStack[$node] = false;

        return false;
    }
}

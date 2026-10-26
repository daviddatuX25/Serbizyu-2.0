<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t4MigrationPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T4 migration proofs require PostgreSQL.');
    }
}

function t4MigrationInstance(): Migration
{
    /** @var Migration $migration */
    $migration = require database_path('migrations/2026_09_04_050939_harden_work_contract_versions_for_t4.php');

    return $migration;
}

/**
 * @return array{user: User, order_id: string}
 */
function t4CreateOrderFixture(): array
{
    $user = User::factory()->create();
    $actor = new ResourceActor($user->id, $user->id);
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle($actor, [
        'title' => 'T4 Migration Listing',
        'description' => 'Test listing for T4 migration',
        'category_code' => 'home-help',
        'listing_type' => 'service',
        'work_shape' => 'A1',
    ], $correlationId);

    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
    ]);

    $orderId = (string) Str::uuid7();
    DB::table('orders')->insert([
        'id' => $orderId,
        'buyer_user_id' => $user->id,
        'provider_user_id' => $user->id,
        'listing_id' => $listing['id'],
        'status' => 'proposed',
        'origin' => 'direct',
        'mechanism' => 'direct',
        'version' => 1,
        'correlation_id' => $correlationId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['user' => $user, 'order_id' => $orderId];
}

function t4InsertWorkInstance(
    string $id,
    string $orderId,
    string $workShape,
    int $version,
    int $payloadVersion = 1,
    ?array $structure = ['task' => 'initial'],
): void {
    DB::table('work_instances')->insert([
        'id' => $id,
        'order_id' => $orderId,
        'work_shape' => $workShape,
        'status' => 'not_started',
        'version' => $version,
        'structure' => $structure === null ? null : json_encode($structure, JSON_THROW_ON_ERROR),
        'structure_payload_version' => $structure === null ? null : $payloadVersion,
        'shape_contract_version' => 1,
        'payload_schema_version' => $payloadVersion,
        'row_version' => $version,
        'revisions_allowed' => 1,
        'revisions_used' => 0,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

it('runs the actual migration repeatedly against the upgraded schema', function (): void {
    t4MigrationPgsqlOrSkip();

    $migration = t4MigrationInstance();
    $migration->up();
    $migration->up();

    expect(Schema::hasTable('t4_work_migration_audits'))->toBeTrue()
        ->and(Schema::hasColumn('t4_work_migration_audits', 'migrated_row_version'))->toBeTrue()
        ->and(Schema::hasColumn('t4_work_migration_audits', 'migrated_fingerprint'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'shape_contract_version'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'payload_schema_version'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'row_version'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'revisions_allowed'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'revisions_used'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'awaiting_signoff_at'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'cancelled_at'))->toBeTrue();
});

it('maps only supported legacy shapes and records a stable post-migration fingerprint', function (): void {
    t4MigrationPgsqlOrSkip();

    $migration = t4MigrationInstance();
    $migration->up();
    $fixture = t4CreateOrderFixture();
    $localServiceId = (string) Str::uuid7();
    $productHandoffId = (string) Str::uuid7();
    $requestBasedId = (string) Str::uuid7();

    t4InsertWorkInstance($localServiceId, $fixture['order_id'], 'local_service', 3, 2);
    t4InsertWorkInstance($productHandoffId, $fixture['order_id'], 'product_handoff', 5);
    t4InsertWorkInstance($requestBasedId, $fixture['order_id'], 'request_based', 2, 1, null);

    $migration->up();

    $migratedService = DB::table('work_instances')->where('id', $localServiceId)->first();
    expect($migratedService->work_shape)->toBe('A1')
        ->and((int) $migratedService->row_version)->toBe(3)
        ->and((int) $migratedService->payload_schema_version)->toBe(2);

    $migratedProduct = DB::table('work_instances')->where('id', $productHandoffId)->first();
    expect($migratedProduct->work_shape)->toBe('A4')
        ->and((int) $migratedProduct->row_version)->toBe(5)
        ->and((int) $migratedProduct->payload_schema_version)->toBe(1);

    $parkedRequest = DB::table('work_instances')->where('id', $requestBasedId)->first();
    expect($parkedRequest->work_shape)->toBe('request_based')
        ->and((int) $parkedRequest->row_version)->toBe(2);

    $serviceAudit = DB::table('t4_work_migration_audits')->where('work_instance_id', $localServiceId)->first();
    $productAudit = DB::table('t4_work_migration_audits')->where('work_instance_id', $productHandoffId)->first();
    expect($serviceAudit->legacy_work_shape)->toBe('local_service')
        ->and($serviceAudit->migrated_work_shape)->toBe('A1')
        ->and((int) $serviceAudit->legacy_row_version)->toBe(3)
        ->and((int) $serviceAudit->migrated_row_version)->toBe(3)
        ->and($serviceAudit->migrated_fingerprint)->not->toBeEmpty()
        ->and($productAudit->legacy_work_shape)->toBe('product_handoff')
        ->and($productAudit->migrated_work_shape)->toBe('A4')
        ->and((int) $productAudit->legacy_row_version)->toBe(5)
        ->and((int) $productAudit->migrated_row_version)->toBe(5);

    $fingerprint = $serviceAudit->migrated_fingerprint;
    $migration->up();

    $rerunAudit = DB::table('t4_work_migration_audits')->where('work_instance_id', $localServiceId)->first();
    $rerunService = DB::table('work_instances')->where('id', $localServiceId)->first();
    expect($rerunAudit->migrated_fingerprint)->toBe($fingerprint)
        ->and((int) $rerunService->row_version)->toBe(3);
});

it('reverts an audited row only when its post-migration snapshot is unchanged', function (): void {
    t4MigrationPgsqlOrSkip();

    $migration = t4MigrationInstance();
    $migration->up();
    $fixture = t4CreateOrderFixture();
    $workId = (string) Str::uuid7();
    t4InsertWorkInstance($workId, $fixture['order_id'], 'local_service', 3);

    $migration->up();
    $migration->down();

    $reverted = DB::table('work_instances')->where('id', $workId)->first();
    expect($reverted->work_shape)->toBe('local_service')
        ->and((int) $reverted->version)->toBe(3)
        ->and(Schema::hasTable('t4_work_migration_audits'))->toBeFalse()
        ->and(Schema::hasColumn('work_instances', 'row_version'))->toBeFalse();
});

it('refuses rollback before DDL when a canonical row progressed without changing shape', function (): void {
    t4MigrationPgsqlOrSkip();

    $migration = t4MigrationInstance();
    $migration->up();
    $fixture = t4CreateOrderFixture();
    $workId = (string) Str::uuid7();
    t4InsertWorkInstance($workId, $fixture['order_id'], 'local_service', 3);

    $migration->up();
    DB::table('work_instances')->where('id', $workId)->update([
        'version' => 4,
        'row_version' => 4,
    ]);

    expect(fn (): mixed => DB::transaction(fn (): mixed => $migration->down()))
        ->toThrow(RuntimeException::class, 'audited work instances changed after migration');

    $progressed = DB::table('work_instances')->where('id', $workId)->first();
    expect($progressed->work_shape)->toBe('A1')
        ->and((int) $progressed->version)->toBe(4)
        ->and((int) $progressed->row_version)->toBe(4)
        ->and(Schema::hasColumn('work_instances', 'row_version'))->toBeTrue()
        ->and(Schema::hasTable('t4_work_migration_audits'))->toBeTrue();
});

it('refuses before any destructive DDL when the audit table is missing', function (): void {
    t4MigrationPgsqlOrSkip();

    $migration = t4MigrationInstance();
    $migration->up();
    Schema::drop('t4_work_migration_audits');

    expect(fn (): mixed => DB::transaction(fn (): mixed => $migration->down()))
        ->toThrow(RuntimeException::class, 't4_work_migration_audits table is missing');

    $constraintNames = collect(DB::select(<<<'SQL'
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'work_instances'::regclass
          AND conname IN (
              'ck_work_instances_shape_contract_version',
              'ck_work_instances_payload_schema_version',
              'ck_work_instances_row_version',
              'ck_work_instances_revisions_used',
              'ck_work_instances_revisions_allowed'
          )
        SQL))->pluck('conname')->all();

    expect(Schema::hasColumn('work_instances', 'shape_contract_version'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'payload_schema_version'))->toBeTrue()
        ->and(Schema::hasColumn('work_instances', 'row_version'))->toBeTrue()
        ->and($constraintNames)->toHaveCount(5);
});

<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\DealCoordination\Application\ConfirmDealNeedAgreement;
use App\Modules\DealCoordination\Application\DealWorkGateAdapter;
use App\Modules\DealCoordination\Application\RespondToDealInvitation;
use App\Modules\DealCoordination\Application\StageDealChain;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\ResourceActor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function dependencyGateUpgradeMigration(): Migration
{
    /** @var Migration $migration */
    $migration = require database_path('migrations/2026_11_02_000100_allow_work_completed_dependency_gates.php');

    return $migration;
}

function dependencyGateUpgradeRequirePostgres(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('Dependency-gate populated-upgrade proofs require PostgreSQL.');
    }
}

/**
 * Form a real Deal Chain with two confirmed child Orders and one active completion dependency.
 *
 * @return array{chain_id: string, predecessor_need_id: string, successor_need_id: string, predecessor_order_id: string, predecessor_work_id: string, successor_order_id: string, successor_work_id: string, dependency_id: string}
 */
function dependencyGateUpgradeFixture(): array
{
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $correlationId = (string) Str::uuid7();
    $listingIds = [];

    foreach (['Service A', 'Service B'] as $title) {
        $draft = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => $title,
                'description' => 'Canonical accepted Work fixture for dependency-gate upgrade coverage.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A1',
                'price_amount_minor' => 25000,
                'currency' => 'PHP',
                'package_tiers' => [['id' => 'standard', 'title' => 'Synthetic service', 'price' => 250]],
                'milestone_stages' => [
                    ['id' => 'perform', 'title' => 'Perform the service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                    ['id' => 'signoff', 'title' => 'Customer accepts the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
                ],
            ],
            $correlationId,
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $draft['id'],
            actor: new ResourceActor((string) $provider->id, (string) $provider->id),
            expectedVersion: (int) $draft['expected_version'],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: $correlationId,
        );
        test()->actingAs($reviewer)->post(route('admin.listings.approve', $draft['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));
        $listingIds[] = (string) $draft['id'];
    }

    $staged = app(StageDealChain::class)->handle(
        coordinatorUserId: (string) $buyer->id,
        items: array_map(
            static fn (string $listingId): array => ['id' => $listingId, 'quantity' => 1],
            $listingIds,
        ),
        idempotencyKey: (string) Str::uuid7(),
        correlationId: $correlationId,
    );
    $needs = DB::table('deal_needs')->where('deal_chain_id', $staged['deal_chain_id'])->orderBy('ordinal')->get();
    if ($needs->count() < 2) {
        throw new \RuntimeException('The real Deal Chain fixture did not create two needs.');
    }

    $formed = [];
    foreach ($needs->take(2) as $need) {
        $invitation = DB::table('deal_invitations')
            ->where('deal_need_id', $need->id)
            ->where('status', 'sent')
            ->first();
        if ($invitation === null) {
            throw new \RuntimeException('The real Deal Chain fixture has no pending provider invitation.');
        }

        app(RespondToDealInvitation::class)->handle(
            actorUserId: (string) $invitation->invited_provider_user_id,
            invitationId: (string) $invitation->id,
            decision: 'accept',
            expectedInvitationVersion: (int) $invitation->version,
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $scope = is_array($invitation->scope) ? $invitation->scope : json_decode((string) $invitation->scope, true, 512, JSON_THROW_ON_ERROR);
        $acceptedNeed = DB::table('deal_needs')->where('id', $need->id)->firstOrFail();
        $confirmed = app(ConfirmDealNeedAgreement::class)->handle(
            actorUserId: (string) $buyer->id,
            dealChainId: (string) $staged['deal_chain_id'],
            dealNeedId: (string) $need->id,
            invitationId: (string) $invitation->id,
            expectedNeedVersion: (int) $acceptedNeed->version,
            termsHash: (string) $scope['terms_hash'],
            capacityHash: (string) $scope['capacity_hash'],
            idempotencyKey: (string) Str::uuid7(),
            correlationId: (string) Str::uuid7(),
        );
        $formed[(string) $need->id] = $confirmed;
    }

    $dependencyId = (string) Str::uuid7();
    DB::table('deal_dependencies')->insert([
        'id' => $dependencyId,
        'deal_chain_id' => $staged['deal_chain_id'],
        'predecessor_need_id' => $needs[0]->id,
        'successor_need_id' => $needs[1]->id,
        'dependency_type' => 'blocks',
        'status' => 'active',
        'condition_code' => 'work_completed',
        'created_by_user_id' => $buyer->id,
        'version' => 1,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return [
        'chain_id' => (string) $staged['deal_chain_id'],
        'predecessor_need_id' => (string) $needs[0]->id,
        'successor_need_id' => (string) $needs[1]->id,
        'predecessor_order_id' => (string) $formed[(string) $needs[0]->id]['order_id'],
        'predecessor_work_id' => (string) $formed[(string) $needs[0]->id]['work_instance_id'],
        'successor_order_id' => (string) $formed[(string) $needs[1]->id]['order_id'],
        'successor_work_id' => (string) $formed[(string) $needs[1]->id]['work_instance_id'],
        'dependency_id' => $dependencyId,
    ];
}

function dependencyGateUpgradeRestoreOldConstraint(): void
{
    DB::statement('ALTER TABLE work_step_dependency_gates DROP CONSTRAINT ck_work_step_dependency_gates_condition');
    DB::statement("ALTER TABLE work_step_dependency_gates ADD CONSTRAINT ck_work_step_dependency_gates_condition CHECK (condition_code IN ('part_ready', 'delivery_signed'))");
}

it('extends the old gate constraint and keeps completed Work without a verified current fact blocked on retry', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    DB::table('work_instances')->where('id', $fixture['predecessor_work_id'])->update(['status' => 'completed']);
    dependencyGateUpgradeRestoreOldConstraint();

    $migration = dependencyGateUpgradeMigration();
    $migration->up();
    $migration->up();

    $gate = DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->first();
    expect($gate)->not->toBeNull()
        ->and($gate->condition_code)->toBe('work_completed')
        ->and($gate->status)->toBe('blocked')
        ->and($gate->source_fact_id)->toBeNull()
        ->and($gate->cleared_at)->toBeNull()
        ->and(DB::table('work_dependency_source_facts')->where('event_type', 'work.completed')->count())->toBe(0)
        ->and(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->count())->toBe(1);

    $successorBefore = DB::table('work_instances')->where('id', $fixture['successor_work_id'])->sole();
    try {
        app(DealWorkGateAdapter::class)->assertWorkCanAdvance($fixture['successor_work_id'], (string) Str::uuid7());
        test()->fail('A status-only completion must not unlock the successor.');
    } catch (KernelException $error) {
        expect($error->envelope->code)->toBe('PREDECESSOR_GATE_BLOCKED');
        expect($error->status)->toBe(409);
    }
    expect(DB::table('work_instances')->where('id', $fixture['successor_work_id'])->sole())->toEqual($successorBefore);
});

it('rolls back the populated migration transaction and permits a clean retry', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    dependencyGateUpgradeRestoreOldConstraint();

    try {
        DB::transaction(function (): void {
            dependencyGateUpgradeMigration()->up();
            throw new \RuntimeException('Simulated interruption before commit.');
        });
    } catch (\RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Simulated interruption before commit.');
    }

    expect(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->exists())->toBeFalse();

    dependencyGateUpgradeMigration()->up();
    expect(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->value('status'))->toBe('blocked');
});

it('clears the upgraded gate only from the real current completion event and records its exact source fact', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    dependencyGateUpgradeRestoreOldConstraint();

    $work = DB::table('work_instances')->where('id', $fixture['predecessor_work_id'])->firstOrFail();
    $order = DB::table('orders')->where('id', $fixture['predecessor_order_id'])->firstOrFail();
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    $activeNode = collect($structure['nodes'])->firstWhere('status', 'active');
    expect($activeNode)->not->toBeNull();
    app(WorkExecutionService::class)->advanceNode(
        orderId: (string) $order->id,
        actorUserId: (string) $order->provider_user_id,
        nodeId: (string) $activeNode['id'],
        action: 'complete_step',
        correlationId: (string) Str::uuid7(),
    );
    $work = DB::table('work_instances')->where('id', $fixture['predecessor_work_id'])->firstOrFail();
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    $signoffNode = collect($structure['nodes'])->firstWhere('node_kind', 'final_signoff');
    expect($signoffNode)->not->toBeNull();
    app(WorkExecutionService::class)->advanceNode(
        orderId: (string) $order->id,
        actorUserId: (string) $order->provider_user_id,
        nodeId: (string) $signoffNode['id'],
        action: 'propose_completion',
        correlationId: (string) Str::uuid7(),
    );
    app(WorkExecutionService::class)->advanceNode(
        orderId: (string) $order->id,
        actorUserId: (string) $order->buyer_user_id,
        nodeId: (string) $signoffNode['id'],
        action: 'signoff_completion',
        correlationId: (string) Str::uuid7(),
    );

    expect(app(OutboxDispatcher::class)->dispatch(eventType: 'work.completed')->published)->toBe(1);
    $currentFact = DB::table('work_dependency_source_facts')->where('deal_need_id', $fixture['predecessor_need_id'])->sole();
    expect(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->exists())->toBeFalse();

    dependencyGateUpgradeMigration()->up();
    $gate = DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->firstOrFail();
    $fact = DB::table('work_dependency_source_facts')->where('id', $gate->source_fact_id)->firstOrFail();
    $auditCount = DB::table('audit_events')->where('action', 'deal_work_gate.cleared')->where('target_id', $gate->id)->count();
    expect($auditCount)->toBeGreaterThan(0);
    expect($gate->status)->toBe('cleared')
        ->and($gate->source_fact_id)->toBe($currentFact->id)
        ->and($gate->cleared_at)->not->toBeNull()
        ->and($fact->event_type)->toBe('work.completed')
        ->and($fact->deal_need_id)->toBe($fixture['predecessor_need_id'])
        ->and($fact->order_id)->toBe($fixture['predecessor_order_id'])
        ->and($fact->work_instance_id)->toBe($fixture['predecessor_work_id'])
        ->and($fact->confirmation_id)->toBe(DB::table('deal_need_confirmations')
        ->where('deal_need_id', $fixture['predecessor_need_id'])
        ->value('id'));

    dependencyGateUpgradeMigration()->up();
    expect(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->value('id'))->toBe($gate->id)
        ->and(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->value('source_fact_id'))->toBe($fact->id)
        ->and(DB::table('work_dependency_source_facts')->where('event_type', 'work.completed')->count())->toBe(1)
        ->and(DB::table('audit_events')->where('action', 'deal_work_gate.cleared')->where('target_id', $gate->id)->count())->toBe($auditCount);
    DB::table('deal_need_confirmations')
        ->where('deal_need_id', $fixture['predecessor_need_id'])
        ->update(['order_id' => $fixture['successor_order_id']]);
    dependencyGateUpgradeMigration()->up();
    expect(DB::table('work_step_dependency_gates')->where('id', $gate->id)->value('status'))->toBe('stale')
        ->and(DB::table('work_step_dependency_gates')->where('id', $gate->id)->value('source_fact_id'))->toBeNull()
        ->and(DB::table('work_dependency_source_facts')->where('id', $fact->id)->exists())->toBeTrue();

    DB::table('work_step_dependency_gates')->where('id', $gate->id)->delete();
    DB::table('deal_dependencies')->where('id', $fixture['dependency_id'])->delete();
    dependencyGateUpgradeMigration()->down();
    expect(DB::table('work_dependency_source_facts')->where('id', $fact->id)->exists())->toBeTrue();
});

it('keeps a replaced child Order from supplying the predecessor completion gate', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    DB::table('deal_need_confirmations')
        ->where('deal_need_id', $fixture['predecessor_need_id'])
        ->update(['order_id' => $fixture['successor_order_id']]);
    dependencyGateUpgradeRestoreOldConstraint();
    Log::spy();

    dependencyGateUpgradeMigration()->up();

    expect(DB::table('deal_need_confirmations')->where('deal_need_id', $fixture['predecessor_need_id'])->value('order_id'))
        ->toBe($fixture['successor_order_id'])
        ->and(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->where('status', 'cleared')->exists())
        ->toBeFalse()
        ->and(DB::table('work_dependency_source_facts')->where('deal_need_id', $fixture['predecessor_need_id'])->where('event_type', 'work.completed')->exists())
        ->toBeFalse();
    Log::shouldHaveReceived('warning')
        ->with(\Mockery::type('string'), \Mockery::on(
            fn (array $context): bool => $context['dependency_id'] === $fixture['dependency_id']
                && $context['confirmation_order_id'] === $fixture['successor_order_id']
                && $context['deal_need_id'] === $fixture['predecessor_need_id'],
        ))
        ->once();
});

it('refuses rollback before DDL when canonical work_completed dependency history exists', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    dependencyGateUpgradeRestoreOldConstraint();
    dependencyGateUpgradeMigration()->up();

    $beforeGate = DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->first();
    expect(fn () => dependencyGateUpgradeMigration()->down())
        ->toThrow(\RuntimeException::class);

    $afterGate = DB::table('work_step_dependency_gates')->where('id', $beforeGate->id)->first();
    expect($afterGate->condition_code)->toBe('work_completed')
        ->and($afterGate->status)->toBe('blocked')
        ->and(DB::table('deal_dependencies')->where('id', $fixture['dependency_id'])->value('condition_code'))->toBe('work_completed');
});

it('retains unsupported historical conditions unchanged and reports them without creating a gate', function (string $condition): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    DB::table('deal_dependencies')->where('id', $fixture['dependency_id'])->update(['condition_code' => $condition]);
    dependencyGateUpgradeRestoreOldConstraint();
    Log::spy();

    dependencyGateUpgradeMigration()->up();

    expect(DB::table('deal_dependencies')->where('id', $fixture['dependency_id'])->value('condition_code'))->toBe($condition)
        ->and(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->exists())->toBeFalse()
        ->and(DB::table('work_dependency_source_facts')->where('deal_need_id', $fixture['predecessor_need_id'])->exists())->toBeFalse();
    Log::shouldHaveReceived('warning')
        ->with(\Mockery::type('string'), \Mockery::on(
            fn (array $context): bool => $context['dependency_id'] === $fixture['dependency_id']
                && $context['condition_code'] === $condition,
        ))
        ->once();
})->with(['completed', 'source_ready', 'delivered_to_site', 'legacy_completed']);

it('refuses rollback for an accepted canonical dependency even after its gate row is absent', function (): void {
    dependencyGateUpgradeRequirePostgres();
    $fixture = dependencyGateUpgradeFixture();
    dependencyGateUpgradeRestoreOldConstraint();
    dependencyGateUpgradeMigration()->up();
    DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->delete();

    expect(DB::table('work_step_dependency_gates')->where('dependency_id', $fixture['dependency_id'])->exists())->toBeFalse()
        ->and(DB::table('deal_dependencies')->where('id', $fixture['dependency_id'])->value('condition_code'))->toBe('work_completed')
        ->and(fn () => dependencyGateUpgradeMigration()->down())->toThrow(\RuntimeException::class);
    expect((string) DB::selectOne(
        "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'ck_work_step_dependency_gates_condition'",
    )->definition)->toContain('work_completed');
});

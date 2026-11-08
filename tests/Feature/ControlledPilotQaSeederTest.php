<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\RespondToOrderProposal;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use Database\Seeders\ControlledPilotQaSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

afterEach(function (): void {
    if (str_starts_with(DB::connection()->getDatabaseName(), 'serbizyu_pilot_qa_test_')) {
        $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
        if (is_file($path)) {
            unlink($path);
        }
    }
});

function runControlledPilotSeeder(): void
{
    test()->seed(ControlledPilotQaSeeder::class);
}

function controlledPilotTestReady(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql'
        || ! str_starts_with(DB::connection()->getDatabaseName(), 'serbizyu_pilot_qa_test_')) {
        test()->markTestSkipped('Controlled pilot seeder tests require a dedicated PostgreSQL serbizyu_pilot_qa_test_* database.');
    }
    config()->set('app.env', 'testing');
    config()->set('serbizyu.environment', 'testing');
    config()->set('serbizyu.evidence_class', 'TEAM_TRAINING');
    config()->set('serbizyu.providers.payment.mode', 'disabled');
    config()->set('serbizyu.providers.notifications.mode', 'disabled');
    config()->set('serbizyu.providers.evidence.mode', 'local');
    config()->set('serbizyu.qa.password', Str::random(40));
    config()->set('filesystems.disks.local.root', storage_path('app/private'));
    config()->set('filesystems.disks.private.root', storage_path('app/private'));
}

it('refuses normal or mismatched environments before creating actors or resources', function (): void {
    $before = DB::table('users')->count();
    config()->set('app.env', 'production');
    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);
    expect(DB::table('users')->count())->toBe($before);

    config()->set('app.env', 'testing');
    config()->set('serbizyu.environment', 'production-connected');
    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);
    expect(DB::table('users')->count())->toBe($before);
});

it('refuses partial identity collisions without writing any fixture rows', function (): void {
    controlledPilotTestReady();
    User::factory()->create(['id' => '019b0000-0000-7100-8000-000000000101', 'phone_e164' => '+639170009999', 'email' => 'collision@example.test']);
    $before = DB::table('users')->count();

    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class, 'identity collision');
    expect(DB::table('users')->count())->toBe($before)
        ->and(DB::table('listings')->where('owner_user_id', '019b0000-0000-7100-8000-000000000102')->count())->toBe(0);
});

it('creates distinct actor roles and a direct-source proposed Order, then exports a truthful private report unchanged on rerun', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $recordPath = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $first = json_decode((string) file_get_contents($recordPath), true, flags: JSON_THROW_ON_ERROR);
    $order = DB::table('orders')->where('id', $first['order_id'])->first();
    $listing = DB::table('listings')->where('id', $first['listing_id'])->first();
    $proposal = DB::table('order_proposals')->where('order_id', $first['order_id'])->first();

    expect($first['synthetic_evidence'])->toBeTrue()
        ->and($first['initial_checkpoint'])->toBe('order_proposed_awaiting_provider_acceptance')
        ->and($first['current_checkpoint'])->toBe('order_proposed_awaiting_provider_acceptance')
        ->and($first['next_actor'])->toBe('provider')
        ->and($order->status)->toBe('proposed')
        ->and($proposal)->not->toBeNull()
        ->and(DB::table('work_instances')->where('order_id', $first['order_id'])->count())->toBe(0)
        ->and(DB::table('payment_obligations')->where('order_id', $first['order_id'])->count())->toBe(0)
        ->and($listing->owner_user_id)->toBe($first['actors']['provider']['id'])
        ->and($first['actors']['buyer']['id'])->not->toBe($first['actors']['provider']['id'])
        ->and($first['staff_roles'])->toBe(['maker' => 'admin', 'checker' => 'operate'])
        ->and($first['credential_status']['existing_actor_passwords_reset'])->toBeFalse()
        ->and(substr(sprintf('%o', fileperms($recordPath)), -4))->toBe('0600');

    $passwordHash = DB::table('users')->where('id', $first['actors']['buyer']['id'])->value('password');
    runControlledPilotSeeder();
    $second = json_decode((string) file_get_contents($recordPath), true, flags: JSON_THROW_ON_ERROR);
    expect($second['listing_id'])->toBe($first['listing_id'])
        ->and($second['order_id'])->toBe($first['order_id'])
        ->and(DB::table('users')->where('id', $first['actors']['buyer']['id'])->value('password'))->toBe($passwordHash);
});

it('recovers a transaction-interrupted first run with no partial rows', function (): void {
    controlledPilotTestReady();
    DB::unprepared("CREATE OR REPLACE FUNCTION controlled_pilot_fail_order_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'proposed' THEN RAISE EXCEPTION 'injected controlled pilot interruption'; END IF; RETURN NEW; END $$");
    DB::unprepared('CREATE TRIGGER controlled_pilot_fail_order BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION controlled_pilot_fail_order_once()');
    try {
        expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);
    } finally {
        DB::unprepared('DROP TRIGGER IF EXISTS controlled_pilot_fail_order ON orders');
        DB::unprepared('DROP FUNCTION IF EXISTS controlled_pilot_fail_order_once()');
    }
    expect(DB::table('users')->whereIn('email', ['pilot-f01-buyer@example.test', 'pilot-f01-provider@example.test'])->count())->toBe(0)
        ->and(DB::table('idempotency_keys')->where('scope', 'controlled-pilot-qa-f01')->count())->toBe(0);

    runControlledPilotSeeder();
    expect(DB::table('orders')->where('status', 'proposed')->whereIn('buyer_user_id', DB::table('users')->where('email', 'pilot-f01-buyer@example.test')->select('id'))->count())->toBe(1);
});

it('preserves a progressed order and expired staff clock on rerun', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    $order = DB::table('orders')->where('id', $manifest['order_id'])->first();
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $manifest['actors']['provider']['id'],
        orderId: $manifest['order_id'],
        expectedOrderVersion: (int) $order->version,
        idempotencyKey: 'pilot-f01-test-acceptance',
        correlationId: (string) $order->correlation_id,
    );
    $work = DB::table('work_instances')->where('order_id', $order->id)->first();
    $termsCount = DB::table('order_terms_snapshots')->where('order_id', $order->id)->count();
    $workStatus = $work->status;
    $workStructure = $work->structure;
    $paymentRows = DB::table('payment_obligations')->where('order_id', $order->id)->count();
    $expiredAt = DB::table('role_assignments')->where('user_id', $manifest['actors']['expired_staff']['id'])->value('expires_at');

    runControlledPilotSeeder();
    $rerunManifest = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    expect(DB::table('orders')->where('id', $order->id)->value('status'))->toBe('accepted')
        ->and(DB::table('work_instances')->where('id', $work->id)->value('status'))->toBe($workStatus)
        ->and(DB::table('work_instances')->where('id', $work->id)->value('structure'))->toEqual($workStructure)
        ->and(DB::table('order_terms_snapshots')->where('order_id', $order->id)->count())->toBe($termsCount)
        ->and(DB::table('role_assignments')->where('user_id', $manifest['actors']['expired_staff']['id'])->value('expires_at'))->toEqual($expiredAt)
        ->and(DB::table('payment_obligations')->where('order_id', $order->id)->count())->toBe($paymentRows)
        ->and($rerunManifest['current_checkpoint'])->toStartWith('order_accepted_work_')
        ->and($rerunManifest['next_actor'])->toBe('provider');

    $structure = json_decode($work->structure, true, flags: JSON_THROW_ON_ERROR);
    app(WorkExecutionService::class)->advanceNode(
        $order->id, $manifest['actors']['provider']['id'], $structure['active_node_id'],
        'request_confirmation', correlationId: (string) Str::uuid7(),
    );
    $submitted = DB::table('work_instances')->where('id', $work->id)->sole();

    runControlledPilotSeeder();

    $pending = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    expect($pending['next_actor'])->toBe('buyer');
    expect(DB::table('work_instances')->where('id', $work->id)->sole())->toEqual($submitted);
});

it('preserves expired proposal clocks without advertising an executable acceptance', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    DB::table('order_proposals')->where('order_id', $manifest['order_id'])->update(['expires_at' => now()->subMinute()]);
    $before = DB::table('order_proposals')->where('order_id', $manifest['order_id'])->sole();

    runControlledPilotSeeder();

    $after = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    expect($after['current_checkpoint'])->toBe('order_proposal_expired');
    expect($after['next_actor'])->toBeNull();
    expect(DB::table('order_proposals')->where('id', $before->id)->sole())->toEqual($before);
});

it('names the buyer as responder to a provider counteroffer instead of asking the proposer to accept', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    $order = DB::table('orders')->where('id', $manifest['order_id'])->sole();
    app(RespondToOrderProposal::class)->handle(
        $manifest['actors']['provider']['id'], $order->id, 'counter', $order->version,
        'f01-counter-proposal', (string) Str::uuid7(), ['amount_minor' => 28000, 'currency' => 'PHP'],
    );
    $before = DB::table('orders')->where('id', $order->id)->sole();

    runControlledPilotSeeder();

    $after = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    expect($after['next_actor'])->toBe('buyer');
    expect(DB::table('orders')->where('id', $order->id)->sole())->toEqual($before);
});

it('refuses changed unavailable source terms without rewriting the existing proposal', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    DB::table('listings')->where('id', $manifest['listing_id'])->update(['status' => 'paused']);
    $before = DB::table('orders')->where('id', $manifest['order_id'])->sole();
    $reportBefore = file_get_contents($path);

    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);

    expect(DB::table('orders')->where('id', $before->id)->sole())->toEqual($before);
    expect(file_get_contents($path))->toBe($reportBefore);
});

it('recovers a missing private report without resetting a changed account password', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    $buyer = User::findOrFail($manifest['actors']['buyer']['id']);
    $buyer->password = Str::random(40);
    $buyer->save();
    $hash = $buyer->getRawOriginal('password');
    unlink($path);

    runControlledPilotSeeder();

    $after = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    expect($after['order_id'])->toBe($manifest['order_id']);
    expect($after['credential_status']['config_password_matches_actor']['buyer'])->toBeFalse();
    expect($buyer->fresh()->getRawOriginal('password'))->toBe($hash);
});

it('rejects unsafe storage or provider configuration before writing fixture data', function (string $key, string $value): void {
    controlledPilotTestReady();
    config()->set($key, $value);
    $users = DB::table('users')->count();
    $orders = DB::table('orders')->count();

    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);

    expect(DB::table('users')->count())->toBe($users);
    expect(DB::table('orders')->count())->toBe($orders);
})->with([
    'private normal storage' => ['filesystems.disks.private.root', '/var/www/html/storage/app/private'],
    'local normal storage' => ['filesystems.disks.local.root', '/var/www/html/storage/app/private'],
    'live payment provider' => ['serbizyu.providers.payment.mode', 'live'],
    'live notification provider' => ['serbizyu.providers.notifications.mode', 'live'],
    'genuine evidence class' => ['serbizyu.evidence_class', 'GENUINE_TAGUDIN'],
]);

it('reports a mismatched accepted obligation without changing progressed business facts', function (): void {
    controlledPilotTestReady();
    runControlledPilotSeeder();
    $path = storage_path('app/private/'.DB::connection()->getDatabaseName().'.json');
    $manifest = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    $order = DB::table('orders')->where('id', $manifest['order_id'])->sole();
    app(FinalizeOrderAgreement::class)->handle(
        $manifest['actors']['provider']['id'], $order->id, $order->version,
        'f01-obligation-reference', (string) Str::uuid7(),
    );
    DB::table('payment_obligations')->where('order_id', $order->id)
        ->update(['recipient_user_id' => $manifest['actors']['buyer']['id']]);
    $before = DB::table('payment_obligations')->where('order_id', $order->id)->sole();

    expect(fn () => runControlledPilotSeeder())->toThrow(RuntimeException::class);

    expect(DB::table('payment_obligations')->where('id', $before->id)->sole())->toEqual($before);
    expect(DB::table('orders')->where('id', $order->id)->value('status'))->toBe('accepted');
});

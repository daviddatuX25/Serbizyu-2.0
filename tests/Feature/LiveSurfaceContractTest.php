<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\AdminWorkspaceSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\OrdersStockSeeder;
use Database\Seeders\PaymentObligationScenarioSeeder;
use Database\Seeders\RequestQuoteSeeder;
use Database\Seeders\TagudinBrowseCatalogSeeder;
use Database\Seeders\WorkExecutionScenariosSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(DatabaseTransactions::class);

test('distinct merchant and provider principals own their respective listings and hardware does not collide with maya tagudin', function (): void {
    app(DatabaseSeeder::class)->run();

    // Check Tagudin Hardware vs Maya Tagudin
    $hardwareOwnerId = DB::table('listings')->where('id', Fix::LISTING_AC_CAPACITOR)->value('owner_user_id');
    $holcimOwnerId = DB::table('listings')->where('id', Fix::LISTING_HOLCIM_CEMENT)->value('owner_user_id');
    $mayaListingId = '0198a3b1-7c40-7abc-8def-5234567890b1';
    $mayaOwnerId = DB::table('listings')->where('id', $mayaListingId)->value('owner_user_id');

    expect($hardwareOwnerId)->toBe(Fix::STORE_USER_ID)
        ->and($holcimOwnerId)->toBe(Fix::STORE_USER_ID)
        ->and($mayaOwnerId)->toBe('0198a3b1-7c40-7abc-8def-2234567890ab')
        ->and($hardwareOwnerId)->not->toBe($mayaOwnerId);

    // Kuya Ben owns AC Clean
    $kuyaBenOwnerId = DB::table('listings')->where('id', Fix::LISTING_AC_CLEAN)->value('owner_user_id');
    expect($kuyaBenOwnerId)->toBe(Fix::TECH_USER_ID);

    // Danny Express owns Courier
    $courierOwnerId = DB::table('listings')->where('id', Fix::LISTING_COURIER)->value('owner_user_id');
    expect($courierOwnerId)->toBe(Fix::COURIER_USER_ID);

    // Lola owns Bibingka
    $lolaOwnerId = DB::table('listings')->where('id', Fix::LISTING_BIBINGKA)->value('owner_user_id');
    expect($lolaOwnerId)->toBe(Fix::LOLA_USER_ID);
});

test('seeding twice is completely idempotent, produces zero duplicate rows, and preserves stock balances', function (): void {
    app(DatabaseSeeder::class)->run();

    $listingsCount1 = DB::table('listings')->count();
    $ordersCount1 = DB::table('orders')->count();
    $requestsCount1 = DB::table('requests')->count();
    $quotesCount1 = DB::table('quotes')->count();
    $casesCount1 = DB::table('support_cases')->count();
    $messagesCount1 = DB::table('messages')->count();

    $holcimBucket = DB::table('listing_capacity')->where('resource_key', 'var-holcim-40kg')->first();
    expect($holcimBucket)->not->toBeNull();
    $qty1 = (int) $holcimBucket->quantity;
    $remaining1 = (int) $holcimBucket->remaining_quantity;

    // Run again
    app(DatabaseSeeder::class)->run();

    expect(DB::table('listings')->count())->toBe($listingsCount1)
        ->and(DB::table('orders')->count())->toBe($ordersCount1)
        ->and(DB::table('requests')->count())->toBe($requestsCount1)
        ->and(DB::table('quotes')->count())->toBe($quotesCount1)
        ->and(DB::table('support_cases')->count())->toBe($casesCount1)
        ->and(DB::table('messages')->count())->toBe($messagesCount1);

    $holcimBucket2 = DB::table('listing_capacity')->where('resource_key', 'var-holcim-40kg')->first();
    expect((int) $holcimBucket2->quantity)->toBe($qty1)
        ->and((int) $holcimBucket2->remaining_quantity)->toBe($remaining1);
});

test('production and genuine environments perform zero demo writes', function (): void {
    Config::set('serbizyu.public_environment', 'genuine');

    $seeder = app(RequestQuoteSeeder::class);
    $initialRequests = DB::table('requests')->count();
    $seeder->run();
    expect(DB::table('requests')->count())->toBe($initialRequests);

    $stockSeeder = app(OrdersStockSeeder::class);
    $initialMovements = DB::table('stock_movements')->count();
    $stockSeeder->run();
    expect(DB::table('stock_movements')->count())->toBe($initialMovements);

    $paymentSeeder = app(PaymentObligationScenarioSeeder::class);
    $initialHolds = DB::table('administrative_holds')->count();
    $paymentSeeder->run();
    expect(DB::table('administrative_holds')->count())->toBe($initialHolds);

    $workSeeder = app(WorkExecutionScenariosSeeder::class);
    $initialWork = DB::table('work_instances')->count();
    $workSeeder->run();
    expect(DB::table('work_instances')->count())->toBe($initialWork);

    $adminSeeder = app(AdminWorkspaceSeeder::class);
    $initialCases = DB::table('support_cases')->count();
    $adminSeeder->run();
    expect(DB::table('support_cases')->count())->toBe($initialCases);
});

test('canonical Cool Again deal chain ORD-2710/2711/2714 and OBL-1041/1042/1048 exist with 1110 PHP informational sum', function (): void {
    app(DatabaseSeeder::class)->run();

    $chain = DB::table('deal_chains')->where('id', Fix::CHAIN_ID_ONGOING)->first();
    expect($chain)->not->toBeNull()
        ->and((string) $chain->title)->toBe('Cool Again');

    $order1 = DB::table('orders')->where('id', Fix::ORDER_ID_PART)->first();
    $order2 = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
    $order3 = DB::table('orders')->where('id', Fix::ORDER_ID_LABOR)->first();

    expect((string) $order1->public_reference)->toBe('ORD-2710')
        ->and((string) $order2->public_reference)->toBe('ORD-2711')
        ->and((string) $order3->public_reference)->toBe('ORD-2714');

    $obl1 = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_PART)->first();
    $obl2 = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->first();
    $obl3 = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_LABOR)->first();

    expect((string) $obl1->public_reference)->toBe('OBL-1041')
        ->and((string) $obl1->status)->toBe('settled')
        ->and((int) $obl1->amount_minor)->toBe(18000)
        ->and((string) $obl2->public_reference)->toBe('OBL-1042')
        ->and((string) $obl2->status)->toBe('settled')
        ->and((int) $obl2->amount_minor)->toBe(8000)
        ->and((string) $obl3->public_reference)->toBe('OBL-1048')
        ->and((string) $obl3->status)->toBe('not_due')
        ->and((int) $obl3->amount_minor)->toBe(85000);

    $sumMinor = (int) $obl1->amount_minor + (int) $obl2->amount_minor + (int) $obl3->amount_minor;
    expect($sumMinor)->toBe(111000); // ₱1,110.00
});

test('canonical cash declaration mismatch OBL-1088, CASE-0413, and active obligation hold exist', function (): void {
    app(DatabaseSeeder::class)->run();

    $order = DB::table('orders')->where('public_reference', 'ORD-2731')->first();
    expect($order)->not->toBeNull();

    $obligation = DB::table('payment_obligations')->where('public_reference', 'OBL-1088')->first();
    expect($obligation)->not->toBeNull()
        ->and((string) $obligation->status)->toBe('disputed_mismatch')
        ->and((string) $obligation->lane)->toBe('external_cash')
        ->and((int) $obligation->amount_minor)->toBe(65000);

    $case = DB::table('support_cases')->where('public_reference', 'CASE-0413')->first();
    expect($case)->not->toBeNull()
        ->and((string) $case->category)->toBe('payment_mismatch_cash')
        ->and((string) $case->status)->toBe('open');

    $hold = DB::table('administrative_holds')->where('payment_obligation_id', $obligation->id)->first();
    expect($hold)->not->toBeNull()
        ->and((string) $hold->status)->toBe('active')
        ->and((string) $hold->reason_class)->toBe('dispute');
});

test('canonical P2P GCash proof OBL-772 contains verified private storage image bytes', function (): void {
    app(DatabaseSeeder::class)->run();

    $obligation = DB::table('payment_obligations')->where('public_reference', 'OBL-772')->first();
    expect($obligation)->not->toBeNull()
        ->and((string) $obligation->status)->toBe('payer_submitted_p2p_proof')
        ->and((string) $obligation->lane)->toBe('p2p_transfer')
        ->and((int) $obligation->amount_minor)->toBe(36000);

    $evidence = DB::table('evidence_files')->where('id', PaymentObligationScenarioSeeder::EVIDENCE_P2P)->first();
    expect($evidence)->not->toBeNull()
        ->and((string) $evidence->scan_status)->toBe('clean')
        ->and((string) $evidence->media_type)->toBe('image/png')
        ->and((int) $evidence->size_bytes)->toBeGreaterThan(0);

    expect(Storage::disk('private')->exists((string) $evidence->storage_key))->toBeTrue();
    $bytes = Storage::disk('private')->get((string) $evidence->storage_key);
    expect(hash('sha256', (string) $bytes))->toBe((string) $evidence->content_hash);
});

test('canonical Holcim 40kg stock ledger maintains 20 on-hand, 4 held, 5 committed, and 11 available with movement history', function (): void {
    app(DatabaseSeeder::class)->run();

    $bucket = DB::table('listing_capacity')->where('resource_key', 'var-holcim-40kg')->first();
    expect($bucket)->not->toBeNull();

    $reservations = DB::table('listing_capacity_reservations')
        ->where('listing_capacity_id', $bucket->id)
        ->get();

    $held = (int) $reservations->where('status', 'held')->sum('quantity');
    $committed = (int) $reservations->where('status', 'committed')->sum('quantity');
    $onHand = (int) $bucket->quantity;
    $available = $onHand - $held - $committed;

    expect($onHand)->toBe(20)
        ->and($held)->toBe(4)
        ->and($committed)->toBe(5)
        ->and($available)->toBe(11);

    // Verify stock movement references
    $movements = DB::table('stock_movements')
        ->where('listing_capacity_id', $bucket->id)
        ->pluck('reference')
        ->all();

    expect($movements)->toContain('RCV-040')
        ->and($movements)->toContain('ORD-2722')
        ->and($movements)->toContain('ORD-2712')
        ->and($movements)->toContain('ADJ-008')
        ->and($movements)->toContain('INV-TH-204');
});

test('canonical A1, A3, A4, and A9 Work execution instances exist with truthful artifacts', function (): void {
    app(DatabaseSeeder::class)->run();

    // A1
    $workA1 = DB::table('work_instances')->where('id', WorkExecutionScenariosSeeder::WORK_A1)->first();
    expect($workA1)->not->toBeNull()
        ->and((string) $workA1->work_shape)->toBe('A1')
        ->and((string) $workA1->status)->toBe('in_progress');

    // A3
    $resA3Booked = DB::table('appointment_reservations')->where('id', WorkExecutionScenariosSeeder::RES_A3_BOOKED)->first();
    $resA3Held = DB::table('appointment_reservations')->where('id', WorkExecutionScenariosSeeder::RES_A3_HELD)->first();
    $blockA3 = DB::table('provider_agenda_blocks')->where('schedule_resource_id', '0198a3b1-7c40-7abc-8def-5c0000000001')->first();
    $changeReqA3 = DB::table('work_schedule_change_requests')->where('id', WorkExecutionScenariosSeeder::CHANGE_REQ_A3)->first();

    expect($resA3Booked)->not->toBeNull()
        ->and((string) $resA3Booked->status)->toBe('committed')
        ->and($resA3Held)->not->toBeNull()
        ->and((string) $resA3Held->status)->toBe('held')
        ->and($blockA3)->not->toBeNull()
        ->and($changeReqA3)->not->toBeNull()
        ->and((string) $changeReqA3->status)->toBe('pending');

    // A4
    $workA4 = DB::table('work_instances')->where('id', WorkExecutionScenariosSeeder::WORK_A4)->first();
    expect($workA4)->not->toBeNull()
        ->and((string) $workA4->work_shape)->toBe('A4');

    // A9
    $workA9 = DB::table('work_instances')->where('id', WorkExecutionScenariosSeeder::WORK_A9)->first();
    expect($workA9)->not->toBeNull()
        ->and((string) $workA9->work_shape)->toBe('A9')
        ->and((string) $workA9->status)->toBe('awaiting_signoff')
        ->and(DB::table('work_deliveries')->where('work_instance_id', WorkExecutionScenariosSeeder::WORK_A9)->count())->toBe(2);

    expect(Storage::disk('private')->exists('evidence/work/'.WorkExecutionScenariosSeeder::WORK_A9.'/card-v1.pdf'))->toBeTrue();
    expect(Storage::disk('private')->exists('evidence/work/'.WorkExecutionScenariosSeeder::WORK_A9.'/card-v2.pdf'))->toBeTrue();
});

test('canonical Admin Inbox cases CASE-0412 through CASE-0418 have exactly 6 open and 1 closed with correct responsibility', function (): void {
    app(DatabaseSeeder::class)->run();

    $cases = DB::table('support_cases')
        ->whereIn('public_reference', ['CASE-0412', 'CASE-0413', 'CASE-0414', 'CASE-0415', 'CASE-0416', 'CASE-0417', 'CASE-0418'])
        ->get();

    expect($cases)->toHaveCount(7);

    $openCases = $cases->where('status', 'open');
    $closedCases = $cases->where('status', 'closed');

    expect($openCases)->toHaveCount(6)
        ->and($closedCases)->toHaveCount(1);

    // 4 waiting on staff (me)
    $waitingOnStaff = $openCases->where('current_responsibility_party', 'staff');
    expect($waitingOnStaff)->toHaveCount(4);

    // 2 waiting on others (participant)
    $waitingOnOthers = $openCases->where('current_responsibility_party', 'participant');
    expect($waitingOnOthers)->toHaveCount(2);
});

test('persisted conversations include Order 1:1, Deal Chain Relay, Carlo Agent Acting-For with consent grant, and Case threads', function (): void {
    app(DatabaseSeeder::class)->run();

    $orderConv = DB::table('conversations')->where('id', AdminWorkspaceSeeder::CONV_ORDER)->first();
    $relayConv = DB::table('conversations')->where('id', AdminWorkspaceSeeder::CONV_RELAY)->first();
    $agentConv = DB::table('conversations')->where('id', AdminWorkspaceSeeder::CONV_AGENT)->first();
    $caseConv = DB::table('conversations')->where('id', AdminWorkspaceSeeder::CONV_CASE)->first();

    expect($orderConv)->not->toBeNull()
        ->and($relayConv)->not->toBeNull()
        ->and($agentConv)->not->toBeNull()
        ->and($caseConv)->not->toBeNull();

    // Verify Carlo Agent message with consent_grant_id
    $agentMessage = DB::table('messages')
        ->where('conversation_id', AdminWorkspaceSeeder::CONV_AGENT)
        ->where('actor_user_id', Fix::CARLO_AGENT_USER_ID)
        ->first();

    expect($agentMessage)->not->toBeNull()
        ->and((string) $agentMessage->owner_user_id)->toBe(Fix::STORE_USER_ID)
        ->and((string) $agentMessage->consent_grant_id)->toBe(AdminWorkspaceSeeder::GRANT_CARLO);

    // Verify consent grant in consent_grants table
    $grant = DB::table('consent_grants')->where('id', AdminWorkspaceSeeder::GRANT_CARLO)->first();
    expect($grant)->not->toBeNull()
        ->and((string) $grant->status)->toBe('active')
        ->and((string) $grant->grantor_user_id)->toBe(Fix::STORE_USER_ID)
        ->and((string) $grant->grantee_user_id)->toBe(Fix::CARLO_AGENT_USER_ID);
});

test('100 percent of admin routes are guarded behind staff authentication', function (): void {
    $routes = Route::getRoutes()->getRoutes();
    $adminRoutes = [];

    foreach ($routes as $route) {
        $uri = $route->uri();
        if ($uri === 'admin' || str_starts_with($uri, 'admin/')) {
            $middleware = $route->gatherMiddleware();
            $adminRoutes[$uri] = $middleware;

            // Must have staff authentication guard
            $hasAuthGuard = collect($middleware)->contains(function ($m): bool {
                return str_contains((string) $m, 'EnsureAuthenticated:admin')
                    || str_contains((string) $m, 'admin');
            });

            expect($hasAuthGuard)->toBeTrue();
        }
    }

    expect(count($adminRoutes))->toBeGreaterThanOrEqual(15);
});

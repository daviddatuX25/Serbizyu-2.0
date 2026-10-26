<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CapacityReservationService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('A4 handoff proof tests require PostgreSQL.');
    }

    $this->bootPhoneOtpAuth();
    $this->withoutMiddleware(ThrottleRequests::class);
    Storage::fake('private');
    Storage::fake('public');
});

/**
 * @return array{
 *     order_id: string,
 *     provider: User,
 *     buyer: User,
 *     work_id: string,
 *     nodes: list<array<string, mixed>>,
 *     reservation_id: string,
 *     capacity_id: string
 * }
 */
function a4ProofCreateAcceptedProductOrder(TestCase $test, User $provider, User $buyer, bool $authoredSchema2 = true): array
{
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        [
            'title' => 'A4 proof test product',
            'description' => 'Product listing for governed A4 proof tests.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
        ],
        $correlationId,
    );
    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'active',
        'review_status' => 'approved',
        'updated_at' => now(),
    ]);
    $listingVersion = DB::table('listing_versions')
        ->where('listing_id', $listing['id'])
        ->where('version_number', (int) $listing['current_version'])
        ->first();
    $terms = is_array($listingVersion->terms)
        ? $listingVersion->terms
        : (json_decode((string) $listingVersion->terms, true, 512, JSON_THROW_ON_ERROR) ?: []);
    $terms['variants'] = [[
        'id' => 'a4-proof-variant',
        'name' => 'Proof-test item',
        'price_amount_minor' => 5000,
        'is_default' => true,
    ]];
    DB::table('listing_versions')->where('id', $listingVersion->id)->update([
        'terms' => json_encode($terms, JSON_THROW_ON_ERROR),
        'price_amount_minor' => 5000,
        'currency' => 'PHP',
        'published_at' => now(),
        'updated_at' => now(),
    ]);
    app(CapacityReservationService::class)->ensureBucket(
        listingId: (string) $listing['id'],
        listingVersionId: (string) $listingVersion->id,
        capacityType: 'quantity',
        quantity: 5,
        correlationId: $correlationId,
        resourceKey: 'a4-proof-variant',
    );

    $proposal = $test->actingAs($buyer)->postJson(route('orders.propose', $listing['id']), [
        'expected_listing_version' => (int) DB::table('listings')->where('id', $listing['id'])->value('current_version'),
        'listing_version_id' => (string) $listingVersion->id,
        'variant_id' => 'a4-proof-variant',
        'quantity' => 2,
        'idempotency_key' => 'a4-proof-proposal-'.$listing['id'],
        'amount_minor' => 1,
        'currency' => 'PHP',
    ])->assertCreated();
    $orderId = (string) $proposal->json('data.order_id');
    $reservationId = (string) $proposal->json('data.capacity_reservation_id');
    $capacityId = (string) DB::table('listing_capacity_reservations')->where('id', $reservationId)->value('listing_capacity_id');

    $test->actingAs($provider)->postJson(route('orders.accept', $orderId), [
        'expected_order_version' => 1,
        'idempotency_key' => 'a4-proof-accept-'.$orderId,
    ])->assertOk();

    $work = DB::table('work_instances')->where('order_id', $orderId)->firstOrFail();
    if ($authoredSchema2) {
        $nodeDefinitions = [];
        foreach ([1, 2, 3] as $ordinal) {
            $nodeDefinitions[] = [
                'id' => 'a4-proof-'.$orderId.'-'.$ordinal,
                'ordinal' => $ordinal,
                'title' => match ($ordinal) {
                    1 => 'Preparation proof',
                    2 => 'Custody proof',
                    default => 'Recipient receipt proof',
                },
                'description' => 'Authored A4 proof phase '.$ordinal,
                'node_kind' => match ($ordinal) {
                    1 => 'checkin_intake',
                    2 => 'handoff_ready',
                    default => 'final_signoff',
                },
                'evidence_type' => 'photo_required',
                'evidence_description' => 'Attach a clean phase photo and complete the authored checklist and measurement.',
                'control_mode' => $ordinal === 1 ? 'provider_advance' : 'counterparty_handoff',
                'required_proofs' => $ordinal === 1
                    ? ['photo_proof', 'checklist_steps', 'metric_reading', 'gps_checkin']
                    : ['photo_proof', 'checklist_steps', 'metric_reading'],
                'approval_method' => $ordinal === 3 ? 'worker_dropoff' : 'none',
                'handoff_party' => $ordinal === 3 ? 'worker_dropoff' : null,
                'checklist_items' => [[
                    'id' => 'a4-check-'.$ordinal,
                    'label' => 'Phase '.$ordinal.' item is verified',
                    'required' => true,
                ]],
                'metric_requirements' => [[
                    'id' => 'a4-count-'.$ordinal,
                    'name' => 'Verified item count',
                    'unit' => 'pieces',
                    'required' => true,
                    'target' => 2,
                    'min' => 1,
                    'max' => 3,
                ]],
            ];
        }
        $structure = app(WorkExecutionService::class)->initializeStructure(
            sourceTerms: ['work_specification' => [
                'shape_contract_version' => 1,
                'payload_schema_version' => 2,
                'nodes' => $nodeDefinitions,
            ]],
            workShape: 'A4',
            correlationId: $correlationId,
            shapeContractVersion: 1,
            payloadSchemaVersion: 2,
        );
        DB::table('work_instances')->where('id', $work->id)->update([
            'payload_schema_version' => 2,
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
            'structure_payload_version' => 1,
            'updated_at' => now(),
        ]);
    } else {
        $structure = is_array($work->structure)
            ? $work->structure
            : json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($structure) || ! is_array($structure['nodes'] ?? null)) {
            throw new RuntimeException('The published default A4 Work definition is unavailable.');
        }
    }

    return [
        'order_id' => $orderId,
        'provider' => $provider,
        'buyer' => $buyer,
        'work_id' => (string) $work->id,
        'nodes' => $structure['nodes'],
        'reservation_id' => $reservationId,
        'capacity_id' => $capacityId,
    ];
}

function a4ProofAddCourier(string $orderId): User
{
    $courier = User::factory()->create();
    $now = now();
    DB::table('order_parties')->insert([
        'id' => (string) Str::uuid7(),
        'order_id' => $orderId,
        'user_id' => (string) $courier->id,
        'party_type' => 'courier',
        'responsibility' => 'delivery',
        'scope' => json_encode([], JSON_THROW_ON_ERROR),
        'consent_grant_id' => null,
        'status' => 'active',
        'effective_at' => $now,
        'ended_at' => null,
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return $courier;
}

function a4ProofAddFinalRecipient(string $orderId): User
{
    $recipient = User::factory()->create();
    $now = now();
    DB::table('order_parties')->insert([
        'id' => (string) Str::uuid7(),
        'order_id' => $orderId,
        'user_id' => (string) $recipient->id,
        'party_type' => 'recipient',
        'responsibility' => 'final_recipient',
        'scope' => json_encode([], JSON_THROW_ON_ERROR),
        'consent_grant_id' => null,
        'status' => 'active',
        'effective_at' => $now,
        'ended_at' => null,
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return $recipient;
}

/** @return array<string, mixed> */
function a4ProofValidFields(int $ordinal): array
{
    $proof = [
        'checklist_responses' => [['id' => 'a4-check-'.$ordinal, 'completed' => true]],
        'metric_readings' => [['id' => 'a4-count-'.$ordinal, 'value' => 2, 'unit' => 'pieces']],
        'notes' => 'A4 phase '.$ordinal.' evidence recorded.',
    ];
    if ($ordinal === 1) {
        $proof['location'] = [
            'latitude' => 15.053,
            'longitude' => 120.927,
            'accuracy_m' => 5,
            'source' => 'gps',
            'observed_at' => now()->toIso8601String(),
        ];
    }

    return $proof;
}

function a4ProofUploadPhoto(TestCase $test, User $actor, string $orderId, string $nodeId): string
{
    $photoBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    if (! is_string($photoBytes)) {
        throw new RuntimeException('The valid A4 test photo fixture could not be decoded.');
    }

    $response = $test->actingAs($actor)
        ->withHeader('Accept', 'application/json')
        ->post(route('orders.work-evidence.store', ['order' => $orderId, 'node' => $nodeId]), [
            'file' => UploadedFile::fake()->createWithContent('a4-proof.png', $photoBytes),
            'tool_key' => 'photo_proof',
        ])
        ->assertCreated();
    $evidenceId = (string) $response->json('data.id');

    app(OutboxDispatcher::class)->dispatch(eventType: 'work.evidence.scan_requested', aggregateId: $evidenceId);
    expect(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('clean');

    return $evidenceId;
}

/**
 * @param  array<string, mixed>  $fixture
 * @return array<string, mixed>
 */
function a4ProofPrepareAndDepart(TestCase $test, array $fixture, string $mode = 'counter_pickup'): array
{
    /** @var User $provider */
    $provider = $fixture['provider'];
    /** @var User $buyer */
    $buyer = $fixture['buyer'];
    $orderId = (string) $fixture['order_id'];
    $nodes = $fixture['nodes'];
    $preparedPhoto = a4ProofUploadPhoto($test, $provider, $orderId, (string) $nodes[0]['id']);
    $test->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        'evidence_file_id' => $preparedPhoto,
        'expected_order_version' => (int) DB::table('orders')->where('id', $orderId)->value('version'),
        'work_version' => (int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'),
        'node_id' => (string) $nodes[0]['id'],
        'idempotency_key' => 'a4-proof-prepared-'.$orderId,
        ...a4ProofValidFields(1),
    ])->assertOk()->assertJsonPath('data.status', 'prepared');

    $courier = $mode === 'courier_delivery' ? a4ProofAddCourier($orderId) : null;
    $offer = $test->actingAs($provider)->postJson(route('orders.handoff.custody', $orderId), [
        'transfer_mode' => $mode,
        ...($courier === null ? [] : ['courier_user_id' => (string) $courier->id]),
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-proof-offer-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'offered');
    $transferId = (string) $offer->json('data.id');
    $custodian = $courier ?? $buyer;
    $custodyPhoto = a4ProofUploadPhoto($test, $custodian, $orderId, (string) $nodes[1]['id']);
    $custodyPayload = [
        'evidence_file_id' => $custodyPhoto,
        'expected_transfer_version' => 2,
        'work_version' => (int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'),
        'node_id' => (string) $nodes[1]['id'],
        'idempotency_key' => 'a4-proof-depart-'.$orderId,
        ...a4ProofValidFields(2),
    ];
    $test->actingAs($custodian)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $custodyPayload)
        ->assertOk()->assertJsonPath('data.status', 'departed');
    $test->actingAs($custodian)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $custodyPayload)
        ->assertOk()->assertJsonPath('data.replay', true);

    $departure = DB::table('outbox_messages')
        ->where('event_type', 'work.custody_departed')
        ->where('aggregate_id', $fixture['work_id'])
        ->firstOrFail();
    $departurePayload = json_decode((string) $departure->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($departurePayload['handoff_transfer_id'])->toBe($transferId)
        ->and($departurePayload['departed_by_user_id'])->toBe((string) $custodian->id)
        ->and($departurePayload['custody_recipient_user_id'])->toBe((string) $custodian->id)
        ->and($departurePayload['stock_fulfilled'])->toBeTrue()
        ->and($departurePayload['stock_reservation_id'])->toBe($fixture['reservation_id'])
        ->and($departurePayload['stock_movement_command_scope'])->toBe('order.handoff.fulfillment:'.$orderId)
        ->and($departurePayload['stock_movement_idempotency_key'])->toBe('a4-fulfillment:'.$orderId)
        ->and($departurePayload['stock_fulfilled_quantity'])->toBe(2)
        ->and(DB::table('outbox_messages')->where('event_type', 'work.custody_departed')->where('aggregate_id', $fixture['work_id'])->count())->toBe(1)
        ->and(DB::table('outbox_messages')->whereIn('event_type', ['work.delivered_to_site', 'work.completed'])->where('aggregate_id', $fixture['work_id'])->count())->toBe(0);

    return [
        ...$fixture,
        'transfer_id' => $transferId,
        'courier' => $courier,
        'custodian' => $custodian,
        'prepared_photo_id' => $preparedPhoto,
        'custody_photo_id' => $custodyPhoto,
    ];
}

/** @return array<string, mixed> */
function a4ProofReceiptPayload(array $fixture, string $photoId, string $idempotencyKey, ?string $challengeId = null, ?string $code = null): array
{
    $transfer = DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->firstOrFail();
    $workVersion = (int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version');
    $payload = [
        'evidence_file_id' => $photoId,
        'expected_transfer_version' => (int) $transfer->version,
        'work_version' => $workVersion,
        'node_id' => (string) $fixture['nodes'][2]['id'],
        'idempotency_key' => $idempotencyKey,
        ...a4ProofValidFields(3),
    ];
    if ($challengeId !== null) {
        $payload['challenge_id'] = $challengeId;
    }
    if ($code !== null) {
        $payload['code'] = $code;
    }

    return $payload;
}

function a4ProofInertiaGet(TestCase $test, User $actor, string $uri)
{
    $manifestPath = public_path('build/manifest.json');
    $version = is_file($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
    $response = $test->actingAs($actor)->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => is_string($version) ? $version : 'test',
    ])->get($uri);
    $test->flushHeaders();

    return $response;
}

it('validates each authored A4 proof before preparation or stock departure', function (): void {
    $provider = User::factory()->create();
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer);
    $orderId = $fixture['order_id'];
    $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
    $nodes = $fixture['nodes'];
    $photo = a4ProofUploadPhoto($this, $provider, $orderId, (string) $nodes[0]['id']);
    $base = [
        'evidence_file_id' => $photo,
        'expected_order_version' => (int) DB::table('orders')->where('id', $orderId)->value('version'),
        'work_version' => (int) $work->version,
        'node_id' => (string) $nodes[0]['id'],
    ];
    $stockMovementsBeforeProof = (int) DB::table('stock_movements')->where('order_id', $orderId)->count();

    $missingChecklist = a4ProofValidFields(1);
    unset($missingChecklist['checklist_responses']);
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...$missingChecklist,
        'idempotency_key' => 'a4-proof-missing-checklist-'.$orderId,
    ])->assertUnprocessable()->assertJsonPath('code', 'WORK_CHECKLIST_REQUIRED');

    $wrongChecklist = a4ProofValidFields(1);
    $wrongChecklist['checklist_responses'][0]['id'] = 'not-authored';
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...$wrongChecklist,
        'idempotency_key' => 'a4-proof-wrong-checklist-'.$orderId,
    ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_WORK_CHECKLIST');

    $wrongMetricId = a4ProofValidFields(1);
    $wrongMetricId['metric_readings'][0]['id'] = 'not-authored';
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...$wrongMetricId,
        'idempotency_key' => 'a4-proof-wrong-metric-id-'.$orderId,
    ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_METRIC_PROOF');

    $wrongUnit = a4ProofValidFields(1);
    $wrongUnit['metric_readings'][0]['unit'] = 'kg';
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...$wrongUnit,
        'idempotency_key' => 'a4-proof-wrong-unit-'.$orderId,
    ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_METRIC_PROOF');

    $outsideBounds = a4ProofValidFields(1);
    $outsideBounds['metric_readings'][0]['value'] = 4;
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...$outsideBounds,
        'idempotency_key' => 'a4-proof-outside-bounds-'.$orderId,
    ])->assertUnprocessable()->assertJsonPath('code', 'METRIC_OUT_OF_BOUNDS');

    $staleWorkVersion = $base;
    $staleWorkVersion['work_version'] = 2;
    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$staleWorkVersion,
        ...a4ProofValidFields(1),
        'idempotency_key' => 'a4-proof-stale-work-version-'.$orderId,
    ])->assertConflict()->assertJsonPath('code', 'VERSION_CONFLICT');

    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        'node_id' => (string) $nodes[1]['id'],
        ...a4ProofValidFields(1),
        'idempotency_key' => 'a4-proof-wrong-node-'.$orderId,
    ])->assertStatus(409)->assertJsonPath('code', 'WORK_NODE_MISMATCH');

    expect(DB::table('order_handoff_transfers')->where('order_id', $orderId)->exists())->toBeFalse()
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('accepted')
        ->and((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('status'))->toBe('not_started')
        ->and((int) DB::table('stock_movements')->where('order_id', $orderId)->count())->toBe($stockMovementsBeforeProof)
        ->and((int) DB::table('listing_capacity')->where('id', $fixture['capacity_id'])->value('quantity'))->toBe(5);

    $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
        ...$base,
        ...a4ProofValidFields(1),
        'idempotency_key' => 'a4-proof-prepared-valid-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'prepared');
    expect((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(2);

    $preparedStructure = json_decode((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
    $preparedNode = collect($preparedStructure['nodes'])->firstWhere('id', (string) $nodes[0]['id']);
    expect($preparedNode['evidence_payload']['location']['latitude'])->toBe(15.053)
        ->and($preparedNode['evidence_payload']['notes'])->toBe('A4 phase 1 evidence recorded.')
        ->and($preparedNode['evidence_payload']['a4_proof_metadata']['work_version'])->toBe(1);

    $offer = $this->actingAs($provider)->postJson(route('orders.handoff.custody', $orderId), [
        'transfer_mode' => 'counter_pickup',
        'expected_transfer_version' => 1,
        'idempotency_key' => 'a4-proof-offer-valid-'.$orderId,
    ])->assertOk()->assertJsonPath('data.status', 'offered');
    $transferId = (string) $offer->json('data.id');
    $custodyPhoto = a4ProofUploadPhoto($this, $buyer, $orderId, (string) $nodes[1]['id']);
    $custodyFields = [
        'evidence_file_id' => $custodyPhoto,
        'expected_transfer_version' => 2,
        'work_version' => 2,
        'node_id' => (string) $nodes[1]['id'],
        'idempotency_key' => 'a4-proof-custody-bad-'.$orderId,
        ...a4ProofValidFields(2),
    ];

    $staleTransferVersion = $custodyFields;
    $staleTransferVersion['expected_transfer_version'] = 1;
    $staleTransferVersion['idempotency_key'] = 'a4-proof-stale-transfer-version-'.$orderId;
    $this->actingAs($buyer)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $staleTransferVersion)
        ->assertConflict()->assertJsonPath('code', 'VERSION_CONFLICT');
    $outsideCustodyBounds = $custodyFields;
    $outsideCustodyBounds['metric_readings'][0]['value'] = 4;
    $this->actingAs($buyer)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $outsideCustodyBounds)
        ->assertUnprocessable()->assertJsonPath('code', 'METRIC_OUT_OF_BOUNDS');
    $this->actingAs($provider)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $custodyFields)
        ->assertForbidden();
    expect((string) DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('offered')
        ->and((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(2)
        ->and((int) DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(0)
        ->and((int) DB::table('listing_capacity')->where('id', $fixture['capacity_id'])->value('quantity'))->toBe(5);

    $custodyFields['idempotency_key'] = 'a4-proof-custody-valid-'.$orderId;
    $this->actingAs($buyer)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), $custodyFields)
        ->assertOk()->assertJsonPath('data.status', 'departed');
    expect((int) DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1)
        ->and((int) DB::table('listing_capacity')->where('id', $fixture['capacity_id'])->value('quantity'))->toBe(3);
});

it('uploads native custody photos for the published default A4 dual-sign node without a photo tool flag', function (): void {
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    foreach (['counter_pickup', 'courier_delivery'] as $mode) {
        $provider = User::factory()->create();
        $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer, authoredSchema2: false);
        $orderId = (string) $fixture['order_id'];
        $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
        $nodes = $fixture['nodes'];
        $custodyNode = $nodes[1];
        expect((int) $work->payload_schema_version)->toBe(1)
            ->and((string) $custodyNode['id'])->toBe('a4-handoff')
            ->and((string) $custodyNode['evidence_type'])->toBe('dual_sign')
            ->and((array) $custodyNode['required_proofs'])->not->toContain('photo_proof');

        $preparationPhoto = a4ProofUploadPhoto($this, $provider, $orderId, (string) $nodes[0]['id']);
        $this->actingAs($provider)->postJson(route('orders.handoff.prepared', $orderId), [
            'evidence_file_id' => $preparationPhoto,
            'expected_order_version' => (int) DB::table('orders')->where('id', $orderId)->value('version'),
            'work_version' => (int) $work->version,
            'node_id' => (string) $nodes[0]['id'],
            'idempotency_key' => 'a4-default-prepared-'.$orderId,
        ])->assertOk()->assertJsonPath('data.status', 'prepared');

        $courier = $mode === 'courier_delivery' ? a4ProofAddCourier($orderId) : null;
        $offer = $this->actingAs($provider)->postJson(route('orders.handoff.custody', $orderId), [
            'transfer_mode' => $mode,
            ...($courier === null ? [] : ['courier_user_id' => (string) $courier->id]),
            'expected_transfer_version' => 1,
            'idempotency_key' => 'a4-default-offer-'.$orderId,
        ])->assertOk()->assertJsonPath('data.status', 'offered');
        $transferId = (string) $offer->json('data.id');
        $custodian = $courier ?? $buyer;
        $beforeUpload = a4ProofInertiaGet($this, $custodian, route('orders.handoff.show', $orderId))
            ->assertOk()
            ->assertJsonPath('props.a4Handoff.proofNode.id', (string) $custodyNode['id'])
            ->assertJsonPath('props.a4Handoff.proofNode.ordinal', 2);
        expect((array) $beforeUpload->json('props.a4Handoff.proofNode.required_proofs'))->not->toContain('photo_proof');

        $custodyPhoto = a4ProofUploadPhoto($this, $custodian, $orderId, (string) $custodyNode['id']);
        $afterUpload = a4ProofInertiaGet($this, $custodian, route('orders.handoff.show', $orderId))->assertOk();
        expect(collect((array) $afterUpload->json('props.a4Handoff.proofNode.candidate_evidence'))->pluck('id')->all())->toContain($custodyPhoto);

        $this->actingAs($custodian)->postJson(route('orders.handoff.custody.accept', [$orderId, $transferId]), [
            'evidence_file_id' => $custodyPhoto,
            'expected_transfer_version' => 2,
            'work_version' => 2,
            'node_id' => (string) $custodyNode['id'],
            'idempotency_key' => 'a4-default-depart-'.$orderId,
        ])->assertOk()->assertJsonPath('data.status', 'departed');

        $structure = json_decode((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        $persistedCustodyNode = collect($structure['nodes'])->firstWhere('id', (string) $custodyNode['id']);
        expect($persistedCustodyNode['evidence_payload']['evidence_file_ids'])->toBe([$custodyPhoto])
            ->and($persistedCustodyNode['evidence_payload']['a4_proof_metadata']['work_signature'])->toBe($structure['signature_hash'])
            ->and((string) DB::table('order_handoff_transfers')->where('id', $transferId)->value('status'))->toBe('departed');
    }
});

it('requires the actual provider issuer and final recipient verifier for counter pickup receipt', function (): void {
    $provider = User::factory()->create();
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer);
    $fixture = a4ProofPrepareAndDepart($this, $fixture);
    $orderId = (string) $fixture['order_id'];
    $node3 = $fixture['nodes'][2];
    $receiptPhoto = a4ProofUploadPhoto($this, $buyer, $orderId, (string) $node3['id']);
    $issueUrl = route('orders.work-challenges.issue', [$orderId, (string) $node3['id']]);

    $this->actingAs($buyer)->postJson($issueUrl)->assertForbidden();
    $issued = $this->actingAs($provider)->postJson($issueUrl)
        ->assertCreated()
        ->assertJsonPath('data.kind', 'worker_dropoff')
        ->json('data');
    expect($issued['code'])->toMatch('/\A[0-9]{6}\z/');

    $narrowPage = a4ProofInertiaGet($this, $provider, route('orders.handoff.show', $orderId))
        ->assertOk()
        ->assertJsonPath('component', 'Orders/Handoff')
        ->assertJsonPath('props.a4Handoff.workVersion', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.id', (string) $node3['id'])
        ->assertJsonPath('props.a4Handoff.proofNode.ordinal', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.can_issue_challenge', true)
        ->assertJsonPath('props.a4Handoff.proofNode.pending_challenge.id', $issued['challenge_id'])
        ->assertJsonMissingPath('props.a4Handoff.proofNode.pending_challenge.code')
        ->assertJsonMissingPath('props.a4Handoff.evidence')
        ->assertJsonMissingPath('props.work')
        ->assertJsonMissingPath('props.terms')
        ->assertJsonMissingPath('props.order.amount_minor');
    expect(collect((array) $narrowPage->json('props.a4Handoff.proofNode.candidate_evidence'))->pluck('id')->all())->toBe([]);

    $recipientPage = a4ProofInertiaGet($this, $buyer, route('orders.handoff.show', $orderId))
        ->assertOk()
        ->assertJsonPath('props.a4Handoff.workVersion', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.ordinal', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.can_verify_challenge', true)
        ->assertJsonPath('props.a4Handoff.proofNode.pending_challenge.id', $issued['challenge_id']);
    expect(collect($recipientPage->json('props.a4Handoff.proofNode.candidate_evidence'))->pluck('id')->all())->toBe([$receiptPhoto]);

    $attemptsBefore = (int) DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count');
    $receiptBody = a4ProofReceiptPayload($fixture, $receiptPhoto, 'a4-proof-provider-not-recipient-'.$orderId, $issued['challenge_id'], $issued['code']);
    $incompleteReceipt = $receiptBody;
    unset($incompleteReceipt['checklist_responses']);
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $incompleteReceipt)
        ->assertUnprocessable()->assertJsonPath('code', 'WORK_CHECKLIST_REQUIRED');
    expect((int) DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe($attemptsBefore)
        ->and((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(3);

    $this->actingAs($provider)->postJson(route('orders.handoff.receipt', $orderId), $receiptBody)->assertForbidden();
    expect((int) DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe($attemptsBefore);

    $legacyAppConfirm = a4ProofReceiptPayload($fixture, $receiptPhoto, 'a4-proof-no-code-'.$orderId);
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $legacyAppConfirm)
        ->assertConflict()->assertJsonPath('code', 'CHALLENGE_REQUIRED');
    expect((string) DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->value('status'))->toBe('departed')
        ->and((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('status'))->toBe('in_progress')
        ->and((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(3);

    $this->actingAs($buyer)->postJson(route('orders.work.signoff', $orderId))->assertConflict();
    $this->actingAs($buyer)->postJson(route('orders.work-nodes.advance', [$orderId, (string) $node3['id']]), [
        'action' => 'signoff_completion',
    ])->assertConflict();
    expect((string) DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->value('status'))->toBe('departed')
        ->and((int) DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe(0);

    $receiptBody['idempotency_key'] = 'a4-proof-valid-recipient-'.$orderId;
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $receiptBody)
        ->assertOk()->assertJsonPath('data.status', 'received');
    $work = DB::table('work_instances')->where('id', $fixture['work_id'])->firstOrFail();
    $order = DB::table('orders')->where('id', $orderId)->firstOrFail();
    $obligation = DB::table('payment_obligations')->where('order_id', $orderId)->firstOrFail();
    $challenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
    $structure = json_decode((string) $work->structure, true, 512, JSON_THROW_ON_ERROR);
    $receiptNode = collect($structure['nodes'])->firstWhere('id', (string) $node3['id']);
    expect((string) $order->status)->toBe('completed')
        ->and((int) $work->version)->toBe(4)
        ->and((string) $work->status)->toBe('completed')
        ->and((string) $obligation->status)->toBe('due')
        ->and($obligation->settled_at)->toBeNull()
        ->and((int) DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1)
        ->and((string) $challenge->issuer_user_id)->toBe((string) $provider->id)
        ->and((string) $challenge->verifier_user_id)->toBe((string) $buyer->id)
        ->and((string) $challenge->consumed_by_user_id)->toBe((string) $buyer->id)
        ->and($challenge->consumed_at)->not->toBeNull()
        ->and($receiptNode['evidence_payload']['checklist_responses'])->toBe(a4ProofValidFields(3)['checklist_responses'])
        ->and($receiptNode['evidence_payload']['metric_readings'][0]['unit'])->toBe('pieces')
        ->and($receiptNode['evidence_payload']['evidence_file_ids'])->toBe([$receiptPhoto])
        ->and($receiptNode['evidence_payload']['a4_proof_metadata']['node_id'])->toBe((string) $node3['id'])
        ->and($receiptNode['evidence_payload']['a4_proof_metadata']['work_signature'])->toBe($structure['signature_hash'])
        ->and($receiptNode['evidence_payload']['a4_proof_metadata']['work_version'])->toBe(3)
        ->and($receiptNode['evidence_payload']['a4_proof_metadata']['challenge_id'])->toBe($issued['challenge_id']);

    $completion = DB::table('outbox_messages')->where('event_type', 'work.completed')->where('aggregate_id', $fixture['work_id'])->firstOrFail();
    $completionPayload = json_decode((string) $completion->payload, true, 512, JSON_THROW_ON_ERROR);
    expect($completionPayload['challenge_id'])->toBe($issued['challenge_id'])
        ->and($completionPayload['authorized_by_user_id'])->toBe((string) $provider->id)
        ->and($completionPayload['verified_by_user_id'])->toBe((string) $buyer->id)
        ->and($completionPayload['work_version'])->toBe(3);

    $receiptBody['idempotency_key'] = 'a4-proof-valid-recipient-'.$orderId;
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $receiptBody)
        ->assertOk()->assertJsonPath('data.replay', true);
    expect((int) DB::table('stock_movements')->where('order_id', $orderId)->where('movement_type', 'fulfillment')->count())->toBe(1);

    $replayedChallenge = $receiptBody;
    $replayedChallenge['idempotency_key'] = 'a4-proof-reused-code-'.$orderId;
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $replayedChallenge)
        ->assertStatus(409)->assertJsonPath('code', 'VERSION_CONFLICT');

    $changedReceiptBody = $receiptBody;
    $changedReceiptBody['metric_readings'][0]['value'] = 3;
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $changedReceiptBody)
        ->assertStatus(409)->assertJsonPath('code', 'IDEMPOTENCY_KEY_REUSED');
});

it('issues courier-delivery receipt codes only to the current assigned courier and verifies the named recipient', function (): void {
    $provider = User::factory()->create();
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer);
    $fixture = a4ProofPrepareAndDepart($this, $fixture, 'courier_delivery');
    /** @var User $courier */
    $courier = $fixture['courier'];
    $orderId = (string) $fixture['order_id'];
    $recipient = a4ProofAddFinalRecipient($orderId);
    $node3 = $fixture['nodes'][2];
    $receiptPhoto = a4ProofUploadPhoto($this, $recipient, $orderId, (string) $node3['id']);
    $issueUrl = route('orders.work-challenges.issue', [$orderId, (string) $node3['id']]);

    $this->actingAs($provider)->postJson($issueUrl)->assertForbidden();
    self::assertSame(0, DB::table('notifications')
        ->where('recipient_user_id', $recipient->id)
        ->where('event_source_type', 'work_clearance_challenge')
        ->where('event_type', 'work.approval_requested')
        ->count());

    $courierPage = a4ProofInertiaGet($this, $courier, route('orders.handoff.show', $orderId))
        ->assertOk()
        ->assertJsonPath('props.a4Handoff.workVersion', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.ordinal', 3)
        ->assertJsonPath('props.a4Handoff.proofNode.can_issue_challenge', true)
        ->assertJsonMissingPath('props.work.nodes');
    expect(collect((array) $courierPage->json('props.a4Handoff.proofNode.candidate_evidence'))->all())->toBe([]);

    $issued = $this->actingAs($courier)->postJson($issueUrl)->assertCreated()->json('data');
    $recipientIntent = DB::table('notifications')
        ->where('recipient_user_id', $recipient->id)
        ->where('event_source_type', 'work_clearance_challenge')
        ->where('event_source_id', $issued['challenge_id'])
        ->where('event_type', 'work.approval_requested')
        ->first();
    self::assertNotNull($recipientIntent);
    $recipientPayload = json_decode((string) $recipientIntent->payload, true, 512, JSON_THROW_ON_ERROR);
    self::assertSame('needs_action', $recipientIntent->priority);
    self::assertSame('needs_action', $recipientPayload['attention']);
    self::assertSame(route('orders.handoff.show', ['order' => $orderId], false), $recipientPayload['action_url']);
    self::assertEqualsCanonicalizing(['attention', 'title', 'body', 'action_url'], array_keys($recipientPayload));

    $challenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
    expect((string) $challenge->issuer_user_id)->toBe((string) $courier->id)
        ->and((string) $challenge->verifier_user_id)->toBe((string) $recipient->id);
    $recipientPage = a4ProofInertiaGet($this, $recipient, route('orders.handoff.show', $orderId))
        ->assertOk()
        ->assertJsonPath('props.a4Handoff.proofNode.can_verify_challenge', true)
        ->assertJsonPath('props.a4Handoff.proofNode.pending_challenge.id', $issued['challenge_id']);
    expect(collect($recipientPage->json('props.a4Handoff.proofNode.candidate_evidence'))->pluck('id')->all())->toBe([$receiptPhoto]);

    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), a4ProofReceiptPayload(
        $fixture,
        $receiptPhoto,
        'a4-proof-wrong-recipient-'.$orderId,
        $issued['challenge_id'],
        $issued['code'],
    ))->assertForbidden();
    expect((int) DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('attempt_count'))->toBe(0);

    $this->actingAs($recipient)->postJson(route('orders.handoff.receipt', $orderId), a4ProofReceiptPayload(
        $fixture,
        $receiptPhoto,
        'a4-proof-courier-delivery-'.$orderId,
        $issued['challenge_id'],
        $issued['code'],
    ))->assertOk()->assertJsonPath('data.status', 'received');

    a4ProofInertiaGet($this, $courier, route('orders.handoff.show', $orderId))
        ->assertOk()
        ->assertJsonPath('props.a4Handoff.status', 'received')
        ->assertJsonPath('props.a4Handoff.proofNode', null)
        ->assertJsonMissingPath('props.work.nodes');
});

it('commits failed A4 code attempts and expires stale receipt challenges without advancing Work', function (): void {
    $provider = User::factory()->create();
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer);
    $fixture = a4ProofPrepareAndDepart($this, $fixture);
    $orderId = (string) $fixture['order_id'];
    $node3 = $fixture['nodes'][2];
    $receiptPhoto = a4ProofUploadPhoto($this, $buyer, $orderId, (string) $node3['id']);
    $issued = $this->actingAs($provider)->postJson(route('orders.work-challenges.issue', [$orderId, (string) $node3['id']]))
        ->assertCreated()->json('data');
    $wrongCode = $issued['code'] === '000000' ? '000001' : '000000';

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $response = $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), a4ProofReceiptPayload(
            $fixture,
            $receiptPhoto,
            'a4-proof-bad-code-'.$orderId.'-'.$attempt,
            $issued['challenge_id'],
            $wrongCode,
        ));
        if ($attempt < 5) {
            $response->assertUnprocessable()->assertJsonPath('code', 'CHALLENGE_CODE_INVALID');
        } else {
            $response->assertStatus(429)->assertJsonPath('code', 'CHALLENGE_ATTEMPTS_EXHAUSTED');
        }
    }
    $failedChallenge = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
    expect((int) $failedChallenge->attempt_count)->toBe(5)
        ->and($failedChallenge->invalidated_at)->not->toBeNull()
        ->and($failedChallenge->consumed_at)->toBeNull()
        ->and((string) DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->value('status'))->toBe('departed')
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('in_progress')
        ->and((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(3)
        ->and((string) DB::table('payment_obligations')->where('order_id', $orderId)->value('status'))->toBe('not_due');

    $expiryFixture = a4ProofCreateAcceptedProductOrder($this, User::factory()->create(), $buyer);
    $expiryFixture = a4ProofPrepareAndDepart($this, $expiryFixture);
    $expiryOrderId = (string) $expiryFixture['order_id'];
    $expiryNode = $expiryFixture['nodes'][2];
    $expiryPhoto = a4ProofUploadPhoto($this, $buyer, $expiryOrderId, (string) $expiryNode['id']);
    $expired = $this->actingAs($expiryFixture['provider'])->postJson(route('orders.work-challenges.issue', [$expiryOrderId, (string) $expiryNode['id']]))
        ->assertCreated()->json('data');
    DB::table('work_clearance_challenges')->where('id', $expired['challenge_id'])->update(['expires_at' => now()->subMinute(), 'updated_at' => now()]);

    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $expiryOrderId), a4ProofReceiptPayload(
        $expiryFixture,
        $expiryPhoto,
        'a4-proof-expired-'.$expiryOrderId,
        $expired['challenge_id'],
        $expired['code'],
    ))->assertUnprocessable()->assertJsonPath('code', 'CHALLENGE_EXPIRED');
    $expiredChallenge = DB::table('work_clearance_challenges')->where('id', $expired['challenge_id'])->firstOrFail();
    expect($expiredChallenge->invalidated_at)->not->toBeNull()
        ->and((int) $expiredChallenge->attempt_count)->toBe(0)
        ->and($expiredChallenge->consumed_at)->toBeNull()
        ->and((string) DB::table('order_handoff_transfers')->where('id', $expiryFixture['transfer_id'])->value('status'))->toBe('departed')
        ->and((int) DB::table('work_instances')->where('id', $expiryFixture['work_id'])->value('version'))->toBe(3);
});

it('rolls back valid A4 code consumption if receipt persistence fails', function (): void {
    $provider = User::factory()->create();
    $buyer = User::query()->findOrFail($this->authenticateBuyer());
    $fixture = a4ProofCreateAcceptedProductOrder($this, $provider, $buyer);
    $fixture = a4ProofPrepareAndDepart($this, $fixture);
    $orderId = (string) $fixture['order_id'];
    $node3 = $fixture['nodes'][2];
    $receiptPhoto = a4ProofUploadPhoto($this, $buyer, $orderId, (string) $node3['id']);
    $issued = $this->actingAs($provider)->postJson(route('orders.work-challenges.issue', [$orderId, (string) $node3['id']]))
        ->assertCreated()->json('data');
    $duplicateEventId = (string) Str::uuid7();
    $correlationId = (string) Str::uuid7();
    DB::table('work_events')->insert([
        'id' => $duplicateEventId,
        'work_instance_id' => $fixture['work_id'],
        'previous_status' => 'in_progress',
        'new_status' => 'in_progress',
        'event_type' => 'work.a4_receipt_rollback_fixture',
        'event_version' => 1,
        'actor_user_id' => (string) $buyer->id,
        'evidence_file_id' => $receiptPhoto,
        'payload' => json_encode([], JSON_THROW_ON_ERROR),
        'payload_version' => 1,
        'idempotency_key' => 'a4-customer_receipt-'.$fixture['work_id'].'-'.$fixture['transfer_id'],
        'correlation_id' => $correlationId,
        'occurred_at' => now(),
        'effective_at' => now(),
        'created_at' => now(),
    ]);

    $receiptBody = a4ProofReceiptPayload($fixture, $receiptPhoto, 'a4-proof-rollback-'.$orderId, $issued['challenge_id'], $issued['code']);
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $receiptBody)->assertServerError();
    $challengeAfterFailure = DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->firstOrFail();
    expect($challengeAfterFailure->consumed_at)->toBeNull()
        ->and($challengeAfterFailure->consumed_by_user_id)->toBeNull()
        ->and((string) DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->value('status'))->toBe('departed')
        ->and((string) DB::table('orders')->where('id', $orderId)->value('status'))->toBe('in_progress')
        ->and((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('status'))->toBe('in_progress')
        ->and((int) DB::table('work_instances')->where('id', $fixture['work_id'])->value('version'))->toBe(3)
        ->and((string) DB::table('payment_obligations')->where('order_id', $orderId)->value('status'))->toBe('not_due');

    DB::table('work_events')->where('id', $duplicateEventId)->delete();
    $this->actingAs($buyer)->postJson(route('orders.handoff.receipt', $orderId), $receiptBody)
        ->assertOk()->assertJsonPath('data.status', 'received');
    expect(DB::table('work_clearance_challenges')->where('id', $issued['challenge_id'])->value('consumed_at'))->not->toBeNull()
        ->and((string) DB::table('order_handoff_transfers')->where('id', $fixture['transfer_id'])->value('status'))->toBe('received');
});

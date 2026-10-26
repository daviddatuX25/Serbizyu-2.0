<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Models\User;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class OrderEvidenceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order evidence tests require PostgreSQL.');
        }

        $this->seed(DealChainExecutionSeeder::class);
        Storage::fake('private');
        Storage::fake('public');
    }

    public function test_provider_upload_is_private_quarantined_and_linked_to_the_exact_work_node(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);

        $response = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();

        $evidenceId = (string) $response->json('data.id');
        $this->assertNotSame('', $evidenceId);
        $this->assertNull($response->json('data.url'));
        $this->assertSame('quarantined', $response->json('data.scan_status'));

        $evidence = DB::table('evidence_files')->where('id', $evidenceId)->first();
        $this->assertNotNull($evidence);
        expect((string) $evidence->owner_user_id)->toBe((string) $provider->id)
            ->and((string) $evidence->media_type)->toBe('image/png')
            ->and((string) $evidence->scan_status)->toBe('quarantined')
            ->and((string) $evidence->visibility)->toBe('order_parties')
            ->and((string) $evidence->evidence_type)->toBe('work_node_photo_proof')
            ->and((string) $evidence->storage_key)->toStartWith('evidence/work/');

        Storage::disk('private')->assertExists((string) $evidence->storage_key);
        Storage::disk('public')->assertMissing((string) $evidence->storage_key);

        $scanRequest = DB::table('outbox_messages')
            ->where('event_type', 'work.evidence.scan_requested')
            ->where('aggregate_id', $evidenceId)
            ->first();
        $this->assertNotNull($scanRequest);
        $this->assertSame('pending', (string) $scanRequest->status);
        $attachmentEvent = DB::table('work_events')
            ->where('work_instance_id', $node['work_id'])
            ->where('event_type', 'work.evidence.uploaded')
            ->where('evidence_file_id', $evidenceId)
            ->first();

        $this->assertNotNull($attachmentEvent);
        $eventPayload = json_decode((string) $attachmentEvent->payload, true);
        expect($eventPayload['node_id'])->toBe($node['id'])
            ->and($eventPayload['tool_key'])->toBe('photo_proof');
    }

    public function test_buyer_cannot_upload_provider_work_evidence(): void
    {
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);

        $this->actingAs($buyer)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('evidence_files', [
            'owner_user_id' => $buyer->id,
            'evidence_type' => 'work_node_photo_proof',
        ]);
    }

    public function test_quarantined_evidence_cannot_advance_a_required_photo_gate(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);

        $upload = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();

        $evidenceId = (string) $upload->json('data.id');
        $this->actingAs($provider)
            ->postJson("/orders/{$node['order_id']}/work-nodes/{$node['id']}", [
                'action' => 'request_confirmation',
                'payload' => ['evidence_file_ids' => [$evidenceId]],
            ])
            ->assertConflict();
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();
        $this->actingAs($buyer)
            ->get("/orders/{$node['order_id']}/work-evidence/{$evidenceId}")
            ->assertNotFound();

        $work = DB::table('work_instances')->where('id', $node['work_id'])->first();
        $structure = json_decode((string) $work->structure, true);
        expect($structure['nodes'][0]['status'])->toBe('active');

        $this->assertDatabaseMissing('work_events', [
            'work_instance_id' => $node['work_id'],
            'event_type' => 'work.node.complete_step',
        ]);
    }

    public function test_available_evidence_is_attached_to_node_submission_and_served_only_to_order_participants(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof', 'gps_checkin', 'metric_reading']);

        $upload = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();
        $evidenceId = (string) $upload->json('data.id');
        app(OutboxDispatcher::class)->dispatch();

        expect(DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'))->toBe('clean');
        $res = $this->actingAs($provider)
            ->postJson("/orders/{$node['order_id']}/work-nodes/{$node['id']}", [
                'action' => 'request_confirmation',
                'payload' => [
                    'evidence_file_ids' => [$evidenceId],
                    'location' => [
                        'latitude' => 17.0851,
                        'longitude' => 120.4482,
                        'accuracy_m' => 8,
                        'source' => 'gps',
                        'observed_at' => '2026-10-01T05:00:00+00:00',
                    ],
                    'metric_readings' => [
                        ['id' => 'current-a', 'value' => 4.2, 'unit' => 'A'],
                    ],
                    'notes' => 'Arrival and diagnostic reading recorded.',
                ],
            ]);
        dump($res->json());
        $res->assertOk();
        $event = DB::table('work_events')
            ->where('work_instance_id', $node['work_id'])
            ->where('event_type', 'work.node.request_confirmation')
            ->orderByDesc('occurred_at')
            ->first();
        expect((string) $event->evidence_file_id)->toBe($evidenceId);

        $payload = json_decode((string) $event->payload, true)['payload'];
        expect($payload['evidence_file_ids'])->toBe([$evidenceId])
            ->and($payload['location']['source'])->toBe('gps')
            ->and($payload['location']['received_at'])->not->toBeEmpty()
            ->and($payload['metric_readings'][0]['value'])->toBe(4.2);

        $manifestPath = public_path('build/manifest.json');
        $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
        $show = $this->actingAs($buyer)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get("/orders/{$node['order_id']}")
            ->assertOk();

        $projectedNode = collect($show->json('props.work.nodes'))->firstWhere('id', $node['id']);
        expect($projectedNode['evidence']['photos'][0]['url'])
            ->toBe(route('orders.work-evidence.show', ['order' => $node['order_id'], 'evidence' => $evidenceId]));

        $this->flushHeaders();
        $download = $this->withoutExceptionHandling()
            ->actingAs($buyer)
            ->get("/orders/{$node['order_id']}/work-evidence/{$evidenceId}");
        $download->assertOk();
        expect($download->headers->get('Cache-Control'))->toContain('no-store')
            ->and($download->headers->get('X-Content-Type-Options'))->toBe('nosniff');

        $outsider = User::factory()->create();
        $this->actingAs($outsider)
            ->get("/orders/{$node['order_id']}/work-evidence/{$evidenceId}")
            ->assertNotFound();
    }

    public function test_invalid_and_flagged_uploads_are_quarantined_then_infected_and_unavailable(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $buyer = User::query()->where('phone_e164', Fix::BUYER_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);

        foreach ([
            UploadedFile::fake()->createWithContent('wrong-magic.png', 'not an image'),
            UploadedFile::fake()->createWithContent('flagged.png', 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
        ] as $file) {
            $upload = $this->actingAs($provider)
                ->withHeader('Accept', 'application/json')
                ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                    'file' => $file,
                    'tool_key' => 'photo_proof',
                ])
                ->assertCreated();
            $evidenceId = (string) $upload->json('data.id');
            expect($upload->json('data.scan_status'))->toBe('quarantined');
            $this->assertSame('quarantined', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));

            app(OutboxDispatcher::class)->dispatch();
            $this->assertSame('infected', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));

            $this->actingAs($provider)
                ->postJson("/orders/{$node['order_id']}/work-nodes/{$node['id']}", [
                    'action' => 'request_confirmation',
                    'payload' => ['evidence_file_ids' => [$evidenceId]],
                ])
                ->assertConflict();
            $this->actingAs($buyer)
                ->get("/orders/{$node['order_id']}/work-evidence/{$evidenceId}")
                ->assertNotFound();
        }
    }

    public function test_clean_scanned_photo_is_selectable_for_work_node_progression(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);
        $upload = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();
        $evidenceId = (string) $upload->json('data.id');

        app(OutboxDispatcher::class)->dispatch();

        $this->assertSame('clean', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));
        $manifestPath = public_path('build/manifest.json');
        $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
        $show = $this->actingAs($provider)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get("/orders/{$node['order_id']}")
            ->assertOk();
        $projectedNode = collect($show->json('props.work.nodes'))->firstWhere('id', $node['id']);
        $candidate = collect($projectedNode['candidate_evidence'])->firstWhere('id', $evidenceId);
        expect($candidate['scan_status'])->toBe('clean')
            ->and($candidate['url'])->toBe(route('orders.work-evidence.show', ['order' => $node['order_id'], 'evidence' => $evidenceId]));
        $this->actingAs($provider)->postJson("/orders/{$node['order_id']}/work-nodes/{$node['id']}", [
            'action' => 'request_confirmation',
            'payload' => ['evidence_file_ids' => [$evidenceId]],
        ])->assertOk();
    }

    public function test_unregistered_media_is_quarantined_then_marked_infected(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);

        $upload = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => UploadedFile::fake()->createWithContent('proof.svg', '<svg><script>alert(1)</script></svg>'),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();
        $evidenceId = (string) $upload->json('data.id');
        app(OutboxDispatcher::class)->dispatch();

        $this->assertSame('infected', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));
    }

    public function test_missing_quarantined_file_transitions_to_failed(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);
        $upload = $this->actingAs($provider)
            ->withHeader('Accept', 'application/json')
            ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                'file' => $this->validPng(),
                'tool_key' => 'photo_proof',
            ])
            ->assertCreated();
        $evidenceId = (string) $upload->json('data.id');
        $storageKey = (string) DB::table('evidence_files')->where('id', $evidenceId)->value('storage_key');
        Storage::disk('private')->delete($storageKey);

        app(OutboxDispatcher::class)->dispatch();

        $this->assertSame('failed', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));
    }

    public function test_valid_jpeg_png_and_webp_photos_all_scan_clean(): void
    {
        $provider = User::query()->where('phone_e164', Fix::TECH_PHONE)->firstOrFail();
        $node = $this->prepareActiveNode(['photo_proof']);
        $evidenceIds = [];

        foreach ([$this->validJpeg(), $this->validPng(), $this->validWebp()] as $file) {
            $upload = $this->actingAs($provider)
                ->withHeader('Accept', 'application/json')
                ->post("/orders/{$node['order_id']}/work-nodes/{$node['id']}/evidence", [
                    'file' => $file,
                    'tool_key' => 'photo_proof',
                ])
                ->assertCreated();
            $evidenceIds[] = (string) $upload->json('data.id');
        }

        app(OutboxDispatcher::class)->dispatch();

        foreach ($evidenceIds as $evidenceId) {
            $this->assertSame('clean', DB::table('evidence_files')->where('id', $evidenceId)->value('scan_status'));
        }
        $manifestPath = public_path('build/manifest.json');
        $version = file_exists($manifestPath) ? hash_file('xxh128', $manifestPath) : 'test';
        $show = $this->actingAs($provider)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-Inertia-Version' => $version,
            ])
            ->get("/orders/{$node['order_id']}")
            ->assertOk();
        $projectedNode = collect($show->json('props.work.nodes'))->firstWhere('id', $node['id']);
        $candidateIds = collect($projectedNode['candidate_evidence'])->pluck('id')->all();
        foreach ($evidenceIds as $evidenceId) {
            $this->assertContains($evidenceId, $candidateIds);
        }
    }

    /**
     * @param  list<string>  $requiredProofs
     * @return array{order_id: string, work_id: string, id: string}
     */
    private function prepareActiveNode(array $requiredProofs): array
    {
        $orderId = Fix::ORDER_ID_LABOR;
        $work = DB::table('work_instances')->where('order_id', $orderId)->first();
        $this->assertNotNull($work);

        $nodeId = 'test-photo-gate';
        $structure = [
            'schema_version' => 1,
            'signature_hash' => hash('sha256', 'work-evidence-test'),
            'work_shape' => 'A1',
            'active_node_id' => $nodeId,
            'active_ordinal' => 1,
            'pending_customer_confirmation' => false,
            'nodes' => [[
                'id' => $nodeId,
                'ordinal' => 1,
                'title' => 'Site proof',
                'description' => 'Capture the proof required by this test gate.',
                'node_kind' => 'execution_proof',
                'evidence_type' => 'photo_required',
                'evidence_description' => 'A current job photo.',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => $requiredProofs,
                'approval_method' => 'app_confirm',
                'metric_requirements' => in_array('metric_reading', $requiredProofs, true)
                    ? [['id' => 'current-a', 'name' => 'Current draw', 'unit' => 'A', 'required' => true]]
                    : [],
                'status' => 'active',
                'completed_at' => null,
                'completed_by_user_id' => null,
                'evidence_payload' => null,
                'customer_confirmed_at' => null,
            ]],
        ];

        DB::table('work_instances')->where('id', $work->id)->update([
            'status' => 'in_progress',
            'payload_schema_version' => in_array('metric_reading', $requiredProofs, true) ? 2 : (int) ($work->payload_schema_version ?? 1),
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
            'started_at' => now(),
            'completion_proposed_at' => null,
            'updated_at' => now(),
        ]);
        DB::table('deal_dependencies')
            ->where('deal_chain_id', Fix::CHAIN_ID_ONGOING)
            ->where('successor_need_id', Fix::NEED_ID_LABOR)
            ->update(['status' => 'removed']);

        return [
            'order_id' => $orderId,
            'work_id' => (string) $work->id,
            'id' => $nodeId,
        ];
    }

    private function validPng(): UploadedFile
    {
        $bytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
            true,
        );

        $this->assertNotFalse($bytes);

        return UploadedFile::fake()->createWithContent('work-proof.png', $bytes);
    }

    private function validJpeg(): UploadedFile
    {
        $bytes = base64_decode(
            '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//9k=',
            true,
        );
        $this->assertNotFalse($bytes);

        return UploadedFile::fake()->createWithContent('work-proof.jpg', $bytes);
    }

    private function validWebp(): UploadedFile
    {
        $bytes = base64_decode('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==', true);
        $this->assertNotFalse($bytes);

        return UploadedFile::fake()->createWithContent('work-proof.webp', $bytes);
    }
}

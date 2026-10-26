<?php

declare(strict_types=1);

namespace Tests\Feature\OrdersWork;

use App\Models\User;
use App\Modules\OrdersWork\Application\A9DeliveryService;
use App\Modules\OrdersWork\Application\ScanWorkEvidenceHandler;
use App\Modules\OrdersWork\Infrastructure\LocalEvidenceScanner;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class A9DeliveryTest extends TestCase
{
    use DatabaseTransactions;

    private string $orderId;

    private User $provider;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('A9 delivery tests require PostgreSQL.');
        }

        $fixture = $this->formA9Order();
        $this->orderId = $fixture['order_id'];
        $this->provider = $fixture['provider'];
        $this->customer = $fixture['customer'];
        Storage::fake('private');
    }

    public function test_provider_uploads_scanned_files_and_submits_an_immutable_versioned_manifest(): void
    {
        $draft = $this->createDraft();
        $work = DB::table('work_instances')->where('order_id', $this->orderId)->firstOrFail();
        expect($work->status)->toBe('in_progress')
            ->and($work->started_at)->not->toBeNull()
            ->and(DB::table('orders')->where('id', $this->orderId)->value('status'))->toBe('in_progress')
            ->and(DB::table('work_events')->where('work_instance_id', $work->id)->where('event_type', 'work.delivery.draft_created')->exists())->toBeTrue();
        $startEvent = DB::table('work_events')->where('work_instance_id', $work->id)->where('event_type', 'work.delivery.draft_created')->firstOrFail();
        $startAudit = DB::table('audit_events')->where('action', 'work.delivery.draft_created')->where('target_id', $work->id)->firstOrFail();
        $startOutbox = DB::table('outbox_messages')->where('aggregate_id', $work->id)->where('event_type', 'work.started')->where('event_id', $startEvent->id)->firstOrFail();
        expect($startAudit->actor_user_id)->toBe((string) $this->provider->id)
            ->and(json_decode((string) $startOutbox->payload, true))->toMatchArray([
                'order_id' => $this->orderId,
                'work_instance_id' => (string) $work->id,
                'delivery_id' => $draft['id'],
                'delivery_version' => 1,
            ]);
        $upload = $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('final.pdf', "%PDF-1.7\nfinal art\n%%EOF")]);
        $fileId = (string) $upload->json('data.files.0.id');
        $evidence = DB::table('evidence_files')->where('id', $fileId)->firstOrFail();

        expect($evidence->scan_status)->toBe('quarantined')
            ->and($evidence->evidence_type)->toBe('work_delivery_artifact');
        Storage::disk('private')->assertExists($evidence->storage_key);
        expect(DB::table('outbox_messages')->where('aggregate_id', $fileId)->where('event_type', 'work.evidence.scan_requested')->exists())->toBeTrue();
        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit")->assertStatus(409);
        $this->actingAs($this->customer)->get("/orders/{$this->orderId}/deliveries/{$draft['id']}/files/{$fileId}")->assertNotFound();
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileId]]);
        expect(DB::table('evidence_files')->where('id', $fileId)->value('scan_status'))->toBe('clean');

        $response = $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit")->assertOk();
        $delivery = DB::table('work_deliveries')->where('id', $draft['id'])->firstOrFail();
        $manifest = json_decode((string) $delivery->manifest, true);
        expect($response->json('data.version'))->toBe(1)
            ->and($delivery->status)->toBe('submitted')
            ->and($manifest['version'])->toBe(1)
            ->and($manifest['files'][0]['filename'])->toBe('final.pdf')
            ->and($manifest['files'][0]['sha256'])->toBe($evidence->content_hash)
            ->and(strlen((string) $delivery->manifest_hash))->toBe(64)
            ->and(DB::table('work_instances')->where('order_id', $this->orderId)->value('status'))->toBe('awaiting_signoff');

        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/files", [
            'files' => [UploadedFile::fake()->createWithContent('late.txt', 'should not attach')],
        ])->assertStatus(409);
        expect(DB::table('work_deliverable_files')->where('work_delivery_id', $draft['id'])->count())->toBe(1);
    }

    public function test_submission_requires_authored_checklist_and_named_metrics_before_any_state_change(): void
    {
        $fixture = $this->formA9Order(withQa: true);
        $this->orderId = $fixture['order_id'];
        $this->provider = $fixture['provider'];
        $this->customer = $fixture['customer'];
        $node = $fixture['node'];
        $draft = $this->createDraft();
        $fileId = (string) $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('qa.pdf', "%PDF-1.7\nQA report\n%%EOF")])->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileId]]);
        $eventsBefore = DB::table('work_events')->where('work_instance_id', DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))->count();
        $submitUrl = "/orders/{$this->orderId}/deliveries/{$draft['id']}/submit";

        $this->actingAs($this->provider)->postJson($submitUrl)->assertStatus(422);
        $this->actingAs($this->provider)->postJson($submitUrl, [
            'node_proofs' => [$node['id'] => [
                'checklist_responses' => [['id' => 'not-authored', 'completed' => true]],
                'metric_readings' => [['id' => 'temperature', 'value' => 20, 'unit' => 'C']],
            ]],
        ])->assertStatus(422);
        $this->actingAs($this->provider)->postJson($submitUrl, [
            'node_proofs' => [$node['id'] => [
                'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
                'metric_readings' => [['id' => 'temperature', 'value' => 20, 'unit' => 'F']],
            ]],
        ])->assertStatus(422);

        expect(DB::table('work_deliveries')->where('id', $draft['id'])->value('status'))->toBe('draft')
            ->and(DB::table('work_deliveries')->where('id', $draft['id'])->value('manifest'))->toBeNull()
            ->and(DB::table('work_instances')->where('order_id', $this->orderId)->value('status'))->toBe('in_progress')
            ->and(DB::table('work_events')->where('work_instance_id', DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))->count())->toBe($eventsBefore);
        self::assertSame(0, DB::table('notifications')->where('event_source_id', $draft['id'])->count());


        $this->actingAs($this->provider)->postJson($submitUrl, [
            'node_proofs' => [$node['id'] => [
                'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
                'metric_readings' => [['id' => 'temperature', 'value' => 21.5, 'unit' => '°C']],
            ]],
        ])->assertOk();
        $submissionIntent = DB::table('notifications')
            ->where('recipient_user_id', $this->customer->id)
            ->where('event_source_type', 'work_delivery')
            ->where('event_source_id', $draft['id'])
            ->where('event_type', 'work.approval_requested')
            ->first();
        expect($submissionIntent)->not->toBeNull();
        $submissionPayload = json_decode((string) $submissionIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($submissionIntent->priority)->toBe('needs_action')
            ->and($submissionPayload['attention'])->toBe('needs_action')
            ->and($submissionPayload['title'])->toBeString()
            ->and($submissionPayload['body'])->toBeString()
            ->and($submissionPayload['action_url'])->toBe(route('orders.show', ['order' => $this->orderId], false))
            ->and(DB::table('notifications')->where('event_source_id', $draft['id'])->where('event_type', 'work.approval_requested')->count())->toBe(1);

        $delivery = DB::table('work_deliveries')->where('id', $draft['id'])->firstOrFail();
        $manifest = json_decode((string) $delivery->manifest, true);
        expect($manifest['node_proofs'][$node['id']]['checklist_responses'][0])->toMatchArray(['id' => 'seal-intact', 'completed' => true])
            ->and($manifest['node_proofs'][$node['id']]['metric_readings'][0])->toMatchArray(['id' => 'temperature', 'value' => 21.5, 'unit' => '°C'])
            ->and($manifest['work_instance_id'])->toBe((string) DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))
            ->and($manifest['work_version'])->toBe((int) DB::table('work_instances')->where('order_id', $this->orderId)->value('version'));
        $projection = app(A9DeliveryService::class)->projectForOrder($this->orderId, (string) $this->provider->id);
        expect($projection['nodes'][0]['id'])->toBe($node['id'])
            ->and($projection['nodes'][0]['checklist_items'][0]['id'])->toBe('seal-intact')
            ->and($projection['currentDelivery']['nodeProofs'][$node['id']]['metric_readings'][0]['value'])->toBe(21.5);

        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $draft['id'],
            'message' => 'Please verify the revised temperature.',
        ])->assertOk();
        $revision = $this->createDraft();
        expect($revision['version'])->toBe(2);
        $revisionFileId = (string) $this->uploadFiles($revision['id'], [UploadedFile::fake()->createWithContent('qa-v2.pdf', "%PDF-1.7\nQA report v2\n%%EOF")])->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $revisionFileId]]);
        $revisionSubmitUrl = "/orders/{$this->orderId}/deliveries/{$revision['id']}/submit";
        $this->actingAs($this->provider)->postJson($revisionSubmitUrl)->assertStatus(422);
        expect(DB::table('work_deliveries')->where('id', $revision['id'])->value('status'))->toBe('draft')
            ->and(DB::table('work_deliveries')->where('id', $revision['id'])->value('manifest'))->toBeNull();
        $this->actingAs($this->provider)->postJson($revisionSubmitUrl, [
            'node_proofs' => [$node['id'] => [
                'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
                'metric_readings' => [['id' => 'temperature', 'value' => 22.5, 'unit' => '°C']],
            ]],
        ])->assertOk();
        $revisionManifest = json_decode((string) DB::table('work_deliveries')->where('id', $revision['id'])->value('manifest'), true);
        expect($revisionManifest['version'])->toBe(2)
            ->and($revisionManifest['node_proofs'][$node['id']]['metric_readings'][0]['value'])->toBe(22.5);
    }

    public function test_acceptance_revalidates_two_authored_nodes_independent_of_map_key_order(): void
    {
        $fixture = $this->formA9Order(withQa: true, twoQaNodes: true);
        $this->orderId = $fixture['order_id'];
        $this->provider = $fixture['provider'];
        $this->customer = $fixture['customer'];
        $draft = $this->createDraft();
        $fileId = (string) $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('two-node-qa.pdf', "%PDF-1.7\nTwo node QA\n%%EOF")])->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileId]]);

        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit", [
            'node_proofs' => [
                'z-quality-check' => [
                    'checklist_responses' => [['id' => 'seal-intact', 'completed' => true]],
                    'metric_readings' => [['id' => 'temperature', 'value' => 21.5, 'unit' => '°C']],
                ],
                'a-print-check' => [
                    'checklist_responses' => [['id' => 'margin-aligned', 'completed' => true]],
                    'metric_readings' => [['id' => 'ink-coverage', 'value' => 72, 'unit' => '%']],
                ],
            ],
        ])->assertOk();
        $manifest = json_decode((string) DB::table('work_deliveries')->where('id', $draft['id'])->value('manifest'), true);
        expect(array_keys($manifest['node_proofs']))->toBe(['a-print-check', 'z-quality-check']);

        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/accept")
            ->assertOk()->assertJsonPath('data.work_status', 'completed');
        expect(DB::table('work_instances')->where('order_id', $this->orderId)->value('status'))->toBe('completed')
            ->and(DB::table('orders')->where('id', $this->orderId)->value('status'))->toBe('completed');
    }

    public function test_photo_proof_on_locked_a9_node_is_bound_to_the_current_draft_version(): void
    {
        $fixture = $this->formA9Order(withLockedPhotoNode: true);
        $this->orderId = $fixture['order_id'];
        $this->provider = $fixture['provider'];
        $this->customer = $fixture['customer'];
        $lockedNode = $fixture['nodes'][1];
        $draft = $this->createDraft();
        $photoUrl = "/orders/{$this->orderId}/work-nodes/{$lockedNode['id']}/evidence";

        $this->actingAs($this->customer)->withHeader('Accept', 'application/json')->post($photoUrl, ['file' => $this->validPng(), 'tool_key' => 'photo_proof'])->assertForbidden();
        $photo = $this->actingAs($this->provider)->withHeader('Accept', 'application/json')->post($photoUrl, ['file' => $this->validPng(), 'tool_key' => 'photo_proof'])->assertCreated();
        $photoId = (string) $photo->json('data.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $photoId]]);
        $unusedV1Photo = $this->actingAs($this->provider)->withHeader('Accept', 'application/json')->post($photoUrl, ['file' => $this->validPng(), 'tool_key' => 'photo_proof'])->assertCreated();
        $unusedV1PhotoId = (string) $unusedV1Photo->json('data.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $unusedV1PhotoId]]);
        $projection = app(A9DeliveryService::class)->projectForOrder($this->orderId, (string) $this->provider->id);
        $projectedNode = collect($projection['nodes'])->firstWhere('id', $lockedNode['id']);
        $projectedPhotoIds = array_column($projectedNode['candidate_evidence'], 'id');
        expect($projectedNode['status'])->toBe('locked')
            ->and($projectedPhotoIds)->toContain($photoId)
            ->and($projectedPhotoIds)->toContain($unusedV1PhotoId);

        $deliveryFileId = (string) $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('photo-delivery.pdf', "%PDF-1.7\nPhoto report\n%%EOF")])->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $deliveryFileId]]);
        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit", [
            'node_proofs' => [$lockedNode['id'] => ['evidence_file_ids' => [$photoId]]],
        ])->assertOk();
        $customerProjection = app(A9DeliveryService::class)->projectForOrder($this->orderId, (string) $this->customer->id);
        $photoProofUrl = $customerProjection['currentDelivery']['nodeProofs'][$lockedNode['id']]['photoUrls'][0];
        $this->actingAs($this->customer)->get($photoProofUrl)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->actingAs($this->provider)->withHeader('Accept', 'application/json')->post($photoUrl, ['file' => $this->validPng(), 'tool_key' => 'photo_proof'])->assertStatus(409);
        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $draft['id'],
            'message' => 'Please update the locked-node photo proof.',
        ])->assertOk();
        $this->actingAs($this->provider)->withHeader('Accept', 'application/json')->post($photoUrl, ['file' => $this->validPng(), 'tool_key' => 'photo_proof'])->assertStatus(409);

        $revision = $this->createDraft();
        expect($revision['version'])->toBe(2);
        $revisionPhoto = $this->actingAs($this->provider)->withHeader('Accept', 'application/json')->post($photoUrl, [
            'file' => $this->validPng(),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
        $revisionPhotoId = (string) $revisionPhoto->json('data.id');
        expect($revisionPhotoId)->not->toBe($photoId);
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $revisionPhotoId]]);
        $revisionFileId = (string) $this->uploadFiles($revision['id'], [UploadedFile::fake()->createWithContent('photo-delivery-v2.pdf', "%PDF-1.7\nPhoto report v2\n%%EOF")])->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $revisionFileId]]);
        $submitUrl = "/orders/{$this->orderId}/deliveries/{$revision['id']}/submit";
        $eventsBefore = DB::table('work_events')->where('work_instance_id', DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))->count();
        $this->actingAs($this->provider)->postJson($submitUrl, [
            'node_proofs' => [$lockedNode['id'] => ['evidence_file_ids' => [$unusedV1PhotoId]]],
        ])->assertStatus(422);
        expect(DB::table('work_deliveries')->where('id', $revision['id'])->value('status'))->toBe('draft')
            ->and(DB::table('work_deliveries')->where('id', $revision['id'])->value('manifest'))->toBeNull()
            ->and(DB::table('work_events')->where('work_instance_id', DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))->count())->toBe($eventsBefore);
        $this->actingAs($this->provider)->postJson($submitUrl, [
            'node_proofs' => [$lockedNode['id'] => ['evidence_file_ids' => [$revisionPhotoId]]],
        ])->assertOk();
    }

    public function test_customer_can_download_only_clean_artifacts_with_no_store_headers_and_accept_exact_version(): void
    {
        [$deliveryId, $fileId] = $this->submittedVersion();
        $file = DB::table('work_deliverable_files as df')
            ->join('evidence_files as ef', 'ef.id', '=', 'df.evidence_file_id')
            ->where('df.work_delivery_id', $deliveryId)->firstOrFail();
        $download = $this->actingAs($this->customer)->get("/orders/{$this->orderId}/deliveries/{$deliveryId}/files/{$fileId}");
        $download->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        expect((string) $download->headers->get('Cache-Control'))->toContain('no-store');
        expect($download->streamedContent())->toContain('final art');

        $outsider = User::factory()->create();
        $this->actingAs($outsider)->get("/orders/{$this->orderId}/deliveries/{$deliveryId}/files/{$fileId}")->assertForbidden();

        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/deliveries/{$deliveryId}/accept")->assertOk()->assertJsonPath('data.version', 1)->assertJsonPath('data.order_status', 'completed');
        expect(DB::table('work_instances')->where('order_id', $this->orderId)->value('status'))->toBe('completed')
            ->and(DB::table('orders')->where('id', $this->orderId)->value('status'))->toBe('completed')
            ->and(DB::table('work_deliveries')->where('id', $deliveryId)->value('status'))->toBe('accepted');
        $workId = (string) DB::table('work_instances')->where('order_id', $this->orderId)->value('id');
        $completion = DB::table('outbox_messages')
            ->where('aggregate_id', $workId)
            ->where('event_type', 'work.completed')
            ->whereRaw("payload::jsonb ->> 'delivery_id' = ?", [$deliveryId])
            ->firstOrFail();
        $acceptanceEvent = DB::table('work_events')
            ->where('work_instance_id', $workId)
            ->where('event_type', 'work.delivery.accepted')
            ->whereRaw("payload::jsonb ->> 'delivery_id' = ?", [$deliveryId])
            ->firstOrFail();
        $completionPayload = json_decode((string) $completion->payload, true);
        expect($completionPayload)->toMatchArray([
            'order_id' => $this->orderId,
            'work_instance_id' => $workId,
            'delivery_id' => $deliveryId,
            'delivery_version' => 1,
            'manifest_hash' => DB::table('work_deliveries')->where('id', $deliveryId)->value('manifest_hash'),
            'completion_actor_user_id' => (string) $this->customer->id,
            'acceptance_kind' => 'digital_delivery',
        ])->and((string) $completion->event_id)->not->toBe((string) $acceptanceEvent->id);
        $this->assertDatabaseMissing('payment_obligations', ['order_id' => $this->orderId, 'status' => 'settled']);
        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $deliveryId,
            'message' => 'Please change the accepted version.',
        ])->assertStatus(409);
    }

    public function test_revision_is_atomic_bounded_and_superseded_versions_cannot_be_accepted(): void
    {
        $this->withHeader('X-Correlation-Id', '0198a3b1-7c40-7abc-8def-7234567890ab');
        [$v1, $file1] = $this->submittedVersion();
        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $v1,
            'message' => 'Please correct the final line of text.',
        ])->assertOk()->assertJsonPath('data.revisions_used', 1);
        expect(DB::table('work_instances')->where('order_id', $this->orderId)->value('status'))->toBe('in_progress')
            ->and((int) DB::table('work_instances')->where('order_id', $this->orderId)->value('revisions_used'))->toBe(1)
            ->and(DB::table('work_deliveries')->where('id', $v1)->value('status'))->toBe('superseded');

        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/deliveries/{$v1}/accept")->assertStatus(409);
        $draft = $this->createDraft();
        $upload = $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('v2.pdf', "%PDF-1.7\nrevised art\n%%EOF")]);
        $fileV2 = (string) $upload->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileV2]]);
        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit")->assertOk();
        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $draft['id'],
            'message' => 'The allowed revision has been used.',
        ])->assertStatus(409)->assertJsonPath('code', 'REVISION_LIMIT_REACHED');
        $this->assertDatabaseCount('work_revision_requests', 1);
        expect(DB::table('work_deliverable_files')->where('work_delivery_id', $v1)->value('evidence_file_id'))->toBe($file1);
    }

    public function test_concurrent_review_actions_serialize_on_work_and_only_first_action_wins(): void
    {
        [$deliveryId] = $this->submittedVersion();

        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/revision-requests", [
            'delivery_id' => $deliveryId,
            'message' => 'Please revise this file.',
        ])->assertOk();
        $this->actingAs($this->customer)->postJson("/orders/{$this->orderId}/deliveries/{$deliveryId}/accept")->assertStatus(409);

        expect(DB::table('work_revision_requests')->where('work_instance_id', DB::table('work_instances')->where('order_id', $this->orderId)->value('id'))->count())->toBe(1)
            ->and((int) DB::table('work_instances')->where('order_id', $this->orderId)->value('revisions_used'))->toBe(1);
    }

    public function test_clean_nonimage_text_and_supported_images_scan_clean_without_weakening_photo_policy(): void
    {
        $textKey = 'a9-text.txt';
        Storage::disk('private')->put($textKey, 'approved plain text deliverable');
        $text = Storage::disk('private')->get($textKey);
        expect(app(LocalEvidenceScanner::class)->scan($textKey, 'text/plain', strlen($text), hash('sha256', $text), 'work_delivery_artifact')->value)->toBe('clean');
        $imageKey = 'a9-image.png';
        $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
        expect($imageBytes)->toBeString();
        Storage::disk('private')->put($imageKey, $imageBytes);
        expect(app(LocalEvidenceScanner::class)->scan($imageKey, 'image/png', strlen($imageBytes), hash('sha256', $imageBytes), 'work_delivery_artifact')->value)->toBe('clean')
            ->and(app(LocalEvidenceScanner::class)->scan($imageKey, 'image/png', strlen($imageBytes), hash('sha256', $imageBytes))->value)->toBe('clean');

        $unsupportedKey = 'a9-archive.zip';
        Storage::disk('private')->put($unsupportedKey, "PK\x03\x04malware");
        $archive = Storage::disk('private')->get($unsupportedKey);
        expect(app(LocalEvidenceScanner::class)->scan($unsupportedKey, 'application/zip', strlen($archive), hash('sha256', $archive), 'work_delivery_artifact')->value)->toBe('infected');
        $activePdfKey = 'a9-active.pdf';
        $activePdf = "%PDF-1.7\n/OpenAction << /JavaScript (alert(1)) >>\n%%EOF";
        Storage::disk('private')->put($activePdfKey, $activePdf);
        expect(app(LocalEvidenceScanner::class)->scan($activePdfKey, 'application/pdf', strlen($activePdf), hash('sha256', $activePdf), 'work_delivery_artifact')->value)->toBe('infected');
    }

    private function validPng(): UploadedFile
    {
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
        $this->assertNotFalse($bytes);

        return UploadedFile::fake()->createWithContent('a9-node-proof.png', $bytes);
    }

    /** @return array{id:string,version:int} */
    private function createDraft(): array
    {
        return $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries")->assertCreated()->json('data');
    }

    private function uploadFiles(string $deliveryId, array $files): TestResponse
    {
        return $this->actingAs($this->provider)->post("/orders/{$this->orderId}/deliveries/{$deliveryId}/files", ['files' => $files])->assertCreated();
    }

    /** @return array{0:string,1:string} */
    private function submittedVersion(): array
    {
        $draft = $this->createDraft();
        $upload = $this->uploadFiles($draft['id'], [UploadedFile::fake()->createWithContent('final.pdf', "%PDF-1.7\nfinal art\n%%EOF")]);
        $fileId = (string) $upload->json('data.files.0.id');
        app(ScanWorkEvidenceHandler::class)->handle(['payload' => ['evidence_file_id' => $fileId]]);
        $this->actingAs($this->provider)->postJson("/orders/{$this->orderId}/deliveries/{$draft['id']}/submit")->assertOk();

        return [$draft['id'], $fileId];
    }

    /**
     * @return array{order_id:string,provider:User,customer:User,node:array<string,mixed>,nodes:list<array<string,mixed>>}
     */
    private function formA9Order(bool $withQa = false, bool $twoQaNodes = false, bool $withLockedPhotoNode = false): array
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create();
        $this->assignCapability($customer, 'buy');
        $this->assignCapability($provider, 'provide');

        $requestId = $this->actingAs($customer)->postJson('/requests', [
            'title' => 'Prepare a digital print',
            'description' => 'Deliver a private printable digital file with customer review.',
            'category_code' => 'print-assist',
        ])->assertCreated()->json('data.id');
        $stage = [
            'id' => 'digital-quality-check',
            'title' => 'Digital quality check',
            'description' => 'Review the final print for the authored checklist and measurement.',
            'node_kind' => 'execution_proof',
            'control_mode' => 'provider_advance',
            'evidence_type' => 'none',
            'evidence_description' => '',
            'required_proofs' => $withQa ? ['checklist_steps', 'metric_reading'] : [],
            'checklist_items' => $withQa ? [['id' => 'seal-intact', 'label' => 'Seal is intact', 'required' => true]] : [],
            'metric_requirements' => $withQa ? [['id' => 'temperature', 'name' => 'Water temperature', 'unit' => '°C', 'required' => true, 'min' => 0, 'max' => 100]] : [],
        ];
        $stages = [$stage];
        if ($withLockedPhotoNode) {
            $stages[0]['id'] = 'digital-preparation';
            $stages[0]['title'] = 'Digital preparation';
            $stages[1] = [
                ...$stage,
                'id' => 'locked-photo-node',
                'title' => 'Final photo proof',
                'evidence_type' => 'photo_required',
                'evidence_description' => 'A clean photo of the final digital output.',
                'required_proofs' => ['photo_proof'],
            ];
        } elseif ($withQa && $twoQaNodes) {
            $stages[0]['id'] = 'z-quality-check';
            $stages[0]['title'] = 'Quality check';
            $stages[1] = [
                ...$stage,
                'id' => 'a-print-check',
                'title' => 'Print check',
                'checklist_items' => [['id' => 'margin-aligned', 'label' => 'Margins are aligned', 'required' => true]],
                'metric_requirements' => [['id' => 'ink-coverage', 'name' => 'Ink coverage', 'unit' => '%', 'required' => true, 'min' => 0, 'max' => 100]],
            ];
        }
        $quoteId = $this->actingAs($provider)->postJson("/requests/{$requestId}/quotes", [
            'amount_minor' => 30000,
            'message' => 'Prepare and deliver the requested digital print.',
            'work_shape' => 'A9',
            'milestone_stages' => $stages,
        ])->assertCreated()->json('data.id');
        $orderId = $this->actingAs($customer)->postJson("/requests/{$requestId}/quotes/{$quoteId}/accept")
            ->assertOk()->json('data.order_id');
        $work = DB::table('work_instances')->where('order_id', $orderId)->firstOrFail();
        $structure = json_decode((string) $work->structure, true);
        $nodes = $structure['nodes'];

        expect($work->work_shape)->toBe('A9')
            ->and($work->status)->toBe('not_started')
            ->and((int) $work->payload_schema_version)->toBe($withQa ? 2 : 1);

        return ['order_id' => (string) $orderId, 'provider' => $provider, 'customer' => $customer, 'node' => $nodes[0], 'nodes' => $nodes];
    }

    private function assignCapability(User $user, string $role): void
    {
        $now = now();
        DB::table('role_assignments')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => (string) $user->id,
            'role_code' => $role,
            'status' => 'active',
            'granted_by_user_id' => (string) $user->id,
            'effective_at' => $now,
            'scope' => '{}',
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}

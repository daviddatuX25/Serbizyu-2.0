<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Modules\TrustSupport\Application\BoundedImageMetadataParser;
use App\Shared\Application\OutboxDispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\CreatesAcceptedWorkOrder;
use Tests\TestCase;

final class LuponPacketHandoffTest extends TestCase
{
    use CreatesAcceptedWorkOrder;
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        Storage::fake('public');
    }

    public function test_staff_packet_contains_private_hash_verified_exhibits_and_actual_return_archive_facts(): void
    {
        $work = $this->createAcceptedWorkOrder('A1', []);
        $node = $this->prepareActiveNode($work);
        $provider = $work['provider'];
        $buyer = $work['buyer'];
        $jpeg = $this->jpegWithExif();
        $png = $this->validPng();

        $jpegUpload = $this->actingAs($provider)->postJson("/orders/{$work['order_id']}/work-nodes/{$node}/evidence", [
            'file' => UploadedFile::fake()->createWithContent('checkpoint-exif.jpg', $jpeg),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
        $pngUpload = $this->actingAs($provider)->postJson("/orders/{$work['order_id']}/work-nodes/{$node}/evidence", [
            'file' => UploadedFile::fake()->createWithContent('checkpoint-no-exif.png', $png),
            'tool_key' => 'photo_proof',
        ])->assertCreated();
        $jpegId = (string) $jpegUpload->json('data.id');
        $pngId = (string) $pngUpload->json('data.id');
        app(OutboxDispatcher::class)->dispatch();
        $this->assertSame('clean', DB::table('evidence_files')->where('id', $jpegId)->value('scan_status'));
        $this->assertSame('clean', DB::table('evidence_files')->where('id', $pngId)->value('scan_status'));

        $case = $this->actingAs($buyer)->postJson('/support-cases', [
            'order_id' => $work['order_id'],
            'category' => 'fulfillment',
            'content' => 'Please record the unresolved handoff facts.',
            'idempotency_key' => 'lupon-case-'.Str::uuid7(),
        ])->assertCreated()->json('data');
        $caseId = (string) $case['id'];
        $caseVersion = (int) DB::table('support_cases')->where('id', $caseId)->value('version');
        $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $create = [
            'expected_case_version' => $caseVersion,
            'recipient' => '<Barangay Hall & Desk>',
            'exhibit_file_ids' => [$jpegId, $pngId],
            'idempotency_key' => 'packet-'.Str::uuid7(),
        ];

        $this->actingAs($buyer)->postJson("/admin/support-cases/{$caseId}/lupon-packets", $create)->assertForbidden();
        $created = $this->actingAs($staff)
            ->postJson("/admin/support-cases/{$caseId}/lupon-packets", $create)
            ->assertCreated()
            ->json('data.packet');
        $this->assertCount(3, $created['artifacts']);
        $this->assertSame('prepared', $created['status']);
        $this->assertSame(1, $created['version']);
        $this->assertCount(2, $created['exhibits']);

        $byEvidence = collect($created['exhibits'])->keyBy('evidence_file_id');
        $this->assertSame('present', $byEvidence[$jpegId]['exif']['status']);
        $this->assertContains('2024:05:06 07:08:09', $byEvidence[$jpegId]['exif']['timestamps']);
        $this->assertSame('absent', $byEvidence[$pngId]['exif']['status']);
        $manifestRow = DB::table('lupon_packet_artifacts')->where('packet_id', $created['id'])->where('kind', 'exhibit_manifest')->first();
        $manifestBytes = Storage::disk('private')->get((string) $manifestRow->storage_key);
        $manifest = json_decode($manifestBytes, true, flags: JSON_THROW_ON_ERROR);
        $manifestByEvidence = collect($manifest['exhibits'])->keyBy('evidence_file_id');
        $this->assertEqualsCanonicalizing($byEvidence->keys()->all(), $manifestByEvidence->keys()->all());
        foreach ($byEvidence as $evidenceId => $expected) {
            $actual = $manifestByEvidence[$evidenceId];
            $expectedExif = $expected['exif'];
            $actualExif = $actual['exif'];
            unset($expected['exif'], $actual['exif']);
            $this->assertEqualsCanonicalizing($expected, $actual);
            $this->assertSame($expectedExif['status'], $actualExif['status']);
            $this->assertSame($expectedExif['timestamps'], $actualExif['timestamps']);
            $this->assertSame($expectedExif['reason'], $actualExif['reason']);
        }
        $this->assertArrayNotHasKey('sha256', $manifest, 'Manifest must not contain its own hash.');
        $this->assertStringContainsString('not a complete inventory', $manifest['selection_scope_note']);

        foreach (DB::table('lupon_packet_artifacts')->where('packet_id', $created['id'])->get() as $artifact) {
            $bytes = Storage::disk('private')->get((string) $artifact->storage_key);
            $this->assertSame(hash('sha256', $bytes), (string) $artifact->sha256);
            $this->assertSame(strlen($bytes), (int) $artifact->size_bytes);
            $this->assertStringStartsWith('evidence/lupon/'.$caseId.'/'.$created['id'].'/', (string) $artifact->storage_key);
            $download = $this->actingAs($buyer)->get("/admin/lupon-packets/{$created['id']}/artifacts/{$artifact->id}");
            $download->assertForbidden();
            $download = $this->actingAs($staff)->get("/admin/lupon-packets/{$created['id']}/artifacts/{$artifact->id}")
                ->assertOk()->assertHeader('X-Content-SHA256', (string) $artifact->sha256);
            $cacheDirectives = array_map('trim', explode(',', (string) $download->headers->get('Cache-Control')));
            $this->assertContains('private', $cacheDirectives);
            $this->assertNotContains('public', $cacheDirectives);
            $this->assertContains('no-store', $cacheDirectives);
        }
        $this->assertSame(1, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'lupon.packet.prepared')->count());
        $this->assertSame(1, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'lupon.packet.prepared')->count());
        $this->assertSame(1, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->where('event_type', 'packet.prepared')->count());

        $auditBeforeReplay = DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->count();
        $outboxBeforeReplay = DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->count();
        $packetEventsBeforeReplay = DB::table('lupon_packet_events')->where('packet_id', $created['id'])->count();
        $replayed = $this->actingAs($staff)->postJson("/admin/support-cases/{$caseId}/lupon-packets", $create)
            ->assertCreated()->json('data.packet');
        $this->assertSame($created['id'], $replayed['id']);
        $this->assertSame(3, DB::table('lupon_packet_artifacts')->where('packet_id', $created['id'])->count());
        $this->assertSame($auditBeforeReplay, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->count());
        $this->assertSame($outboxBeforeReplay, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->count());
        $this->assertSame($packetEventsBeforeReplay, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->count());

        $transmission = [
            'expected_version' => 1,
            'recipient' => $create['recipient'],
            'transmitted_at' => now()->subMinute()->toISOString(),
            'idempotency_key' => 'transmit-'.Str::uuid7(),
        ];
        $transmitted = $this->actingAs($staff)->postJson("/admin/lupon-packets/{$created['id']}/transmission", $transmission)
            ->assertOk()->json('data.packet');
        $this->assertSame('transmitted', $transmitted['status']);
        $this->assertNotNull($transmitted['transmitted_at']);
        $this->assertSame(1, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'lupon.packet.transmitted')->count());
        $this->assertSame(1, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'lupon.packet.transmitted')->count());
        $this->assertSame(1, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->where('event_type', 'packet.transmitted')->count());
        $this->assertFalse($transmitted['archive_eligible']);

        $returnBytes = $this->validPng();
        $return = [
            'expected_version' => 2,
            'return_kind' => 'signed_kasunduan',
            'received_at' => now()->subSeconds(30)->toISOString(),
            'cabinet_code' => 'CAB-2026-TAG-B04',
            'paperwork' => UploadedFile::fake()->createWithContent('actual-signed-paper.png', $returnBytes),
            'idempotency_key' => 'return-'.Str::uuid7(),
        ];
        $returned = $this->actingAs($staff)->post("/admin/lupon-packets/{$created['id']}/returned-paperwork", $return)
            ->assertOk()->json('data.packet');
        $this->assertSame('returned', $returned['status']);
        $this->assertSame('CAB-2026-TAG-B04', $returned['cabinet_code']);
        $this->assertSame('quarantined', $returned['returned_paper_scan_status']);
        $this->assertTrue($returned['returned_paper_integrity_ok']);
        $this->assertFalse($returned['archive_eligible']);
        $this->assertSame(1, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'lupon.packet.returned')->count());
        $this->assertSame(1, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'lupon.packet.returned')->count());
        $this->assertSame(1, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->where('event_type', 'paperwork.returned')->count());
        $returnedId = $returned['returned_evidence_file_id'];
        $returnedPath = (string) DB::table('evidence_files')->where('id', $returnedId)->value('storage_key');
        Storage::disk('private')->assertExists($returnedPath);

        $this->actingAs($staff)->postJson("/admin/lupon-packets/{$created['id']}/archive", [
            'expected_version' => 3, 'idempotency_key' => 'archive-before-scan',
        ])->assertConflict();
        $replayedReturn = $this->actingAs($staff)->post("/admin/lupon-packets/{$created['id']}/returned-paperwork", $return)
            ->assertOk()->json('data.packet');
        $this->assertSame($returnedId, $replayedReturn['returned_evidence_file_id']);
        $this->assertSame(1, DB::table('evidence_files')->where('id', $returnedId)->count());
        $this->assertSame(1, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'lupon.packet.returned')->count());
        $this->assertSame(1, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'lupon.packet.returned')->count());
        $this->assertSame(1, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->where('event_type', 'paperwork.returned')->count());

        app(OutboxDispatcher::class)->dispatch();
        $this->assertSame('clean', DB::table('evidence_files')->where('id', $returnedId)->value('scan_status'));
        $ready = app(\App\Modules\TrustSupport\Application\LuponHandoffService::class)->casePackets($caseId)['packets'][0];
        $this->assertTrue($ready['returned_paper_integrity_ok']);
        $this->assertTrue($ready['archive_eligible']);
        $this->assertNotNull($ready['returned_paper_download_url']);
        $this->actingAs($buyer)->get($ready['returned_paper_download_url'])->assertForbidden();
        $paperDownload = $this->actingAs($staff)->get($ready['returned_paper_download_url'])
            ->assertOk()->assertHeader('X-Content-SHA256', hash('sha256', $returnBytes));
        $paperCacheDirectives = array_map('trim', explode(',', (string) $paperDownload->headers->get('Cache-Control')));
        $this->assertContains('private', $paperCacheDirectives);
        $this->assertNotContains('public', $paperCacheDirectives);
        $this->assertContains('no-store', $paperCacheDirectives);

        $archived = $this->actingAs($staff)->postJson("/admin/lupon-packets/{$created['id']}/archive", [
            'expected_version' => 3,
            'idempotency_key' => 'archive-'.Str::uuid7(),
        ])->assertOk()->json('data.packet');
        $this->assertSame('archived', $archived['status']);
        $this->assertSame('CAB-2026-TAG-B04', $archived['cabinet_code']);
        $this->assertNotNull($archived['archived_at']);
        $this->assertSame($returnBytes, Storage::disk('private')->get($returnedPath));
        $this->assertSame(4, $archived['version']);
        $this->assertSame(1, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'lupon.packet.archived')->count());
        $this->assertSame(1, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'lupon.packet.archived')->count());
        $this->assertSame(1, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->where('event_type', 'packet.archived')->count());
        $this->assertSame(4, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'like', 'lupon.packet.%')->count());
        $this->assertSame(4, DB::table('outbox_messages')->where('aggregate_type', 'support_case')->where('aggregate_id', $caseId)->where('event_type', 'like', 'lupon.packet.%')->count());
        $this->assertSame(4, DB::table('lupon_packet_events')->where('packet_id', $created['id'])->count());
        $this->assertSame(4, DB::table('audit_events')->where('target_type', 'support_case')->where('target_id', $caseId)->where('action', 'like', 'lupon.packet.%')->count());
    }

    public function test_bounded_image_metadata_parser_rejects_bad_webp_tail_and_duplicate_exif_chunks(): void
    {
        $parser = app(BoundedImageMetadataParser::class);
        $badTail = tempnam(sys_get_temp_dir(), 'lupon-webp-tail-');
        $badPadding = tempnam(sys_get_temp_dir(), 'lupon-webp-padding-');
        $duplicateExif = tempnam(sys_get_temp_dir(), 'lupon-webp-duplicate-');
        file_put_contents($badTail, $this->webpWithAdditionalChunk('JUNK'.pack('V', 4).'xy'));
        file_put_contents($badPadding, $this->webpWithAdditionalChunk('JUNK'.pack('V', 1)."x\x01"));
        file_put_contents($duplicateExif, $this->webpWithAdditionalChunk($this->webpChunk('EXIF', "Exif\0\0".$this->exifTiff())));
        try {
            $this->assertSame(
                ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'malformed_container'],
                $parser->inspect($badTail, 'image/webp'),
            );
            $this->assertSame(
                ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'malformed_container'],
                $parser->inspect($badPadding, 'image/webp'),
            );
            $this->assertSame(
                ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'malformed_container'],
                $parser->inspect($duplicateExif, 'image/webp'),
            );
        } finally {
            @unlink($badTail);
            @unlink($duplicateExif);
            @unlink($badPadding);
        }
    }

    private function webpChunk(string $type, string $payload): string
    {
        $chunk = $type.pack('V', strlen($payload)).$payload.(strlen($payload) % 2 === 1 ? "\0" : '');

        return $chunk;
    }
    private function webpWithAdditionalChunk(string $chunk): string
    {
        $webp = $this->webpWithExif();
        $riff = substr($webp, 12).$chunk;

        return 'RIFF'.pack('V', 4 + strlen($riff)).'WEBP'.$riff;
    }

    public function test_packet_storage_is_removed_when_artifact_database_write_rolls_back(): void
    {
        $work = $this->createAcceptedWorkOrder('A1', []);
        $case = $this->actingAs($work['buyer'])->postJson('/support-cases', [
            'order_id' => $work['order_id'],
            'category' => 'fulfillment',
            'content' => 'Record the handoff issue.',
            'idempotency_key' => 'rollback-case-'.Str::uuid7(),
        ])->assertCreated()->json('data');
        $caseId = (string) $case['id'];
        $caseVersion = (int) DB::table('support_cases')->where('id', $caseId)->value('version');
        $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $fail = true;
        DB::listen(static function ($query) use (&$fail): void {
            if ($fail && str_contains(strtolower($query->sql), 'insert into "lupon_packet_artifacts"')) {
                $fail = false;
                throw new \RuntimeException('Injected artifact metadata write failure.');
            }
        });

        $this->actingAs($staff)->postJson("/admin/support-cases/{$caseId}/lupon-packets", [
            'expected_case_version' => $caseVersion,
            'recipient' => 'Barangay Hall',
            'exhibit_file_ids' => [],
            'idempotency_key' => 'rollback-'.Str::uuid7(),
        ])->assertServerError();

        $this->assertSame(0, DB::table('lupon_packets')->where('case_id', $caseId)->count());
        $this->assertSame([], Storage::disk('private')->allFiles("evidence/lupon/{$caseId}"));
    }

    public function test_bounded_image_metadata_parser_reports_presence_absence_and_malformed_containers(): void
    {
        $parser = app(BoundedImageMetadataParser::class);
        $withExif = tempnam(sys_get_temp_dir(), 'lupon-exif-');
        $withoutExif = tempnam(sys_get_temp_dir(), 'lupon-no-exif-');
        $webpWithExif = tempnam(sys_get_temp_dir(), 'lupon-webp-exif-');
        $webpWithoutExif = tempnam(sys_get_temp_dir(), 'lupon-webp-no-exif-');
        $malformed = tempnam(sys_get_temp_dir(), 'lupon-malformed-');
        file_put_contents($withExif, $this->jpegWithExif());
        file_put_contents($withoutExif, $this->validPng());
        file_put_contents($webpWithExif, $this->webpWithExif());
        file_put_contents($webpWithoutExif, $this->validWebp());
        file_put_contents($malformed, "\x89PNG\r\n\x1a\n\x00\x00\x00\x20eXIfbroken");
        try {
            $expected = ['status' => 'present', 'timestamps' => ['2024:05:06 07:08:09'], 'reason' => null];
            $this->assertSame($expected, $parser->inspect($withExif, 'image/jpeg'));
            $this->assertSame($expected, $parser->inspect($webpWithExif, 'image/webp'));
            $this->assertSame(['status' => 'absent', 'timestamps' => [], 'reason' => null], $parser->inspect($withoutExif, 'image/png'));
            $this->assertSame(['status' => 'absent', 'timestamps' => [], 'reason' => null], $parser->inspect($webpWithoutExif, 'image/webp'));
            $this->assertSame('unreadable', $parser->inspect($malformed, 'image/png')['status']);
            $this->assertSame('not_applicable', $parser->inspect($malformed, 'application/pdf')['status']);
        } finally {
            @unlink($withExif);
            @unlink($withoutExif);
            @unlink($webpWithExif);
            @unlink($webpWithoutExif);
            @unlink($malformed);
        }
    }

    private function prepareActiveNode(array $work): string
    {
        $nodeId = 'lupon-test-photo-node';
        $structure = [
            'schema_version' => 1,
            'signature_hash' => hash('sha256', 'lupon-packet-test'),
            'work_shape' => 'A1',
            'active_node_id' => $nodeId,
            'active_ordinal' => 1,
            'pending_customer_confirmation' => false,
            'nodes' => [[
                'id' => $nodeId,
                'ordinal' => 1,
                'title' => 'Handoff evidence',
                'description' => 'Capture evidence for the case packet test.',
                'node_kind' => 'execution_proof',
                'evidence_type' => 'photo_required',
                'evidence_description' => 'Current work photo.',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => ['photo_proof'],
                'approval_method' => 'app_confirm',
                'metric_requirements' => [],
                'status' => 'active',
                'completed_at' => null,
                'completed_by_user_id' => null,
                'evidence_payload' => null,
                'customer_confirmed_at' => null,
            ]],
        ];
        DB::table('work_instances')->where('id', $work['work_id'])->update([
            'status' => 'in_progress',
            'structure' => json_encode($structure, JSON_THROW_ON_ERROR),
            'started_at' => now(),
            'completion_proposed_at' => null,
            'updated_at' => now(),
        ]);

        return $nodeId;
    }

    private function validPng(): string
    {
        $chunk = static fn (string $type, string $data): string => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $imageData = gzcompress("\0\xFF\xFF\xFF");
        $this->assertNotFalse($imageData);

        return "\x89PNG\r\n\x1A\n"
            .$chunk('IHDR', pack('N2C5', 1, 1, 8, 2, 0, 0, 0))
            .$chunk('IDAT', $imageData)
            .$chunk('IEND', '');
    }

    private function jpegWithExif(): string
    {
        $jpeg = base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//9k=', true);
        $this->assertNotFalse($jpeg);
        $payload = "Exif\0\0".$this->exifTiff();
        $segment = "\xFF\xE1".pack('n', strlen($payload) + 2).$payload;

        return substr($jpeg, 0, 2).$segment.substr($jpeg, 2);
    }

    private function webpWithExif(): string
    {
        $webp = $this->validWebp();
        $exif = "Exif\0\0".$this->exifTiff();
        $chunk = 'EXIF'.pack('V', strlen($exif)).$exif.(strlen($exif) % 2 === 1 ? "\0" : '');
        $riff = 'WEBP'.substr($webp, 12).$chunk;

        return 'RIFF'.pack('V', strlen($riff)).$riff;
    }

    private function validWebp(): string
    {
        $webp = base64_decode('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==', true);
        $this->assertNotFalse($webp);

        $riffSize = unpack('Vlength', substr($webp, 4, 4))['length'];
        return substr($webp, 0, $riffSize + 8);
    }

    private function exifTiff(): string
    {
        $date = "2024:05:06 07:08:09\0";

        return 'II'.pack('v', 42).pack('V', 8)
            .pack('v', 1).pack('v', 0x8769).pack('v', 4).pack('V', 1).pack('V', 26).pack('V', 0)
            .pack('v', 1).pack('v', 0x9003).pack('v', 2).pack('V', strlen($date)).pack('V', 44).pack('V', 0)
            .$date;
    }
}

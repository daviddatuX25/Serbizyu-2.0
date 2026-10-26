<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\TrustSupport\Application\TrustSupportError;
use App\Shared\Contracts\PaymentMismatchCasePort;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\AuthenticatesWithPhoneOtp;
use Tests\TestCase;

final class PaymentP2PWorkflowTest extends TestCase
{
    use AuthenticatesWithPhoneOtp;
    use DatabaseTransactions;

    private string $privateStorageRoot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootPhoneOtpAuth();
        $this->withoutMiddleware(ThrottleRequests::class);
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Payment proof lifecycle requires PostgreSQL.');
        }
        $this->privateStorageRoot = storage_path('framework/testing/payment-p2p-'.Str::uuid7());
        config()->set('filesystems.disks.private.root', $this->privateStorageRoot);
        Storage::forgetDisk('private');
        $this->seed(DealChainExecutionSeeder::class);
        DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->update([
            'status' => 'due',
            'due_at' => now(),
            'lane' => 'p2p_transfer',
            'settled_at' => null,
        ]);
    }

    protected function tearDown(): void
    {
        if (isset($this->privateStorageRoot)) {
            File::deleteDirectory($this->privateStorageRoot);
        }
        Storage::forgetDisk('private');
        parent::tearDown();
    }

    public function test_p2p_proof_scanner_rejects_non_image_bytes_without_advancing_payment(): void
    {
        $payerId = $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();

        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => UploadedFile::fake()->createWithContent('forged.png', 'not image bytes'),
            'sent_amount_minor' => (int) $obligation->amount_minor,
            'transfer_reference' => 'TXN-INVALID',
        ])->assertUnprocessable();

        $evidence = DB::table('evidence_files')->where('owner_user_id', $payerId)
            ->where('evidence_type', 'payment_p2p_proof')->firstOrFail();
        self::assertSame('infected', $evidence->scan_status);
        self::assertSame('due', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame(0, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.p2p.proof_submitted')->count());

        Storage::disk('private')->assertExists($evidence->storage_key);
    }

    public function test_transfer_reference_length_is_validated_before_storing_proof(): void
    {
        $payerId = $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();

        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => (int) $obligation->amount_minor,
            'transfer_reference' => str_repeat('R', 256),
        ])->assertUnprocessable();

        self::assertSame(0, DB::table('evidence_files')->where('owner_user_id', $payerId)->where('evidence_type', 'payment_p2p_proof')->count());
        self::assertSame('due', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
    }

    public function test_clean_private_proof_can_be_rejected_replaced_and_verified_without_changing_amount_or_reference(): void
    {
        $payerId = $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();
        $amount = (int) $obligation->amount_minor;

        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => $amount,
            'transfer_reference' => 'TXN-2026-001',
        ])->assertOk();
        $firstProofIntent = DB::table('notifications')
            ->where('recipient_user_id', $obligation->recipient_user_id)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.p2p.proof_submitted')
            ->first();
        expect($firstProofIntent)->not->toBeNull();
        $firstProofPayload = json_decode((string) $firstProofIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($firstProofIntent->priority)->toBe('needs_action')
            ->and($firstProofPayload['attention'])->toBe('needs_action')
            ->and($firstProofPayload['title'])->toBeString()
            ->and($firstProofPayload['body'])->toBeString()
            ->and($firstProofPayload['action_url'])->toBe(route('orders.show', ['order' => $obligation->order_id], false));
        self::assertSame(['attention', 'title', 'body', 'action_url'], array_keys($firstProofPayload));



        $firstEvent = DB::table('payment_events')->where('payment_obligation_id', $obligation->id)
            ->where('event_type', 'payment.p2p.proof_submitted')->firstOrFail();
        $firstEvidence = DB::table('evidence_files')->where('id', $firstEvent->evidence_file_id)->firstOrFail();
        $firstPayload = json_decode((string) $firstEvent->payload, true);
        self::assertSame($amount, $firstPayload['sent_amount_minor']);
        self::assertSame('TXN-2026-001', $firstPayload['transfer_reference']);
        $scanMessage = DB::table('outbox_messages')->where('aggregate_id', $firstEvidence->id)
            ->where('event_type', 'work.evidence.scan_requested')->firstOrFail();
        self::assertSame('published', $scanMessage->status);
        self::assertSame('processed', DB::table('inbox_messages')->where('source_event_id', $scanMessage->event_id)->value('status'));
        self::assertSame(2, (int) $firstEvidence->version);
        self::assertSame('clean', $firstEvidence->scan_status);
        self::assertSame('payer_submitted_p2p_proof', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame($payerId, (string) $firstEvidence->owner_user_id);
        Storage::disk('private')->assertExists($firstEvidence->storage_key);

        $recipientId = $this->authenticateWithPhone(Fix::COURIER_PHONE);
        self::assertNotSame($payerId, $recipientId);
        $this->get("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof")
            ->assertOk();
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/reject", [
            'reason' => 'Receipt details are not readable.',
        ])->assertOk()->assertJsonPath('data.status', 'proof_rejected');
        self::assertSame('proof_rejected', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        $rejectionIntent = DB::table('notifications')
            ->where('recipient_user_id', $payerId)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.p2p.proof_rejected')
            ->first();
        expect($rejectionIntent)->not->toBeNull();
        $rejectionPayload = json_decode((string) $rejectionIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($rejectionIntent->priority)->toBe('needs_action')
            ->and($rejectionPayload['attention'])->toBe('needs_action')
            ->and($rejectionPayload['title'])->toBeString()
            ->and($rejectionPayload['body'])->toBeString()
            ->and($rejectionPayload['action_url'])->toBe(route('orders.show', ['order' => $obligation->order_id], false));

        $this->authenticateBuyer();

        $evidenceCount = DB::table('evidence_files')->where('owner_user_id', $payerId)->where('evidence_type', 'payment_p2p_proof')->count();
        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => $amount - 1,
            'transfer_reference' => 'TXN-TAMPERED',
        ])->assertStatus(409);
        self::assertSame($evidenceCount, DB::table('evidence_files')->where('owner_user_id', $payerId)->where('evidence_type', 'payment_p2p_proof')->count());
        self::assertSame('proof_rejected', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame(1, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.p2p.proof_submitted')->count());

        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => $amount,
            'transfer_reference' => 'TXN-2026-001',
        ])->assertOk()->assertJsonPath('data.status', 'payer_submitted_p2p_proof');
        self::assertSame(2, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.p2p.proof_submitted')->count());


        $this->authenticateWithPhone(Fix::COURIER_PHONE);
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/verify", [
            'received_amount_minor' => $amount,
        ])->assertOk()->assertJsonPath('data.status', 'settled');
        $verificationIntent = DB::table('notifications')
            ->where('recipient_user_id', $payerId)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.p2p.receipt_verified')
            ->first();
        expect($verificationIntent)->not->toBeNull();
        $verificationPayload = json_decode((string) $verificationIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($verificationIntent->priority)->toBe('updates')
            ->and($verificationPayload['attention'])->toBe('updates')
            ->and($verificationPayload['title'])->toBeString()
            ->and($verificationPayload['body'])->toBeString()
            ->and($verificationPayload['action_url'])->toBe(route('orders.show', ['order' => $obligation->order_id], false));


        $current = DB::table('payment_obligations')->where('id', $obligation->id)->firstOrFail();
        self::assertSame('settled', $current->status);
        self::assertSame($obligation->public_reference, $current->public_reference);
        self::assertSame($amount, (int) $current->amount_minor);
        self::assertSame(2, DB::table('payment_events')->where('payment_obligation_id', $obligation->id)
            ->where('event_type', 'payment.p2p.proof_submitted')->count());
        self::assertSame(1, DB::table('payment_events')->where('payment_obligation_id', $obligation->id)
            ->where('event_type', 'payment.p2p.receipt_verified')->count());
        $reportedFactsHistory = DB::table('payment_events')
            ->where('payment_obligation_id', $obligation->id)
            ->where('event_type', 'payment.p2p.proof_submitted')
            ->orderBy('occurred_at')
            ->pluck('payload')
            ->all();
        self::assertCount(2, $reportedFactsHistory);
        foreach ($reportedFactsHistory as $payload) {
            $facts = json_decode((string) $payload, true);
            self::assertSame($amount, $facts['sent_amount_minor']);
            self::assertSame('TXN-2026-001', $facts['transfer_reference']);
        }
        Storage::disk('private')->assertExists($firstEvidence->storage_key);
    }

    public function test_amount_mismatch_uses_payment_only_hold_and_staff_can_release_or_settle_it(): void
    {
        $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();
        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => (int) $obligation->amount_minor - 100,
            'transfer_reference' => 'TXN-MISMATCH-1',
        ])->assertOk();

        $recipientId = $this->authenticateWithPhone(Fix::COURIER_PHONE);
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/verify", [
            'received_amount_minor' => (int) $obligation->amount_minor,
        ])->assertStatus(409);
        self::assertSame('payer_submitted_p2p_proof', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/mismatch", [
            'received_amount_minor' => (int) $obligation->amount_minor,
        ])->assertOk()->assertJsonPath('data.status', 'disputed_mismatch');
        self::assertSame(0, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.p2p.receipt_verified')->count());
        $mismatchIntent = DB::table('notifications')
            ->where('recipient_user_id', $obligation->payer_user_id)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.mismatch.reported')
            ->first();
        expect($mismatchIntent)->not->toBeNull();
        $mismatchPayload = json_decode((string) $mismatchIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($mismatchIntent->priority)->toBe('needs_action')
            ->and($mismatchPayload['attention'])->toBe('needs_action')
            ->and($mismatchPayload['title'])->toBeString()
            ->and($mismatchPayload['body'])->toBeString()
            ->and($mismatchPayload['action_url'])->toBe(route('orders.show', ['order' => $obligation->order_id], false));
        self::assertSame(['attention', 'title', 'body', 'action_url'], array_keys($mismatchPayload));



        $case = DB::table('support_cases')->where('payment_obligation_id', $obligation->id)->where('category', 'payment_mismatch_p2p')->firstOrFail();
        self::assertSame('disputed_mismatch', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame('under_review', DB::table('disputes')->where('payment_obligation_id', $obligation->id)->value('status'));
        $reason = (string) DB::table('disputes')->where('payment_obligation_id', $obligation->id)->value('reason');
        self::assertStringContainsString((string) ((int) $obligation->amount_minor - 100), $reason);
        self::assertStringContainsString((string) $obligation->amount_minor, $reason);
        $hold = DB::table('administrative_holds')->where('payment_obligation_id', $obligation->id)->where('status', 'active')->firstOrFail();
        self::assertNull($hold->order_id);
        self::assertNull($hold->work_instance_id);

        $this->postJson("/admin/payment-mismatches/{$case->id}/resolve", ['resolution' => 'release'])
            ->assertForbidden();
        self::assertSame('open', DB::table('support_cases')->where('id', $case->id)->value('status'));
        self::assertSame('disputed_mismatch', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        try {
            DB::transaction(fn () => app(PaymentMismatchCasePort::class)
                ->resolvePaymentMismatchCase((string) $case->id, (string) $recipientId, 'release', (string) Str::uuid7()));
            self::fail('A non-staff recipient must not resolve payment mismatch cases through the port.');
        } catch (TrustSupportError $error) {
            self::assertSame(403, $error->status);
        }
        self::assertSame('open', DB::table('support_cases')->where('id', $case->id)->value('status'));
        self::assertSame('disputed_mismatch', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        $workStatus = DB::table('work_instances')->where('order_id', $obligation->order_id)->value('status');
        $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $this->actingAs($staff)->postJson("/admin/payment-mismatches/{$case->id}/resolve", ['resolution' => 'release'])
            ->assertOk()->assertJsonPath('data.status', 'due');
        $resolutionIntents = DB::table('notifications')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.mismatch.resolved')
            ->orderBy('recipient_user_id')
            ->get();
        self::assertCount(2, $resolutionIntents);
        $resolutionPriorities = $resolutionIntents->pluck('priority', 'recipient_user_id')->all();
        self::assertSame('needs_action', $resolutionPriorities[$obligation->payer_user_id]);
        self::assertSame('updates', $resolutionPriorities[$obligation->recipient_user_id]);


        self::assertSame('due', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame('resolved', DB::table('support_cases')->where('id', $case->id)->value('status'));
        self::assertSame('resolved', DB::table('disputes')->where('payment_obligation_id', $obligation->id)->value('status'));
        self::assertSame('released', DB::table('administrative_holds')->where('id', $hold->id)->value('status'));
        $this->actingAs($staff)->postJson("/admin/payment-mismatches/{$case->id}/resolve", ['resolution' => 'settle'])
            ->assertStatus(409);
        self::assertSame(2, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.mismatch.resolved')->count());
        self::assertSame('due', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertSame($workStatus, DB::table('work_instances')->where('order_id', $obligation->order_id)->value('status'));
        self::assertSame(0, DB::table('administrative_holds')->where('order_id', $obligation->order_id)->whereIn('status', ['active', 'reviewing'])->count());
        self::assertSame(0, DB::table('administrative_holds')->where('work_instance_id', DB::table('work_instances')->where('order_id', $obligation->order_id)->value('id'))->whereIn('status', ['active', 'reviewing'])->count());

        $this->authenticateBuyer();
        $this->withHeader('Accept', 'application/json')->post("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/p2p/proof", [
            'proof' => $this->validPng(),
            'sent_amount_minor' => (int) $obligation->amount_minor,
            'transfer_reference' => 'TXN-MISMATCH-2',
        ])->assertOk();
        $this->authenticateWithPhone(Fix::COURIER_PHONE);
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/mismatch", [
            'received_amount_minor' => (int) $obligation->amount_minor - 1,
        ])->assertOk();
        $settlementCase = DB::table('support_cases')->where('payment_obligation_id', $obligation->id)
            ->where('category', 'payment_mismatch_p2p')->where('status', 'open')->firstOrFail();
        $this->actingAs($staff)->postJson("/admin/payment-mismatches/{$settlementCase->id}/resolve", ['resolution' => 'settle'])
            ->assertOk()->assertJsonPath('data.status', 'settled');
        self::assertNotNull(DB::table('payment_obligations')->where('id', $obligation->id)->value('settled_at'));
        self::assertSame(4, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.mismatch.resolved')->count());
        self::assertSame(3, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.mismatch.resolved')->where('priority', 'updates')->count());

    }

    public function test_money_history_projects_the_party_currency_and_immutable_title_snapshot_in_minor_units(): void
    {
        $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();
        DB::table('order_terms_snapshots')->where('order_id', $obligation->order_id)->update([
            'scope' => json_encode(['title' => 'Accepted snapshot title'], JSON_THROW_ON_ERROR),
        ]);
        $headers = [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
        ];

        $response = $this->withHeaders($headers)->get('/money-history')->assertOk()
            ->assertJsonPath('component', 'Payments/MoneyHistory');
        $record = null;
        foreach ($response->json('props.groups') as $group) {
            foreach ($group['records'] as $candidate) {
                if ($candidate['order_id'] === (string) $obligation->order_id) {
                    $record = $candidate;
                    self::assertSame($group['currency'], (string) $obligation->currency);
                    break 2;
                }
            }
        }
        self::assertIsArray($record);
        self::assertSame('Accepted snapshot title', $record['title']);
        self::assertSame('payer', $record['role']);
        self::assertSame('due', $record['status']);
        self::assertSame((int) $obligation->amount_minor, $record['amount_minor']);
    }

    public function test_external_cash_mismatch_case_is_classified_as_cash_and_holds_only_payment(): void
    {
        $this->authenticateBuyer();
        $obligation = DB::table('payment_obligations')->where('order_id', Fix::ORDER_ID_TRANSIT)->firstOrFail();
        DB::table('payment_obligations')->where('id', $obligation->id)->update(['lane' => 'external_cash']);
        $this->postJson(route('orders.payment-obligations.cash.report', [$obligation->order_id, $obligation->id]), [
            'idempotency_key' => 'cash-mismatch-report-'.Str::uuid7(),
        ])->assertOk();

        $this->authenticateWithPhone(Fix::COURIER_PHONE);
        $this->postJson("/orders/{$obligation->order_id}/payment-obligations/{$obligation->id}/mismatch", [
            'received_amount_minor' => (int) $obligation->amount_minor - 1,
        ])->assertOk()->assertJsonPath('data.status', 'disputed_mismatch');

        $mismatchIntent = DB::table('notifications')
            ->where('recipient_user_id', $obligation->payer_user_id)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.mismatch.reported')
            ->first();
        expect($mismatchIntent)->not->toBeNull();
        $mismatchPayload = json_decode((string) $mismatchIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        expect($mismatchIntent->priority)->toBe('needs_action')
            ->and($mismatchPayload['attention'])->toBe('needs_action')
            ->and($mismatchPayload['title'])->toBeString()
            ->and($mismatchPayload['body'])->toBeString()
            ->and($mismatchPayload['action_url'])->toBe(route('orders.show', ['order' => $obligation->order_id], false));
        self::assertSame(['attention', 'title', 'body', 'action_url'], array_keys($mismatchPayload));


        $case = DB::table('support_cases')->where('payment_obligation_id', $obligation->id)->firstOrFail();
        $dispute = DB::table('disputes')->where('payment_obligation_id', $obligation->id)->firstOrFail();
        $hold = DB::table('administrative_holds')->where('payment_obligation_id', $obligation->id)->firstOrFail();
        self::assertSame('payment_mismatch_cash', $case->category);
        self::assertStringContainsString('External cash amount mismatch', $dispute->reason);
        self::assertNull($hold->order_id);
        self::assertNull($hold->work_instance_id);
    }

    private function validPng(): UploadedFile
    {
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
        self::assertIsString($bytes);

        return UploadedFile::fake()->createWithContent('payment-proof.png', $bytes);
    }
}

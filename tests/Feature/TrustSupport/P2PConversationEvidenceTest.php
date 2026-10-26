<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('offers and downloads clean current P2P proof as a related private conversation attachment', function (): void {
    Storage::fake('private');
    $provider = User::factory()->create();
    $buyer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        [
            'title' => 'P2P conversation proof service',
            'description' => 'Service listing with a supported P2P payment option.',
            'category_code' => 'repairs',
            'listing_type' => 'service',
            'work_shape' => 'A1',
            'price_amount_minor' => 25000,
            'currency' => 'PHP',
            'milestone_stages' => [
                ['id' => 'perform-service', 'title' => 'Perform the agreed service', 'clearanceMode' => 'worker_direct', 'approvalMethod' => 'none', 'requiredProofs' => []],
                ['id' => 'customer-signoff', 'title' => 'Customer accepts the service', 'clearanceMode' => 'customer_approval', 'approvalMethod' => 'app_confirm', 'requiredProofs' => []],
            ],
        ],
        $correlationId,
    );
    $submitted = app(SubmitListing::class)->handle(
        listingId: (string) $listing['id'],
        actor: new ResourceActor((string) $provider->id, (string) $provider->id),
        expectedVersion: (int) $listing['expected_version'],
        idempotencyKey: 'p2p-conversation-listing-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $this->actingAs($reviewer)->post(route('admin.listings.approve', $listing['id']), [
        'expected_version' => $submitted['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));

    $listing = DB::table('listings')->where('id', $listing['id'])->firstOrFail();
    $version = DB::table('listing_versions')
        ->where('listing_id', $listing->id)
        ->where('version_number', (int) $listing->current_version)
        ->firstOrFail();
    DB::table('listing_versions')->where('id', $version->id)->update([
        'payment_lane_availability' => json_encode(['external_cash', 'p2p_transfer'], JSON_THROW_ON_ERROR),
    ]);
    DB::table('capability_profiles')
        ->where('profile_family_code', $version->capability_profile_family_code)
        ->where('business_version', $version->capability_profile_business_version)
        ->update(['allowed_payment_lanes' => json_encode(['external_cash', 'p2p_transfer'], JSON_THROW_ON_ERROR)]);
    $proposal = app(SubmitOrderProposal::class)->handle(
        buyerUserId: (string) $buyer->id,
        listingId: (string) $listing->id,
        expectedListingVersion: (int) $listing->current_version,
        idempotencyKey: 'p2p-conversation-proposal-'.Str::uuid7(),
        correlationId: $correlationId,
        input: [
            'amount_minor' => 25000,
            'currency' => 'PHP',
            'quantity' => 1,
            'listing_version_id' => (string) $version->id,
        ],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: (string) $provider->id,
        orderId: (string) $proposal['order_id'],
        expectedOrderVersion: (int) $proposal['version'],
        idempotencyKey: 'p2p-conversation-finalize-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $orderId = (string) $proposal['order_id'];
    $workId = (string) DB::table('work_instances')->where('order_id', $orderId)->value('id');
    $workService = app(WorkExecutionService::class);
    while (true) {
        $workInstance = DB::table('work_instances')->where('id', $workId)->firstOrFail();
        if ($workInstance->status === 'completed') {
            break;
        }
        $structure = is_array($workInstance->structure) ? $workInstance->structure : json_decode((string) $workInstance->structure, true, flags: JSON_THROW_ON_ERROR);
        $activeNode = collect($structure['nodes'])->firstWhere('status', 'active');
        expect($activeNode)->not->toBeNull();
        if (($activeNode['node_kind'] ?? null) === 'final_signoff') {
            $workService->advanceNode($orderId, (string) $provider->id, (string) $activeNode['id'], 'propose_completion', [], $correlationId);
            $workService->advanceNode($orderId, (string) $buyer->id, (string) $activeNode['id'], 'signoff_completion', [], $correlationId);
        } elseif (($activeNode['control_mode'] ?? null) === 'customer_confirm') {
            $workService->advanceNode($orderId, (string) $provider->id, (string) $activeNode['id'], 'request_confirmation', [], $correlationId);
            $workService->advanceNode($orderId, (string) $buyer->id, (string) $activeNode['id'], 'confirm_gate', [], $correlationId);
        } else {
            $workService->advanceNode($orderId, (string) $provider->id, (string) $activeNode['id'], 'complete_step', [], $correlationId);
        }
    }
    $obligation = DB::table('payment_obligations')
        ->where('order_id', $orderId)
        ->where('purpose', 'primary_consideration')
        ->where('status', '!=', 'superseded')
        ->orderByDesc('created_at')
        ->orderByDesc('id')
        ->firstOrFail();
    $payments = app(OrderPaymentObligationPort::class);
    $currentObligationId = $payments->chooseLane(
        $orderId, (string) $obligation->id, (string) $buyer->id, 'p2p_transfer',
        (string) $version->id, $correlationId, 'p2p-conversation-lane',
    );
    $proofBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    expect($proofBytes)->toBeString();
    $submissionStatus = $payments->submitP2pProof(
        $orderId,
        $currentObligationId,
        (string) $buyer->id,
        UploadedFile::fake()->createWithContent('current-p2p-proof.png', $proofBytes),
        (int) $obligation->amount_minor,
        'COMMUNICATION-P2P-2026',
        (string) Str::uuid7(),
    );
    expect($submissionStatus)->toBe('payer_submitted_p2p_proof');
    $proof = $payments->p2pProofForRecipient($orderId, $currentObligationId, (string) $provider->id);
    $evidenceId = (string) $proof->id;

    $conversation = $this->actingAs($buyer)
        ->postJson('/orders/'.$orderId.'/conversation')
        ->assertCreated()
        ->assertJsonPath('data.available_attachments.0.id', $evidenceId)
        ->json('data.id');
    $this->postJson('/conversations/'.$conversation.'/messages', [
        'idempotency_key' => 'current-p2p-proof-message',
        'content' => 'The current transfer proof is attached.',
        'attachment_evidence_file_id' => $evidenceId,
        'audience' => 'participants',
    ])->assertCreated();

    $this->actingAs($provider)
        ->get('/conversations/'.$conversation.'/attachments/'.$evidenceId)
        ->assertOk()
        ->assertContent($proofBytes);
});

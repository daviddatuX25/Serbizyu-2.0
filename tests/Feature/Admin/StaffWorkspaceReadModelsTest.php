<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Shared\Application\PublicReferenceAllocator;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesSettledDealChainReview;

uses(DatabaseTransactions::class, CreatesSettledDealChainReview::class);

it('includes actual open support cases in the staff inbox', function (): void {
    $staff = User::factory()->create([
        'status' => 'active',
        'primary_access_tier' => 'L4',
    ]);
    $reporter = User::factory()->create();
    $caseId = (string) Str::uuid7();
    $reference = app(PublicReferenceAllocator::class)->allocate('support_cases');
    DB::table('support_cases')->insert([
        'id' => $caseId,
        'reporter_user_id' => (string) $reporter->id,
        'requester_user_id' => (string) $reporter->id,
        'principal_user_id' => (string) $reporter->id,
        'category' => 'payment_mismatch',
        'severity' => 'high',
        'status' => 'open',
        'opened_at' => now(),
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'public_reference' => $reference,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('cohort_classifications')->insert([
        'id' => (string) Str::uuid7(),
        'actor_user_id' => (string) $reporter->id,
        'cohort_class' => 'capstone_demo',
        'source' => 'staff-workspace-test',
        'classified_at' => now(),
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($staff)
        ->get('/admin/triage?'.http_build_query(['q' => $reference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('inbox.data.0.id', $caseId)
            ->where('inbox.data.0.reference', $reference)
            ->where('inbox.data.0.cohort', 'capstone_demo'));
    $this->actingAs($staff)->get('/admin/triage?'.http_build_query(['cohort' => 'capstone_demo', 'q' => $reference]))
        ->assertInertia(fn ($page) => $page->where('inbox.meta.total', 1)->where('filters.cohort', 'capstone_demo'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $reference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.id', $caseId)
            ->where('workspace.kind', 'case')
            ->where('workspace.rails.case.0.reference', $reference));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $caseId]))
        ->assertInertia(fn ($page) => $page->where('workspace.id', $caseId));
});

it('computes saved-view counts from actual responsibility and paginates filtered cases on the server', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $participants = [User::factory()->create(), User::factory()->create(), User::factory()->create()];
    $caseIds = [(string) Str::uuid7(), (string) Str::uuid7(), (string) Str::uuid7()];
    $category = 'staff-inbox-'.(string) Str::uuid7();
    foreach ($caseIds as $index => $caseId) {
        $status = $index === 2 ? 'closed' : 'open';
        DB::table('support_cases')->insert([
            'id' => $caseId,
            'reporter_user_id' => (string) $participants[$index]->id,
            'requester_user_id' => (string) $participants[$index]->id,
            'principal_user_id' => (string) $participants[$index]->id,
            'category' => $category,
            'severity' => 'low',
            'status' => $status,
            'owner_user_id' => $index === 0 ? (string) $staff->id : null,
            'current_responsibility_party' => $index === 1 ? 'participant' : ($index === 2 ? 'none' : 'staff'),
            'current_responsibility_user_id' => $index === 1 ? (string) $participants[$index]->id : null,
            'opened_at' => now()->subMinutes($index),
            'resolved_at' => $index === 2 ? now() : null,
            'correlation_id' => (string) Str::uuid7(),
            'public_reference' => app(PublicReferenceAllocator::class)->allocate('support_cases'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($staff)->get('/admin/triage?'.http_build_query([
        'view' => 'all_open', 'status' => 'open', 'per_page' => 1, 'q' => $category,
    ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('views.all_open', 2)
            ->where('views.assigned_to_me', 1)
            ->where('views.waiting_on_me', 1)
            ->where('views.waiting_on_others', 1)
            ->where('views.closed', 0)
            ->where('inbox.meta.total', 2)
            ->where('inbox.meta.per_page', 1)
            ->where('inbox.meta.last_page', 2)
            ->where('filters.status', 'open'));
    $this->actingAs($staff)->get('/admin/triage?'.http_build_query(['view' => 'waiting_on_others', 'q' => $category]))
        ->assertInertia(fn ($page) => $page
            ->where('inbox.meta.total', 1)
            ->where('inbox.data.0.id', $caseIds[1]));
});

it('uses the latest order cohort instead of the actor cohort when filtering related cases', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $participant = User::factory()->create();
    $orderId = (string) Str::uuid7();
    $caseId = (string) Str::uuid7();
    DB::table('orders')->insert([
        'id' => $orderId,
        'public_reference' => app(PublicReferenceAllocator::class)->allocate('orders'),
        'origin' => 'listing',
        'mechanism' => 'direct_booking',
        'status' => 'accepted',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $caseReference = app(PublicReferenceAllocator::class)->allocate('support_cases');
    DB::table('support_cases')->insert([
        'id' => $caseId,
        'reporter_user_id' => (string) $participant->id,
        'requester_user_id' => (string) $participant->id,
        'principal_user_id' => (string) $participant->id,
        'category' => 'case_study',
        'severity' => 'normal',
        'status' => 'open',
        'order_id' => $orderId,
        'owner_user_id' => (string) $staff->id,
        'current_responsibility_party' => 'staff',
        'opened_at' => now(),
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'public_reference' => $caseReference,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    foreach ([['actor_user_id' => (string) $participant->id, 'cohort_class' => 'capstone_demo'], ['order_id' => $orderId, 'cohort_class' => 'genuine_tagudin']] as $classification) {
        DB::table('cohort_classifications')->insert([
            'id' => (string) Str::uuid7(),
            ...$classification,
            'source' => 'staff-workspace-test',
            'classified_at' => now(),
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($staff)->get('/admin/triage?'.http_build_query(['cohort' => 'capstone_demo', 'q' => $caseReference]))
        ->assertInertia(fn ($page) => $page->where('inbox.meta.total', 0));
    $this->actingAs($staff)->get('/admin/triage?'.http_build_query(['cohort' => 'genuine_tagudin', 'q' => $caseReference]))
        ->assertInertia(fn ($page) => $page
            ->where('inbox.meta.total', 1)
            ->where('inbox.data.0.id', $caseId)
            ->where('inbox.data.0.cohort', 'genuine_tagudin'));
});

it('keeps non-staff users out of the universal workspace', function (): void {
    $participant = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L1']);
    $this->actingAs($participant)->get('/admin/inspect?ref=ORD-UNKNOWN-31')->assertForbidden();
});

it('returns not found for an unknown universal workspace reference', function (): void {
    $staff = User::factory()->create([
        'status' => 'active',
        'primary_access_tier' => 'L4',
    ]);

    $this->actingAs($staff)
        ->get('/admin/inspect?ref=ORD-UNKNOWN-31')
        ->assertNotFound();
});
it('renders an empty inspector workspace without a reference while preserving not-found for unknown references', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);

    $this->actingAs($staff)->get('/admin/inspect')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace', null)
            ->where('query_ref', ''));
    $this->actingAs($staff)->get('/admin/inspect?ref=ORD-UNKNOWN-31')->assertNotFound();
});

it('validates listing category filters as UUIDs before querying listings', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);

    $this->actingAs($staff)
        ->getJson('/admin/listings?category=food')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('category');
});

it('composes independent order, work, payment, case, conversation, evidence and audit facts in the universal workspace', function (): void {
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $buyer = User::factory()->create();
    $provider = User::factory()->create();
    $listingCorrelationId = (string) Str::uuid7();
    $listingDraft = app(CreateListingDraft::class)->handle(
        new ResourceActor((string) $provider->id, (string) $provider->id),
        [
            'title' => 'Current stock linked order listing',
            'description' => 'A persisted product listing linked to the inspected order.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
            'variants' => [['id' => 'linked-stock', 'name' => 'Linked stock', 'price' => 12, 'stock' => 5]],
        ],
        $listingCorrelationId,
    );
    $listingId = (string) $listingDraft['id'];
    $submittedListing = app(SubmitListing::class)->handle(
        listingId: $listingId,
        actor: new ResourceActor((string) $provider->id, (string) $provider->id),
        expectedVersion: (int) $listingDraft['expected_version'],
        idempotencyKey: 'workspace-listing-submit-'.Str::uuid7(),
        correlationId: $listingCorrelationId,
    );
    $this->actingAs($staff)->post(route('admin.listings.approve', $listingId), [
        'expected_version' => $submittedListing['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));
    $listingVersion = DB::table('listings')->where('id', $listingId)->value('current_version');
    $listingVersionId = (string) DB::table('listing_versions')->where('listing_id', $listingId)->where('version_number', $listingVersion)->value('id');
    $listingReference = (string) DB::table('listings')->where('id', $listingId)->value('public_reference');
    $orderId = (string) Str::uuid7();
    $workId = (string) Str::uuid7();
    $obligationId = (string) Str::uuid7();
    $caseId = (string) Str::uuid7();
    $orderReference = app(PublicReferenceAllocator::class)->allocate('orders');
    $obligationReference = app(PublicReferenceAllocator::class)->allocate('payment_obligations');
    $caseReference = app(PublicReferenceAllocator::class)->allocate('support_cases');
    $workEvidenceId = (string) Str::uuid7();
    $caseEvidenceId = (string) Str::uuid7();
    $now = now();
    DB::table('orders')->insert([
        'id' => $orderId,
        'public_reference' => $orderReference,
        'origin' => 'listing',
        'mechanism' => 'direct_booking',
        'listing_id' => $listingId,
        'buyer_user_id' => (string) $buyer->id,
        'provider_user_id' => (string) $provider->id,
        'status' => 'accepted',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'accepted_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $termsId = (string) Str::uuid7();
    DB::table('order_terms_snapshots')->insert([
        'id' => $termsId,
        'order_id' => $orderId,
        'source_listing_version_id' => $listingVersionId,
        'snapshot_version' => 1,
        'scope' => json_encode(['description' => 'Repair a kitchen tap'], JSON_THROW_ON_ERROR),
        'scope_payload_version' => 1,
        'amount_minor' => 12500,
        'currency' => 'PHP',
        'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
        'payment_lane_options_payload_version' => 1,
        'cancellation_rules' => json_encode([], JSON_THROW_ON_ERROR),
        'cancellation_rules_payload_version' => 1,
        'review_rules' => json_encode([], JSON_THROW_ON_ERROR),
        'review_rules_payload_version' => 1,
        'accepted_by_user_id' => (string) $buyer->id,
        'accepted_at' => $now,
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => $now,
    ]);
    DB::table('orders')->where('id', $orderId)->update(['current_terms_snapshot_id' => $termsId]);
    DB::table('work_instances')->insert([
        'id' => $workId,
        'order_id' => $orderId,
        'work_shape' => 'A1',
        'status' => 'in_progress',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    foreach ([[$workEvidenceId, (string) $provider->id, 'work evidence'], [$caseEvidenceId, (string) $buyer->id, 'case attachment']] as [$fileId, $ownerId, $label]) {
        DB::table('evidence_files')->insert([
            'id' => $fileId,
            'owner_user_id' => $ownerId,
            'storage_key' => 'private/'.$fileId,
            'media_type' => 'image/jpeg',
            'size_bytes' => 128,
            'content_hash' => hash('sha256', $label),
            'evidence_type' => 'photo',
            'data_class' => 'P2',
            'scan_status' => 'clean',
            'visibility' => 'private',
            'retention_policy' => 'standard_7y',
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    DB::table('work_events')->insert([
        'id' => (string) Str::uuid7(),
        'work_instance_id' => $workId,
        'new_status' => 'in_progress',
        'event_type' => 'work.started',
        'event_version' => 1,
        'actor_user_id' => (string) $provider->id,
        'evidence_file_id' => $workEvidenceId,
        'idempotency_key' => 'staff-workspace-work-event-'.$workId,
        'correlation_id' => (string) Str::uuid7(),
        'occurred_at' => $now,
        'effective_at' => $now,
        'created_at' => $now,
    ]);
    DB::table('payment_obligations')->insert([
        'id' => $obligationId,
        'public_reference' => $obligationReference,
        'order_id' => $orderId,
        'work_instance_id' => $workId,
        'purpose' => 'primary_consideration',
        'amount_minor' => 12500,
        'currency' => 'PHP',
        'lane' => 'external_cash',
        'status' => 'due',
        'due_condition' => 'on_work_acceptance',
        'due_at' => $now,
        'platform_fee_amount_minor' => 0,
        'processor_cost_amount_minor' => 0,
        'payer_user_id' => (string) $buyer->id,
        'recipient_user_id' => (string) $provider->id,
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('support_cases')->insert([
        'id' => $caseId,
        'public_reference' => $caseReference,
        'reporter_user_id' => (string) $buyer->id,
        'requester_user_id' => (string) $buyer->id,
        'principal_user_id' => (string) $buyer->id,
        'category' => 'payment_mismatch',
        'severity' => 'high',
        'order_id' => $orderId,
        'work_instance_id' => $workId,
        'payment_obligation_id' => $obligationId,
        'status' => 'open',
        'owner_user_id' => (string) $staff->id,
        'current_responsibility_party' => 'participant',
        'current_responsibility_user_id' => (string) $buyer->id,
        'opened_at' => $now,
        'first_response_due_at' => $now->copy()->addDay(),
        'resolution_due_at' => $now->copy()->addWeek(),
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $caseConversationId = (string) Str::uuid7();
    DB::table('conversations')->insert([
        'id' => $caseConversationId,
        'participants' => json_encode([], JSON_THROW_ON_ERROR),
        'participants_payload_version' => 1,
        'access_policy' => json_encode(['authorization' => 'live_scope_membership'], JSON_THROW_ON_ERROR),
        'access_policy_payload_version' => 1,
        'order_id' => null,
        'work_instance_id' => null,
        'created_by_user_id' => (string) $buyer->id,
        'status' => 'open',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'scope_type' => 'support_case',
        'scope_id' => $caseId,
        'next_sequence' => 2,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('messages')->insert([
        'id' => (string) Str::uuid7(),
        'conversation_id' => $caseConversationId,
        'actor_user_id' => (string) $buyer->id,
        'owner_user_id' => (string) $buyer->id,
        'sequence' => 1,
        'content' => 'The repair is still incomplete.',
        'attachment_evidence_file_id' => $caseEvidenceId,
        'delivery_state' => 'recorded',
        'audit_metadata' => null,
        'audit_metadata_payload_version' => null,
        'idempotency_key' => 'staff-workspace-case-message-'.$caseId,
        'payload_hash' => hash('sha256', 'case-message'),
        'audience' => 'participants',
        'actor_display_name' => 'Buyer participant',
        'owner_display_name' => 'Buyer participant',
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => $now,
    ]);
    $orderConversationId = (string) Str::uuid7();
    DB::table('conversations')->insert([
        'id' => $orderConversationId,
        'participants' => json_encode([], JSON_THROW_ON_ERROR),
        'participants_payload_version' => 1,
        'access_policy' => json_encode(['authorization' => 'live_scope_membership'], JSON_THROW_ON_ERROR),
        'access_policy_payload_version' => 1,
        'order_id' => $orderId,
        'work_instance_id' => null,
        'created_by_user_id' => (string) $buyer->id,
        'status' => 'open',
        'correlation_id' => (string) Str::uuid7(),
        'version' => 1,
        'scope_type' => 'order',
        'scope_id' => $orderId,
        'next_sequence' => 2,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('messages')->insert([
        'id' => (string) Str::uuid7(),
        'conversation_id' => $orderConversationId,
        'actor_user_id' => (string) $buyer->id,
        'owner_user_id' => (string) $buyer->id,
        'sequence' => 1,
        'content' => 'Private order participant message.',
        'delivery_state' => 'recorded',
        'idempotency_key' => 'staff-workspace-private-order-message-'.$orderId,
        'payload_hash' => hash('sha256', 'private-order-message'),
        'audience' => 'participants',
        'actor_display_name' => 'Buyer participant',
        'owner_display_name' => 'Buyer participant',
        'correlation_id' => (string) Str::uuid7(),
        'created_at' => $now,
    ]);
    foreach ([['order', $orderId, 'order.accepted'], ['support_case', $caseId, 'support_case.opened']] as [$type, $targetId, $action]) {
        DB::table('audit_events')->insert([
            'id' => (string) Str::uuid7(),
            'actor_user_id' => (string) $staff->id,
            'action' => $action,
            'target_type' => $type,
            'target_id' => $targetId,
            'order_id' => $orderId,
            'correlation_id' => (string) Str::uuid7(),
            'occurred_at' => $now,
            'created_at' => $now,
        ]);
    }

    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $orderReference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.kind', 'order')
            ->where('workspace.rails.agreement.state', 'accepted')
            ->where('workspace.rails.work.state', 'in_progress')
            ->where('workspace.rails.payment.state', 'due')
            ->where('workspace.rails.payment.facts.2.value', '0 PHP')
            ->where('workspace.rails.payment.facts.3.value', 'External and non-custodial; platform fee is 0')
            ->where('workspace.rails.case.0.state', 'open')
            ->where('workspace.stock.state', 'open')
            ->has('workspace.conversations', 1)
            ->where('workspace.conversations.0.messages.0.body', 'The repair is still incomplete.')
            ->where('workspace.conversations.0.messages.0.visibility', 'participant')
            ->has('workspace.evidence', 2)
            ->has('workspace.audit', 2)
            ->missing('workspace.evidence.0.storage_key'));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $obligationReference]))
        ->assertInertia(fn ($page) => $page
            ->where('workspace.kind', 'payment')
            ->where('workspace.rails.payment.reference', $obligationReference)
            ->where('workspace.rails.payment.state', 'due')
            ->where('workspace.siblings.0.reference', $orderReference));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $orderId]))
        ->assertInertia(fn ($page) => $page->where('workspace.id', $orderId));
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $listingReference]))
        ->assertInertia(fn ($page) => $page
            ->where('workspace.kind', 'listing')
            ->where('workspace.id', $listingId)
            ->where('workspace.stock.state', 'open'));
});


it('shows only current deal-chain child orders as universal workspace siblings', function (): void {
    $chain = $this->createReviewableDealChain(false);
    $withdrawnChild = $chain['children'][1];
    $replacement = $this->replaceUnstartedReviewChild($chain, $withdrawnChild);
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $reference = (string) DB::table('deal_chains')->where('id', $chain['chain_id'])->value('public_reference');
    $firstChildReference = (string) DB::table('orders')->where('id', $chain['children'][0]['order_id'])->value('public_reference');
    $replacementReference = (string) DB::table('orders')->where('id', $replacement['order_id'])->value('public_reference');
    $this->actingAs($staff)->get('/admin/inspect?'.http_build_query(['ref' => $reference]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspace.kind', 'deal_chain')
            ->has('workspace.siblings', 2)
            ->where('workspace.siblings.0.reference', $firstChildReference)
            ->where('workspace.siblings.1.reference', $replacementReference));
});

<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\AppointmentSchedulingService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\AppointmentRescheduleService;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use App\Shared\Application\KernelException;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

/** @return array{provider: User, customer: User, listing_id: string, listing_version_id: string, listing_version: int, correlation_id: string} */
function a3AppointmentListing(?User $provider = null): array
{
    $provider ??= User::factory()->create();
    $customer = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $listing = app(CreateListingDraft::class)->handle(new ResourceActor($provider->id, $provider->id), [
        'title' => 'Scheduled electrical repair',
        'description' => 'A pinned 90-minute A3 repair appointment.',
        'category_code' => 'repairs',
        'listing_type' => 'service',
        'work_shape' => 'A3',
        'price_amount_minor' => 25000,
        'currency' => 'PHP',
        'milestone_stages' => [
            [
                'id' => 'a3-arrival-checkin',
                'title' => 'Arrival check-in',
                'description' => 'Confirm access and the agreed appointment scope.',
                'dur' => '45m',
                'evidence_type' => 'none',
                'required_proofs' => [],
                'control_mode' => 'provider_advance',
                'approval_method' => 'none',
            ],
            [
                'id' => 'a3-service-signoff',
                'title' => 'Customer service sign-off',
                'description' => 'Review the completed scheduled service with the customer.',
                'dur' => '45m',
                'evidence_type' => 'dual_sign',
                'required_proofs' => [],
                'control_mode' => 'customer_confirm',
                'approval_method' => 'app_confirm',
            ],
        ],
    ], $correlationId);
    $submitted = app(SubmitListing::class)->handle(
        listingId: (string) $listing['id'],
        actor: new ResourceActor($provider->id, $provider->id),
        expectedVersion: (int) $listing['expected_version'],
        idempotencyKey: 'a3-listing-'.Str::uuid7(),
        correlationId: $correlationId,
    );
    $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    test()->actingAs($reviewer)->post(route('admin.listings.approve', $listing['id']), [
        'expected_version' => $submitted['expected_version'],
    ])->assertRedirect(route('admin.listings.index'));

    $listingVersion = (int) DB::table('listings')->where('id', $listing['id'])->value('current_version');

    return [
        'provider' => $provider,
        'customer' => $customer,
        'listing_id' => (string) $listing['id'],
        'listing_version_id' => (string) DB::table('listing_versions')->where('listing_id', $listing['id'])->where('version_number', $listingVersion)->value('id'),
        'listing_version' => $listingVersion,
        'correlation_id' => $correlationId,
    ];
}

/** @return array{order_id: string, work_id: string, reservation_id: string, starts_at: string} */
function a3AcceptedAppointment(array $fixture, string $startsAt): array
{
    $appointments = app(AppointmentSchedulingService::class);
    $details = $appointments->details($fixture['listing_id']);
    $hold = $appointments->holdAppointment(
        listingId: $fixture['listing_id'],
        listingVersionId: $fixture['listing_version_id'],
        providerUserId: $fixture['provider']->id,
        customerUserId: $fixture['customer']->id,
        startsAt: $startsAt,
        durationMinutes: $details['duration_minutes'],
        ttlMinutes: 10,
        idempotencyKey: 'a3-hold-'.Str::uuid7(),
        correlationId: $fixture['correlation_id'],
    );
    $proposed = app(SubmitOrderProposal::class)->handle(
        buyerUserId: $fixture['customer']->id,
        listingId: $fixture['listing_id'],
        expectedListingVersion: $fixture['listing_version'],
        idempotencyKey: 'a3-proposal-'.Str::uuid7(),
        correlationId: $fixture['correlation_id'],
        input: ['appointment_reservation_id' => $hold['id']],
    );
    app(FinalizeOrderAgreement::class)->handle(
        actorUserId: $fixture['provider']->id,
        orderId: $proposed['order_id'],
        expectedOrderVersion: 1,
        idempotencyKey: 'a3-finalize-'.Str::uuid7(),
        correlationId: $fixture['correlation_id'],
    );

    return [
        'order_id' => $proposed['order_id'],
        'work_id' => (string) DB::table('work_instances')->where('order_id', $proposed['order_id'])->value('id'),
        'reservation_id' => $hold['id'],
        'starts_at' => $hold['starts_at'],
    ];
}

it('serializes full-duration holds across all of a provider listings with half-open boundaries', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $first = a3AppointmentListing();
    $second = a3AppointmentListing($first['provider']);
    $appointments = app(AppointmentSchedulingService::class);
    $start = now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String();
    $firstDetails = $appointments->details($first['listing_id']);
    expect($firstDetails['duration_minutes'])->toBe(90);
    $hold = $appointments->holdAppointment($first['listing_id'], $first['listing_version_id'], $first['provider']->id, $first['customer']->id, $start, 90, 10, 'cross-listing-hold-0001', $first['correlation_id']);
    expect($hold['duration_minutes'])->toBe(90)
        ->and(DB::table('audit_events')->where('action', 'appointment.hold_created')->where('target_id', $hold['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'appointment.hold_created')->whereJsonContains('payload', ['appointment_reservation_id' => $hold['id']])->exists())->toBeTrue();
    $auditsBeforeOverlap = DB::table('audit_events')->count();
    $outboxBeforeOverlap = DB::table('outbox_messages')->count();

    try {
        $appointments->holdAppointment($second['listing_id'], $second['listing_version_id'], $second['provider']->id, $second['customer']->id, $start, 90, 10, 'cross-listing-hold-0002', $second['correlation_id']);
        expect(false)->toBeTrue('An overlapping interval from the providers other listing must be rejected.');
    } catch (KernelException $error) {
        expect($error->envelope->code)->toBe('APPOINTMENT_UNAVAILABLE');
    }
    expect(DB::table('audit_events')->count())->toBe($auditsBeforeOverlap)
        ->and(DB::table('outbox_messages')->count())->toBe($outboxBeforeOverlap);

    $adjacent = Carbon::parse($hold['ends_at'])->toIso8601String();
    $next = $appointments->holdAppointment($second['listing_id'], $second['listing_version_id'], $second['provider']->id, $second['customer']->id, $adjacent, 90, 10, 'cross-listing-hold-0003', $second['correlation_id']);
    expect($next['starts_at'])->toBe($adjacent)
        ->and(DB::table('provider_schedule_resources')->where('provider_user_id', $first['provider']->id)->count())->toBe(1);
});

it('expires only unaccepted holds and keeps committed appointments when a provider adds a block', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $fixture = a3AppointmentListing();
    $appointments = app(AppointmentSchedulingService::class);
    $details = $appointments->details($fixture['listing_id']);
    $start = now()->addDays(3)->setTime(10, 0)->setSecond(0)->toIso8601String();
    $hold = $appointments->holdAppointment($fixture['listing_id'], $fixture['listing_version_id'], $fixture['provider']->id, $fixture['customer']->id, $start, $details['duration_minutes'], 10, 'expiry-hold-0001', $fixture['correlation_id']);

    Carbon::setTestNow(now()->addMinutes(11));
    try {
        $replacement = $appointments->holdAppointment($fixture['listing_id'], $fixture['listing_version_id'], $fixture['provider']->id, $fixture['customer']->id, $start, $details['duration_minutes'], 10, 'expiry-hold-0002', $fixture['correlation_id']);
    } finally {
        Carbon::setTestNow();
    }
    expect(DB::table('appointment_reservations')->where('id', $hold['id'])->value('status'))->toBe('expired')
        ->and(DB::table('audit_events')->where('action', 'appointment.hold_expired')->where('target_id', $hold['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'appointment.hold_expired')->whereJsonContains('payload', ['appointment_reservation_id' => $hold['id']])->exists())->toBeTrue()
        ->and($replacement['id'])->not->toBe($hold['id']);

    $accepted = a3AcceptedAppointment($fixture, now()->addDays(4)->setTime(10, 0)->setSecond(0)->toIso8601String());
    $booked = DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->first();
    $block = $appointments->createBlock($fixture['provider']->id, $fixture['provider']->id, (string) $booked->starts_at, (string) $booked->ends_at, $fixture['correlation_id'], 'Personal time');
    expect(DB::table('audit_events')->where('action', 'appointment.committed')->where('target_id', $accepted['reservation_id'])->where('actor_user_id', $fixture['provider']->id)->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'appointment.committed')->whereJsonContains('payload', ['appointment_reservation_id' => $accepted['reservation_id']])->exists())->toBeTrue()
        ->and(DB::table('audit_events')->where('action', 'agenda.block_created')->where('target_id', $block['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'agenda.block_created')->whereJsonContains('payload', ['block_id' => $block['id']])->exists())->toBeTrue();
    expect(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
        ->and(DB::table('work_instances')->where('id', $accepted['work_id'])->value('scheduled_at'))->toEqual($booked->starts_at);
    try {
        $appointments->holdAppointment(
            $fixture['listing_id'],
            $fixture['listing_version_id'],
            $fixture['provider']->id,
            $fixture['customer']->id,
            Carbon::parse($booked->starts_at)->toIso8601String(),
            $details['duration_minutes'],
            10,
            'blocked-by-existing-booking-0001',
            $fixture['correlation_id'],
        );
        expect(false)->toBeTrue('A block and committed appointment must prevent another hold.');
    } catch (KernelException $error) {
        expect($error->envelope->code)->toBe('APPOINTMENT_UNAVAILABLE');
    }
});

it('keeps the old appointment active until the counterparty accepts and atomically swaps schedule history', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $fixture = a3AppointmentListing();
    $oldStart = now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String();
    $accepted = a3AcceptedAppointment($fixture, $oldStart);
    $newStart = now()->addDays(4)->setTime(11, 0)->setSecond(0)->toIso8601String();
    $reschedules = app(AppointmentRescheduleService::class);
    $request = $reschedules->propose($accepted['order_id'], $fixture['customer']->id, $newStart, $fixture['correlation_id'], 'Change the visit date.');

    expect(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
        ->and(Carbon::parse((string) DB::table('work_instances')->where('id', $accepted['work_id'])->value('scheduled_at'))->equalTo(Carbon::parse($accepted['starts_at'])))->toBeTrue();

    try {
        $reschedules->respond($accepted['order_id'], $request['id'], $fixture['customer']->id, 'accept', $fixture['correlation_id']);
        expect(false)->toBeTrue('The requester cannot accept their own reschedule request.');
    } catch (KernelException $error) {
        expect($error->envelope->code)->toBe('COUNTERPARTY_REQUIRED');
    }

    $proposedReservationId = (string) DB::table('work_schedule_change_requests')->where('id', $request['id'])->value('proposed_reservation_id');
    $proposedReservation = DB::table('appointment_reservations')->where('id', $proposedReservationId)->first();
    $block = app(AppointmentSchedulingService::class)->createBlock(
        $fixture['provider']->id,
        $fixture['provider']->id,
        (string) $proposedReservation->starts_at,
        (string) $proposedReservation->ends_at,
        $fixture['correlation_id'],
        'Unavailable after proposal.',
    );
    expect(DB::table('audit_events')->where('action', 'agenda.block_created')->where('target_id', $block['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'agenda.block_created')->where('aggregate_id', DB::table('provider_schedule_resources')->where('provider_user_id', $fixture['provider']->id)->value('id'))->exists())->toBeTrue();
    $auditsBeforeBlockedAccept = DB::table('audit_events')->count();
    $outboxBeforeBlockedAccept = DB::table('outbox_messages')->count();
    try {
        $reschedules->respond($accepted['order_id'], $request['id'], $fixture['provider']->id, 'accept', $fixture['correlation_id']);
        expect(false)->toBeTrue('A newly blocked replacement time cannot be accepted.');
    } catch (KernelException $error) {
        expect($error->envelope->code)->toBe('APPOINTMENT_UNAVAILABLE');
    }
    expect(DB::table('audit_events')->count())->toBe($auditsBeforeBlockedAccept)
        ->and(DB::table('outbox_messages')->count())->toBe($outboxBeforeBlockedAccept);
    expect(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
        ->and(Carbon::parse((string) DB::table('work_instances')->where('id', $accepted['work_id'])->value('scheduled_at'))->equalTo(Carbon::parse($accepted['starts_at'])))->toBeTrue()
        ->and(DB::table('work_schedule_history')->where('schedule_change_request_id', $request['id'])->exists())->toBeFalse();
    app(AppointmentSchedulingService::class)->deleteBlock($fixture['provider']->id, $block['id'], $fixture['provider']->id, $fixture['correlation_id']);
    expect(DB::table('audit_events')->where('action', 'agenda.block_removed')->where('target_id', $block['id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'agenda.block_removed')->exists())->toBeTrue();
    $reschedules->respond($accepted['order_id'], $request['id'], $fixture['provider']->id, 'accept', $fixture['correlation_id']);
    $newReservationId = (string) DB::table('work_schedule_change_requests')->where('id', $request['id'])->value('proposed_reservation_id');
    expect(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('released')
        ->and(DB::table('appointment_reservations')->where('id', $newReservationId)->value('status'))->toBe('committed')
        ->and(Carbon::parse((string) DB::table('work_instances')->where('id', $accepted['work_id'])->value('scheduled_at'))->equalTo(Carbon::parse($newStart)))->toBeTrue()
        ->and(DB::table('work_schedule_history')->where('schedule_change_request_id', $request['id'])->count())->toBe(1)
        ->and(DB::table('audit_events')->where('action', 'appointment.rescheduled')->where('target_id', $accepted['order_id'])->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'appointment.rescheduled')->exists())->toBeTrue()
        ->and(DB::table('outbox_messages')->where('event_type', 'schedule_change.accepted')->where('aggregate_id', $accepted['order_id'])->exists())->toBeTrue();
});
it('expires a stale reschedule hold without changing the active appointment', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $fixture = a3AppointmentListing();
    $oldStart = now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String();
    $accepted = a3AcceptedAppointment($fixture, $oldStart);
    $reschedules = app(AppointmentRescheduleService::class);
    $request = $reschedules->propose(
        $accepted['order_id'],
        $fixture['customer']->id,
        now()->addDays(4)->setTime(11, 0)->setSecond(0)->toIso8601String(),
        $fixture['correlation_id'],
    );

    Carbon::setTestNow(now()->addMinutes((int) config('serbizyu.scheduling.slot_hold_minutes', 10) + 1));
    try {
        $result = $reschedules->respond($accepted['order_id'], $request['id'], $fixture['provider']->id, 'accept', $fixture['correlation_id']);
    } finally {
        Carbon::setTestNow();
    }

    expect($result['status'])->toBe('expired')
        ->and(DB::table('work_schedule_change_requests')->where('id', $request['id'])->value('status'))->toBe('expired')
        ->and(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
        ->and(Carbon::parse((string) DB::table('work_instances')->where('id', $accepted['work_id'])->value('scheduled_at'))->equalTo(Carbon::parse($accepted['starts_at'])))->toBeTrue()
        ->and(DB::table('work_schedule_history')->where('schedule_change_request_id', $request['id'])->exists())->toBeFalse();
});
it('starts scheduled A3 work and its accepted order on the first provider progression action', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $fixture = a3AppointmentListing();
    $accepted = a3AcceptedAppointment($fixture, now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String());
    $beforeWork = DB::table('work_instances')->where('id', $accepted['work_id'])->first();
    $beforeOrder = DB::table('orders')->where('id', $accepted['order_id'])->first();
    $structure = json_decode((string) $beforeWork->structure, true, 512, JSON_THROW_ON_ERROR);
    $firstNode = $structure['nodes'][0];
    $action = ($firstNode['control_mode'] ?? 'provider_advance') === 'customer_confirm'
        ? 'request_confirmation'
        : 'complete_step';

    expect($beforeWork->status)->toBe('scheduled')
        ->and($beforeWork->started_at)->toBeNull()
        ->and($beforeOrder->status)->toBe('accepted');

    $result = app(WorkExecutionService::class)->advanceNode(
        orderId: $accepted['order_id'],
        actorUserId: $fixture['provider']->id,
        nodeId: (string) $firstNode['id'],
        action: $action,
        correlationId: $fixture['correlation_id'],
    );

    expect($result['work_status'])->toBe('in_progress')
        ->and($result['order_status'])->toBe('in_progress')
        ->and(DB::table('work_instances')->where('id', $accepted['work_id'])->value('started_at'))->not->toBeNull()
        ->and(DB::table('orders')->where('id', $accepted['order_id'])->value('status'))->toBe('in_progress')
        ->and(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed');
});
it('rejects reschedule acceptance after Work completion or cancellation but permits rejection cleanup', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('A3 capacity proofs require PostgreSQL.');
    }

    $reschedules = app(AppointmentRescheduleService::class);
    foreach ([
        ['order' => 'in_progress', 'work' => 'completed', 'description' => 'completed Work'],
        ['order' => 'cancelled', 'work' => 'cancelled', 'description' => 'a cancelled Order'],
    ] as $terminalState) {
        $fixture = a3AppointmentListing();
        $accepted = a3AcceptedAppointment($fixture, now()->addDays(3)->setTime(9, 0)->setSecond(0)->toIso8601String());
        $change = $reschedules->propose(
            $accepted['order_id'],
            $fixture['customer']->id,
            now()->addDays(4)->setTime(11, 0)->setSecond(0)->toIso8601String(),
            $fixture['correlation_id'],
        );
        $proposedReservationId = (string) DB::table('work_schedule_change_requests')->where('id', $change['id'])->value('proposed_reservation_id');
        $auditsBeforeDeniedAccept = DB::table('audit_events')->count();
        $outboxBeforeDeniedAccept = DB::table('outbox_messages')->count();
        $orderUpdates = ['status' => $terminalState['order']];
        if (in_array($terminalState['order'], ['completed', 'cancelled'], true)) {
            $orderUpdates[$terminalState['order'].'_at'] = now();
        }
        $workUpdates = ['status' => $terminalState['work']];
        $workUpdates[$terminalState['work'].'_at'] = now();
        DB::table('orders')->where('id', $accepted['order_id'])->update($orderUpdates);
        DB::table('work_instances')->where('id', $accepted['work_id'])->update($workUpdates);

        try {
            $reschedules->respond($accepted['order_id'], $change['id'], $fixture['provider']->id, 'accept', $fixture['correlation_id']);
            expect(false)->toBeTrue("A reschedule cannot be accepted after {$terminalState['description']}.");
        } catch (KernelException $error) {
            expect($error->envelope->code)->toBe('INVALID_ORDER_STATE');
        }
        expect(DB::table('audit_events')->count())->toBe($auditsBeforeDeniedAccept)
            ->and(DB::table('outbox_messages')->count())->toBe($outboxBeforeDeniedAccept)
            ->and(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
            ->and(DB::table('appointment_reservations')->where('id', $proposedReservationId)->value('status'))->toBe('held')
            ->and(DB::table('work_schedule_change_requests')->where('id', $change['id'])->value('status'))->toBe('pending')
            ->and(DB::table('work_schedule_history')->where('schedule_change_request_id', $change['id'])->exists())->toBeFalse();

        $reschedules->respond($accepted['order_id'], $change['id'], $fixture['provider']->id, 'reject', $fixture['correlation_id']);
        expect(DB::table('appointment_reservations')->where('id', $accepted['reservation_id'])->value('status'))->toBe('committed')
            ->and(DB::table('appointment_reservations')->where('id', $proposedReservationId)->value('status'))->toBe('released')
            ->and(DB::table('audit_events')->where('action', 'appointment.hold_released')->where('target_id', $proposedReservationId)->where('actor_user_id', $fixture['provider']->id)->exists())->toBeTrue()
            ->and(DB::table('outbox_messages')->where('event_type', 'schedule_change.rejected')->where('aggregate_id', $accepted['order_id'])->exists())->toBeTrue();
    }
});

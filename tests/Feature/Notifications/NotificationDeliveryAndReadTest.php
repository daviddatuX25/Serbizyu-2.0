<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Operations\Application\InAppNotificationHandler;
use App\Shared\Application\InboxConsumer;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function notificationIntentFor(string $recipientId, string $key = 'test-intent'): NotificationIntent
{
    return new NotificationIntent(
        recipientUserId: $recipientId,
        eventSourceType: 'test_source',
        eventSourceId: (string) Str::uuid7(),
        eventType: 'test.update',
        attention: NotificationAttention::NeedsAction,
        title: 'A safe notification',
        body: 'A safe notification message.',
        actionUrl: '/notifications',
        idempotencyKey: $key,
        correlationId: (string) Str::uuid7(),
    );
}

it('records and delivers an intent in the source transaction and replays without duplicate delivery', function (): void {
    $recipient = User::factory()->create();
    $intent = notificationIntentFor((string) $recipient->id);
    $adapter = app(NotificationsPort::class);


    $notificationId = DB::transaction(fn () => $adapter->recordIntent($intent));
    $replay = DB::transaction(fn () => $adapter->recordIntent($intent));
    $conflictingIntent = new NotificationIntent(
        recipientUserId: $intent->recipientUserId,
        eventSourceType: $intent->eventSourceType,
        eventSourceId: $intent->eventSourceId,
        eventType: $intent->eventType,
        attention: $intent->attention,
        title: 'Changed content',
        body: $intent->body,
        actionUrl: $intent->actionUrl,
        idempotencyKey: $intent->idempotencyKey,
        correlationId: $intent->correlationId,
    );
    expect(fn () => DB::transaction(fn () => $adapter->recordIntent($conflictingIntent)))
        ->toThrow(RuntimeException::class);
    expect($replay)->toBe($notificationId);
    expect(DB::table('outbox_messages')->where('event_id', $notificationId)->count())->toBe(1);

    $dispatcher = new OutboxDispatcher([app(InAppNotificationHandler::class)], app(InboxConsumer::class));
    expect($dispatcher->dispatch(eventType: 'notification.intent.recorded')->published)->toBe(1);
    expect($dispatcher->dispatch(eventType: 'notification.intent.recorded')->published)->toBe(0);

    expect(DB::table('notification_deliveries')->where('notification_id', $notificationId)->where('channel', 'in_app')->where('status', 'delivered')->count())->toBe(1);
    expect(DB::table('notifications')->where('id', $notificationId)->value('status'))->toBe('delivered');

    $response = $this->actingAs($recipient)->getJson('/notifications/summary')->assertOk();
    $response->assertJsonPath('data.unread_count', 1)
        ->assertJsonPath('data.needs_action_count', 1)
        ->assertJsonPath('data.updates_count', 0);

    $read = $this->postJson("/notifications/{$notificationId}/read")->assertOk();
    $readAt = $read->json('data.read_at');
    $read->assertJsonPath('data.summary.unread_count', 0);
    $this->postJson("/notifications/{$notificationId}/read")->assertOk()->assertJsonPath('data.read_at', $readAt);

    expect(DB::table('notification_deliveries')->where('notification_id', $notificationId)->value('status'))->toBe('delivered');
    $this->getJson('/notifications')->assertOk()->assertJsonPath('data.0.id', $notificationId);
});

it('rolls back notification and outbox intent with its source transaction', function (): void {
    $recipient = User::factory()->create();
    $intent = notificationIntentFor((string) $recipient->id, 'rollback-test');

    try {
        DB::transaction(function () use ($intent): void {
            app(NotificationsPort::class)->recordIntent($intent);
            throw new RuntimeException('rollback');
        });
    } catch (RuntimeException $error) {
        expect($error->getMessage())->toBe('rollback');
    }

    expect(DB::table('notifications')->where('recipient_user_id', $recipient->id)->count())->toBe(0)
        ->and(DB::table('outbox_messages')->where('event_type', 'notification.intent.recorded')->count())->toBe(0)
        ->and(DB::table('notification_deliveries')->where('correlation_id', $intent->correlationId)->count())->toBe(0);
});
it('paginates all delivered notifications with a stable opaque cursor', function (): void {
    $recipient = User::factory()->create();
    $adapter = app(NotificationsPort::class);

    for ($index = 0; $index < 51; $index++) {
        $intent = notificationIntentFor((string) $recipient->id, 'cursor-'.$index);
        DB::transaction(fn () => $adapter->recordIntent($intent));
    }

    $dispatcher = new OutboxDispatcher([app(InAppNotificationHandler::class)], app(InboxConsumer::class));
    expect($dispatcher->dispatch(eventType: 'notification.intent.recorded')->published)->toBe(51);

    $first = $this->actingAs($recipient)->getJson('/notifications')->assertOk();
    expect($first->json('data'))->toHaveCount(50);
    $cursor = $first->json('next_cursor');
    expect($cursor)->toBeString()->not->toBeEmpty();

    $second = $this->getJson('/notifications?cursor='.urlencode($cursor))->assertOk();
    expect($second->json('data'))->toHaveCount(1)
        ->and($second->json('next_cursor'))->toBeNull()
        ->and(collect($first->json('data'))->pluck('id')->concat(collect($second->json('data'))->pluck('id'))->unique())->toHaveCount(51);
    $this->getJson('/notifications?cursor=not-a-cursor')->assertUnprocessable();
});

it('rejects a structurally valid cursor containing an impossible calendar date', function (): void {
    $recipient = User::factory()->create();
    $cursor = rtrim(strtr(base64_encode('2026-02-30 12:00:00+00|'.Str::uuid7()), '+/', '-_'), '=');

    $this->actingAs($recipient)
        ->getJson('/notifications?cursor='.urlencode($cursor))
        ->assertUnprocessable();
});

it('shares a null summary with guests and actual counters with authenticated inertia requests', function (): void {
    $this->get('/mockup')->assertOk()->assertInertia(fn ($page) => $page->where('notificationSummary', null));

    $recipient = User::factory()->create();
    $intent = notificationIntentFor((string) $recipient->id, 'inertia-summary');
    $notificationId = DB::transaction(fn () => app(NotificationsPort::class)->recordIntent($intent));
    (new OutboxDispatcher([app(InAppNotificationHandler::class)], app(InboxConsumer::class)))
        ->dispatch(eventType: 'notification.intent.recorded');

    $this->actingAs($recipient)->get('/mockup')->assertOk()->assertInertia(fn ($page) => $page
        ->where('notificationSummary.unread_count', 1)
        ->where('notificationSummary.needs_action_count', 1)
        ->where('notificationSummary.updates_count', 0));
});

it('hides another recipient notification and returns not found on a foreign read', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $intent = notificationIntentFor((string) $owner->id, 'private-test');
    $notificationId = DB::transaction(fn () => app(NotificationsPort::class)->recordIntent($intent));
    (new OutboxDispatcher([app(InAppNotificationHandler::class)], app(InboxConsumer::class)))
        ->dispatch(eventType: 'notification.intent.recorded');

    $this->actingAs($stranger)->getJson('/notifications')->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($stranger)->postJson("/notifications/{$notificationId}/read")->assertNotFound();
    expect(DB::table('notifications')->where('id', $notificationId)->value('read_at'))->toBeNull();
});

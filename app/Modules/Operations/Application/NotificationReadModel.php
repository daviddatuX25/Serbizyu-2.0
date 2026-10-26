<?php

declare(strict_types=1);

namespace App\Modules\Operations\Application;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use stdClass;

final class NotificationReadModel
{
    private const PAGE_SIZE = 50;

    /** @return array{unread_count:int,needs_action_count:int,updates_count:int} */
    public function summary(string $recipientUserId): array
    {
        $counts = DB::table('notifications')
            ->where('recipient_user_id', $recipientUserId)
            ->where('status', 'delivered')
            ->whereNull('read_at')
            ->selectRaw("COUNT(*) AS unread_count, COUNT(*) FILTER (WHERE attention = 'needs_action') AS needs_action_count, COUNT(*) FILTER (WHERE attention = 'updates') AS updates_count")
            ->first();

        return [
            'unread_count' => (int) $counts->unread_count,
            'needs_action_count' => (int) $counts->needs_action_count,
            'updates_count' => (int) $counts->updates_count,
        ];
    }

    /** @return array{data:list<array<string,mixed>>,next_cursor:?string} */
    public function page(string $recipientUserId, ?string $cursor): array
    {
        $query = DB::table('notifications as n')
            ->join('notification_deliveries as d', function ($join): void {
                $join->on('d.notification_id', '=', 'n.id')
                    ->where('d.channel', '=', 'in_app')
                    ->where('d.status', '=', 'delivered')
                    ->where('d.attempt_number', '=', 1);
            })
            ->where('n.recipient_user_id', $recipientUserId)
            ->where('n.status', 'delivered')
            ->select(['n.id', 'n.event_type', 'n.attention', 'n.payload', 'n.created_at', 'n.read_at']);

        if ($cursor !== null) {
            [$createdAt, $id] = $this->decodeCursor($cursor);
            $query->where(function ($query) use ($createdAt, $id): void {
                $query->where('n.created_at', '<', $createdAt)
                    ->orWhere(function ($query) use ($createdAt, $id): void {
                        $query->where('n.created_at', '=', $createdAt)->where('n.id', '<', $id);
                    });
            });
        }

        $rows = $query->orderByDesc('n.created_at')->orderByDesc('n.id')->limit(self::PAGE_SIZE + 1)->get();
        $hasMore = $rows->count() > self::PAGE_SIZE;
        $items = $rows->take(self::PAGE_SIZE)->map(fn (stdClass $row): array => $this->resource($row))->values()->all();
        $last = $hasMore ? $rows[self::PAGE_SIZE - 1] : null;

        return [
            'data' => $items,
            'next_cursor' => $last === null ? null : $this->encodeCursor((string) $last->created_at, (string) $last->id),
        ];
    }

    public function markRead(string $recipientUserId, string $id): ?string
    {
        if (! Str::isUuid($id)) {
            return null;
        }
        return DB::transaction(function () use ($recipientUserId, $id): ?string {
            $notification = DB::table('notifications')
                ->where('id', $id)
                ->where('recipient_user_id', $recipientUserId)
                ->where('status', 'delivered')
                ->lockForUpdate()
                ->first();

            if ($notification === null) {
                return null;
            }

            if ($notification->read_at === null) {
                DB::table('notifications')->where('id', $id)->update(['read_at' => now(), 'updated_at' => now()]);
                $persistedReadAt = DB::table('notifications')->where('id', $id)->value('read_at');

                return CarbonImmutable::parse((string) $persistedReadAt)->toISOString();
            }

            return CarbonImmutable::parse((string) $notification->read_at)->toISOString();
        });
    }

    /** @return array<string,mixed> */
    private function resource(stdClass $row): array
    {
        $payload = is_string($row->payload) ? json_decode($row->payload, true, 512, JSON_THROW_ON_ERROR) : (array) $row->payload;
        return [
            'id' => (string) $row->id,
            'event_type' => (string) $row->event_type,
            'attention' => (string) $row->attention,
            'title' => (string) ($payload['title'] ?? ''),
            'body' => (string) ($payload['body'] ?? ''),
            'action_url' => (string) ($payload['action_url'] ?? ''),
            'created_at' => (string) $row->created_at,
            'read_at' => $row->read_at === null ? null : (string) $row->read_at,
        ];
    }

    private function encodeCursor(string $createdAt, string $id): string
    {
        return rtrim(strtr(base64_encode($createdAt.'|'.$id), '+/', '-_'), '=');
    }

    /** @return array{string,string} */
    private function decodeCursor(string $cursor): array
    {
        $padding = (4 - strlen($cursor) % 4) % 4;
        $decoded = base64_decode(strtr($cursor, '-_', '+/').str_repeat('=', $padding), true);
        if ($decoded === false || substr_count($decoded, '|') !== 1) {
            throw new InvalidArgumentException('Invalid notification cursor.');
        }
        [$createdAt, $id] = explode('|', $decoded, 2);
        if (! preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:[+-]\\d{2}(?::?[0-5]\\d)?)?$/D', $createdAt)
            || ! Str::isUuid($id)) {
            throw new InvalidArgumentException('Invalid notification cursor.');
        }
        $timestamp = date_parse($createdAt);
        if ($timestamp['error_count'] !== 0
            || $timestamp['warning_count'] !== 0
            || ! checkdate((int) $timestamp['month'], (int) $timestamp['day'], (int) $timestamp['year'])) {
            throw new InvalidArgumentException('Invalid notification cursor.');
        }
        if (isset($timestamp['zone']) && abs($timestamp['zone']) > 14 * 60 * 60) {
            throw new InvalidArgumentException('Invalid notification cursor.');
        }

        return [$createdAt, $id];
    }
}

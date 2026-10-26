<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure;

use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\StaffAuditReaderPort;
use Illuminate\Support\Facades\DB;

final class DatabaseStaffAuditReader implements StaffAuditReaderPort
{
    public function __construct(private readonly ParticipantDisplayNameReaderPort $displayNames) {}

    public function forTargets(array $targets): array
    {
        $targets = array_values(array_filter($targets, static fn (array $target): bool => $target['target_id'] !== ''));
        if ($targets === []) return [];
        $query = DB::table('audit_events as events')->where(function ($query) use ($targets): void {
            foreach ($targets as $target) {
                $query->orWhere(fn ($where) => $where->where('target_type', $target['target_type'])->where('target_id', $target['target_id']));
            }
        });
        $events = $query->orderByDesc('occurred_at')->orderByDesc('id')->limit(50)->get([
            'id', 'actor_user_id', 'action', 'target_type', 'target_id', 'command_name', 'expected_version', 'occurred_at',
        ]);
        $names = $this->displayNames->displayNamesFor($events->pluck('actor_user_id')->filter()->map(fn ($id) => (string) $id)->unique()->values()->all());
        return $events->map(fn ($event): array => [
            'id' => (string) $event->id,
            'event' => (string) $event->action,
            'actor_label' => $event->actor_user_id === null ? 'System' : ($names[(string) $event->actor_user_id] ?? 'User'),
            'created_at' => \Illuminate\Support\Carbon::parse($event->occurred_at)->toISOString(),
            'facts' => array_values(array_filter([
                $event->command_name === null ? null : ['label' => 'Command', 'value' => (string) $event->command_name],
                $event->expected_version === null ? null : ['label' => 'Expected version', 'value' => (string) $event->expected_version],
            ])),
        ])->all();
    }
}

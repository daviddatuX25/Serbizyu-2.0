<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\StaffCaseReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffCaseReaderAdapter implements StaffCaseReaderPort
{
    public function __construct(
        private readonly ParticipantDisplayNameReaderPort $displayNames,
        private readonly CohortClassificationReaderPort $cohorts,
    ) {}

    public function inbox(string $staffId, array $filters): array
    {
        $base = DB::table('support_cases as cases');
        $this->applyFilters($base, $filters);
        $views = [];
        foreach (['all_open', 'assigned_to_me', 'waiting_on_me', 'waiting_on_others', 'closed'] as $view) {
            $query = clone $base;
            $this->applyView($query, $view, $staffId);
            $views[$view] = $query->count();
        }
        $selected = clone $base;
        $this->applyView($selected, (string) $filters['view'], $staffId);
        $paginator = $selected->orderByDesc('cases.opened_at')->orderBy('cases.id')
            ->paginate((int) $filters['per_page'], ['cases.*'], 'page', (int) $filters['page'])
            ->appends($filters);
        $cases = $paginator->getCollection();
        $ids = $cases->flatMap(fn ($case) => array_filter([
            $case->owner_user_id, $case->current_responsibility_user_id,
            $case->principal_user_id ?? null, $case->requester_user_id, $case->reporter_user_id,
        ]))->unique()->values()->all();
        $names = $this->displayNames->displayNamesFor($ids);
        $cohortBySubject = $this->cohorts->latestForSubjects($cases->map(fn ($case): array => [
            'actor_user_id' => $case->principal_user_id ?? $case->requester_user_id ?? $case->reporter_user_id,
            'order_id' => $case->order_id,
        ])->all());

        return [
            'inbox' => [
                'data' => $cases->map(fn ($case): array => $this->toInboxRow($case, $staffId, $names, $cohortBySubject))->values()->all(),
                'links' => ['first' => $paginator->url(1), 'last' => $paginator->url($paginator->lastPage()), 'prev' => $paginator->previousPageUrl(), 'next' => $paginator->nextPageUrl()],
                'meta' => ['current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(), 'per_page' => $paginator->perPage(), 'total' => $paginator->total(), 'from' => $paginator->firstItem(), 'to' => $paginator->lastItem()],
            ],
            'views' => $views,
            'filters' => $filters,
        ];
    }

    /** @return array<string, mixed>|null */
    public function findCase(string $referenceOrId): ?array
    {
        $query = DB::table('support_cases')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $case = $query->first([
            'id', 'public_reference', 'category', 'severity', 'status', 'order_id',
            'work_instance_id', 'payment_obligation_id', 'owner_user_id', 'principal_user_id',
            'requester_user_id', 'reporter_user_id', 'current_responsibility_party',
            'current_responsibility_user_id', 'opened_at', 'updated_at', 'first_response_due_at',
            'resolution_due_at', 'version',
        ]);
        if ($case === null) return null;
        $ids = array_values(array_filter([
            $case->owner_user_id, $case->current_responsibility_user_id, $case->principal_user_id,
            $case->requester_user_id, $case->reporter_user_id,
        ]));
        $names = $this->displayNames->displayNamesFor($ids);
        $cohortActorId = $case->principal_user_id ?? $case->requester_user_id ?? $case->reporter_user_id;
        $cohorts = $this->cohorts->latestForSubjects([[
            'actor_user_id' => $cohortActorId,
            'order_id' => $case->order_id,
        ]]);
        $participant = $case->current_responsibility_user_id ?? $case->principal_user_id ?? $case->requester_user_id ?? $case->reporter_user_id;

        return [
            'id' => (string) $case->id, 'kind' => 'case', 'reference' => (string) $case->public_reference,
            'title' => str($case->category)->replace('_', ' ')->title()->toString(),
            'status' => (string) $case->status, 'version' => (int) $case->version,
            'updated_at' => \Illuminate\Support\Carbon::parse($case->updated_at)->toISOString(),
            'case_id' => (string) $case->id,
            'order_id' => $case->order_id === null ? null : (string) $case->order_id,
            'work_instance_id' => $case->work_instance_id === null ? null : (string) $case->work_instance_id,
            'payment_obligation_id' => $case->payment_obligation_id === null ? null : (string) $case->payment_obligation_id,
            'severity' => (string) $case->severity,
            'responsibility' => [
                'party' => (string) $case->current_responsibility_party,
                'user_id' => $case->current_responsibility_party === 'participant' && $participant !== null ? (string) $participant : null,
                'label' => match ((string) $case->current_responsibility_party) {
                    'staff' => $case->owner_user_id === null ? 'Unassigned staff' : 'Waiting on staff',
                    'participant' => 'Waiting on '.($names[$participant] ?? 'participant'),
                    default => 'No current responsibility',
                },
            ],
            'assigned_to' => $case->owner_user_id === null ? null : ['id' => (string) $case->owner_user_id, 'display_name' => $names[$case->owner_user_id] ?? 'Staff member'],
            'cohort' => $this->cohortLabel($cohorts['order:'.$case->order_id] ?? $cohorts['actor:'.$cohortActorId] ?? null),
            'rails' => ['case' => [[
                'id' => (string) $case->id,
                'kind' => 'support_case',
                'reference' => (string) $case->public_reference,
                'title' => str($case->category)->replace('_', ' ')->title()->toString(),
                'state' => (string) $case->status,
                'label' => 'Support case',
                'facts' => [
                    ['label' => 'Severity', 'value' => (string) $case->severity],
                    ['label' => 'Category', 'value' => (string) $case->category],
                    ['label' => 'Opened', 'value' => \Illuminate\Support\Carbon::parse($case->opened_at)->toISOString()],
                ],
            ]]],
        ];
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if ($filters['status'] !== '') $query->where('cases.status', $filters['status']);
        if ($filters['category'] !== '') $query->where('cases.category', $filters['category']);
        if ($filters['assignee'] !== '') {
            if ($filters['assignee'] === 'unassigned') $query->whereNull('cases.owner_user_id');
            else $query->where('cases.owner_user_id', $filters['assignee']);
        }
        if ($filters['cohort'] !== null) {
            $subjects = $this->cohorts->matchingSubjectIds((string) $filters['cohort']);
            if ($subjects['orders'] === [] && $subjects['actors'] === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function (Builder $q) use ($subjects): void {
                    if ($subjects['orders'] !== []) $q->whereIn('cases.order_id', $subjects['orders']);
                    if ($subjects['actors'] !== []) {
                        $actorCondition = function (Builder $actorQuery) use ($subjects): void {
                            $actorQuery->whereIn(
                                DB::raw('COALESCE(cases.principal_user_id, cases.requester_user_id, cases.reporter_user_id)'),
                                $subjects['actors'],
                            );
                            if ($subjects['other_orders'] !== []) {
                                $actorQuery->where(fn (Builder $scope) => $scope
                                    ->whereNull('cases.order_id')
                                    ->orWhereNotIn('cases.order_id', $subjects['other_orders']));
                            }
                        };
                        if ($subjects['orders'] === []) $q->where($actorCondition);
                        else $q->orWhere($actorCondition);
                    }
                });
            }
        }
        if ($filters['q'] !== '') {
            $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $filters['q']).'%';
            $query->where(fn (Builder $q) => $q->where('cases.public_reference', 'ilike', $needle)
                ->orWhere('cases.category', 'ilike', $needle)->orWhere('cases.status', 'ilike', $needle));
        }
    }

    private function applyView(Builder $query, string $view, string $staffId): void
    {
        if ($view === 'all_open') $query->whereIn('cases.status', ['open', 'under_review']);
        elseif ($view === 'assigned_to_me') $query->whereIn('cases.status', ['open', 'under_review'])->where('cases.owner_user_id', $staffId);
        elseif ($view === 'waiting_on_me') $query->whereIn('cases.status', ['open', 'under_review'])->where('cases.current_responsibility_party', 'staff')->where('cases.owner_user_id', $staffId);
        elseif ($view === 'waiting_on_others') $query->whereIn('cases.status', ['open', 'under_review'])->where(function (Builder $q) use ($staffId): void {
            $q->where('cases.current_responsibility_party', 'participant')
                ->orWhere(fn (Builder $staff) => $staff->where('cases.current_responsibility_party', 'staff')
                    ->whereNotNull('cases.owner_user_id')->where('cases.owner_user_id', '!=', $staffId));
        });
        elseif ($view === 'closed') $query->whereIn('cases.status', ['resolved', 'rejected', 'withdrawn', 'closed']);
    }

    private function toInboxRow(object $case, string $staffId, array $names, array $cohorts): array
    {
        $participant = $case->current_responsibility_user_id ?? $case->principal_user_id ?? $case->requester_user_id ?? $case->reporter_user_id;
        $cohortActorId = $case->principal_user_id ?? $case->requester_user_id ?? $case->reporter_user_id;
        $cohort = $cohorts['order:'.$case->order_id] ?? $cohorts['actor:'.$cohortActorId] ?? null;
        return [
            'id' => (string) $case->id, 'reference' => (string) $case->public_reference, 'kind' => 'case',
            'title' => str($case->category)->replace('_', ' ')->title()->toString(),
            'status' => (string) $case->status, 'severity' => (string) $case->severity,
            'assigned_to' => $case->owner_user_id === null ? null : ['id' => (string) $case->owner_user_id, 'display_name' => $names[$case->owner_user_id] ?? 'Staff member'],
            'responsibility' => [
                'party' => (string) $case->current_responsibility_party,
                'user_id' => $case->current_responsibility_party === 'participant' && $participant !== null ? (string) $participant : null,
                'label' => match ((string) $case->current_responsibility_party) {
                    'staff' => $case->owner_user_id === $staffId ? 'Waiting on you' : ($case->owner_user_id === null ? 'Unassigned staff' : 'Waiting on staff'),
                    'participant' => 'Waiting on '.($names[$participant] ?? 'participant'),
                    default => 'No current responsibility',
                },
            ],
            'opened_at' => $case->opened_at === null ? null : \Illuminate\Support\Carbon::parse($case->opened_at)->toISOString(),
            'updated_at' => $case->updated_at === null ? null : \Illuminate\Support\Carbon::parse($case->updated_at)->toISOString(),
            'first_response_due_at' => $case->first_response_due_at === null ? null : \Illuminate\Support\Carbon::parse($case->first_response_due_at)->toISOString(),
            'resolution_due_at' => $case->resolution_due_at === null ? null : \Illuminate\Support\Carbon::parse($case->resolution_due_at)->toISOString(),
            'cohort' => $this->cohortLabel($cohort),
            'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $case->public_reference),
        ];
    }

    private function cohortLabel(?string $cohort): string
    {
        return $cohort ?? 'unclassified';
    }
}

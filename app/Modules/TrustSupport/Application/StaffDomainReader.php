<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\StaffCaseReaderPort;
use App\Shared\Contracts\StaffTrustSupportReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffTrustSupportReaderPort
{
    public function __construct(
        private readonly StaffCaseReaderPort $cases,
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly ParticipantDisplayNameReaderPort $displayNames,
    ) {}

    public function inbox(string $staffId, array $filters): array
    {
        return $this->cases->inbox($staffId, $filters);
    }

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'disputes') return null;
        $query = DB::table('disputes');
        if ($filters['status'] !== '') $query->where('status', $filters['status']);
        if ($filters['category'] !== '') $query->where('category', $filters['category']);
        if ($filters['q'] !== '') {
            $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $filters['q']).'%';
            $query->where(fn (Builder $q) => $q->where('public_reference', 'ilike', $needle)
                ->orWhere('category', 'ilike', $needle)->orWhere('status', 'ilike', $needle)
                ->orWhere('severity', 'ilike', $needle));
        }
        if ($filters['cohort'] !== null) {
            $subjects = $this->cohorts->matchingSubjectIds((string) $filters['cohort']);
            if ($subjects['orders'] === [] && $subjects['actors'] === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function (Builder $q) use ($subjects): void {
                    if ($subjects['orders'] !== []) $q->whereIn('order_id', $subjects['orders']);
                    if ($subjects['actors'] !== []) {
                        $actorCondition = function (Builder $actorQuery) use ($subjects): void {
                            $actorQuery->whereIn('reporter_user_id', $subjects['actors']);
                            if ($subjects['other_orders'] !== []) {
                                $actorQuery->where(fn (Builder $scope) => $scope
                                    ->whereNull('order_id')
                                    ->orWhereNotIn('order_id', $subjects['other_orders']));
                            }
                        };
                        if ($subjects['orders'] === []) $q->where($actorCondition);
                        else $q->orWhere($actorCondition);
                    }
                });
            }
        }
        $metricsQuery = clone $query;
        $metrics = [
            'dispute_count' => (clone $metricsQuery)->count(),
            'open_count' => (clone $metricsQuery)->whereNotIn('status', ['resolved', 'rejected', 'withdrawn', 'closed'])->count(),
            'high_severity_count' => (clone $metricsQuery)->where('severity', 'high')->whereNotIn('status', ['resolved', 'rejected', 'withdrawn', 'closed'])->count(),
        ];
        $page = $query->orderByDesc('opened_at')->orderBy('id')
            ->paginate((int) $filters['per_page'], ['*'], 'page', (int) $filters['page'])
            ->appends($filters);
        $cohorts = $this->cohorts->latestForSubjects($page->getCollection()->map(fn ($row): array => [
            'order_id' => $row->order_id, 'actor_user_id' => $row->reporter_user_id,
        ])->all());

        return [
            'data' => $page->getCollection()->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->public_reference,
                'kind' => 'dispute',
                'title' => str($row->category)->replace('_', ' ')->title()->toString(),
                'status' => (string) $row->status,
                'summary' => (string) $row->severity.' severity · '.(string) $row->status,
                'updated_at' => \Illuminate\Support\Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $this->cohortLabel($cohorts['order:'.$row->order_id] ?? $cohorts['actor:'.$row->reporter_user_id] ?? null),
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->public_reference),
                'facts' => [
                    ['label' => 'Severity', 'value' => (string) $row->severity],
                    ['label' => 'Category', 'value' => (string) $row->category],
                ],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'metrics' => $metrics,
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $case = $this->cases->findCase($referenceOrId);
        if ($case !== null) return $case;
        $query = DB::table('disputes')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $dispute = $query->first();
        if ($dispute === null) return null;
        return [
            'id' => (string) $dispute->id, 'kind' => 'dispute',
            'reference' => (string) $dispute->public_reference,
            'title' => str($dispute->category)->replace('_', ' ')->title()->toString(),
            'status' => (string) $dispute->status, 'version' => (int) $dispute->version,
            'order_id' => $dispute->order_id === null ? null : (string) $dispute->order_id,
            'work_instance_id' => $dispute->work_instance_id === null ? null : (string) $dispute->work_instance_id,
            'payment_obligation_id' => $dispute->payment_obligation_id === null ? null : (string) $dispute->payment_obligation_id,
            'updated_at' => \Illuminate\Support\Carbon::parse($dispute->updated_at)->toISOString(),
            'rails' => ['case' => [$this->disputeRail($dispute)]],
        ];
    }

    public function casesForOrder(string $orderId): array
    {
        return DB::table('support_cases')->where('order_id', $orderId)
            ->orderByRaw("CASE WHEN status IN ('resolved', 'rejected', 'withdrawn', 'closed') THEN 1 ELSE 0 END")
            ->orderByDesc('opened_at')->orderBy('id')->get(['id', 'public_reference'])
            ->map(fn ($case): ?array => $this->cases->findCase((string) $case->public_reference))
            ->filter()->values()->all();
    }

    public function safeCaseWorkspace(string $caseId): array
    {
        $case = $this->cases->findCase($caseId);
        abort_if($case === null, 404);
        $conversations = DB::table('conversations')
            ->where('scope_type', 'support_case')->where('scope_id', $caseId)
            ->orderByDesc('updated_at')->get(['id', 'updated_at']);
        $conversationDtos = [];
        $evidenceIds = [];
        foreach ($conversations as $conversation) {
            $messages = DB::table('messages')->where('conversation_id', $conversation->id)
                ->where('delivery_state', 'recorded')->whereIn('audience', ['participants', 'staff_internal'])
                ->orderByDesc('sequence')->limit(50)
                ->get(['id', 'audience', 'content', 'actor_display_name', 'owner_display_name', 'created_at', 'attachment_evidence_file_id'])
                ->reverse()->values();
            $messageDtos = [];
            foreach ($messages as $message) {
                if ($message->attachment_evidence_file_id !== null) $evidenceIds[] = (string) $message->attachment_evidence_file_id;
                $messageDtos[] = [
                    'id' => (string) $message->id,
                    'author_label' => (string) $message->actor_display_name,
                    'body' => (string) $message->content,
                    'created_at' => \Illuminate\Support\Carbon::parse($message->created_at)->toISOString(),
                    'visibility' => $message->audience === 'staff_internal' ? 'staff_internal' : 'participant',
                ];
            }
            if ($messageDtos !== []) {
                $conversationDtos[] = [
                    'id' => (string) $conversation->id,
                    'title' => (string) $case['title'],
                    'participant_label' => (string) ($messages->first()->owner_display_name ?? 'Case participants'),
                    'messages' => $messageDtos,
                ];
            }
        }
        $caseRails = $case['rails']['case'] ?? [];
        foreach ($this->relatedDisputes($case) as $dispute) $caseRails[] = $this->disputeRail($dispute);

        return [
            'rails' => ['case' => $caseRails],
            'responsibility' => $case['responsibility'] ?? null,
            'evidence_ids' => array_values(array_unique($evidenceIds)),
            'conversations' => $conversationDtos,
        ];
    }

    /** @return list<object> */
    private function relatedDisputes(array $case): array
    {
        $query = DB::table('disputes');
        $hasTarget = false;
        foreach (['order_id', 'work_instance_id', 'payment_obligation_id'] as $target) {
            if (($case[$target] ?? null) === null) continue;
            $method = $hasTarget ? 'orWhere' : 'where';
            $query->{$method}($target, $case[$target]);
            $hasTarget = true;
        }
        return $hasTarget ? $query->orderByDesc('opened_at')->get()->all() : [];
    }

    private function disputeRail(object $dispute): array
    {
        return [
            'id' => (string) $dispute->id,
            'kind' => 'dispute',
            'reference' => (string) $dispute->public_reference,
            'title' => str($dispute->category)->replace('_', ' ')->title()->toString(),
            'state' => (string) $dispute->status,
            'label' => 'Dispute',
            'facts' => [
                ['label' => 'Severity', 'value' => (string) $dispute->severity],
                ['label' => 'Category', 'value' => (string) $dispute->category],
            ],
        ];
    }

    private function cohortLabel(?string $cohort): string
    {
        return $cohort ?? 'unclassified';
    }
}

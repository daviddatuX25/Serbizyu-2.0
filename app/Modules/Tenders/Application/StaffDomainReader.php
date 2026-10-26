<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\StaffTendersReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffTendersReaderPort
{
    public function __construct(
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly ParticipantDisplayNameReaderPort $participants,
    ) {}

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'tenders') return null;
        $query = $this->filteredTenders($filters);
        $metrics = (clone $query)->selectRaw('COUNT(*) AS record_count')->first();
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $rows = $page->getCollection();
        $actorIds = $rows->pluck('actor_user_id')->filter()->map(static fn ($id): string => (string) $id)->unique()->values()->all();
        $names = $this->participants->displayNamesFor($actorIds);
        $subjects = $rows->map(static fn ($row): array => ['actor_user_id' => (string) $row->actor_user_id])->all();
        $cohorts = $this->cohorts->latestForSubjects($subjects);

        return [
            'data' => $rows->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->id,
                'kind' => (string) $row->record_kind,
                'title' => (string) $row->title,
                'status' => (string) $row->status,
                'summary' => (string) $row->summary,
                'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $cohorts['actor:'.$row->actor_user_id] ?? 'unclassified',
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->id),
                'facts' => [
                    ['label' => $row->record_kind === 'request' ? 'Requester' : 'Provider', 'value' => $names[(string) $row->actor_user_id] ?? 'Unknown participant'],
                    ...($row->record_kind === 'quote' ? [['label' => 'Request', 'value' => (string) $row->request_id]] : []),
                    ['label' => 'Expires', 'value' => $row->expires_at === null ? 'Not specified' : Carbon::parse($row->expires_at)->toISOString()],
                ],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'metrics' => ['record_count' => (int) $metrics->record_count],
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        if (! Str::isUuid($referenceOrId)) return null;
        $request = DB::table('requests')->where('id', $referenceOrId)->first();
        if ($request !== null) {
            return [
                'id' => (string) $request->id,
                'kind' => 'request',
                'reference' => (string) $request->id,
                'title' => 'Request '.(string) $request->id,
                'status' => (string) $request->status,
                'version' => (int) $request->version,
                'updated_at' => Carbon::parse($request->updated_at)->toISOString(),
                'listing_id' => $request->listing_id === null ? null : (string) $request->listing_id,
                'deal_chain_id' => $request->deal_chain_id === null ? null : (string) $request->deal_chain_id,
                'rails' => [],
            ];
        }
        $quote = DB::table('quotes')->where('id', $referenceOrId)->first();
        if ($quote === null) return null;
        return [
            'id' => (string) $quote->id,
            'kind' => 'quote',
            'reference' => (string) $quote->id,
            'title' => 'Quote '.(string) $quote->id,
            'status' => (string) $quote->status,
            'version' => (int) $quote->version,
            'updated_at' => Carbon::parse($quote->updated_at)->toISOString(),
            'listing_id' => $quote->listing_id === null ? null : (string) $quote->listing_id,
            'deal_chain_id' => $quote->deal_chain_id === null ? null : (string) $quote->deal_chain_id,
            'rails' => [],
        ];
    }


    private function filteredTenders(array $filters): Builder
    {
        $requests = DB::table('requests')->selectRaw(
            "id, 'request' AS record_kind, requester_user_id AS actor_user_id, status, updated_at, expires_at, NULL::uuid AS request_id, category_id, description AS title, description AS summary",
        );
        $quotes = DB::table('quotes')->join('requests as linked_request', 'linked_request.id', '=', 'quotes.request_id')->selectRaw(
            "quotes.id, 'quote' AS record_kind, quotes.provider_user_id AS actor_user_id, quotes.status, quotes.updated_at, quotes.expires_at, quotes.request_id, linked_request.category_id, CONCAT('Quote ', quotes.id) AS title, CONCAT(quotes.amount_minor, ' ', quotes.currency, ' · ', quotes.work_shape) AS summary",
        );
        $union = $requests->unionAll($quotes);
        $query = DB::query()->fromSub($union, 'tenders');
        if (($filters['status'] ?? '') !== '') $query->where('status', $filters['status']);
        if (($filters['category'] ?? '') !== '') $query->where('category_id', $filters['category']);
        if (($filters['q'] ?? '') !== '') {
            $term = '%'.$filters['q'].'%';
            $query->where(fn (Builder $q) => $q->where('id', 'ilike', $term)->orWhere('status', 'ilike', $term)->orWhere('title', 'ilike', $term)->orWhere('summary', 'ilike', $term));
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('actor_user_id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['actors']);
        }
        return $query;
    }
}

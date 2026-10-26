<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\StaffDealChainsReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffDealChainsReaderPort
{
    public function __construct(private readonly CohortClassificationReaderPort $cohorts) {}

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'deal_chains') return null;
        $query = DB::table('deal_chains');
        if (($filters['status'] ?? '') !== '') $query->where('status', $filters['status']);
        if (($filters['q'] ?? '') !== '') {
            $term = (string) $filters['q'];
            $query->where(fn (Builder $q) => $q->where('public_reference', 'ilike', '%'.$term.'%')
                ->orWhere('title', 'ilike', '%'.$term.'%')->orWhere('status', 'ilike', '%'.$term.'%'));
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('coordinator_user_id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['actors']);
        }
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? 25), ['*'], 'page', (int) ($filters['page'] ?? 1));
        $classified = $this->cohorts->latestForSubjects($page->getCollection()->map(
            static fn ($row): array => ['actor_user_id' => (string) $row->coordinator_user_id],
        )->all());

        return [
            'data' => $page->getCollection()->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->public_reference,
                'kind' => 'deal_chain',
                'title' => (string) $row->title,
                'status' => (string) $row->status,
                'summary' => (string) $row->goal,
                'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $this->cohortLabel($classified['actor:'.$row->coordinator_user_id] ?? null),
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->public_reference),
                'facts' => [['label' => 'Version', 'value' => (string) $row->version]],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $query = DB::table('deal_chains')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $chain = $query->first();
        if ($chain === null) return null;

        $needs = DB::table('deal_needs')->where('deal_chain_id', $chain->id)->orderBy('ordinal')->orderBy('id')->get();
        $needIds = $needs->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $dependencies = $needIds === [] ? collect() : DB::table('deal_dependencies')
            ->where('deal_chain_id', $chain->id)->where('status', 'active')->orderBy('created_at')->orderBy('id')->get();
        $gates = DB::table('work_step_dependency_gates')->where('deal_chain_id', $chain->id)
            ->orderBy('created_at')->orderBy('id')->get(['condition_code', 'status', 'updated_at', 'source_fact_id']);
        $sourceFactIds = $gates->pluck('source_fact_id')->filter()->map(static fn ($id): string => (string) $id)->unique()->values()->all();
        $sourceFacts = $sourceFactIds === [] ? collect() : DB::table('work_dependency_source_facts')
            ->whereIn('id', $sourceFactIds)->orderBy('occurred_at')->orderBy('id')
            ->get(['event_type', 'aggregate_version', 'payload_version', 'occurred_at']);
        $currentChildIds = $this->currentChildOrderIds((string) $chain->id);

        $facts = [['label' => 'Version', 'value' => (string) $chain->version], ['label' => 'Goal', 'value' => (string) $chain->goal]];
        foreach ($needs as $need) {
            $facts[] = ['label' => 'Need '.$need->ordinal, 'value' => (string) $need->title.' — '.(string) $need->status];
        }
        foreach ($dependencies as $dependency) {
            $facts[] = ['label' => 'Dependency', 'value' => (string) $dependency->condition_code.' — '.(string) $dependency->status];
        }
        foreach ($gates as $gate) {
            $facts[] = ['label' => 'Work gate', 'value' => (string) $gate->condition_code.' — '.(string) $gate->status];
        }
        foreach ($sourceFacts as $sourceFact) {
            $facts[] = ['label' => 'Gate source fact', 'value' => (string) $sourceFact->event_type.'; aggregate v'.(string) $sourceFact->aggregate_version.'; payload v'.(string) $sourceFact->payload_version.'; '.Carbon::parse($sourceFact->occurred_at)->toISOString()];
        }

        return [
            'id' => (string) $chain->id,
            'kind' => 'deal_chain',
            'reference' => (string) $chain->public_reference,
            'title' => (string) $chain->title,
            'status' => (string) $chain->status,
            'version' => (int) $chain->version,
            'updated_at' => Carbon::parse($chain->updated_at)->toISOString(),
            'deal_chain_id' => (string) $chain->id,
            'current_order_ids' => $currentChildIds,
            'rails' => ['agreement' => ['state' => (string) $chain->status, 'label' => 'Deal Chain', 'reference' => (string) $chain->public_reference, 'facts' => $facts]],
        ];
    }

    public function currentChildOrderIds(string $dealChainId): array
    {
        return DB::table('deal_need_confirmations as confirmation')
            ->join('deal_needs as need', function ($join): void {
                $join->on('need.id', '=', 'confirmation.deal_need_id')->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
            })
            ->where('confirmation.deal_chain_id', $dealChainId)
            ->whereNotIn('need.status', ['superseded', 'cancelled', 'replacement_needed', 'failed', 'withdrawn'])
            ->orderBy('need.ordinal')->orderBy('confirmation.created_at')->orderBy('confirmation.id')
            ->pluck('confirmation.order_id')->map(static fn ($id): string => (string) $id)->unique()->values()->all();
    }

    private function cohortLabel(?string $cohort): string
    {
        if ($cohort === null) return 'unclassified';
        return $cohort;
    }
}

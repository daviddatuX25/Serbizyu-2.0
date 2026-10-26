<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\StaffEvidenceReaderPort;
use App\Shared\Contracts\StaffOrdersReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffOrdersReaderPort
{
    public function __construct(
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly StaffEvidenceReaderPort $evidence,
    ) {}

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'orders') return null;

        $query = $this->filteredOrders($filters);
        $metrics = [
            'order_count' => (int) (clone $query)->count(),
            'open_order_count' => (int) (clone $query)->whereNotIn('status', ['cancelled', 'closed'])->count(),
        ];
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $ids = $page->getCollection()->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $cohorts = $this->cohorts->latestForSubjects(array_map(
            static fn (string $id): array => ['order_id' => $id],
            $ids,
        ));

        return [
            'data' => $page->getCollection()->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->public_reference,
                'kind' => 'order',
                'title' => 'Order '.(string) $row->public_reference,
                'status' => (string) $row->status,
                'summary' => 'Order status: '.(string) $row->status,
                'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $cohorts['order:'.$row->id] ?? 'unclassified',
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->public_reference),
                'facts' => [['label' => 'Version', 'value' => (string) $row->version]],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'metrics' => $metrics,
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $query = DB::table('orders')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $order = $query->first();
        if ($order === null) return null;

        $proposalAgreement = $order->current_terms_snapshot_id === null && $order->current_proposal_id !== null
            ? DB::table('order_proposals')->where('id', $order->current_proposal_id)->where('order_id', $order->id)->where('status', 'proposed')->first()
            : null;
        $agreement = $order->current_terms_snapshot_id === null
            ? $proposalAgreement
            : DB::table('order_terms_snapshots')->where('id', $order->current_terms_snapshot_id)->where('order_id', $order->id)->first();
        $proposalScope = $proposalAgreement === null ? null : json_decode((string) $proposalAgreement->scope, true);
        $work = DB::table('work_instances')->where('order_id', $order->id)->orderByDesc('created_at')->orderByDesc('id')->first();

        return [
            'id' => (string) $order->id,
            'kind' => 'order',
            'reference' => (string) $order->public_reference,
            'title' => 'Order '.(string) $order->public_reference,
            'status' => (string) $order->status,
            'version' => (int) $order->version,
            'updated_at' => Carbon::parse($order->updated_at)->toISOString(),
            'order_id' => (string) $order->id,
            'listing_id' => $order->listing_id === null ? null : (string) $order->listing_id,
            'deal_chain_id' => $order->deal_chain_id === null ? null : (string) $order->deal_chain_id,
            'rails' => [
                'agreement' => $agreement === null ? null : [
                    'state' => $proposalAgreement !== null ? 'pending_acceptance' : ($agreement->accepted_at === null ? 'pending_acceptance' : 'accepted'),
                    'label' => is_array($proposalScope) && is_string($proposalScope['title'] ?? null) ? $proposalScope['title'] : 'Order agreement',
                    'reference' => (string) $order->public_reference,
                    'facts' => [
                        ['label' => 'Version', 'value' => (string) ($proposalAgreement !== null ? $proposalAgreement->proposal_version : $agreement->snapshot_version)],
                        ['label' => 'Amount (minor units)', 'value' => (string) $agreement->amount_minor.' '.$agreement->currency],
                    ],
                ],
                'work' => $work === null ? null : [
                    'state' => (string) $work->status,
                    'label' => 'Work execution',
                    'facts' => [['label' => 'Work shape', 'value' => (string) $work->work_shape]],
                ],
            ],
        ];
    }
    public function evidenceForOrder(string $orderId): array
    {
        $work = DB::table('work_instances')
            ->where('order_id', $orderId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['id', 'completion_evidence_id']);
        if ($work === null) return [];

        $evidenceIds = DB::table('work_events')
            ->where('work_instance_id', $work->id)
            ->whereNotNull('evidence_file_id')
            ->pluck('evidence_file_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();
        if ($work->completion_evidence_id !== null) $evidenceIds[] = (string) $work->completion_evidence_id;

        return $this->evidence->metadataForIds(array_values(array_unique($evidenceIds)));
    }


    private function filteredOrders(array $filters): Builder
    {
        $query = DB::table('orders');
        if (($filters['status'] ?? '') !== '') $query->where('status', $filters['status']);
        if (($filters['q'] ?? '') !== '') {
            $term = '%'.$filters['q'].'%';
            $query->where(fn (Builder $q) => $q->where('public_reference', 'ilike', $term)->orWhere('status', 'ilike', $term));
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['orders']);
        }
        return $query;
    }
}

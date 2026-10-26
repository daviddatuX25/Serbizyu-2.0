<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\OrderReferenceReaderPort;
use App\Shared\Contracts\StaffEvidenceReaderPort;
use App\Shared\Contracts\StaffPaymentsReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffPaymentsReaderPort
{
    public function __construct(
        private readonly OrderReferenceReaderPort $orderReferences,
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly StaffEvidenceReaderPort $evidence,
    ) {}

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'financials') return null;

        $query = $this->filteredObligations($filters);
        $metrics = (clone $query)->selectRaw('COUNT(*) AS obligation_count')->first();
        $cashAmounts = (clone $query)->where('lane', 'external_cash')
            ->groupBy('currency')->selectRaw('currency, SUM(amount_minor) AS amount_minor')->get();
        $feeAmounts = (clone $query)->where('platform_fee_amount_minor', '<>', 0)
            ->groupBy('currency')->selectRaw('currency, SUM(platform_fee_amount_minor) AS amount_minor')->get();
        $cashCurrencyCount = $cashAmounts->count();
        $feeCurrencyCount = $feeAmounts->count();
        $cashMetric = [
            'external_cash_gmv_minor' => $cashCurrencyCount === 0 ? 0 : ($cashCurrencyCount === 1 ? (int) $cashAmounts[0]->amount_minor : null),
            'external_cash_gmv_currency' => $cashCurrencyCount === 0 ? null : ($cashCurrencyCount === 1 ? (string) $cashAmounts[0]->currency : 'mixed'),
        ];
        $feeMetric = [
            'platform_fee_minor' => $feeCurrencyCount === 0 ? 0 : ($feeCurrencyCount === 1 ? (int) $feeAmounts[0]->amount_minor : null),
            'platform_fee_currency' => $feeCurrencyCount === 0 ? null : ($feeCurrencyCount === 1 ? (string) $feeAmounts[0]->currency : 'mixed'),
        ];
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $references = $this->orderReferences->referencesForOrders($page->getCollection()->pluck('order_id')->map(static fn ($id): string => (string) $id)->all());
        $subjects = [];
        foreach ($page->getCollection() as $row) $subjects[] = ['order_id' => (string) $row->order_id];
        $cohorts = $this->cohorts->latestForSubjects($subjects);

        return [
            'data' => $page->getCollection()->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->public_reference,
                'kind' => 'payment',
                'title' => 'Payment '.(string) $row->public_reference,
                'status' => (string) $row->status,
                'summary' => (string) $row->amount_minor.' minor units '.(string) $row->currency.' · '.str($row->lane)->replace('_', ' ')->toString(),
                'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $cohorts['order:'.$row->order_id] ?? 'unclassified',
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->public_reference),
                'facts' => [
                    ['label' => 'Order', 'value' => $references[(string) $row->order_id] ?? (string) $row->order_id],
                    ['label' => 'Amount (minor units)', 'value' => (string) $row->amount_minor.' '.(string) $row->currency],
                    ['label' => 'Lane', 'value' => (string) $row->lane],
                    ['label' => 'Platform fee (minor units)', 'value' => (string) $row->platform_fee_amount_minor.' '.(string) $row->currency],
                    ...($row->lane === 'external_cash' ? [['label' => 'Custody', 'value' => 'Non-custodial; external cash is not platform revenue']] : []),
                ],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'metrics' => [
                'obligation_count' => (int) $metrics->obligation_count,
                ...$cashMetric,
                ...$feeMetric,
            ],
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $query = DB::table('payment_obligations')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $obligation = $query->first();
        if ($obligation === null) return null;

        return [
            'id' => (string) $obligation->id,
            'kind' => 'payment',
            'reference' => (string) $obligation->public_reference,
            'title' => 'Payment '.(string) $obligation->public_reference,
            'status' => (string) $obligation->status,
            'version' => (int) $obligation->version,
            'updated_at' => Carbon::parse($obligation->updated_at)->toISOString(),
            'order_id' => (string) $obligation->order_id,
            'rails' => ['payment' => $this->rail($obligation)],
        ];
    }

    public function primaryRailForOrder(string $orderId): ?array
    {
        $row = DB::table('payment_obligations')
            ->where('order_id', $orderId)
            ->where('purpose', 'primary_consideration')
            ->where('status', '<>', 'superseded')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
        return $row === null ? null : $this->rail($row);
    }

    public function evidenceForOrder(string $orderId): array
    {
        $evidenceIds = DB::table('payment_events')
            ->join('payment_obligations', 'payment_obligations.id', '=', 'payment_events.payment_obligation_id')
            ->where('payment_obligations.order_id', $orderId)
            ->whereIn('payment_events.lane', ['external_digital_proof', 'p2p_transfer'])
            ->whereNotNull('payment_events.evidence_file_id')
            ->orderBy('payment_events.created_at')
            ->orderBy('payment_events.id')
            ->pluck('payment_events.evidence_file_id')
            ->map(static fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
        return $this->evidence->metadataForIds($evidenceIds);
    }


    private function rail(object $obligation): array
    {
        return [
            'state' => (string) $obligation->status,
            'label' => 'Payment obligation',
            'reference' => (string) $obligation->public_reference,
            'facts' => [
                ['label' => 'Amount (minor units)', 'value' => (string) $obligation->amount_minor.' '.(string) $obligation->currency],
                ['label' => 'Lane', 'value' => (string) $obligation->lane],
                ['label' => 'Platform fee (minor units)', 'value' => (string) $obligation->platform_fee_amount_minor.' '.(string) $obligation->currency],
                ...($obligation->settled_at === null ? [] : [['label' => 'Settled at', 'value' => Carbon::parse($obligation->settled_at)->toISOString()]]),
                ...($obligation->lane === 'external_cash' ? [['label' => 'Settlement', 'value' => 'External and non-custodial; platform fee is 0']] : []),
            ],
        ];
    }

    private function filteredObligations(array $filters): Builder
    {
        $query = DB::table('payment_obligations');
        if (($filters['status'] ?? '') !== '') $query->where('status', $filters['status']);
        if (($filters['q'] ?? '') !== '') {
            $term = '%'.$filters['q'].'%';
            $query->where(fn (Builder $q) => $q->where('public_reference', 'ilike', $term)->orWhere('status', 'ilike', $term)->orWhere('lane', 'ilike', $term));
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('order_id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['orders']);
        }
        return $query;
    }
}

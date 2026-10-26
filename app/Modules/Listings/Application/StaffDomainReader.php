<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\StaffListingsReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffListingsReaderPort
{
    public function __construct(
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly ParticipantDisplayNameReaderPort $participants,
    ) {}

    public function registry(string $kind, array $filters): ?array
    {
        if (! in_array($kind, ['listings', 'telemetry'], true)) return null;
        $query = $this->filteredListings($filters);
        $metrics = (clone $query)->selectRaw(
            'COUNT(*) AS listing_count, COUNT(*) FILTER (WHERE review_status = ?) AS pending_review_count',
            ['pending'],
        )->first();
        $telemetry = DB::table('listing_daily_metrics as metrics')
            ->join('listings', 'listings.id', '=', 'metrics.listing_id')
            ->whereIn('listings.id', (clone $query)->select('listings.id'))
            ->groupBy('metrics.currency')
            ->selectRaw('metrics.currency, COALESCE(SUM(metrics.impressions), 0) AS impressions, COALESCE(SUM(metrics.views), 0) AS views, COALESCE(SUM(metrics.inquiries), 0) AS inquiries, COALESCE(SUM(metrics.orders), 0) AS orders, COALESCE(SUM(metrics.gross_amount_minor), 0) AS gross_amount_minor')
            ->get();
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')->paginate($filters['per_page'], ['listings.*'], 'page', $filters['page']);
        $rows = $page->getCollection();
        $subjects = $rows->map(static fn ($row): array => ['actor_user_id' => (string) $row->owner_user_id])->all();
        $cohorts = $this->cohorts->latestForSubjects($subjects);
        $names = $this->participants->displayNamesFor($rows->pluck('owner_user_id')->map(static fn ($id): string => (string) $id)->all());
        $listingIds = $rows->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $versions = DB::table('listing_versions')->whereIn('listing_id', $listingIds)->get();
        $currentVersions = $rows->mapWithKeys(static fn ($row): array => [(string) $row->id => (int) $row->current_version]);
        $rowTelemetry = DB::table('listing_daily_metrics')->whereIn('listing_id', $listingIds)
            ->groupBy('listing_id')
            ->selectRaw('listing_id, SUM(impressions) AS impressions, SUM(views) AS views, SUM(inquiries) AS inquiries, SUM(orders) AS orders')
            ->get()->keyBy(static fn ($row): string => (string) $row->listing_id);
        return [
            'data' => $rows->map(function ($row) use ($cohorts, $names, $versions, $currentVersions, $rowTelemetry): array {
                $version = $versions->first(static fn ($version): bool => (string) $version->listing_id === (string) $row->id && (int) $version->version_number === $currentVersions[(string) $row->id]);
                $telemetryRow = $rowTelemetry[(string) $row->id] ?? null;
                $terms = $version === null ? [] : (json_decode((string) $version->terms, true) ?: []);
                return [
                    'id' => (string) $row->id,
                    'reference' => (string) $row->public_reference,
                    'kind' => 'listing',
                    'title' => (string) ($terms['title'] ?? ''),
                    'status' => (string) $row->review_status,
                    'summary' => (string) $row->listing_type.' · '.(string) $row->status,
                    'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                    'cohort' => $cohorts['actor:'.$row->owner_user_id] ?? 'unclassified',
                    'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->public_reference),
                    'facts' => [
                        ['label' => 'Provider', 'value' => $names[(string) $row->owner_user_id] ?? 'Unknown participant'],
                        ['label' => 'Type', 'value' => (string) $row->listing_type],
                        ['label' => 'Review', 'value' => (string) $row->review_status],
                        ['label' => 'Impressions', 'value' => (string) (int) ($telemetryRow->impressions ?? 0)],
                        ['label' => 'Views', 'value' => (string) (int) ($telemetryRow->views ?? 0)],
                        ['label' => 'Inquiries', 'value' => (string) (int) ($telemetryRow->inquiries ?? 0)],
                        ['label' => 'Orders', 'value' => (string) (int) ($telemetryRow->orders ?? 0)],
                    ],
                    'moderation' => $row->status === 'pending_review' && $row->review_status === 'pending' ? [
                        'can_approve' => true,
                        'can_reject' => true,
                        'expected_version' => (int) $row->version,
                        'approve_url' => '/admin/listings/'.rawurlencode((string) $row->id).'/approve',
                        'reject_url' => '/admin/listings/'.rawurlencode((string) $row->id).'/reject',
                    ] : null,
                ];
            })->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
            'metrics' => [
                'listing_count' => (int) $metrics->listing_count,
                'pending_review_count' => (int) $metrics->pending_review_count,
                'impressions' => (int) $telemetry->sum('impressions'),
                'views' => (int) $telemetry->sum('views'),
                'inquiries' => (int) $telemetry->sum('inquiries'),
                'orders' => (int) $telemetry->sum('orders'),
                ...$telemetry->mapWithKeys(static fn ($row): array => [
                    'gross_amount_minor_'.strtoupper((string) $row->currency) => (int) $row->gross_amount_minor,
                ])->all(),
            ],
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $query = DB::table('listings')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $query->orWhere('id', $referenceOrId);
        $listing = $query->first();
        if ($listing === null) return null;
        $version = DB::table('listing_versions')->where('listing_id', $listing->id)->where('version_number', $listing->current_version)->first();
        $terms = $version === null ? [] : (json_decode((string) $version->terms, true) ?: []);
        return [
            'id' => (string) $listing->id,
            'kind' => 'listing',
            'reference' => (string) $listing->public_reference,
            'title' => (string) ($terms['title'] ?? ''),
            'status' => (string) $listing->review_status,
            'version' => (int) $listing->version,
            'updated_at' => Carbon::parse($listing->updated_at)->toISOString(),
            'listing_id' => (string) $listing->id,
            'listing_details' => $version === null ? null : array_filter([
                'description' => (string) $version->description,
                'listing_type' => (string) $listing->listing_type,
                'price_amount_minor' => $version->price_amount_minor === null ? null : (int) $version->price_amount_minor,
                'currency' => $version->currency === null ? null : (string) $version->currency,
                'work_shape' => isset($terms['work_shape']) && is_string($terms['work_shape']) ? $terms['work_shape'] : null,
                'work_specification' => is_array($terms['work_specification'] ?? null) ? $terms['work_specification'] : null,
                'media' => is_array($terms['media'] ?? null) ? $terms['media'] : null,
                'variants' => is_array($terms['variants'] ?? null) ? $terms['variants'] : null,
                'prep_lead_time' => isset($terms['prep_lead_time']) && is_string($terms['prep_lead_time']) ? $terms['prep_lead_time'] : null,
                'deal_chain_combinations' => is_array($terms['deal_chain_combinations'] ?? null) ? $terms['deal_chain_combinations'] : null,
                'deal_chain_specification' => is_array($terms['deal_chain_specification'] ?? null) ? $terms['deal_chain_specification'] : null,
            ], static fn ($value): bool => $value !== null),
            'rails' => [],
            'actions' => $listing->status === 'pending_review' && $listing->review_status === 'pending' ? [
                'listing_review' => [
                    'can_approve' => true,
                    'can_reject' => true,
                    'expected_version' => (int) $listing->version,
                    'approve_url' => '/admin/listings/'.rawurlencode((string) $listing->id).'/approve',
                    'reject_url' => '/admin/listings/'.rawurlencode((string) $listing->id).'/reject',
                ],
            ] : [],
        ];
    }

    public function stockFactsForListing(string $listingId): ?array
    {
        $listing = DB::table('listings')->where('id', $listingId)->first(['id', 'listing_type']);
        if ($listing === null || $listing->listing_type !== 'product') return null;
        $capacity = DB::table('listing_capacity')->where('listing_id', $listingId)->orderBy('resource_key')->get([
            'capacity_type', 'resource_key', 'quantity', 'remaining_quantity', 'availability_status', 'stock_policy', 'low_stock_threshold',
        ]);
        $latest = DB::table('stock_movements as movement')->join('listing_capacity as capacity', 'capacity.id', '=', 'movement.listing_capacity_id')
            ->where('capacity.listing_id', $listingId)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')->from('stock_movements as newer')
                    ->whereColumn('newer.listing_capacity_id', 'movement.listing_capacity_id')
                    ->where(function ($query): void {
                        $query->whereColumn('newer.occurred_at', '>', 'movement.occurred_at')
                            ->orWhere(function ($query): void {
                                $query->whereColumn('newer.occurred_at', '=', 'movement.occurred_at')
                                    ->whereColumn('newer.id', '>', 'movement.id');
                            });
                    });
            })
            ->orderBy('capacity.resource_key')
            ->get(['capacity.resource_key', 'movement.balance_on_hand', 'movement.balance_held', 'movement.balance_committed', 'movement.balance_available', 'movement.occurred_at']);
        return [
            'buckets' => $capacity->map(static fn ($row): array => [
                'resource_key' => (string) $row->resource_key,
                'capacity_type' => (string) $row->capacity_type,
                'quantity' => $row->quantity === null ? null : (int) $row->quantity,
                'remaining_quantity' => $row->remaining_quantity === null ? null : (int) $row->remaining_quantity,
                'availability_status' => (string) $row->availability_status,
                'stock_policy' => $row->stock_policy,
                'low_stock_threshold' => (int) $row->low_stock_threshold,
            ])->all(),
            'latest_movements' => $latest->map(static fn ($row): array => [
                'resource_key' => (string) $row->resource_key,
                'on_hand' => (int) $row->balance_on_hand,
                'held' => (int) $row->balance_held,
                'committed' => (int) $row->balance_committed,
                'available' => (int) $row->balance_available,
                'occurred_at' => Carbon::parse($row->occurred_at)->toISOString(),
            ])->all(),
        ];
    }


    private function filteredListings(array $filters): Builder
    {
        $query = DB::table('listings');
        if (($filters['status'] ?? '') !== '') $query->where('review_status', $filters['status']);
        if (($filters['category'] ?? '') !== '') $query->where('category_id', $filters['category']);
        if (($filters['q'] ?? '') !== '') {
            $term = '%'.$filters['q'].'%';
            $query->where(function (Builder $q) use ($term): void {
                $q->where('public_reference', 'ilike', $term)
                    ->orWhere('listing_type', 'ilike', $term)
                    ->orWhere('review_status', 'ilike', $term)
                    ->orWhere('status', 'ilike', $term)
                    ->orWhereExists(function (Builder $versions) use ($term): void {
                        $versions->selectRaw('1')->from('listing_versions')
                            ->whereColumn('listing_versions.listing_id', 'listings.id')
                            ->whereColumn('listing_versions.version_number', 'listings.current_version')
                            ->where(function (Builder $match) use ($term): void {
                                $match->where('listing_versions.description', 'ilike', $term)
                                    ->orWhereRaw("listing_versions.terms->>'title' ILIKE ?", [$term]);
                            });
                    });
            });
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('owner_user_id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['actors']);
        }
        return $query;
    }
}

<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Telemetry;

use App\Shared\Contracts\ListingTelemetryQueryPort;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class ListingTelemetryService implements ListingTelemetryQueryPort
{
    private const ALLOWED_EVENT_TYPES = [
        'listing.impression',
        'listing.view',
        'listing.inquiry_started',
    ];

    /**
     * Category baseline benchmarks per ADR-032 for draft listings or zero-traffic new listings.
     *
     * @var array<string, array{impressions: int, views: int, inquiries: int, orders: int}>
     */
    private const CATEGORY_BENCHMARKS = [
        'repairs' => ['impressions' => 720, 'views' => 184, 'inquiries' => 46, 'orders' => 14],
        'cleaning' => ['impressions' => 610, 'views' => 152, 'inquiries' => 35, 'orders' => 11],
        'food' => ['impressions' => 840, 'views' => 240, 'inquiries' => 58, 'orders' => 22],
        'goods' => ['impressions' => 680, 'views' => 195, 'inquiries' => 42, 'orders' => 16],
        'default' => ['impressions' => 640, 'views' => 156, 'inquiries' => 38, 'orders' => 12],
    ];

    public function recordEvent(
        string $eventType,
        string $listingId,
        ?string $actorUserId = null,
        ?string $sessionId = null,
        ?string $correlationId = null,
    ): void {
        if (! in_array($eventType, self::ALLOWED_EVENT_TYPES, true)) {
            return;
        }

        if (! Schema::hasTable('listing_daily_metrics')) {
            return;
        }

        $date = CarbonImmutable::now('Asia/Manila')->toDateString();
        $impDelta = $eventType === 'listing.impression' ? 1 : 0;
        $viewDelta = $eventType === 'listing.view' ? 1 : 0;
        $inqDelta = $eventType === 'listing.inquiry_started' ? 1 : 0;

        DB::statement(
            'INSERT INTO listing_daily_metrics (metric_date, listing_id, impressions, views, inquiries, orders, gross_amount_minor, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())
             ON CONFLICT (metric_date, listing_id) DO UPDATE SET
                impressions = listing_daily_metrics.impressions + EXCLUDED.impressions,
                views = listing_daily_metrics.views + EXCLUDED.views,
                inquiries = listing_daily_metrics.inquiries + EXCLUDED.inquiries,
                updated_at = NOW()',
            [$date, $listingId, $impDelta, $viewDelta, $inqDelta, 'PHP'],
        );
    }

    public function forListing(
        string $listingId,
        string $status,
        string $categoryCode,
        int $days = 30,
    ): array {
        $sinceDate = CarbonImmutable::now('Asia/Manila')->subDays($days)->toDateString();

        $metrics = null;
        if (Schema::hasTable('listing_daily_metrics')) {
            $metrics = DB::table('listing_daily_metrics')
                ->where('listing_id', $listingId)
                ->where('metric_date', '>=', $sinceDate)
                ->selectRaw('
                    COALESCE(SUM(impressions), 0) as total_impressions,
                    COALESCE(SUM(views), 0) as total_views,
                    COALESCE(SUM(inquiries), 0) as total_inquiries,
                    COALESCE(SUM(gross_amount_minor), 0) as total_gross
                ')
                ->first();
        }

        $impressions = (int) ($metrics->total_impressions ?? 0);
        $views = (int) ($metrics->total_views ?? 0);
        $inquiries = (int) ($metrics->total_inquiries ?? 0);
        $grossMinor = (int) ($metrics->total_gross ?? 0);

        // Derive domain truth for orders directly from PostgreSQL orders table
        $ordersCount = 0;
        if (Schema::hasTable('orders')) {
            $ordersCount = DB::table('orders')
                ->where('listing_id', $listingId)
                ->whereIn('status', ['accepted', 'agreed', 'in_progress', 'completed'])
                ->count();
        }

        $normalizedStatus = strtolower(trim($status));
        $isDraftOrPending = in_array($normalizedStatus, ['draft', 'pending_review'], true);

        // If listing is draft/pending or has zero traffic, return category benchmark projections
        if ($impressions === 0 && ($isDraftOrPending || $views === 0)) {
            $benchmark = self::CATEGORY_BENCHMARKS[$categoryCode] ?? self::CATEGORY_BENCHMARKS['default'];
            $benchCvr = $benchmark['views'] > 0
                ? number_format(($benchmark['orders'] / $benchmark['views']) * 100, 1)
                : '7.7';
            $benchCtr = $benchmark['impressions'] > 0
                ? number_format(($benchmark['views'] / $benchmark['impressions']) * 100, 1)
                : '24.4';

            return [
                'impressions' => $benchmark['impressions'],
                'views' => $benchmark['views'],
                'inquiries' => $benchmark['inquiries'],
                'orders' => $benchmark['orders'],
                'gross_amount_minor' => $benchmark['orders'] * 45000,
                'ctr_pct' => $benchCtr,
                'cvr_pct' => $benchCvr,
                'is_projected' => true,
            ];
        }

        $ctr = $impressions > 0 ? number_format(($views / $impressions) * 100, 1) : '0.0';
        $cvr = $views > 0 ? number_format(($ordersCount / $views) * 100, 1) : '0.0';

        return [
            'impressions' => $impressions,
            'views' => $views,
            'inquiries' => $inquiries,
            'orders' => $ordersCount,
            'gross_amount_minor' => $grossMinor,
            'ctr_pct' => $ctr,
            'cvr_pct' => $cvr,
            'is_projected' => false,
        ];
    }

    public function forListings(array $listingIds): array
    {
        if ($listingIds === [] || ! Schema::hasTable('listing_daily_metrics')) {
            return [];
        }

        $sinceDate = CarbonImmutable::now('Asia/Manila')->subDays(30)->toDateString();

        $rows = DB::table('listing_daily_metrics')
            ->whereIn('listing_id', $listingIds)
            ->where('metric_date', '>=', $sinceDate)
            ->groupBy('listing_id')
            ->selectRaw('
                listing_id,
                COALESCE(SUM(impressions), 0) as impressions,
                COALESCE(SUM(views), 0) as views,
                COALESCE(SUM(inquiries), 0) as inquiries
            ')
            ->get()
            ->keyBy('listing_id');

        $orderCounts = [];
        if (Schema::hasTable('orders')) {
            $orderCounts = DB::table('orders')
                ->whereIn('listing_id', $listingIds)
                ->whereIn('status', ['accepted', 'agreed', 'in_progress', 'completed'])
                ->groupBy('listing_id')
                ->selectRaw('listing_id, COUNT(*) as cnt')
                ->pluck('cnt', 'listing_id')
                ->all();
        }

        $result = [];
        foreach ($listingIds as $id) {
            $row = $rows->get($id);
            $imp = (int) ($row->impressions ?? 0);
            $views = (int) ($row->views ?? 0);
            $inq = (int) ($row->inquiries ?? 0);
            $ord = (int) ($orderCounts[$id] ?? 0);

            $ctr = $imp > 0 ? number_format(($views / $imp) * 100, 1) : '0.0';
            $cvr = $views > 0 ? number_format(($ord / $views) * 100, 1) : '0.0';

            $result[$id] = [
                'impressions' => $imp,
                'views' => $views,
                'inquiries' => $inq,
                'orders' => $ord,
                'ctr_pct' => $ctr,
                'cvr_pct' => $cvr,
                'is_projected' => false,
            ];
        }

        return $result;
    }
}

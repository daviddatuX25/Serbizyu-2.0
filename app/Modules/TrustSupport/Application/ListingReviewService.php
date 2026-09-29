<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\ListingReviewReaderPort;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class ListingReviewService implements ListingReviewReaderPort
{
    private const BAYESIAN_PRIOR_WEIGHT = 5;
    private const BAYESIAN_CATALOG_MEAN = 4.5;

    public function summaryForListing(string $listingId, ?string $categoryCode = null): array
    {
        if (! Schema::hasTable('reviews') || ! Schema::hasTable('orders')) {
            return $this->emptySummary();
        }

        $rows = DB::table('reviews')
            ->join('orders', 'orders.id', '=', 'reviews.order_id')
            ->where('orders.listing_id', $listingId)
            ->whereNotNull('reviews.unblinded_at')
            ->whereIn('reviews.moderation_status', ['approved', 'unblinded'])
            ->pluck('reviews.rating');

        $count = $rows->count();
        if ($count === 0) {
            return $this->emptySummary();
        }

        $dist = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        $totalStars = 0;
        foreach ($rows as $r) {
            $star = (int) $r;
            if ($star >= 1 && $star <= 5) {
                $dist[$star]++;
                $totalStars += $star;
            }
        }

        $avg = $totalStars / $count;
        $m = self::BAYESIAN_PRIOR_WEIGHT;
        $c = self::BAYESIAN_CATALOG_MEAN;
        $bayesian = ($count * $avg + $m * $c) / ($count + $m);

        $satisfaction = round((($dist[4] + $dist[5]) / $count) * 100);

        return [
            'rating' => round($avg, 1),
            'bayesian_rating' => round($bayesian, 1),
            'reviews_count' => $count,
            'verified_count' => $count,
            'distribution' => $dist,
            'satisfaction_pct' => (int) $satisfaction,
        ];
    }

    public function reviewsForListing(string $listingId, int $limit = 10, int $offset = 0): array
    {
        if (! Schema::hasTable('reviews') || ! Schema::hasTable('orders')) {
            return [];
        }

        $query = DB::table('reviews')
            ->join('orders', 'orders.id', '=', 'reviews.order_id')
            ->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'reviews.author_user_id')
            ->leftJoin('evidence_files', 'evidence_files.id', '=', 'reviews.eligibility_evidence_file_id')
            ->where('orders.listing_id', $listingId)
            ->whereNotNull('reviews.unblinded_at')
            ->whereIn('reviews.moderation_status', ['approved', 'unblinded'])
            ->select([
                'reviews.id',
                'reviews.author_user_id',
                'reviews.rating',
                'reviews.content',
                'reviews.attribute_chips',
                'reviews.created_at',
                'reviews.eligibility_evidence_file_id',
                'user_profiles.display_name',
                'user_profiles.service_area_display',
                'evidence_files.storage_key as evidence_photo',
            ])
            ->orderByDesc('reviews.created_at')
            ->limit($limit)
            ->offset($offset);

        $results = [];
        foreach ($query->get() as $row) {
            $displayName = (string) ($row->display_name ?? 'Resident Customer');
            $barangay = (string) ($row->service_area_display ?? 'Tagudin');
            $createdAt = Carbon::parse($row->created_at);

            $rawChips = $row->attribute_chips ?? null;
            $chips = [];
            if (is_string($rawChips)) {
                $decoded = json_decode($rawChips, true);
                if (is_array($decoded)) {
                    $chips = array_values(array_filter($decoded, 'is_string'));
                }
            } elseif (is_array($rawChips)) {
                $chips = array_values(array_filter($rawChips, 'is_string'));
            }

            $hasPhoto = ! empty($row->evidence_photo);
            $photoUrl = $hasPhoto ? '/photos/' . ltrim((string) $row->evidence_photo, '/') : null;

            $results[] = [
                'id' => (string) $row->id,
                'author' => $displayName,
                'barangay' => $barangay,
                'time_ago' => $createdAt->diffForHumans(),
                'created_at' => $createdAt->toISOString(),
                'stars' => (int) $row->rating,
                'package_tag' => 'Verified Order',
                'quote' => (string) ($row->content ?? 'Great service and communication.'),
                'attribute_chips' => $chips,
                'has_photo' => $hasPhoto,
                'photo_url' => $photoUrl,
                'verified' => true,
            ];
        }

        return $results;
    }

    public function summariesForListings(array $listingIds): array
    {
        if ($listingIds === [] || ! Schema::hasTable('reviews') || ! Schema::hasTable('orders')) {
            return [];
        }

        $rows = DB::table('reviews')
            ->join('orders', 'orders.id', '=', 'reviews.order_id')
            ->whereIn('orders.listing_id', $listingIds)
            ->whereNotNull('reviews.unblinded_at')
            ->whereIn('reviews.moderation_status', ['approved', 'unblinded'])
            ->groupBy('orders.listing_id')
            ->selectRaw('
                orders.listing_id,
                COUNT(*) as reviews_count,
                AVG(reviews.rating) as avg_rating
            ')
            ->get()
            ->keyBy('listing_id');

        $result = [];
        foreach ($listingIds as $id) {
            $row = $rows->get($id);
            if ($row === null) {
                $result[$id] = [
                    'rating' => 0.0,
                    'reviews_count' => 0,
                    'rating_label' => 'New',
                ];
            } else {
                $avg = round((float) $row->avg_rating, 1);
                $cnt = (int) $row->reviews_count;
                $result[$id] = [
                    'rating' => $avg,
                    'reviews_count' => $cnt,
                    'rating_label' => number_format($avg, 1),
                ];
            }
        }

        return $result;
    }

    /**
     * @return array{
     *     rating: float,
     *     bayesian_rating: float,
     *     reviews_count: int,
     *     verified_count: int,
     *     distribution: array{1: int, 2: int, 3: int, 4: int, 5: int},
     *     satisfaction_pct: int,
     * }
     */
    private function emptySummary(): array
    {
        return [
            'rating' => 5.0,
            'bayesian_rating' => 4.5,
            'reviews_count' => 0,
            'verified_count' => 0,
            'distribution' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0],
            'satisfaction_pct' => 100,
        ];
    }
}

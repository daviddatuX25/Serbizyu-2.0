<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure;

use App\Shared\Contracts\CohortClassificationReaderPort;
use Illuminate\Support\Facades\DB;

final class DatabaseCohortClassificationReader implements CohortClassificationReaderPort
{
    public function latestForSubjects(array $subjects): array
    {
        $actors = array_values(array_unique(array_filter(array_column($subjects, 'actor_user_id'), static fn ($id): bool => is_string($id) && $id !== '')));
        $orders = array_values(array_unique(array_filter(array_column($subjects, 'order_id'), static fn ($id): bool => is_string($id) && $id !== '')));
        if ($actors === [] && $orders === []) return [];

        $query = DB::table('cohort_classifications')
            ->selectRaw("actor_user_id, order_id, cohort_class, ROW_NUMBER() OVER (PARTITION BY CASE WHEN order_id IS NOT NULL THEN 'order:' || order_id::text ELSE 'actor:' || actor_user_id::text END ORDER BY classified_at DESC, id DESC) AS position")
            ->where(function ($where) use ($actors, $orders): void {
                if ($actors !== []) $where->whereIn('actor_user_id', $actors);
                if ($orders !== []) {
                    if ($actors !== []) $where->orWhereIn('order_id', $orders);
                    else $where->whereIn('order_id', $orders);
                }
            });
        $rows = DB::query()->fromSub($query, 'latest')->where('position', 1)->get(['actor_user_id', 'order_id', 'cohort_class']);
        $latest = [];
        foreach ($rows as $row) {
            $key = $row->order_id !== null ? 'order:'.$row->order_id : 'actor:'.$row->actor_user_id;
            $latest[$key] = (string) $row->cohort_class;
        }
        return $latest;
    }

    public function matchingSubjectIds(string $cohort): array
    {
        $aggregate = DB::selectOne(<<<'SQL'
            WITH latest AS (
                SELECT actor_user_id, order_id, cohort_class,
                    ROW_NUMBER() OVER (
                        PARTITION BY CASE
                            WHEN order_id IS NOT NULL THEN 'order:' || order_id::text
                            ELSE 'actor:' || actor_user_id::text
                        END
                        ORDER BY classified_at DESC, id DESC
                    ) AS position
                FROM cohort_classifications
            )
            SELECT
                COALESCE(json_agg(DISTINCT actor_user_id) FILTER (
                    WHERE position = 1 AND order_id IS NULL AND actor_user_id IS NOT NULL AND cohort_class = ?
                ), '[]'::json)::text AS actors,
                COALESCE(json_agg(DISTINCT order_id) FILTER (
                    WHERE position = 1 AND order_id IS NOT NULL AND cohort_class = ?
                ), '[]'::json)::text AS orders,
                COALESCE(json_agg(DISTINCT order_id) FILTER (
                    WHERE position = 1 AND order_id IS NOT NULL AND cohort_class <> ?
                ), '[]'::json)::text AS other_orders
            FROM latest
            SQL, [$cohort, $cohort, $cohort]);

        return [
            'actors' => json_decode((string) $aggregate->actors, true, flags: JSON_THROW_ON_ERROR),
            'orders' => json_decode((string) $aggregate->orders, true, flags: JSON_THROW_ON_ERROR),
            'other_orders' => json_decode((string) $aggregate->other_orders, true, flags: JSON_THROW_ON_ERROR),
        ];
    }
}

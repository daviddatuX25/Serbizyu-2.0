<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use Illuminate\Support\Facades\DB;

final class OwnOrderReviewReader
{
    /** @return array{status: 'sealed'|'unblinded'}|null */
    public function forOrder(string $orderId, string $authorUserId): ?array
    {
        $review = DB::table('reviews')
            ->where('order_id', $orderId)
            ->where('author_user_id', $authorUserId)
            ->first(['unblinded_at']);

        return $review === null ? null : ['status' => $review->unblinded_at === null ? 'sealed' : 'unblinded'];
    }
}

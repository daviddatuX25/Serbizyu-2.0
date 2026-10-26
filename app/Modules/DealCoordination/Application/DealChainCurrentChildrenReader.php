<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\DealChainCurrentChildrenPort;
use Illuminate\Support\Facades\DB;

final class DealChainCurrentChildrenReader implements DealChainCurrentChildrenPort
{
    public function currentConfirmedOrderIds(string $dealChainId): array
    {
        $query = DB::table('deal_need_confirmations as confirmation')
            ->join('deal_needs as need', function ($join): void {
                $join->on('need.id', '=', 'confirmation.deal_need_id')
                    ->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
            })
            ->where('confirmation.deal_chain_id', $dealChainId)
            ->whereNotIn('need.status', ['superseded', 'cancelled', 'replacement_needed', 'failed'])
            ->orderBy('confirmation.id');
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }

        return $query->pluck('confirmation.order_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();
    }

    public function lockReviewChain(string $dealChainId): bool
    {
        return DB::table('deal_chains')
            ->where('id', $dealChainId)
            ->lockForUpdate()
            ->first(['id']) !== null;
    }
}

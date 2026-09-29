<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\DealNeedOrderLinkPort;
use Illuminate\Support\Facades\DB;

final class DealNeedOrderLinkService implements DealNeedOrderLinkPort
{
    public function lockEligibleNeed(string $dealChainId, string $dealNeedId, string $correlationId): array
    {
        $need = DB::table('deal_needs')
            ->where('id', $dealNeedId)
            ->where('deal_chain_id', $dealChainId)
            ->lockForUpdate()
            ->first();

        if ($need === null) {
            throw new DealCoordinationError(
                'DEAL_NEED_NOT_FOUND',
                'Deal Need not found or does not belong to specified Deal Chain.',
                $correlationId,
                status: 404,
            );
        }

        if (! in_array($need->status, ['open', 'invited', 'accepted'], true)) {
            throw new DealCoordinationError(
                'INVALID_NEED_STATE',
                "Cannot form child order for Need in '{$need->status}' status.",
                $correlationId,
                status: 409,
            );
        }

        $chain = DB::table('deal_chains')
            ->where('id', $dealChainId)
            ->lockForUpdate()
            ->first();

        if ($chain === null) {
            throw new DealCoordinationError(
                'DEAL_CHAIN_NOT_FOUND',
                'Referenced Deal Chain could not be found.',
                $correlationId,
                status: 404,
            );
        }

        return [
            'deal_chain_id' => (string) $chain->id,
            'deal_need_id' => (string) $need->id,
            'coordinator_user_id' => (string) $chain->coordinator_user_id,
            'status' => (string) $need->status,
            'version' => (int) $need->version,
        ];
    }

    public function markChildFormed(string $dealChainId, string $dealNeedId, string $orderId, string $correlationId): void
    {
        $now = now();

        DB::table('deal_needs')
            ->where('id', $dealNeedId)
            ->update([
                'status' => 'in_progress',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);

        DB::table('deal_chains')
            ->where('id', $dealChainId)
            ->where('status', 'sourcing')
            ->update([
                'status' => 'in_progress',
                'version' => DB::raw('version + 1'),
                'updated_at' => $now,
            ]);
    }
}

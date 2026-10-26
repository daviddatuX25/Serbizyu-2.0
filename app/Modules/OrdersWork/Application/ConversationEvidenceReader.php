<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\WorkConversationEvidencePort;
use Illuminate\Support\Facades\DB;

final class ConversationEvidenceReader implements WorkConversationEvidencePort
{
    public function relatedEvidenceIds(array $orderIds, string $ownerUserId): array
    {
        if ($orderIds === []) {
            return [];
        }

        return DB::table('work_events')
            ->join('work_instances', 'work_instances.id', '=', 'work_events.work_instance_id')
            ->whereIn('work_instances.order_id', $orderIds)
            ->where('work_events.event_type', 'work.evidence.uploaded')
            ->where('work_events.actor_user_id', $ownerUserId)
            ->whereNotNull('work_events.evidence_file_id')
            ->distinct()
            ->pluck('work_events.evidence_file_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();
    }
}

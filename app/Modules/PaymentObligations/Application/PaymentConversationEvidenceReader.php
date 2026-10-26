<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Contracts\PaymentConversationEvidencePort;
use Illuminate\Support\Facades\DB;

final class PaymentConversationEvidenceReader implements PaymentConversationEvidencePort
{
    public function relatedEvidenceIds(array $orderIds, string $ownerUserId): array
    {
        if ($orderIds === []) {
            return [];
        }

        return DB::table('payment_events as event')
            ->join('payment_obligations as obligation', 'obligation.id', '=', 'event.payment_obligation_id')
            ->whereIn('obligation.order_id', $orderIds)
            ->where('obligation.purpose', 'primary_consideration')
            ->where('obligation.status', '!=', 'superseded')
            ->where('event.event_type', 'payment.p2p.proof_submitted')
            ->where('event.actor_user_id', $ownerUserId)
            ->whereNotNull('event.evidence_file_id')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('payment_events as newer_proof')
                    ->whereColumn('newer_proof.payment_obligation_id', 'event.payment_obligation_id')
                    ->where('newer_proof.event_type', 'payment.p2p.proof_submitted')
                    ->where(function ($query): void {
                        $query->whereColumn('newer_proof.occurred_at', '>', 'event.occurred_at')
                            ->orWhere(function ($query): void {
                                $query->whereColumn('newer_proof.occurred_at', 'event.occurred_at')
                                    ->whereColumn('newer_proof.id', '>', 'event.id');
                            });
                    });
            })
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('payment_obligations as newer')
                    ->whereColumn('newer.order_id', 'obligation.order_id')
                    ->where('newer.purpose', 'primary_consideration')
                    ->where('newer.status', '!=', 'superseded')
                    ->where(function ($query): void {
                        $query->whereColumn('newer.created_at', '>', 'obligation.created_at')
                            ->orWhere(function ($query): void {
                                $query->whereColumn('newer.created_at', 'obligation.created_at')
                                    ->whereColumn('newer.id', '>', 'obligation.id');
                            });
                    });
            })
            ->distinct()
            ->pluck('event.evidence_file_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();
    }
}

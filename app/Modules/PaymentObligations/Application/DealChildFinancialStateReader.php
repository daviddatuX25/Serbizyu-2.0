<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Contracts\DealChildFinancialStatePort;
use Illuminate\Support\Facades\DB;

/** PaymentObligations-owned read boundary; never mutates claims or settlement state. */
final class DealChildFinancialStateReader implements DealChildFinancialStatePort
{
    public function forDealChild(string $orderId): ?array
    {
        $query = DB::table('payment_obligations')
            ->where('order_id', $orderId)
            ->where('purpose', 'primary_consideration')
            ->where('status', '!=', 'superseded')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        if (DB::transactionLevel() > 0) {
            $query->lockForUpdate();
        }
        $row = $query->first(['id', 'status', 'settled_at']);
        if ($row === null) {
            return null;
        }
        $status = (string) $row->status;
        return [
            'obligation_id' => (string) $row->id,
            'obligation_status' => $status,
            'settled_at' => is_string($row->settled_at) ? $row->settled_at : null,
            'claimed' => in_array($status, ['payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch'], true),
            'settled' => $status === 'settled',
        ];
    }
}

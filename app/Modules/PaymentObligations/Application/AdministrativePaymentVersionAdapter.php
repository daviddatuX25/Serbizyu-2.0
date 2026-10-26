<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Contracts\AdministrativePaymentVersionPort;
use Illuminate\Support\Facades\DB;

final class AdministrativePaymentVersionAdapter implements AdministrativePaymentVersionPort
{
    public function lockTarget(string $obligationId): ?array
    {
        $row = DB::table('payment_obligations')->where('id', $obligationId)->lockForUpdate()->first(['version', 'order_id']);
        return $row === null ? null : ['version' => (int) $row->version, 'order_id' => (string) $row->order_id];
    }
    public function readTarget(string $obligationId): ?array
    {
        $row = DB::table('payment_obligations')->where('id', $obligationId)->first(['version', 'order_id']);
        return $row === null ? null : ['version' => (int) $row->version, 'order_id' => (string) $row->order_id];
    }
    /** @return list<array{id:string,version:int,order_id:string}> */
    public function targetsForOrder(string $orderId): array
    {
        return DB::table('payment_obligations')->where('order_id', $orderId)->orderBy('id')
            ->get(['id', 'version', 'order_id'])
            ->map(fn ($row): array => ['id' => (string) $row->id, 'version' => (int) $row->version, 'order_id' => (string) $row->order_id])
            ->all();
    }
}

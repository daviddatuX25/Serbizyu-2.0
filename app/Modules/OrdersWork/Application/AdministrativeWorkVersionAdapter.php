<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\AdministrativeWorkVersionPort;
use Illuminate\Support\Facades\DB;

final class AdministrativeWorkVersionAdapter implements AdministrativeWorkVersionPort
{
    public function lockTarget(string $workInstanceId): ?array
    {
        $row = DB::table('work_instances')->where('id', $workInstanceId)->lockForUpdate()->first(['row_version', 'order_id']);
        return $row === null ? null : ['version' => (int) $row->row_version, 'order_id' => (string) $row->order_id];
    }
    public function readTarget(string $workInstanceId): ?array
    {
        $row = DB::table('work_instances')->where('id', $workInstanceId)->first(['row_version', 'order_id']);
        return $row === null ? null : ['version' => (int) $row->row_version, 'order_id' => (string) $row->order_id];
    }
    /** @return list<array{id:string,version:int,order_id:string}> */
    public function targetsForOrder(string $orderId): array
    {
        return DB::table('work_instances')->where('order_id', $orderId)->orderBy('id')
            ->get(['id', 'row_version', 'order_id'])
            ->map(fn ($row): array => ['id' => (string) $row->id, 'version' => (int) $row->row_version, 'order_id' => (string) $row->order_id])
            ->all();
    }
}

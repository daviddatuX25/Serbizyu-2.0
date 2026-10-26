<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Contracts\AdministrativeOrderVersionPort;
use Illuminate\Support\Facades\DB;

final class AdministrativeOrderVersionAdapter implements AdministrativeOrderVersionPort
{
    public function lockTarget(string $orderId): ?array
    {
        $row = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first(['id', 'version']);
        return $row === null ? null : ['version' => (int) $row->version, 'order_id' => (string) $row->id];
    }
    public function readTarget(string $orderId): ?array
    {
        $row = DB::table('orders')->where('id', $orderId)->first(['id', 'version']);
        return $row === null ? null : ['version' => (int) $row->version, 'order_id' => (string) $row->id];
    }
}

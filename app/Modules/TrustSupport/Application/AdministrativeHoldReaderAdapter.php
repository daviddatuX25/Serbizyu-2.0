<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\AdministrativeHoldReaderPort;
use Illuminate\Support\Facades\DB;

final class AdministrativeHoldReaderAdapter implements AdministrativeHoldReaderPort
{
    public function hasActiveHold(string $targetKind, string $targetId): bool
    {
        $column = match ($targetKind) {
            'order' => 'order_id',
            'work_instance' => 'work_instance_id',
            'payment_obligation' => 'payment_obligation_id',
            default => throw new \InvalidArgumentException('Unsupported administrative hold target kind.'),
        };

        return DB::table('administrative_holds')
            ->where($column, $targetId)
            ->whereIn('status', ['active', 'reviewing'])
            ->where('effective_at', '<=', now())
            ->exists();
    }
}

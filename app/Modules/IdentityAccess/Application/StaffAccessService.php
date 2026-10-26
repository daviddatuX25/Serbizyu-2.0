<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\StaffAccessPort;
use Illuminate\Support\Facades\DB;

final class StaffAccessService implements StaffAccessPort
{
    public function canAccessStaff(string $userId): bool
    {
        $now = now();
        $user = DB::table('users')->where('id', $userId)->first(['status', 'primary_access_tier']);

        if ($user === null || (string) $user->status !== 'active') {
            return false;
        }

        if (strtoupper((string) $user->primary_access_tier) === 'L4') {
            return true;
        }

        return DB::table('role_assignments')
            ->where('user_id', $userId)
            ->whereIn('role_code', ['admin', 'operate'])
            ->where('status', 'active')
            ->where('effective_at', '<=', $now)
            ->where(function ($query) use ($now): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->exists();
    }
}

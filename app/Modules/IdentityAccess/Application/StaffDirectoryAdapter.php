<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;


use App\Shared\Contracts\StaffDirectoryPort;
use Illuminate\Support\Facades\DB;

final class StaffDirectoryAdapter implements StaffDirectoryPort
{

    public function eligibleStaff(): array
    {
        $now = now();
        $users = DB::table('users as u')
            ->leftJoin('user_profiles as p', 'p.user_id', '=', 'u.id')
            ->where('u.status', 'active')
            ->where(function ($query) use ($now): void {
                $query->where('u.primary_access_tier', 'L4')
                    ->orWhereExists(function ($roles) use ($now): void {
                        $roles->selectRaw('1')->from('role_assignments as r')
                            ->whereColumn('r.user_id', 'u.id')->whereIn('r.role_code', ['admin', 'operate'])
                            ->where('r.status', 'active')->where('r.effective_at', '<=', $now)
                            ->where(fn ($active) => $active->whereNull('r.expires_at')->orWhere('r.expires_at', '>', $now));
                    });
            })
            ->orderBy('p.display_name')->orderBy('u.id')
            ->get(['u.id', 'u.primary_access_tier', 'p.display_name']);
        $ids = $users->pluck('id')->map(fn ($id): string => (string) $id)->all();
        $rolesByUser = DB::table('role_assignments')
            ->whereIn('user_id', $ids)->whereIn('role_code', ['admin', 'operate'])
            ->where('status', 'active')->where('effective_at', '<=', $now)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->orderBy('role_code')->get(['user_id', 'role_code'])->groupBy('user_id');
        return $users->map(function ($user) use ($rolesByUser): array {
            $id = (string) $user->id;
            $roles = strtoupper((string) $user->primary_access_tier) === 'L4' ? ['L4'] : ($rolesByUser->get($id)?->pluck('role_code')->all() ?? []);
            return ['id' => $id, 'display_name' => (string) ($user->display_name ?: 'Staff member'), 'roles' => array_values(array_unique($roles))];
        })->values()->all();
    }
}

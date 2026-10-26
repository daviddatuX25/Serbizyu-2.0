<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use Illuminate\Support\Facades\DB;

final class IdentityAccessApplicationParticipantDisplayNameReader implements ParticipantDisplayNameReaderPort
{
    public function displayNamesFor(array $userIds): array
    {
        $userIds = array_values(array_unique(array_filter($userIds, static fn (mixed $userId): bool => is_string($userId) && $userId !== '')));
        if ($userIds === []) {
            return [];
        }

        return DB::table('user_profiles')
            ->whereIn('user_id', $userIds)
            ->whereNotNull('display_name')
            ->where('display_name', '!=', '')
            ->pluck('display_name', 'user_id')
            ->map(static fn (mixed $name): string => (string) $name)
            ->all();
    }
}

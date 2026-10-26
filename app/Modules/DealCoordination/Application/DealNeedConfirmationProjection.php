<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use Illuminate\Support\Facades\DB;

final class DealNeedConfirmationProjection
{
    /** @param list<string> $dealNeedIds
     * @return array<string, array<string, mixed>> need id to coordinator-visible confirmation terms
     */
    public function forCoordinator(array $dealNeedIds): array
    {
        if ($dealNeedIds === []) {
            return [];
        }

        $versions = DB::table('deal_needs')
            ->whereIn('id', $dealNeedIds)
            ->pluck('version', 'id');
        $invitations = DB::table('deal_invitations')
            ->whereIn('deal_need_id', $dealNeedIds)
            ->where('status', 'accepted')
            ->where('expires_at', '>', now())
            ->orderByDesc('responded_at')
            ->orderByDesc('created_at')
            ->get();

        $projection = [];
        foreach ($invitations as $invitation) {
            $needId = (string) $invitation->deal_need_id;
            if (isset($projection[$needId])) {
                continue;
            }

            $scope = is_array($invitation->scope)
                ? $invitation->scope
                : (json_decode((string) $invitation->scope, true) ?: []);
            if (! is_array($scope)
                || ! is_string($scope['terms_hash'] ?? null)
                || ! is_string($scope['capacity_hash'] ?? null)
                || ! is_string($scope['listing_id'] ?? null)
                || ! is_string($scope['listing_version_id'] ?? null)) {
                continue;
            }

            $projection[$needId] = [
                'invitation_id' => (string) $invitation->id,
                'expected_need_version' => (int) ($versions[$needId] ?? 0),
                'terms_hash' => $scope['terms_hash'],
                'capacity_hash' => $scope['capacity_hash'],
                'listing_id' => $scope['listing_id'],
                'listing_version_id' => $scope['listing_version_id'],
                'listing_version' => (int) ($scope['listing_version'] ?? 1),
                'title' => (string) ($scope['title'] ?? 'Partner listing'),
                'work_shape' => (string) ($scope['work_shape'] ?? ''),
                'amount_minor' => is_numeric($scope['amount_minor'] ?? null) ? (int) $scope['amount_minor'] : null,
                'currency' => (string) ($scope['currency'] ?? 'PHP'),
                'status' => (string) $invitation->status,
            ];
        }

        return $projection;
    }
}

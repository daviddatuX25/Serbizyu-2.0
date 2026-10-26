<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class DealInvitationInboxQuery
{
    public function __construct(private readonly ParticipantDisplayNameReaderPort $participantNames) {}

    /** @return list<array<string, mixed>> */
    public function forProvider(string $providerUserId): array
    {
        $rows = DB::table('deal_invitations as invitations')
            ->join('deal_needs as needs', 'needs.id', '=', 'invitations.deal_need_id')
            ->join('deal_chains as chains', 'chains.id', '=', 'needs.deal_chain_id')
            ->where('invitations.invited_provider_user_id', $providerUserId)
            ->where(function (Builder $query): void {
                $query->whereIn('invitations.status', ['sent', 'viewed'])
                    ->whereIn('needs.status', ['open', 'invited'])
                    ->orWhere(function (Builder $accepted): void {
                        $accepted->where('invitations.status', 'accepted')
                            ->where('needs.status', 'awaiting_customer_confirmation')
                            ->whereNotExists(function (Builder $confirmation): void {
                                $confirmation->selectRaw('1')->from('deal_need_confirmations')
                                    ->whereColumn('deal_need_confirmations.deal_need_id', 'needs.id');
                            });
                    });
            })
            ->whereNull('chains.archived_at')
            ->whereIn('chains.status', ['sourcing', 'in_progress'])
            ->orderByDesc('invitations.created_at')
            ->get([
                'invitations.id', 'invitations.status', 'invitations.expires_at', 'invitations.version',
                'invitations.scope', 'invitations.purpose', 'invitations.created_at',
                'needs.id as need_id', 'needs.title as need_title', 'needs.need_kind', 'needs.node_key', 'needs.node_role',
                'needs.version as need_version', 'needs.status as need_status',
                'chains.id as chain_id', 'chains.title as chain_title', 'chains.coordinator_user_id',
            ]);

        $coordinatorIds = $rows->pluck('coordinator_user_id')
            ->map(static fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
        $coordinatorNames = $this->participantNames->displayNamesFor($coordinatorIds);

        return $rows->map(static function (object $row) use ($coordinatorNames): array {
            $scope = is_array($row->scope) ? $row->scope : json_decode((string) $row->scope, true);
            $scope = is_array($scope) ? $scope : [];
            $expiresAt = (string) $row->expires_at;

            return [
                'id' => (string) $row->id,
                'status' => (string) $row->status,
                'version' => (int) $row->version,
                'deal_chain_id' => (string) $row->chain_id,
                'deal_need_id' => (string) $row->need_id,
                'expected_need_version' => (int) $row->need_version,
                'can_withdraw_need' => (string) $row->status === 'accepted'
                    && (string) $row->need_status === 'awaiting_customer_confirmation',
                'expires_at' => $expiresAt,
                'actionable' => in_array((string) $row->status, ['sent', 'viewed'], true)
                    && strtotime($expiresAt) > now()->getTimestamp(),
                'chain' => ['title' => (string) $row->chain_title],
                'need' => [
                    'title' => (string) $row->need_title,
                    'kind' => (string) $row->need_kind,
                    'node_key' => (string) $row->node_key,
                    'node_role' => (string) $row->node_role,
                ],
                'coordinator_name' => $coordinatorNames[(string) $row->coordinator_user_id] ?? 'Coordinator',
                'purpose' => (string) $row->purpose,
                'terms' => [
                    'title' => (string) ($scope['title'] ?? $row->need_title),
                    'work_shape' => (string) ($scope['work_shape'] ?? ''),
                    'amount_minor' => is_numeric($scope['amount_minor'] ?? null) ? (int) $scope['amount_minor'] : null,
                    'currency' => (string) ($scope['currency'] ?? 'PHP'),
                    'quantity' => is_numeric($scope['quantity'] ?? null) ? (int) $scope['quantity'] : null,
                ],
            ];
        })->all();
    }
}

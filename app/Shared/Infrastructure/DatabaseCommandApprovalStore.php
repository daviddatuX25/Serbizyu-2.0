<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure;

use App\Shared\Contracts\CommandApprovalStorePort;
use Illuminate\Support\Facades\DB;

final class DatabaseCommandApprovalStore implements CommandApprovalStorePort
{
    public function lockByIdempotency(string $scope, string $key): ?object
    {
        return DB::table('command_approvals')->where('idempotency_scope', $scope)->where('idempotency_key', $key)->lockForUpdate()->first();
    }

    public function insert(array $row): void
    {
        DB::table('command_approvals')->insert($row);
    }

    public function lockById(string $approvalId): ?object
    {
        return DB::table('command_approvals')->where('id', $approvalId)->lockForUpdate()->first();
    }

    public function findById(string $approvalId): ?object
    {
        $row = DB::table('command_approvals')->where('id', $approvalId)->first();
        return $row === null ? null : $row;
    }

    public function markApproved(string $approvalId): int
    {
        return DB::table('command_approvals')->where('id', $approvalId)->where('status', 'pending')
            ->update(['status' => 'approved', 'updated_at' => now()]);
    }

    public function markConsumed(string $approvalId, array $result, \DateTimeInterface $consumedAt): int
    {
        return DB::table('command_approvals')->where('id', $approvalId)->where('status', 'approved')->update([
            'status' => 'consumed', 'consumed_at' => $consumedAt,
            'command_result' => json_encode($result, JSON_THROW_ON_ERROR), 'updated_at' => $consumedAt,
        ]);
    }

    public function forCase(string $caseId): array
    {
        return DB::table('command_approvals')->where('support_case_id', $caseId)->orderByDesc('created_at')->get()->all();
    }
}

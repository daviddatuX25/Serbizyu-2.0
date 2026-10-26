<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface CommandApprovalStorePort
{
    /** @return object|null */
    public function lockByIdempotency(string $scope, string $key): ?object;

    /** @param array<string,mixed> $row */
    public function insert(array $row): void;

    public function lockById(string $approvalId): ?object;

    public function findById(string $approvalId): ?object;

    public function markApproved(string $approvalId): int;

    /** @param array<string,mixed> $result */
    public function markConsumed(string $approvalId, array $result, \DateTimeInterface $consumedAt): int;

    /** @return list<object> */
    public function forCase(string $caseId): array;
}

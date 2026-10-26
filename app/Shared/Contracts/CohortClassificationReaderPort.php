<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface CohortClassificationReaderPort
{
    /** @param list<array{actor_user_id?: string|null, order_id?: string|null}> $subjects @return array<string, string> */
    public function latestForSubjects(array $subjects): array;

    /** @return array{actors:list<string>,orders:list<string>,other_orders:list<string>} */
    public function matchingSubjectIds(string $cohort): array;
}

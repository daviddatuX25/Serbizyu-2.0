<?php

declare(strict_types=1);

namespace App\Modules\Operations\Application;

use App\Shared\Contracts\StaffTrustSupportReaderPort;
use Illuminate\Support\Str;

final class StaffInboxQuery
{
    private const VIEWS = ['all_open', 'assigned_to_me', 'waiting_on_me', 'waiting_on_others', 'closed'];
    private const COHORTS = ['genuine_tagudin', 'capstone_demo', 'sandbox', 'team', 'training', 'support'];

    public function __construct(private readonly StaffTrustSupportReaderPort $cases) {}

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function execute(string $staffId, array $input): array
    {
        $assignee = $input['assignee'] ?? null;
        $filters = [
            'view' => in_array($input['view'] ?? null, self::VIEWS, true) ? $input['view'] : 'all_open',
            'q' => is_string($input['q'] ?? null) ? mb_substr(trim($input['q']), 0, 160) : '',
            'status' => in_array($input['status'] ?? null, ['open', 'under_review', 'resolved', 'rejected', 'withdrawn', 'closed'], true) ? $input['status'] : '',
            'category' => is_string($input['category'] ?? null) ? mb_substr(trim($input['category']), 0, 80) : '',
            'cohort' => in_array($input['cohort'] ?? null, self::COHORTS, true) ? $input['cohort'] : null,
            'assignee' => $assignee === 'unassigned' ? 'unassigned' : (is_string($assignee) && Str::isUuid($assignee) ? $assignee : ''),
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => min(100, max(1, (int) ($input['per_page'] ?? 20))),
        ];
        return $this->cases->inbox($staffId, $filters);
    }
}

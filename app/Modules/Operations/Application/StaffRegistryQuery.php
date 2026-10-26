<?php

declare(strict_types=1);

namespace App\Modules\Operations\Application;

use App\Shared\Contracts\StaffDomainReaderPort;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class StaffRegistryQuery
{
    /** @param list<StaffDomainReaderPort> $readers @return array<string, mixed> */
    public function execute(string $kind, Request $request, array $readers): array
    {
        if (! in_array($kind, ['orders', 'financials', 'disputes', 'listings', 'users', 'tenders', 'telemetry'], true)) abort(404);
        $cohort = $this->queryText($request, 'cohort', 40);
        $filters = [
            'q' => $this->queryText($request, 'q', 160),
            'status' => $this->queryText($request, 'status', 80),
            'category' => $this->queryText($request, 'category', 80),
            'cohort' => in_array($cohort, ['genuine_tagudin', 'capstone_demo', 'sandbox', 'team', 'training', 'support'], true) ? $cohort : null,
            'page' => $this->queryInteger($request, 'page', 1, PHP_INT_MAX),
            'per_page' => $this->queryInteger($request, 'per_page', 20, 100),
        ];
        if (in_array($kind, ['listings', 'tenders', 'telemetry'], true)) {
            Validator::make(['category' => $filters['category']], ['category' => ['nullable', 'uuid']])->validate();
        }
        foreach ($readers as $reader) {
            $result = $reader->registry($kind, $filters);
            if ($result !== null) {
                $registry = ['kind' => $kind, 'rows' => array_intersect_key($result, array_flip(['data', 'links', 'meta'])), 'filters' => $filters];
                if (isset($result['metrics'])) $registry['metrics'] = $result['metrics'];
                return $registry;
            }
        }
        abort(404);
    }

    private function queryText(Request $request, string $key, int $limit): string
    {
        $value = $request->query($key);
        return is_string($value) ? mb_substr(trim($value), 0, $limit) : '';
    }

    private function queryInteger(Request $request, string $key, int $default, int $maximum): int
    {
        $value = $request->query($key);
        if (! is_string($value) && ! is_int($value)) return $default;
        $integer = filter_var($value, FILTER_VALIDATE_INT);
        if (! is_int($integer)) return $default;
        return min($maximum, max(1, $integer));
    }
}

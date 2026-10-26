<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Operations\Application\StaffInboxQuery;
use App\Modules\Operations\Application\StaffRegistryQuery;
use App\Modules\Operations\Application\UniversalRecordWorkspaceQuery;
use App\Modules\TrustSupport\Application\SupportCaseService;
use App\Shared\Contracts\StaffDealChainsReaderPort;
use App\Shared\Contracts\StaffDomainReaderPort;
use App\Shared\Contracts\StaffIdentityReaderPort;
use App\Shared\Contracts\StaffListingsReaderPort;
use App\Shared\Contracts\StaffOrdersReaderPort;
use App\Shared\Contracts\StaffPaymentsReaderPort;
use App\Shared\Contracts\StaffTendersReaderPort;
use App\Shared\Contracts\StaffTrustSupportReaderPort;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class StaffWorkspaceController extends Controller
{
    public function __construct(
        private readonly StaffIdentityReaderPort $identity,
        private readonly StaffOrdersReaderPort $orders,
        private readonly StaffPaymentsReaderPort $payments,
        private readonly StaffTrustSupportReaderPort $trustSupport,
        private readonly StaffListingsReaderPort $listings,
        private readonly StaffTendersReaderPort $tenders,
        private readonly StaffDealChainsReaderPort $dealChains,
    ) {}

    public function inbox(Request $request, StaffInboxQuery $query): Response
    {
        $data = $query->execute((string) $request->user()->id, $request->query());
        return Inertia::render('Admin/Triage', [
            ...$data,
            'staffContext' => $this->identity->staffContext((string) $request->user()->id, $data['filters']['cohort'] ?? null),
        ]);
    }

    public function inspect(Request $request, UniversalRecordWorkspaceQuery $query, SupportCaseService $cases): Response
    {
        $reference = trim((string) $request->query('ref', ''));
        $workspace = $reference === '' ? null : $query->execute($reference);
        abort_if($reference !== '' && $workspace === null, 404);
        if ($workspace !== null) {
            $workspace['governance'] = $workspace['kind'] === 'case'
                ? $cases->workspace((string) $workspace['id'], (string) $request->user()->id)
                : null;
        }
        return Inertia::render('Admin/Inspector/Show', [
            'workspace' => $workspace,
            'query_ref' => $reference,
            'staffContext' => $this->identity->staffContext((string) $request->user()->id, is_string($request->query('cohort')) ? $request->query('cohort') : null),
        ]);
    }

    public function registry(Request $request, string $kind, StaffRegistryQuery $query): Response
    {
        $pages = [
            'orders' => 'Admin/Orders/Index',
            'financials' => 'Admin/Financials/Index',
            'disputes' => 'Admin/Disputes/Index',
            'listings' => 'Admin/Listings/Index',
            'users' => 'Admin/Users/Index',
            'tenders' => 'Admin/Tenders/Index',
            'telemetry' => 'Admin/System/TelemetryIndex',
        ];
        abort_unless(isset($pages[$kind]), 404);
        $registry = $query->execute($kind, $request, $this->domainReaders());
        return Inertia::render($pages[$kind], [
            'registry' => $registry,
            'staffContext' => $this->identity->staffContext((string) $request->user()->id, $registry['filters']['cohort'] ?? null),
        ]);
    }

    /** @return list<StaffDomainReaderPort> */
    private function domainReaders(): array
    {
        return [$this->orders, $this->payments, $this->trustSupport, $this->listings, $this->identity, $this->tenders, $this->dealChains];
    }
}

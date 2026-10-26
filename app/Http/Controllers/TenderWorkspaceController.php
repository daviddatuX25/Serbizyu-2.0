<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\Tenders\Application\TenderWorkspaceQuery;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class TenderWorkspaceController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly TenderWorkspaceQuery $workspaces,
    ) {}

    public function requests(Request $request): Response
    {
        $userId = $this->session->requireUser($request, (string) $request->attributes->get('correlation_id'));

        return Inertia::render('Requests/MyRequests', [
            'session' => $this->session->read($request),
            'records' => $this->workspaces->requestsFor($userId),
        ]);
    }

    public function quotes(Request $request): Response
    {
        $userId = $this->session->requireUser($request, (string) $request->attributes->get('correlation_id'));

        return Inertia::render('Quotes/MyQuotes', [
            'session' => $this->session->read($request),
            'records' => $this->workspaces->quotesFor($userId),
        ]);
    }
}

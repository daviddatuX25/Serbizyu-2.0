<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\DealCoordination\Application\DealInvitationInboxQuery;
use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

final class DealInvitationController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly DealInvitationInboxQuery $invitations,
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        try {
            $providerUserId = $this->session->requireUser($request, (string) Str::uuid7());
        } catch (IdentityAccessError) {
            return redirect()->route('auth.sign-in');
        }

        return Inertia::render('DealInvitations/Index', [
            'invitations' => $this->invitations->forProvider($providerUserId),
        ]);
    }
}

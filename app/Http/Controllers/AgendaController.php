<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\Listings\Application\AppointmentSchedulingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class AgendaController
{
    public function __construct(
        private readonly AppointmentSchedulingService $appointments,
        private readonly RoleAssignmentService $roles,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $providerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($providerUserId === '', 401);
        abort_unless($this->roles->hasActive($providerUserId, 'provider'), 403);
        $dates = $request->validate([
            'from' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'to' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
        ]);
        $from = (string) ($dates['from'] ?? now()->toIso8601String());
        $to = (string) ($dates['to'] ?? now()->addDays(7)->toIso8601String());

        return Inertia::render('Agenda/Index', [
            'agenda' => $this->appointments->agenda($providerUserId, $from, $to, (string) $request->attributes->get('correlation_id')),
            'correlationId' => (string) $request->attributes->get('correlation_id'),
        ]);
    }

    public function storeBlock(Request $request): RedirectResponse
    {
        $providerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($providerUserId === '', 401);
        abort_unless($this->roles->hasActive($providerUserId, 'provider'), 403);
        $input = $request->validate([
            'starts_at' => ['required', 'date', 'after:now', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'ends_at' => ['required', 'date', 'after:starts_at', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $this->appointments->createBlock(
            providerUserId: $providerUserId,
            actorUserId: $providerUserId,
            startsAt: (string) $input['starts_at'],
            endsAt: (string) $input['ends_at'],
            correlationId: (string) $request->attributes->get('correlation_id'),
            reason: isset($input['reason']) ? (string) $input['reason'] : null,
        );

        return Redirect::route('agenda.index')->with('notice', 'Unavailable time saved. Existing appointments are unchanged.');
    }

    public function destroyBlock(Request $request, string $block): RedirectResponse
    {
        $providerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($providerUserId === '', 401);
        abort_unless($this->roles->hasActive($providerUserId, 'provider'), 403);
        $this->appointments->deleteBlock($providerUserId, $block, $providerUserId, (string) $request->attributes->get('correlation_id'));

        return Redirect::route('agenda.index')->with('notice', 'Availability block removed.');
    }
}

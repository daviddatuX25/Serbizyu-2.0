<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\IdentityAccess\Application\SliceStateQuery;
use App\Modules\Operations\Application\NotificationReadModel;
use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function __construct(
        private readonly SliceStateQuery $sliceState,
        private readonly NotificationReadModel $notifications,
    ) {}

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $state = $this->sliceState->for($request);

        $userId = $request->user()?->getAuthIdentifier();

        return array_merge(parent::share($request), [
            'correlationId' => static fn (): ?string => $request->attributes->get('correlation_id'),
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
            'notificationSummary' => $userId === null
                ? null
                : fn (): array => $this->notifications->summary((string) $userId),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\IdentityAccess\Application\SliceStateQuery;
use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function __construct(
        private readonly SliceStateQuery $sliceState,
    ) {}

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $state = $this->sliceState->for($request);

        return array_merge(parent::share($request), [
            'correlationId' => static fn (): ?string => $request->attributes->get('correlation_id'),
            'session' => $state['session'] ?? null,
            'readiness' => $state['readiness'] ?? null,
        ]);
    }
}

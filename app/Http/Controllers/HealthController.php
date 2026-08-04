<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Shared\Support\EnvironmentValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

final class HealthController
{
    public function readiness(Request $request): JsonResponse
    {
        $configuration = config('serbizyu', []);
        $violations = app(EnvironmentValidator::class)->violations($configuration);
        $checks = [
            'configuration' => $violations === [] ? 'ok' : 'blocked',
            'database' => $this->databaseStatus((bool) config('serbizyu.health.database_required', false)),
            'redis' => $this->redisStatus((bool) config('serbizyu.health.redis_required', false)),
        ];
        $ready = $violations === [] && ! in_array('failed', $checks, true);

        return response()->json([
            'status' => $ready ? 'ready' : 'blocked',
            'app' => (string) config('app.name', 'Serbizyu'),
            'environment' => (string) config('serbizyu.public_environment', 'local'),
            'correlation_id' => $request->attributes->get('correlation_id'),
            'checks' => $checks,
        ], $ready ? 200 : 503, [
            'Cache-Control' => 'no-store',
        ]);
    }

    private function databaseStatus(bool $required): string
    {
        if (! $required) {
            return 'deferred';
        }

        try {
            DB::connection()->getPdo();

            return 'ok';
        } catch (Throwable) {
            return 'failed';
        }
    }

    private function redisStatus(bool $required): string
    {
        if (! $required) {
            return 'deferred';
        }

        try {
            Redis::connection()->ping();

            return 'ok';
        } catch (Throwable) {
            return 'failed';
        }
    }
}

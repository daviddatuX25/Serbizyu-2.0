<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Contracts\CorrelationId;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class FirstSliceResponse
{
    public static function error(Request $request, FirstSliceException $exception): Response
    {
        $correlation = new CorrelationId((string) $request->attributes->get('correlation_id'));
        $payload = $exception->envelope($correlation);

        if ($request->expectsJson() || $request->isJson()) {
            return response()->json($payload, $exception->httpStatus);
        }

        return redirect()->back()->with('sliceError', $payload);
    }
}

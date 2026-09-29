<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Shared\Contracts\ListingTelemetryQueryPort;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class TelemetryController
{
    public function __construct(
        private readonly ListingTelemetryQueryPort $telemetry,
    ) {}

    public function recordEvents(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'events' => ['required', 'array', 'max:20'],
            'events.*.type' => ['required', 'string', 'in:listing.impression,listing.view,listing.inquiry_started'],
            'events.*.listing_id' => ['required', 'string', 'uuid'],
        ]);

        $actorUserId = $request->user()?->getAuthIdentifier();
        $sessionId = (string) ($request->session()->getId() ?? '');
        $correlationId = (string) ($request->header('X-Correlation-Id') ?? Str::uuid7());

        foreach ($payload['events'] as $event) {
            $this->telemetry->recordEvent(
                eventType: (string) $event['type'],
                listingId: (string) $event['listing_id'],
                actorUserId: $actorUserId !== null ? (string) $actorUserId : null,
                sessionId: $sessionId !== '' ? $sessionId : null,
                correlationId: $correlationId,
            );
        }

        return response()->json(['status' => 'accepted'], 202);
    }
}

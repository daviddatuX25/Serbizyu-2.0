<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Operations\Application\NotificationReadModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class NotificationController
{
    public function __construct(private readonly NotificationReadModel $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $cursor = $request->query('cursor');
        if ($cursor !== null && (! is_string($cursor) || strlen($cursor) > 256)) {
            return $this->invalidCursor();
        }

        try {
            return response()->json($this->notifications->page((string) $request->user()->getAuthIdentifier(), $cursor));
        } catch (InvalidArgumentException) {
            return $this->invalidCursor();
        }
    }

    public function summary(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->notifications->summary((string) $request->user()->getAuthIdentifier())]);
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $readAt = $this->notifications->markRead((string) $request->user()->getAuthIdentifier(), $notification);
        if ($readAt === null) {
            return response()->json(['error' => ['code' => 'NOTIFICATION_NOT_FOUND', 'message' => 'Notification not found.']], 404);
        }

        return response()->json(['data' => [
            'id' => $notification,
            'read_at' => $readAt,
            'summary' => $this->notifications->summary((string) $request->user()->getAuthIdentifier()),
        ]]);
    }

    private function invalidCursor(): JsonResponse
    {
        return response()->json(['error' => ['code' => 'INVALID_CURSOR', 'message' => 'The notification cursor is invalid.']], 422);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Listings\Application\AppointmentSchedulingService;
use App\Modules\OrdersWork\Application\AppointmentRescheduleService;
use App\Modules\Tenders\Application\TenderService;
use App\Shared\Application\KernelException;
use App\Shared\Contracts\OrderCapacityPort;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;

final class AppointmentController
{
    public function slots(Request $request, string $listing, AppointmentSchedulingService $appointments): JsonResponse
    {
        $dates = $request->validate([
            'from' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'to' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'listing_version_id' => ['required', 'uuid'],
        ]);
        $from = (string) ($dates['from'] ?? now()->addMinutes(30)->toIso8601String());
        $to = (string) ($dates['to'] ?? now()->addDays(7)->toIso8601String());
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            return response()->json(['data' => $appointments->slots($listing, $from, $to, (string) $dates['listing_version_id'], $correlationId)]);
        } catch (KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage()]], $error->status);
        }
    }

    public function hold(Request $request, string $listing, AppointmentSchedulingService $appointments, OrderCapacityPort $capacity): JsonResponse
    {
        $input = $request->validate([
            'starts_at' => ['required', 'date', 'after:now', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'listing_version_id' => ['required', 'uuid'],
            'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);
        $actorUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($actorUserId === '', 401);
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            $details = $appointments->details($listing);
            if ($details['listing_version_id'] !== (string) $input['listing_version_id']) {
                throw new KernelException('LISTING_VERSION_CHANGED', 'This listing changed. Refresh the appointment choices.', $correlationId, status: 409);
            }
            $hold = $capacity->holdAppointment(
                listingId: $listing,
                listingVersionId: (string) $input['listing_version_id'],
                providerUserId: $details['provider_user_id'],
                customerUserId: $actorUserId,
                startsAt: (string) $input['starts_at'],
                durationMinutes: $details['duration_minutes'],
                ttlMinutes: (int) config('serbizyu.scheduling.slot_hold_minutes', 10),
                idempotencyKey: (string) $input['idempotency_key'],
                correlationId: $correlationId,
            );
        } catch (KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage()]], $error->status);
        }

        return response()->json(['data' => [...$hold, 'duration_minutes' => $details['duration_minutes']]], 201, ['X-Correlation-Id' => $correlationId]);
    }

    public function quoteSlots(
        Request $request,
        string $id,
        string $quote,
        TenderService $tenders,
        OrderCapacityPort $capacity,
    ): JsonResponse {
        $input = $request->validate([
            'quote_version' => ['required', 'integer', 'min:1'],
            'from' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'to' => ['nullable', 'date', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
        ]);
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            $source = $tenders->appointmentSourceForQuote(
                (string) ($request->user()?->getAuthIdentifier() ?? ''),
                $id,
                $quote,
                (int) $input['quote_version'],
                $correlationId,
            );
            $from = (string) ($input['from'] ?? now()->addMinutes(30)->toIso8601String());
            $to = (string) ($input['to'] ?? now()->addDays(7)->toIso8601String());
            $slots = $capacity->appointmentSlotsForProvider(
                $source['provider_user_id'],
                $from,
                $to,
                $source['duration_minutes'],
                $correlationId,
            );
        } catch (KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage()]], $error->status);
        }

        return response()->json(['data' => $slots], 200, ['X-Correlation-Id' => $correlationId]);
    }

    public function quoteHold(
        Request $request,
        string $id,
        string $quote,
        TenderService $tenders,
        OrderCapacityPort $capacity,
    ): JsonResponse {
        $input = $request->validate([
            'quote_version' => ['required', 'integer', 'min:1'],
            'starts_at' => ['required', 'date', 'after:now', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);
        $customerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($customerUserId === '', 401);
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            $source = $tenders->appointmentSourceForQuote(
                $customerUserId,
                $id,
                $quote,
                (int) $input['quote_version'],
                $correlationId,
            );
            $hold = $capacity->holdQuoteAppointment(
                quoteId: $quote,
                quoteVersion: (int) $input['quote_version'],
                providerUserId: $source['provider_user_id'],
                customerUserId: $customerUserId,
                startsAt: (string) $input['starts_at'],
                durationMinutes: $source['duration_minutes'],
                ttlMinutes: (int) config('serbizyu.scheduling.slot_hold_minutes', 10),
                idempotencyKey: (string) $input['idempotency_key'],
                correlationId: $correlationId,
            );
        } catch (KernelException $error) {
            return response()->json(['error' => ['code' => $error->envelope->code, 'message' => $error->getMessage()]], $error->status);
        }

        return response()->json(['data' => [...$hold, 'duration_minutes' => $source['duration_minutes']]], 201, ['X-Correlation-Id' => $correlationId]);
    }

    public function proposeChange(Request $request, string $order, AppointmentRescheduleService $reschedules): JsonResponse|RedirectResponse
    {
        $input = $request->validate([
            'starts_at' => ['required', 'date', 'after:now', 'regex:/^(?:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)(?:Z|[+-]\\d{2}:\\d{2})$/'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $actorUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($actorUserId === '', 401);
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            $result = $reschedules->propose(
                orderId: $order,
                actorUserId: $actorUserId,
                startsAt: (string) $input['starts_at'],
                correlationId: $correlationId,
                reason: isset($input['reason']) ? (string) $input['reason'] : null,
            );
        } catch (KernelException $error) {
            return $this->failure($request, $error->envelope->code, $error->getMessage(), $error->status);
        }

        return $this->success($request, $result, 'The request was sent. Your current appointment remains booked until the other participant accepts.');
    }

    public function respondToChange(Request $request, string $order, string $scheduleChangeRequest, string $action, AppointmentRescheduleService $reschedules): JsonResponse|RedirectResponse
    {
        abort_unless(in_array($action, ['accept', 'reject', 'withdraw'], true), 404);
        $actorUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($actorUserId === '', 401);
        $correlationId = (string) $request->attributes->get('correlation_id', Str::uuid7());

        try {
            $result = $reschedules->respond($order, $scheduleChangeRequest, $actorUserId, $action, $correlationId);
        } catch (KernelException $error) {
            return $this->failure($request, $error->envelope->code, $error->getMessage(), $error->status);
        }

        return $this->success($request, $result, match ($result['status']) {
            'accepted' => 'Appointment rescheduled.',
            'rejected' => 'Schedule change declined. The active appointment is unchanged.',
            'expired' => 'The proposed time expired. The active appointment is unchanged.',
            default => 'Schedule change withdrawn. The active appointment is unchanged.',
        });
    }

    private function success(Request $request, array $payload, string $notice): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['data' => $payload]);
        }

        return Redirect::back()->with('notice', $notice);
    }

    private function failure(Request $request, string $code, string $message, int $status): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['error' => ['code' => $code, 'message' => $message]], $status);
        }

        return Redirect::back()->withErrors(['appointment' => $message])->withInput();
    }
}

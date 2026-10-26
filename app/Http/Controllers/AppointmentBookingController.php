<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Listings\Application\AppointmentSchedulingService;
use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class AppointmentBookingController
{
    public function __construct(
        private readonly OrderListingSourcePort $listings,
        private readonly AppointmentSchedulingService $appointments,
    ) {}

    public function show(Request $request, string $listing): InertiaResponse
    {
        $source = $this->listings->findActiveApproved($listing);
        abort_if($source === null || (string) $source['work_shape'] !== 'A3', 404);
        $details = $this->appointments->details($listing);
        $bookingDraft = $request->session()->get('appointment_booking_draft', []);
        $allowedFields = [
            'expected_listing_version',
            'listing_version_id',
            'quantity',
            'variant_id',
            'package_id',
            'addon_ids',
            'lane',
            'note',
            'deal_chain_combination_id',
        ];
        $bookingDraft = is_array($bookingDraft) && (string) ($bookingDraft['listing_id'] ?? '') === $listing
            ? Arr::only($bookingDraft, $allowedFields)
            : [];

        return Inertia::render('Orders/BookAppointment', [
            'listing' => [
                'id' => (string) $source['listing_id'],
                'title' => (string) $source['title'],
                'listingVersionId' => $details['listing_version_id'],
                'listingVersion' => (int) $source['listing_version_number'],
                'durationMinutes' => $details['duration_minutes'],
            ],
            'bookingDraft' => $bookingDraft,
            'correlationId' => (string) $request->attributes->get('correlation_id'),
        ]);
    }
}

import { useState } from 'react';
import { router } from '@inertiajs/react';
import AppointmentSlotPicker, { type AppointmentHold } from '@/components/orders/AppointmentSlotPicker';

type BookingDraft = {
    expected_listing_version?: number;
    listing_version_id?: string;
    quantity?: number;
    variant_id?: string | null;
    package_id?: string | null;
    addon_ids?: string[];
    lane?: string;
    note?: string | null;
    deal_chain_combination_id?: string | null;
};
type Props = {
    listing: { id: string; title: string; listingVersionId: string; listingVersion: number; durationMinutes: number };
    bookingDraft: BookingDraft;
    correlationId: string;
};

export default function BookAppointment({ listing, bookingDraft }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submitProposal = (hold: AppointmentHold) => {
        setSubmitting(true);
        setError(null);
        router.post(`/listings/${listing.id}/orders`, {
            ...bookingDraft,
            expected_listing_version: bookingDraft.expected_listing_version ?? listing.listingVersion,
            listing_version_id: bookingDraft.listing_version_id ?? listing.listingVersionId,
            quantity: bookingDraft.quantity ?? 1,
            appointment_reservation_id: hold.id,
            idempotency_key: `appointment-proposal:${hold.id}`,
        }, {
            onError: (errors) => setError(Object.values(errors)[0] ?? 'Your appointment could not be requested.'),
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6" data-testid="appointment-booking-page">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-[#102A43]">Choose an appointment time</h1>
                <p className="mt-1 text-sm leading-6 text-[#526579]">{listing.title}</p>
            </header>
            <AppointmentSlotPicker
                source={{ kind: 'listing', listingId: listing.id, listingVersionId: listing.listingVersionId }}
                onHeld={submitProposal}
                disabled={submitting}
            />
            {error ? <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm font-semibold text-[#9B1C1C]">{error}</p> : null}
        </main>
    );
}

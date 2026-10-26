import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { router } from '@inertiajs/react';
import BookAppointment from './BookAppointment';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn() },
}));

const listing = {
    id: '0192a000-0000-7000-8000-000000000001',
    title: 'AC maintenance',
    listingVersionId: '0192a000-0000-7000-8000-000000000002',
    listingVersion: 3,
    durationMinutes: 90,
};

const jsonResponse = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('BookAppointment', () => {
    it('loads real slots, holds the selected time, then posts the pinned proposal selection', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ data: { duration_minutes: 90, slots: [{ starts_at: '2026-10-28T09:00:00+08:00', ends_at: '2026-10-28T10:30:00+08:00' }] } }))
            .mockResolvedValueOnce(jsonResponse({ data: { id: '0192a000-0000-7000-8000-000000000003', starts_at: '2026-10-28T09:00:00+08:00', ends_at: '2026-10-28T10:30:00+08:00', hold_expires_at: '2026-10-25T12:10:00+08:00' } }));
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('crypto', { randomUUID: () => '12345678-1234-4234-8234-123456789abc' });
        document.cookie = 'XSRF-TOKEN=csrf-token';

        render(<BookAppointment listing={listing} bookingDraft={{ expected_listing_version: 3, listing_version_id: listing.listingVersionId, quantity: 2, package_id: 'pkg-two' }} correlationId="corr-1" />);

        const [slotButton] = await screen.findAllByRole('button');
        fireEvent.click(slotButton);
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

        await waitFor(() => expect(router.post).toHaveBeenCalledWith(
            `/listings/${listing.id}/orders`,
            expect.objectContaining({
                expected_listing_version: 3,
                listing_version_id: listing.listingVersionId,
                quantity: 2,
                package_id: 'pkg-two',
                appointment_reservation_id: '0192a000-0000-7000-8000-000000000003',
            }),
            expect.any(Object),
        ));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    });

    it('shows an explicit empty state when the server reports no available times', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: { duration_minutes: 90, slots: [] } })));

        render(<BookAppointment listing={listing} bookingDraft={{}} correlationId="corr-2" />);

        expect(await screen.findByText('No open appointment times')).toBeTruthy();
    });
});

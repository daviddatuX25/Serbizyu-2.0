import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AppointmentPanel from './AppointmentPanel';

vi.mock('@inertiajs/react', () => ({ router: { post: vi.fn() } }));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AppointmentPanel', () => {
    it('explains an expired reschedule while retaining the original booked time', () => {
        render(<AppointmentPanel orderId="order-1" appointment={{
            scheduledAt: '2026-11-02T10:00:00Z',
            scheduleChangeRequests: [{
                id: 'change-1',
                proposedStart: '2026-11-03T11:00:00Z',
                proposedEnd: '2026-11-03T12:00:00Z',
                proposerUserId: 'buyer-1',
                status: 'expired',
                createdAt: '2026-10-25T10:00:00Z',
            }],
            canPropose: true,
            viewerUserId: 'buyer-1',
        }} />);

        expect(screen.getByText(/Booked for/).textContent).toContain('Booked for');
        expect(screen.getByTestId('schedule-change-expired').textContent)
            .toContain('Expired — original appointment remains booked');
        expect(screen.queryByRole('button', { name: 'Accept new time' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    });
});

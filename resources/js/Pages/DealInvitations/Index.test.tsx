import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';
import DealInvitationsIndex from './Index';

vi.mock('@inertiajs/react', () => ({ Head: () => null, router: { reload: vi.fn() } }));
vi.mock('@/components/layout/DesktopGlobalNav', () => ({ DesktopGlobalNav: () => null }));

const invitation = {
    id: 'inv-1', status: 'sent', version: 4, expires_at: '2026-10-27T12:00:00Z', actionable: true,
    chain: { title: 'Kitchen refresh' }, need: { title: 'Cabinet repair', kind: 'service', node_key: 'repair', node_role: 'labor' },
    coordinator_name: 'Rosa', purpose: 'deal_need_assignment',
    terms: { title: 'Cabinet repair service', work_shape: 'A1 (Linear Project)', amount_minor: 12500, currency: 'PHP', quantity: 1 },
};

const successfulResponse = () => ({ ok: true, json: async () => ({ data: { status: 'accepted' } }) });

describe('DealInvitationsIndex', () => {
    afterEach(() => {
        cleanup();
        document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    });

    beforeEach(() => vi.restoreAllMocks());

    it('posts acceptance with version and idempotency key, then waits for customer confirmation', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse() as Response);
        render(<DealInvitationsIndex invitations={[invitation]} />);
        expect(screen.getByText(/Accepting asks the customer to confirm/i)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
        await waitFor(() => expect(screen.getByText('Waiting for customer confirmation')).toBeTruthy());
        expect(fetchMock).toHaveBeenCalledWith('/deal-invitations/inv-1/respond', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ decision: 'accept', expected_version: 4 }),
            headers: expect.objectContaining({ Accept: 'application/json', 'X-Idempotency-Key': expect.any(String) }),
        }));
        expect(screen.getByText(/must confirm these terms before an independent order can be created/i)).toBeTruthy();
        expect(screen.queryByRole('link', { name: /order/i })).toBeNull();
    });

    it('posts decline and shows the released sourcing slot', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse() as Response);
        render(<DealInvitationsIndex invitations={[invitation]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
        await waitFor(() => expect(screen.getByText('Declined')).toBeTruthy());
        expect(screen.getByText(/released the slot/i)).toBeTruthy();
    });

    it('does not offer actions for an expired invitation', () => {
        render(<DealInvitationsIndex invitations={[{ ...invitation, actionable: false }]} />);
        expect(screen.getByText('Expired')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
    });

    it('shows an API error without removing the invitation', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: false,
            json: async () => ({ error: { message: 'Invitation has expired.' } }),
        } as Response);
        render(<DealInvitationsIndex invitations={[invitation]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Invitation has expired.'));
        expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeTruthy();
    });

    it('lets the current accepted partner withdraw an unformed Need through the scoped Need route', async () => {
        const acceptedInvitation = {
            ...invitation,
            status: 'accepted',
            actionable: false,
            deal_chain_id: 'chain-current',
            deal_need_id: 'need-current',
            expected_need_version: 7,
            can_withdraw_need: true,
        };
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse() as Response);
        document.cookie = 'XSRF-TOKEN=rotated%20session%20token; path=/';
        render(<DealInvitationsIndex invitations={[acceptedInvitation]} />);

        expect(screen.getByRole('button', { name: 'Withdraw acceptance' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw acceptance' }));

        await waitFor(() => expect(router.reload).toHaveBeenCalled());
        expect(fetchMock).toHaveBeenCalledWith('/deal-chains/chain-current/needs/need-current/withdraw', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ expected_need_version: 7 }),
            headers: expect.objectContaining({
                Accept: 'application/json',
                'X-Idempotency-Key': expect.any(String),
                'X-XSRF-TOKEN': 'rotated session token',
            }),
        }));
    });
});

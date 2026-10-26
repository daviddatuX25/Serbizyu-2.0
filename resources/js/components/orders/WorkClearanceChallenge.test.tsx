import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { router } from '@inertiajs/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkClearanceChallenge from './WorkClearanceChallenge';
import type { WorkNodeRecord } from '../../types';
const ORIGINAL_NOW = Date.now();
const node = { id: 'node-7', approval_method: 'presence_otp', can_issue_challenge: true, can_verify_challenge: false } as WorkNodeRecord;

describe('WorkClearanceChallenge', () => {
    beforeEach(() => {
        document.querySelector('meta[name="csrf-token"]')?.remove();
        const csrf = document.createElement('meta');
        csrf.name = 'csrf-token';
        csrf.content = 'test-csrf';
        document.head.append(csrf);
        vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.setSystemTime(new Date(ORIGINAL_NOW)); });
    it('shows an issuer code only after the server returns it', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { challenge_id: 'challenge-1', code: '4821', kind: 'presence_otp', expires_at: '2026-10-25T12:03:00Z', work_version: 3, node_id: 'node-7' } }) }));
        render(<WorkClearanceChallenge orderId="order-1" workVersion={3} node={node} />);
        expect(screen.queryByText('4821')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Issue clearance code' }));
        expect(await screen.findByText('4821')).toBeDefined();
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/orders/order-1/work-nodes/node-7/clearance-challenges'), expect.objectContaining({ method: 'POST' }));
    });

    it('shows server issue errors and never fabricates a code', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Rate limit exceeded.' } }) }));
        render(<WorkClearanceChallenge orderId="order-1" workVersion={3} node={node} />);
        fireEvent.click(screen.getByRole('button', { name: 'Issue clearance code' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Rate limit exceeded.');
        expect(screen.queryByText(/\d{4}/)).toBeNull();
    });

    it('verifies only the projected pending challenge and keeps server failures inline', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: { code: ['The code has expired.'] } }) });
        vi.stubGlobal('fetch', fetchMock);
        const verifierNode = {
            ...node,
            can_issue_challenge: false,
            can_verify_challenge: true,
            pending_challenge: { id: 'challenge-9', kind: 'presence_otp', expires_at: '2026-10-25T12:03:00Z', work_version: 3, issued_by_role: 'customer' },
        } as WorkNodeRecord;
        render(<WorkClearanceChallenge orderId="order-1" workVersion={3} node={verifierNode} />);
        fireEvent.change(screen.getByLabelText(/Enter the code/), { target: { value: '4821' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
        expect((await screen.findByRole('alert')).textContent).toContain('The code has expired.');
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/challenge-9/verify'), expect.objectContaining({ body: JSON.stringify({ code: '4821', work_version: 3 }) }));
    });
    it('preserves a leading-zero handoff code and refreshes only after server verification succeeds', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { verified: true } }) });
        vi.stubGlobal('fetch', fetchMock);
        const reload = vi.spyOn(router, 'reload').mockImplementation(() => {});
        const verifierNode = {
            ...node,
            approval_method: 'worker_dropoff',
            can_issue_challenge: false,
            can_verify_challenge: true,
            pending_challenge: { id: 'handoff-7', kind: 'worker_dropoff', expires_at: '2026-10-25T12:03:00Z', work_version: 9, issued_by_role: 'provider' },
        } as WorkNodeRecord;
        render(<WorkClearanceChallenge orderId="order-1" workVersion={9} node={verifierNode} />);
        const input = screen.getByLabelText(/Enter the code/) as HTMLInputElement;
        fireEvent.change(input, { target: { value: '000482' } });
        expect(input.value).toBe('000482');
        fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/handoff-7/verify'),
            expect.objectContaining({ body: JSON.stringify({ code: '000482', work_version: 9 }) }),
        ));
        await waitFor(() => expect(reload).toHaveBeenCalledWith());
        expect(input.value).toBe('');
    });
    it('shows a truthful waiting state without exposing a verification form before a challenge exists', () => {
        const verifierNode = { ...node, can_issue_challenge: false, can_verify_challenge: true, pending_challenge: null } as WorkNodeRecord;
        render(<WorkClearanceChallenge orderId="order-1" workVersion={3} node={verifierNode} />);
        expect(screen.getByText(/Waiting for the other party to issue/)).toBeDefined();
        expect(screen.queryByLabelText(/Enter the code/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Refresh challenge status' })).toBeDefined();
    });
});

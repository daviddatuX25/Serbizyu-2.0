import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { router } from '@inertiajs/react';
import A4HandoffPanel, { type A4HandoffProjection } from './A4HandoffPanel';
import type { WorkNodeRecord } from '../../types';

vi.mock('@inertiajs/react', () => ({ router: { post: vi.fn(), reload: vi.fn() } }));
const ORIGINAL_NOW = Date.now();

const baseHandoff: A4HandoffProjection = {
    enabled: true,
    listingType: 'product',
    status: 'not_prepared',
    transfer: null,
    couriers: [{ id: 'courier-1', label: 'Danny Express', public_reference: 'ORD-2026-0421' }],
    canMarkPrepared: true,
    canOfferCustody: false,
    canAcceptCustody: false,
    canRecordReceipt: false,
    workVersion: 9,
    proofNode: null,
};
const a4WorkNodes = [
    {
        id: 'prep-node', ordinal: 1, title: 'Prepare', description: 'Count and weigh items.', node_kind: 'checkin_intake',
        evidence_type: 'photo_required', evidence_description: 'Clean preparation photo.', control_mode: 'provider_advance', mandatory: true,
        required_proofs: ['photo_proof', 'checklist_steps', 'metric_reading'],
        checklist_items: [{ id: 'count', label: 'Verify stock count', required: true }],
        metric_requirements: [{ id: 'weight', name: 'Package weight', unit: 'kg', required: true, target: 2 }],
        candidate_evidence: [{ id: 'clean-proof-1', scan_status: 'clean', media_type: 'image' }],
    },
    {
        id: 'custody-node', ordinal: 2, title: 'Custody', description: 'Confirm custody.', node_kind: 'handoff_ready',
        evidence_type: 'photo_required', evidence_description: 'Clean custody photo.', control_mode: 'counterparty_handoff', mandatory: true,
        required_proofs: ['photo_proof'],
        candidate_evidence: [{ id: 'clean-proof-1', scan_status: 'clean', media_type: 'image' }],
    },
    {
        id: 'receipt-node', ordinal: 3, title: 'Receipt', description: 'Confirm receipt.', node_kind: 'final_signoff',
        evidence_type: 'photo_required', evidence_description: 'Clean receipt photo.', control_mode: 'customer_confirm', mandatory: true,
        required_proofs: ['photo_proof'],
        candidate_evidence: [{ id: 'clean-proof-1', scan_status: 'clean', media_type: 'image' }],
    },
] as WorkNodeRecord[];

const renderHandoff = (handoff = baseHandoff, workNodes = a4WorkNodes) => {
    const actionableOrdinal = handoff.canMarkPrepared ? 1 : handoff.canAcceptCustody ? 2 : handoff.canRecordReceipt ? 3 : null;
    const projected = handoff.proofNode ?? workNodes.find((node) => node.ordinal === actionableOrdinal) ?? null;
    return render(<A4HandoffPanel orderId="order-1" orderVersion={4} handoff={{ ...handoff, workVersion: 9, proofNode: projected }} />);
};

describe('A4HandoffPanel', () => {
    beforeEach(() => {
        const csrf = document.createElement('meta');
        csrf.name = 'csrf-token';
        csrf.content = 'test-csrf';
        document.head.append(csrf);
        vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    });
    afterEach(() => {
        cleanup();
        document.querySelector('meta[name="csrf-token"]')?.remove();
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        vi.setSystemTime(new Date(ORIGINAL_NOW));
    });

    it('submits prepared status with authored item and metric proofs bound to the Work node/version', () => {
        renderHandoff();
        fireEvent.click(screen.getByLabelText(/Verify stock count/));
        fireEvent.change(screen.getByLabelText(/Package weight/), { target: { value: '2.2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Mark prepared' }));

        expect(router.post).toHaveBeenCalledWith('/orders/order-1/handoff/prepared', expect.objectContaining({
            evidence_file_id: 'clean-proof-1',
            node_id: 'prep-node',
            work_version: 9,
            checklist_responses: [{ id: 'count', completed: true }],
            metric_readings: [{ id: 'weight', value: 2.2, unit: 'kg' }],
            expected_order_version: 4,
            idempotency_key: expect.any(String),
        }), expect.objectContaining({ preserveScroll: true }));
    });

    it('offers custody only to a server-projected courier candidate', () => {
        renderHandoff({
            ...baseHandoff,
            status: 'prepared',
            transfer: {
                id: 'transfer-1', status: 'prepared', mode: null, offered_to_user_id: null,
                version: 1, prepared_at: '2026-10-25T10:00:00Z', offered_at: null,
                departed_at: null, received_at: null,
            },
            canMarkPrepared: false,
            canOfferCustody: true,
        });

        fireEvent.change(screen.getByLabelText('Handoff method'), { target: { value: 'courier_delivery' } });
        fireEvent.change(screen.getByLabelText('Assigned courier'), { target: { value: 'courier-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Offer custody' }));

        expect(screen.getByText('Danny Express · ORD-2026-0421')).toBeTruthy();
        expect(screen.queryByLabelText('Assigned courier user ID')).toBeNull();
        expect(router.post).toHaveBeenCalledWith('/orders/order-1/handoff/custody', expect.objectContaining({
            transfer_mode: 'courier_delivery',
            courier_user_id: 'courier-1',
            expected_transfer_version: 1,
        }), expect.objectContaining({ preserveScroll: true }));
    });

    it('shows only the authorized recipient custody action and does not offer receipt to the courier', () => {
        renderHandoff({
            ...baseHandoff,
            status: 'offered',
            canMarkPrepared: false,
            canAcceptCustody: true,
            transfer: {
                id: 'transfer-1', status: 'offered', mode: 'courier_delivery', offered_to_user_id: 'courier-1',
                version: 2, prepared_at: '2026-10-25T10:00:00Z', offered_at: '2026-10-25T10:05:00Z',
                departed_at: null, received_at: null,
            },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Accept custody & record departure' }));

        expect(router.post).toHaveBeenCalledWith('/orders/order-1/handoff/custody/transfer-1/accept', expect.objectContaining({
            evidence_file_id: 'clean-proof-1',
            node_id: 'custody-node',
            work_version: 9,
            expected_transfer_version: 2,
            idempotency_key: expect.any(String),
        }), expect.objectContaining({ preserveScroll: true }));
    });
    it('requires the receiving counterparty code plus authored final receipt checklist and measurements', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ errors: { code: ['The code is invalid.'] } }),
        });
        vi.stubGlobal('fetch', fetchMock);
        const receiptNode = {
            ...a4WorkNodes[2],
            required_proofs: ['photo_proof', 'checklist_steps', 'metric_reading'],
            approval_method: 'worker_dropoff',
            can_issue_challenge: false,
            can_verify_challenge: true,
            pending_challenge: { id: 'challenge-3', kind: 'worker_dropoff', expires_at: '2026-10-25T12:03:00Z', work_version: 9, issued_by_role: 'provider' },
            checklist_items: [{ id: 'package-count', label: 'Verify recipient count', required: true }],
            metric_requirements: [{ id: 'received-weight', name: 'Received package weight', unit: 'kg', required: true }],
        } as WorkNodeRecord;
        const nodes = [...a4WorkNodes.slice(0, 2), receiptNode];
        renderHandoff({
            ...baseHandoff,
            status: 'departed',
            canMarkPrepared: false,
            canRecordReceipt: true,
            transfer: {
                id: 'transfer-3', status: 'departed', mode: 'courier_delivery', offered_to_user_id: 'courier-1',
                version: 4, prepared_at: '2026-10-25T09:00:00Z', offered_at: '2026-10-25T09:05:00Z',
                departed_at: '2026-10-25T09:10:00Z', received_at: null,
            },
        }, nodes);

        expect(screen.queryByRole('button', { name: 'Confirm final receipt' })).toBeNull();
        fireEvent.click(screen.getByLabelText(/Verify recipient count/));
        fireEvent.change(screen.getByLabelText(/Received package weight/), { target: { value: '2.4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Review proof & enter receipt code' }));
        const codeInput = screen.getByLabelText(/Enter the code/) as HTMLInputElement;
        fireEvent.change(codeInput, { target: { value: '000482' } });
        expect(codeInput.value).toBe('000482');
        fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

        expect((await screen.findByRole('alert')).textContent).toContain('The code is invalid.');
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/orders/order-1/handoff/receipt'), expect.objectContaining({
            body: expect.any(String),
        }));
        const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
        expect(requestBody).toEqual(expect.objectContaining({
            challenge_id: 'challenge-3',
            code: '000482',
            work_version: 9,
            node_id: 'receipt-node',
            evidence_file_id: 'clean-proof-1',
            expected_transfer_version: 4,
            idempotency_key: expect.any(String),
            checklist_responses: [{ id: 'package-count', completed: true }],
            metric_readings: [{ id: 'received-weight', value: 2.4, unit: 'kg' }],
        }));
    });

    it('shows a worker-dropoff code only to the server-authorized A4 issuer', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { challenge_id: 'dropoff-9', code: '000482', kind: 'worker_dropoff', expires_at: '2026-10-25T12:03:00Z', work_version: 9, node_id: 'receipt-node' } }),
        });
        vi.stubGlobal('fetch', fetchMock);
        const issuerNode = {
            ...a4WorkNodes[2],
            approval_method: 'worker_dropoff',
            can_issue_challenge: true,
            can_verify_challenge: false,
        } as WorkNodeRecord;
        renderHandoff({
            ...baseHandoff,
            status: 'departed',
            canMarkPrepared: false,
            transfer: {
                id: 'transfer-3', status: 'departed', mode: 'courier_delivery', offered_to_user_id: 'courier-1',
                version: 4, prepared_at: '2026-10-25T09:00:00Z', offered_at: '2026-10-25T09:05:00Z',
                departed_at: '2026-10-25T09:10:00Z', received_at: null,
            },
            proofNode: issuerNode,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Issue clearance code' }));
        expect(await screen.findByText('000482')).toBeDefined();
        expect(screen.queryByLabelText(/Enter the code/)).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/orders/order-1/work-nodes/receipt-node/clearance-challenges'), expect.objectContaining({ method: 'POST' }));
    });
    it('does not expose mutation actions when the server grants none', () => {
        renderHandoff({
            ...baseHandoff,
            canMarkPrepared: false,
        });

        expect(screen.queryByRole('button', { name: 'Mark prepared' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Offer custody' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Confirm final receipt' })).toBeNull();
    });
});

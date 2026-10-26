import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { router } from '@inertiajs/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import A9DeliveryPanel, { type A9DeliveryProjection } from './A9DeliveryPanel';
import type { WorkNodeRecord } from '../../types';

vi.mock('@inertiajs/react', () => ({ router: { reload: vi.fn() } }));

const node = {
    id: 'qa-node', ordinal: 1, title: 'Final quality check', description: 'Check finish', node_kind: 'execution_proof',
    evidence_type: 'none', evidence_description: '', control_mode: 'provider_advance', mandatory: true,
    required_proofs: ['checklist_steps', 'metric_reading'],
    checklist_items: [{ id: 'seal-intact', label: 'Seal is intact', required: true }],
    metric_requirements: [{ id: 'temperature', name: 'Water temperature', unit: '°C', required: true, min: 0, max: 100 }],
} as WorkNodeRecord;

function projection(id: string, version: number, workStatus = 'in_progress'): A9DeliveryProjection {
    return {
        enabled: true,
        viewer: 'provider',
        workStatus,
        revisionsAllowed: 1,
        revisionsUsed: version - 1,
        nodes: [node],
        currentDelivery: null,
        deliveries: [{
            id,
            version,
            status: 'draft',
            submittedAt: null,
            nodeProofs: {},
            files: [{ id: `file-${version}`, name: 'delivery.pdf', mediaType: 'application/pdf', sizeBytes: 20, scanStatus: 'clean', downloadUrl: null }],
        }],
    };
}

describe('A9DeliveryPanel authored QA', () => {
    afterEach(() => {
        cleanup();
        document.querySelector('meta[name="csrf-token"]')?.remove();
        vi.unstubAllGlobals();
        vi.mocked(router.reload).mockClear();
    });
    it('lets the assigned provider prepare the first delivery on an accepted not-started A9 Work', () => {
        render(<A9DeliveryPanel orderId="order-1" delivery={projection('draft-start', 1, 'not_started')} />);
        expect(screen.getByLabelText('Choose deliverable files')).toBeTruthy();
    });

    it('submits itemized proof, preserves inputs on server errors, and requires fresh proof for a revision', async () => {
        const csrf = document.createElement('meta');
        csrf.name = 'csrf-token';
        csrf.content = 'test-token';
        document.head.appendChild(csrf);
        const fetch = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Measurement unit does not match.' } }), { status: 422 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'submitted' } }), { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        const { rerender } = render(<A9DeliveryPanel orderId="order-1" delivery={projection('draft-v1', 1)} />);

        fireEvent.click(screen.getByLabelText(/Seal is intact/));
        fireEvent.change(screen.getByLabelText(/Water temperature \(°C\)/), { target: { value: '21.5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Attach proof to this delivery' }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit version 1 for review' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Measurement unit does not match.');
        expect((screen.getByLabelText(/Water temperature \(°C\)/) as HTMLInputElement).value).toBe('21.5');

        rerender(<A9DeliveryPanel orderId="order-1" delivery={projection('draft-v2', 2)} />);
        expect((screen.getByLabelText(/Seal is intact/) as HTMLInputElement).checked).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Submit version 2 for review' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Save the required proof for each authored Work node');
        expect(fetch).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByLabelText(/Seal is intact/));
        fireEvent.change(screen.getByLabelText(/Water temperature \(°C\)/), { target: { value: '22.5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Attach proof to this delivery' }));
        fireEvent.click(screen.getByRole('button', { name: 'Submit version 2 for review' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        const submitted = JSON.parse(String(fetch.mock.calls[1][1]?.body));
        expect(submitted).toEqual({
            node_proofs: {
                'qa-node': {
                    checklist_responses: [{ id: 'seal-intact', completed: true }],
                    metric_readings: [{ id: 'temperature', value: 22.5, unit: '°C' }],
                },
            },
        });
    });
    it('shows accepted status and reloads the full order projection after customer acceptance', async () => {
        const csrf = document.createElement('meta');
        csrf.name = 'csrf-token';
        csrf.content = 'test-token';
        document.head.appendChild(csrf);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ data: { work_status: 'completed', order_status: 'completed' } }), { status: 200 }),
        ));
        const current = {
            id: 'delivery-1',
            version: 1,
            status: 'submitted' as const,
            submittedAt: '2026-01-01T00:00:00Z',
            nodeProofs: {},
            files: [{ id: 'file-1', name: 'delivery.pdf', mediaType: 'application/pdf', sizeBytes: 20, scanStatus: 'clean' as const, downloadUrl: '/download' }],
        };
        const review: A9DeliveryProjection = {
            enabled: true,
            viewer: 'customer',
            workStatus: 'awaiting_signoff',
            revisionsAllowed: 1,
            revisionsUsed: 0,
            nodes: [node],
            currentDelivery: current,
            deliveries: [current],
        };
        render(<A9DeliveryPanel orderId="order-1" delivery={review} />);
        fireEvent.click(screen.getByRole('button', { name: 'Accept version 1' }));

        expect((await screen.findByRole('status')).textContent).toContain('Version 1 accepted.');
        expect(vi.mocked(router.reload).mock.calls[0]).toEqual([]);
    });
});

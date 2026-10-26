import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { router } from '@inertiajs/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkPhotoProofInput from './WorkPhotoProofInput';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Work photo proof', () => {
    it('supports a missing candidate list without retriggering state synchronization', async () => {
        const onEvidenceIdsChange = vi.fn();

        render(
            <WorkPhotoProofInput
                orderId="order-1"
                nodeId="node-1"
                disabled={false}
                onEvidenceIdsChange={onEvidenceIdsChange}
                onPreviewPhoto={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: /Choose or take a photo/i })).toBeTruthy();
        await waitFor(() => expect(onEvidenceIdsChange).toHaveBeenCalledWith([]));
    });
    it('waits for refreshed server scan status before including a quarantined proof', async () => {
        const onEvidenceIdsChange = vi.fn();
        const reload = vi.spyOn(router, 'reload').mockImplementation(() => {});
        const props = {
            orderId: 'order-1',
            nodeId: 'node-1',
            disabled: false,
            onEvidenceIdsChange,
            onPreviewPhoto: vi.fn(),
        };
        const { rerender } = render(<WorkPhotoProofInput {...props} candidates={[{ id: 'proof-1', scan_status: 'quarantined', media_type: 'image' }]} />);

        await waitFor(() => expect(onEvidenceIdsChange).toHaveBeenLastCalledWith([]));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh scan status' }));
        expect(reload).toHaveBeenCalledWith();
        expect(onEvidenceIdsChange).toHaveBeenLastCalledWith([]);

        rerender(<WorkPhotoProofInput {...props} candidates={[{ id: 'proof-1', scan_status: 'clean', media_type: 'image' }]} />);
        await waitFor(() => expect(onEvidenceIdsChange).toHaveBeenLastCalledWith(['proof-1']));
    });
    it('renders infected and failed scan results as terminal rejected evidence, never pending or selectable', async () => {
        const onEvidenceIdsChange = vi.fn();
        const { rerender } = render(
            <WorkPhotoProofInput
                orderId="order-1"
                nodeId="node-1"
                candidates={[
                    { id: 'infected-proof', scan_status: 'quarantined', media_type: 'image' },
                    { id: 'failed-proof', scan_status: 'quarantined', media_type: 'image' },
                ]}
                disabled={false}
                onEvidenceIdsChange={onEvidenceIdsChange}
                onPreviewPhoto={vi.fn()}
            />,
        );
        await waitFor(() => expect(onEvidenceIdsChange).toHaveBeenLastCalledWith([]));
        rerender(
            <WorkPhotoProofInput
                orderId="order-1"
                nodeId="node-1"
                candidates={[
                    { id: 'infected-proof', scan_status: 'infected', media_type: 'image', url: '/private/infected-proof' },
                    { id: 'failed-proof', scan_status: 'failed', media_type: 'image', url: '/private/failed-proof' },
                ]}
                disabled={false}
                onEvidenceIdsChange={onEvidenceIdsChange}
                onPreviewPhoto={vi.fn()}
            />,
        );

        expect(screen.getAllByText('Rejected by safety scan')).toHaveLength(2);
        expect(screen.getByText(/rejected by the safety scan/i)).toBeDefined();
        expect(screen.getByText(/safety scan failed/i)).toBeDefined();
        expect(screen.queryByText(/waiting for a safety scan/i)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Refresh scan status' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Preview work proof photo' })).toBeNull();
        await waitFor(() => expect(onEvidenceIdsChange).toHaveBeenLastCalledWith([]));
    });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartnerSelectionDrawer, type PartnerCandidate } from './PartnerSelectionDrawer';

const mockCandidates: PartnerCandidate[] = [
    {
        id: 's-1',
        role: 'store',
        name: 'Tagudin Hardware & Supply Depot',
        sub: 'Direct counter lane · Genuine parts guarantee',
        fee: 180,
        category: 'depot',
        icon: 'store',
    },
    {
        id: 's-2',
        role: 'store',
        name: 'Centro Electrical & Aircon Depot',
        sub: 'Original OEM capacitors and chemical foam',
        fee: 195,
        category: 'oem',
        icon: 'store',
    },
];

describe('PartnerSelectionDrawer', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders side drawer when open with store candidates', () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();

        render(
            <PartnerSelectionDrawer
                open={true}
                onClose={onClose}
                role="store"
                candidates={mockCandidates}
                currentSelectedId="s-1"
                onSelect={onSelect}
            />,
        );

        expect(screen.getByText('Select Hardware Store')).toBeTruthy();
        expect(screen.getByText('Tagudin Hardware & Supply Depot')).toBeTruthy();
        expect(screen.getByText('Centro Electrical & Aircon Depot')).toBeTruthy();
        expect(screen.getByText('Active')).toBeTruthy();
    });

    it('filters candidates based on search input', () => {
        render(
            <PartnerSelectionDrawer
                open={true}
                onClose={vi.fn()}
                role="store"
                candidates={mockCandidates}
                currentSelectedId="s-1"
                onSelect={vi.fn()}
            />,
        );

        const searchInput = screen.getByPlaceholderText(/search verified stores/i);
        fireEvent.change(searchInput, { target: { value: 'Centro' } });

        expect(screen.queryByText('Tagudin Hardware & Supply Depot')).toBeNull();
        expect(screen.getByText('Centro Electrical & Aircon Depot')).toBeTruthy();
    });

    it('calls onSelect and onClose when selecting a partner', () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();

        render(
            <PartnerSelectionDrawer
                open={true}
                onClose={onClose}
                role="store"
                candidates={mockCandidates}
                currentSelectedId="s-1"
                onSelect={onSelect}
            />,
        );

        const centroCandidate = screen.getByText('Centro Electrical & Aircon Depot');
        fireEvent.click(centroCandidate);

        expect(onSelect).toHaveBeenCalledWith(mockCandidates[1]);
        expect(onClose).toHaveBeenCalled();
    });
});

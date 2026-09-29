import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotListingPickerModal } from './SlotListingPickerModal';
import type { SlotCandidateListing } from '../../marketplace/types';

describe('SlotListingPickerModal', () => {
    const sampleCandidates: SlotCandidateListing[] = [
        {
            id: 'c1',
            title: 'Tagudin Express Motorcycle Delivery',
            provider_name: 'Danny Express Motorcycle Pool',
            area: 'Tagudin Townwide',
            price_minor: 3500,
            sla_text: 'On-demand ~20 mins transit',
            rating: 4.9,
            role: 'COURIER',
        },
        {
            id: 'c2',
            title: 'Barangay Centro Bicycle Runner',
            provider_name: 'Centro Eco Courier',
            area: 'Poblacion Centro',
            price_minor: 2500,
            sla_text: 'Eco transit ~15 mins',
            rating: 4.8,
            role: 'COURIER',
        },
    ];

    it('renders candidate listings when provided and selects on click', () => {
        const onSelectCandidate = vi.fn();
        render(
            <SlotListingPickerModal
                open={true}
                onClose={vi.fn()}
                role="COURIER"
                candidates={sampleCandidates}
                onSelectCandidate={onSelectCandidate}
            />,
        );

        expect(screen.getAllByText('Tagudin Express Motorcycle Delivery').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Barangay Centro Bicycle Runner').length).toBeGreaterThanOrEqual(1);

        // Click second candidate and confirm
        fireEvent.click(screen.getAllByText('Barangay Centro Bicycle Runner')[0]);
        fireEvent.click(screen.getAllByRole('button', { name: /Confirm Partner Selection/i })[0]);

        expect(onSelectCandidate).toHaveBeenCalledTimes(1);
        expect(onSelectCandidate.mock.calls[0][0].id).toBe('c2');
    });

    it('renders empty pool CTA state when no candidates match and triggers open slot callback', () => {
        const onSelectOpenSlot = vi.fn();
        const onClose = vi.fn();

        render(
            <SlotListingPickerModal
                open={true}
                onClose={onClose}
                role="COURIER"
                candidates={[]}
                onSelectCandidate={vi.fn()}
                onSelectOpenSlot={onSelectOpenSlot}
            />,
        );

        expect(screen.getAllByText(/No Verified COURIER Listings in Tagudin/i).length).toBeGreaterThanOrEqual(1);
        const openPoolBtn = screen.getAllByRole('button', { name: /Set as Community Open Pool/i })[0];
        expect(openPoolBtn).toBeTruthy();

        fireEvent.click(openPoolBtn);
        expect(onSelectOpenSlot).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('filters candidates based on search query', () => {
        render(
            <SlotListingPickerModal
                open={true}
                onClose={vi.fn()}
                role="COURIER"
                candidates={sampleCandidates}
                onSelectCandidate={vi.fn()}
            />,
        );

        const searchInputs = screen.getAllByPlaceholderText(/Search courier providers or listings/i);
        searchInputs.forEach((input) => fireEvent.change(input, { target: { value: 'Bicycle' } }));

        expect(screen.queryByText('Tagudin Express Motorcycle Delivery')).toBeNull();
        expect(screen.getAllByText('Barangay Centro Bicycle Runner').length).toBeGreaterThanOrEqual(1);
    });
});

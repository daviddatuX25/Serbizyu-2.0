import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlotListingPickerModal } from './SlotListingPickerModal';
import type { SlotCandidateListing } from '../../marketplace/types';

afterEach(() => cleanup());

describe('SlotListingPickerModal', () => {
    it('offers exact audit/recycle candidates with unknown facts left unknown and preserves the selected version', () => {
        const audit: SlotCandidateListing = {
            id: 'audit-listing',
            title: 'Safety inspection',
            provider_name: 'Local auditor',
            listing_version_id: 'audit-version-3',
            area: 'Tagudin',
            price_minor: null,
            rating: null,
            sla_text: 'Listing details',
            role: 'AUDIT',
        };
        const recycle: SlotCandidateListing = {
            id: 'recycle-listing',
            title: 'Recycling collection',
            provider_name: 'Local recycler',
            listingVersionId: 'recycle-version-2',
            area: 'Tagudin',
            price_minor: 0,
            rating: 0,
            sla_text: 'Listing details',
            role: 'RECYCLE',
        };
        const onSelectCandidate = vi.fn();
        const onClose = vi.fn();

        const { rerender } = render(
            <SlotListingPickerModal open onClose={onClose} role="AUDIT" currentListingId="stale-auditor" candidates={[audit, recycle]} onSelectCandidate={onSelectCandidate} />,
        );

        expect(screen.getByRole('button', { name: /Safety inspection/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Recycling collection/i })).toBeNull();
        expect(screen.getByText('No reviews')).toBeTruthy();
        expect(screen.getByText('Price unavailable')).toBeTruthy();
        const auditConfirm = screen.getByRole('button', { name: /Confirm Partner Selection/i });
        expect(auditConfirm.hasAttribute('disabled')).toBe(true);
        fireEvent.click(auditConfirm);
        expect(onSelectCandidate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /Safety inspection/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirm Partner Selection/i }));
        expect(onSelectCandidate).toHaveBeenCalledWith(expect.objectContaining({ listingVersionId: 'audit-version-3' }));

        onSelectCandidate.mockClear();
        rerender(
            <SlotListingPickerModal open onClose={onClose} role="RECYCLE" candidates={[audit, recycle]} onSelectCandidate={onSelectCandidate} />,
        );
        expect(screen.getByRole('button', { name: /Recycling collection/i })).toBeTruthy();
        expect(screen.getByText('0.0')).toBeTruthy();
        expect(screen.getByText('₱0.00')).toBeTruthy();
        expect(screen.queryByText('No reviews')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Recycling collection/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirm Partner Selection/i }));
        expect(onSelectCandidate).toHaveBeenCalledWith(expect.objectContaining({ listingVersionId: 'recycle-version-2', price_minor: 0, rating: 0 }));
    });
});

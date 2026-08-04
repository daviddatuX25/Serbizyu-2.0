import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListingCard } from './ListingCard';
import { listingStatusLabel } from './ListingStatusBadge';

describe('ListingCard', () => {
    it('renders public listing without price or verification claims', () => {
        render(
            <ListingCard
                listing={{
                    id: 'listing-1',
                    title: 'Tagudin bicycle repair',
                    description: 'Reliable local help for simple repairs.',
                    category_code: 'repairs',
                    listing_type: 'service',
                    status: 'active',
                    area: 'Tagudin',
                    owner_name: 'Maya Tagudin',
                    public: true,
                }}
                variant="public"
            />,
        );

        expect(screen.getByRole('heading', { name: 'Tagudin bicycle repair' })).toBeTruthy();
        expect(screen.getByText(/Maya Tagudin/i)).toBeTruthy();
        expect(screen.queryByText(/₱/)).toBeNull();
        expect(screen.queryByText(/verified/i)).toBeNull();
        expect(screen.queryByText(/in stock/i)).toBeNull();
    });

    it('labels owner statuses with readable badges', () => {
        expect(listingStatusLabel('pending_review')).toBe('Pending review');
        expect(listingStatusLabel('draft')).toBe('Draft');

        render(
            <ListingCard
                listing={{
                    id: 'listing-2',
                    title: 'Household help draft',
                    description: 'Private owner draft.',
                    status: 'draft',
                    version: 2,
                    area: 'Tagudin',
                }}
                variant="owner"
            />,
        );

        expect(screen.getByText(/Draft · v2/)).toBeTruthy();
        expect(screen.getByText(/Private draft/)).toBeTruthy();
    });
});

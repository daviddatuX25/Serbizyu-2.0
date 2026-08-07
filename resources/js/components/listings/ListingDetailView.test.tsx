import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingDetailView } from './ListingDetailView';
import type { ReactNode } from 'react';
import { ProductShell } from '../ProductShell';

const post = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        post: (...args: unknown[]) => post(...args),
    },
}));

afterEach(() => {
    cleanup();
    post.mockReset();
    window.localStorage.clear();
});

function renderDetail(ui: ReactNode) {
    return render(<ProductShell active="browse" title="Listing detail">{ui}</ProductShell>);
}

const listing = {
    id: 'listing-detail-1',
    title: 'Hand-drawn greeting card layout',
    description: 'A5 layout with one revision.',
    category_code: 'greeting-cards',
    listing_type: 'service',
    status: 'active',
    area: 'Tagudin',
    owner_name: 'Maya Tagudin',
    public: true,
    price_amount_minor: 35000,
    currency: 'PHP',
    capacity_summary: '1 revision included',
};

describe('ListingDetailView', () => {
    it('renders Stitch Media dock anatomy with workflow steps and review suite', () => {
        renderDetail(<ListingDetailView listing={listing} />);

        expect(screen.getByRole('heading', { name: /hand-drawn greeting card layout/i })).toBeTruthy();
        expect(screen.getAllByText(/greeting cards/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/a1 linear project/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /how this works/i })).toBeTruthy();
        expect(screen.getByText(/share your occasion brief/i)).toBeTruthy();
        expect(screen.getByText(/tell us the names/i)).toBeTruthy();
        expect(screen.queryByText(/from request/i)).toBeNull();
        expect(screen.getByRole('heading', { name: /^reviews$/i })).toBeTruthy();
        expect(screen.getAllByText(/ana m\./i).length).toBeGreaterThan(0);
        expect(screen.getByLabelText(/all sample reviews/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /next review/i })).toBeNull();
        expect(screen.getByText(/new provider/i)).toBeTruthy();
        expect(screen.getByText(/local safety/i)).toBeTruthy();
        expect(screen.getByText(/verified provider · later/i)).toBeTruthy();
        expect(screen.queryByRole('heading', { name: /deal & message/i })).toBeNull();
        expect(screen.queryByLabelText(/play preview video/i)).toBeNull();
        expect(screen.getAllByText(/₱350/i)).toHaveLength(1);
        expect(screen.getByText(/1 revision included/i)).toBeTruthy();
        expect(screen.getByLabelText(/photos for hand-drawn/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /pin this listing/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^message$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^book$/i })).toBeTruthy();
        expect(screen.getByRole('link', { name: /visit us/i })).toBeTruthy();
        expect(screen.getByRole('link', { name: /visit us/i }).getAttribute('href')).toContain('google.com/maps');
        expect(screen.queryByText(/activity/i)).toBeNull();
        expect(screen.queryByText(/escrow/i)).toBeNull();
    });

    it('shows unavailable recovery when listing is missing', () => {
        renderDetail(<ListingDetailView listing={null} />);

        expect(screen.getByText(/listing unavailable/i)).toBeTruthy();
        expect(screen.getByText(/not available for public viewing/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /back to browse/i })).toBeTruthy();
    });

    it('surfaces denial message and correlation reference', () => {
        render(
            <ListingDetailView
                listing={listing}
                denial={{
                    message: 'You cannot edit this listing as a public viewer.',
                    recovery: 'Return to browse.',
                    correlationId: 'corr-detail-1',
                }}
            />,
        );

        expect(screen.getByText(/you cannot edit this listing/i)).toBeTruthy();
        expect(screen.getByText(/return to browse/i)).toBeTruthy();
        expect(screen.getByText(/corr-detail-1/i)).toBeTruthy();
    });

    it('toggles pin shortlist in local storage', () => {
        renderDetail(<ListingDetailView listing={listing} />);
        fireEvent.click(screen.getByRole('button', { name: /pin this listing/i }));
        expect(screen.getByRole('button', { name: /saved to your pins/i })).toBeTruthy();
        const raw = window.localStorage.getItem('serbizyu.browse.pins');
        expect(raw).toContain('listing-detail-1');
    });
});

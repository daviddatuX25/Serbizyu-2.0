import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListingDetail from './ListingDetail';
import type { HomeProps, ListingRecord } from '../types';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: vi.fn(),
    },
}));

describe('ListingDetail Page', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    const mockListing: ListingRecord = {
        id: 'listing-detail-1',
        title: 'Inverter Split AC Deep Clean',
        description: 'Complete indoor evaporator coil deep chemical foam wash.',
        category_code: 'repairs',
        listing_type: 'service',
        status: 'active',
        area: 'Tagudin Centro',
        owner_name: 'Kuya Ben AC',
        public: true,
        price_amount_minor: 45000,
        currency: 'PHP',
    };

    const baseProps: HomeProps = {
        activeListingDetail: mockListing,
        session: {
            authenticated: true,
            userId: 'usr_buyer',
            displayName: 'Maria Santos',
        },
    };

    function getDesktop(container: HTMLElement): HTMLElement {
        const el = container.querySelector('.hidden.lg\\:flex')?.closest('div');
        return (el || container) as HTMLElement;
    }

    it('renders listing details, work execution gates, and starting rate', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        expect(within(desktop).getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText('₱450.00').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText('Kuya Ben AC').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/What's Included & Execution Gates/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Tiwala Escrow Protection/i).length).toBeGreaterThan(0);
    });

    it('updates total escrow amount when deal chain add-on is selected', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Initially ₱450.00
        expect(within(desktop).getAllByText('Total Escrow Amount:').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText('₱450.00').length).toBeGreaterThan(0);

        // Check "Tagudin Hardware Parts" (+₱180.00)
        const partsCheckbox = within(desktop).getAllByRole('checkbox')[0];
        fireEvent.click(partsCheckbox);

        // 450 + 180 = ₱630.00
        expect(within(desktop).getAllByText('₱630.00').length).toBeGreaterThan(0);
    });

    it('updates quantity and multiplies total escrow calculation', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        const incBtn = within(desktop).getAllByRole('button', { name: 'Increase quantity' })[0];
        fireEvent.click(incBtn);

        // Quantity 2 * ₱450 = ₱900.00
        expect(within(desktop).getAllByText('₱900.00').length).toBeGreaterThan(0);
    });

    it('adds listing to Citizen Picks and opens PicksDrawer', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Click Add to Citizen Picks button
        const addBtn = within(desktop).getByRole('button', { name: /Add to Citizen Picks/i });
        fireEvent.click(addBtn);

        // Picks drawer opens with item
        expect(screen.getByText('Citizen Picks')).toBeTruthy();
        expect(screen.getByText('1 item ready for escrow')).toBeTruthy();
        expect(screen.getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThan(0);
        expect(screen.getByText('Proceed to Escrow Booking')).toBeTruthy();
    });

    it('renders unavailable notice when listing is missing', () => {
        render(<ListingDetail {...baseProps} activeListingDetail={null} />);

        expect(screen.getByText('Listing Unavailable')).toBeTruthy();
        expect(screen.getByText(/not currently available for public viewing/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /Back to Marketplace/i })).toBeTruthy();
    });
});

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

    it('renders listing details, package tier options, and starting rate', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        expect(within(desktop).getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText('₱450.00').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Kuya Ben AC/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Choose Package Tier/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/1 Unit Standard/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Tiwala Escrow Protection/i).length).toBeGreaterThan(0);
    });

    it('updates total escrow amount and renders live pipeline when turnkey deal chain preset is selected', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Initially Labor Only (₱450.00)
        expect(within(desktop).getAllByText('₱450.00').length).toBeGreaterThan(0);

        // Click "Turnkey Parts"
        const turnkeyBtn = within(desktop).getByRole('button', { name: /Turnkey Parts/i });
        fireEvent.click(turnkeyBtn);

        // Renders Connected Deal Chain Flow & Partner Banners
        expect(within(desktop).getAllByText(/Connected Deal Chain Flow/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Change Courier ▾/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Change Store ▾/i).length).toBeGreaterThan(0);
    });

    it('opens partner substitution modal and substitutes selected partner', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Switch to Turnkey Parts to show courier banner
        fireEvent.click(within(desktop).getByRole('button', { name: /Turnkey Parts/i }));

        // Click "Change Courier ▾"
        const changeCourierBtn = within(desktop).getByRole('button', { name: /Change Courier ▾/i });
        fireEvent.click(changeCourierBtn);

        // Substitution Modal opens
        expect(screen.getByText('Substitute Courier Delivery')).toBeTruthy();
        expect(screen.getByText(/Kuya Danny Tricycle Cargo/i)).toBeTruthy();

        // Select Kuya Danny Tricycle Cargo
        fireEvent.click(screen.getByText(/Kuya Danny Tricycle Cargo/i));

        // Slot banner reflects substituted partner
        expect(within(desktop).getAllByText(/Kuya Danny Tricycle Cargo/i).length).toBeGreaterThan(0);
    });

    it('toggles package customizer and adds rush priority enhancements', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Click customize service options toggle
        const customizerToggle = within(desktop).getByRole('button', { name: /Customize service speed/i });
        fireEvent.click(customizerToggle);

        // Check Fast Clean (+₱100)
        const fastCleanCheckbox = within(desktop).getAllByRole('checkbox')[0];
        fireEvent.click(fastCleanCheckbox);

        // 450 + 100 = ₱550.00
        expect(within(desktop).getAllByText('₱550.00').length).toBeGreaterThan(0);
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
        const addBtn = within(desktop).getAllByRole('button', { name: /Add to Citizen Picks/i })[0];
        fireEvent.click(addBtn);

        // Picks drawer opens with item
        expect(screen.getByText('Citizen Picks')).toBeTruthy();
        expect(screen.getByText('1 item ready for escrow')).toBeTruthy();
        expect(screen.getAllByText(/Inverter Split AC Deep Clean/).length).toBeGreaterThan(0);
    });

    it('renders unavailable notice when listing is missing', () => {
        render(<ListingDetail {...baseProps} activeListingDetail={null} />);

        expect(screen.getByText('Listing Unavailable')).toBeTruthy();
        expect(screen.getByText(/not currently available for public viewing/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /Back to Marketplace/i })).toBeTruthy();
    });

    it('renders verified customer reviews suite and expands more reviews on demand', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Header and satisfaction rating
        expect(within(desktop).getAllByText(/Customer Reviews/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/98% Satisfaction/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Job photos from Tagudin homes/i).length).toBeGreaterThan(0);

        // Featured review visible
        expect(within(desktop).getAllByText(/Maria S\./i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Very thorough clean/i).length).toBeGreaterThan(0);

        // Click "+ View more reviews"
        const toggleBtn = within(desktop).getByRole('button', { name: /\+ View more reviews/i });
        fireEvent.click(toggleBtn);

        // Extended reviews with mock counts and pagination visible
        expect(within(desktop).getByText('★ 5 Stars (120)')).toBeTruthy();
        expect(within(desktop).getByText('With Photos (18)')).toBeTruthy();
        expect(within(desktop).getByText('Ramil D. · Barangay Bio')).toBeTruthy();
        expect(within(desktop).getByText('Page 1 of 6')).toBeTruthy();
    });

    it('adapts headers and specifications dynamically for product listings', () => {
        const productListing: ListingRecord = {
            id: 'product-1',
            title: 'Weekend bibingka tray',
            description: 'Fresh warm bibingka cakes in banana leaf wrapping.',
            category_code: 'local-food',
            listing_type: 'product',
            status: 'active',
            area: 'Tagudin Market',
            owner_name: 'Auntie Tess',
            public: true,
            price_amount_minor: 18000,
            currency: 'PHP',
        };

        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={productListing} />);
        const desktop = getDesktop(container as HTMLElement);

        // Check product adaptations
        expect(within(desktop).getAllByText('Weekend bibingka tray').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Verified Local Product/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Solo Snack Box/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/In-Store Pickup/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Doorstep Delivery/i).length).toBeGreaterThan(0);
    });
});

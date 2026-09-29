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

        expect(within(desktop).getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThan(
            0,
        );
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
        expect(within(desktop).getAllByText(/Connected Deal Chain Flow/i).length).toBeGreaterThan(
            0,
        );
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

        // Substitution Drawer opens
        expect(screen.getByText('Select Courier Partner')).toBeTruthy();
        expect(screen.getByText(/Kuya Danny Tricycle Cargo/i)).toBeTruthy();

        // Select Kuya Danny Tricycle Cargo
        fireEvent.click(screen.getByText(/Kuya Danny Tricycle Cargo/i));

        // Slot banner reflects substituted partner
        expect(within(desktop).getAllByText(/Kuya Danny Tricycle Cargo/i).length).toBeGreaterThan(
            0,
        );
    });

    it('toggles package customizer and adds rush priority enhancements', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Click customize service options toggle
        const customizerToggle = within(desktop).getByRole('button', {
            name: /Customize service speed/i,
        });
        fireEvent.click(customizerToggle);

        // Check Fast Clean (+₱100)
        const fastCleanCheckbox = within(desktop).getAllByRole('checkbox')[0];
        fireEvent.click(fastCleanCheckbox);

        // 450 + 100 = ₱550.00
        expect(within(desktop).getAllByText('₱550.00').length).toBeGreaterThan(0);
    });

    it('updates quantity and multiplies the planning estimate', () => {
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
        expect(screen.getByText(/1 item staged for review/i)).toBeTruthy();
        expect(screen.getAllByText(/Inverter Split AC Deep Clean/).length).toBeGreaterThan(0);
    });

    it('renders unavailable notice when listing is missing', () => {
        render(<ListingDetail {...baseProps} activeListingDetail={null} />);

        expect(screen.getByText('Listing Unavailable')).toBeTruthy();
        expect(screen.getByText(/not currently available for public viewing/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /Back to Marketplace/i })).toBeTruthy();
    });

    it('hides photos, filters, and pagination for listings with no reviews', () => {
        const emptyListing: ListingRecord = {
            ...mockListing,
            rating_summary: {
                rating: 0,
                reviews_count: 0,
                photos_count: 1,
                distribution: {},
            },
            reviews: [],
            photos: [
                {
                    url: '/photos/verified-job.jpg',
                    thumbnail_url: '/photos/verified-job-thumb.jpg',
                    label: 'Verified job photo',
                    author: 'Maria Santos',
                },
            ],
        };
        const { container } = render(
            <ListingDetail {...baseProps} activeListingDetail={emptyListing} />,
        );
        const desktop = getDesktop(container as HTMLElement);

        expect(within(desktop).getByText('No verified reviews yet')).toBeTruthy();
        expect(
            within(desktop).getByText(
                'Customer reviews and milestone completion photos appear after verified orders are completed.',
            ),
        ).toBeTruthy();
        expect(within(desktop).queryByText(/Job photos from verified orders/i)).toBeNull();
        expect(within(desktop).queryByRole('button', { name: /View more reviews/i })).toBeNull();
        expect(within(desktop).queryByText(/Page \d+ of \d+/)).toBeNull();
        expect(within(desktop).queryByText(/All \(0\)/)).toBeNull();
    });

    it('renders verified reviews, thumbnails, and filter counts from listing data', () => {
        const reviews = Array.from({ length: 7 }, (_, index) => ({
            id: `review-${index + 1}`,
            author: index === 0 ? 'Maria S.' : `Reviewer ${index + 1}`,
            barangay: 'Barangay Centro',
            timeAgo: '3 days ago',
            stars: index === 6 ? 4 : 5,
            packageTag: 'Standard Service',
            quote: index === 0 ? 'Very thorough clean.' : 'Verified service review.',
            hasPhoto: index < 2,
        }));
        const reviewedListing: ListingRecord = {
            ...mockListing,
            rating_summary: {
                rating: 4.9,
                reviews_count: 7,
                photos_count: 2,
                satisfaction_pct: 92,
                distribution: { 5: 6, 4: 1 },
            },
            reviews,
            photos: [
                {
                    url: '/photos/verified-coil.jpg',
                    thumbnail_url: '/photos/verified-coil-thumb.jpg',
                    label: 'Chemical coil service',
                    author: 'Maria Santos',
                },
                {
                    url: '/photos/verified-capacitor.jpg',
                    thumbnail_url: '/photos/verified-capacitor-thumb.jpg',
                    label: 'Capacitor replacement',
                    author: 'Ramil Dela Cruz',
                },
            ],
        };
        const { container } = render(
            <ListingDetail {...baseProps} activeListingDetail={reviewedListing} />,
        );
        const desktop = getDesktop(container as HTMLElement);

        expect(within(desktop).getByText('Job photos from verified orders (2)')).toBeTruthy();
        const thumbnail = within(desktop).getByRole('img', {
            name: 'Chemical coil service by Maria Santos',
        });
        expect(thumbnail.getAttribute('src')).toBe('/photos/verified-coil-thumb.jpg');
        expect(thumbnail.getAttribute('loading')).toBe('lazy');
        expect(thumbnail.getAttribute('decoding')).toBe('async');
        expect(within(desktop).getByText('Maria S. · Barangay Centro')).toBeTruthy();

        fireEvent.click(within(desktop).getByRole('button', { name: /\+ View more reviews/i }));
        expect(within(desktop).getByRole('button', { name: 'All (7)' })).toBeTruthy();
        expect(within(desktop).getByRole('button', { name: '★ 5 Stars (6)' })).toBeTruthy();
        expect(within(desktop).getByRole('button', { name: '★ 4 Stars (1)' })).toBeTruthy();
        expect(within(desktop).getByRole('button', { name: 'With Photos (2)' })).toBeTruthy();
        expect(within(desktop).getByText('Page 1 of 2')).toBeTruthy();
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

        const { container } = render(
            <ListingDetail {...baseProps} activeListingDetail={productListing} />,
        );
        const desktop = getDesktop(container as HTMLElement);

        // Check product adaptations
        expect(within(desktop).getAllByText('Weekend bibingka tray').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Verified Local Product/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Solo Snack Box/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/In-Store Pickup/i).length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText(/Doorstep Delivery/i).length).toBeGreaterThan(0);

        // Verified Fulfillment & Handoff Protocol for products (instead of Work Execution Pipeline)
        expect(within(desktop).getByText('Fulfillment & Handoff Protocol')).toBeTruthy();
        expect(within(desktop).getByText(/custody & dispatch gates/i)).toBeTruthy();
        expect(within(desktop).getByText('Sourcing & Package Preparation')).toBeTruthy();
        expect(within(desktop).getByText('Counter Collection & Verification')).toBeTruthy();
        expect(within(desktop).getByText('Condition Close-Out & Release')).toBeTruthy();

        // Switching to delivery updates custody gates
        fireEvent.click(within(desktop).getByText(/Doorstep Delivery/i));
        expect(within(desktop).getByText('Store Sourcing & Dispatch Packaging')).toBeTruthy();
        expect(within(desktop).getByText('Courier Custody & Transit Relay')).toBeTruthy();
        expect(within(desktop).getByText('Doorstep Arrival & Photo Confirmation')).toBeTruthy();
    });
    it('renders server-projected package tiers and milestone stages from database terms', () => {
        const customListing: ListingRecord = {
            id: 'custom-listing-1',
            title: 'Custom Metal Fabrication Service',
            description: 'Custom welding and stainless gate fabrication.',
            category_code: 'repairs',
            listing_type: 'service',
            status: 'active',
            area: 'Tagudin Centro',
            owner_name: 'Mang Lando Steel',
            public: true,
            price_amount_minor: 150000,
            currency: 'PHP',
            package_tiers: [
                {
                    id: 'custom-pkg-1',
                    title: 'Light Gate Repair',
                    price: 1500,
                    sub: 'Hinge welding & alignment',
                    inclusions: [
                        'On-site metal inspection',
                        'Spot welding and grind',
                        'Anti-rust primer coat',
                    ],
                },
                {
                    id: 'custom-pkg-2',
                    title: 'Full Stainless Fabrication',
                    price: 4500,
                    sub: 'Custom security grille',
                    inclusions: [
                        'Measurement & material cut',
                        'TIG welding assembly',
                        'Mirror polish finish',
                    ],
                },
            ],
            milestone_stages: [
                {
                    title: 'Material measurement & cutting',
                    description: 'Stage 1 · Cut specifications gate',
                },
                {
                    title: 'TIG welding and structural test',
                    description: 'Stage 2 · Weld bead penetration test',
                },
            ],
        };

        const { container } = render(
            <ListingDetail {...baseProps} activeListingDetail={customListing} />,
        );
        const desktop = getDesktop(container as HTMLElement);

        // Server-projected package tiers are rendered!
        expect(within(desktop).getByText('Light Gate Repair')).toBeTruthy();
        expect(within(desktop).getByText('Full Stainless Fabrication')).toBeTruthy();
        expect(within(desktop).getByText('Hinge welding & alignment')).toBeTruthy();
        expect(within(desktop).getByText('Anti-rust primer coat')).toBeTruthy();

        // Server-projected milestone stages are rendered in compact stepper!
        expect(within(desktop).getByText('Material measurement & cutting')).toBeTruthy();

        // Expand pipeline details
        const detailsBtn = within(desktop).getByRole('button', { name: /Details/i });
        fireEvent.click(detailsBtn);
        expect(within(desktop).getByText('Stage 1 · Cut specifications gate')).toBeTruthy();
    });
});

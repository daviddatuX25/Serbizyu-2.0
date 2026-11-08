import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListingDetail from './ListingDetail';
import type { HomeProps, ListingRecord } from '../types';

const { visit, post } = vi.hoisted(() => ({ visit: vi.fn(), post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { visit, post },
}));

describe('ListingDetail Page', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        visit.mockClear();
        post.mockClear();
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
        return (container.querySelector('main') || container) as HTMLElement;
    }

    it('renders the seller price and does not claim an escrow guarantee', () => {
        const { container } = render(<ListingDetail {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        expect(within(desktop).getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThan(0);
        expect(within(desktop).getAllByText('₱450.00').length).toBeGreaterThan(0);
        expect(within(desktop).getByText(/Choose service package/i)).toBeTruthy();
        expect(within(desktop).queryByText(/Tiwala Escrow Protection/i)).toBeNull();
    });

    it('renders authored Work Specification steps and saved Deal Chain partner slots', () => {
        const listing: ListingRecord = {
            ...mockListing,
            listing_version_id: 'service-version-3',
            work_specification: {
                nodes: [{
                    id: 'inspect',
                    ordinal: 1,
                    title: 'Inspect wheel',
                    description: 'Check for visible damage.',
                    target_duration_minutes: 30,
                    required_proofs: ['photo_proof'],
                    clearance_mode: 'customer_approval',
                    approval_method: 'app_confirm',
                }],
            },
            deal_chain_combinations: [{
                id: 'combo-fit',
                title: 'Repair and fitting',
                isDefault: true,
                planVersion: 1,
                nodes: [{
                    id: 'node-primary',
                    isPrimary: true,
                    role: 'service',
                    title: 'Repair',
                    sub: 'Primary service',
                    type: 'labor',
                }, {
                    id: 'slot-rider',
                    isPrimary: false,
                    role: 'delivery',
                    title: 'Local rider',
                    sub: 'Active rider listing',
                    type: 'delivery',
                    listingId: 'rider-listing-1',
                }],
                dependencies: [{
                    id: 'edge-primary-rider',
                    predecessorId: 'node-primary',
                    successorId: 'slot-rider',
                    conditionCode: 'work_completed',
                    dependencyType: 'blocks',
                    status: 'active',
                }],
            }],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const main = container.querySelector('main') as HTMLElement;

        expect(within(main).getByText('Work Specification')).toBeTruthy();
        expect(within(main).getByText('Inspect wheel')).toBeTruthy();
        fireEvent.click(within(main).getByRole('button', { name: 'Details' }));
        expect(within(main).getByText(/Target duration: 30 min/)).toBeTruthy();
        expect(within(main).getByText(/Required proof: photo proof/)).toBeTruthy();
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'unrelated-item',
            listing_id: 'unrelated-listing',
            title: 'Unrelated Picks item',
            price: 99,
            quantity: 1,
        }]));
        expect(within(main).getByText(/Clearance: customer approval/)).toBeTruthy();
        expect(within(main).getByText(/Approval: app confirm/)).toBeTruthy();
        expect(within(main).getByText('Repair and fitting')).toBeTruthy();
        expect(within(main).queryByText(/Tiwala Escrow Protection|Turnkey Parts|Safety Audit/)).toBeNull();
        fireEvent.click(within(main).getByRole('button', { name: /Book Service Now/i }));
        const booking = new URL(visit.mock.calls[0][0], 'http://localhost');
        expect(booking.searchParams.get('listing_version_id')).toBe('service-version-3');
        expect(booking.searchParams.get('deal_chain_combination_id')).toBeNull();
        fireEvent.click(within(main).getByRole('button', { name: /Repair and fitting/ }));
        fireEvent.click(within(main).getByRole('button', { name: /Book Service Now/i }));
        expect(visit).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /Stage Coordinated Plan/i })).toBeTruthy();
        expect(screen.queryByText('Unrelated Picks item')).toBeNull();
    });

    it('offers only seller-authored add-ons and includes their ids and prices in booking and Picks', () => {
        const listing: ListingRecord = {
            ...mockListing,
            listing_version_id: 'service-version-7',
            addons: [{
                id: 'addon-rush',
                code: 'rush_priority',
                title: 'Rush scheduling',
                description: 'Request a priority appointment.',
                price_amount_minor: 10000,
                currency: 'PHP',
                partner_role: 'technician',
                partner_fixture_keys: [],
                status: 'available',
                settlement_mode: 'independent_provider_agreement',
            }],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const main = container.querySelector('main') as HTMLElement;
        fireEvent.click(within(main).getByRole('checkbox', { name: /Rush scheduling/i }));
        fireEvent.click(within(main).getByRole('button', { name: /Book Service Now/i }));

        const booking = new URL(visit.mock.calls[0][0], 'http://localhost');
        expect(booking.searchParams.getAll('addon_ids[]')).toEqual(['addon-rush']);
        expect(booking.searchParams.get('listing_version_id')).toBe('service-version-7');

        fireEvent.click(within(main).getByRole('button', { name: /Add to Citizen Picks/i }));
        const saved = JSON.parse(window.localStorage.getItem('serbizyu.picks') ?? '[]');
        expect(saved[0]).toMatchObject({ addon_ids: ['addon-rush'], listing_version_id: 'service-version-7' });
    });
    it('keeps product variants, quantity, and direct seller extras intact through booking and Picks', () => {
        const listing: ListingRecord = {
            id: 'listing-product-1',
            title: 'Olive Oil',
            listing_type: 'product',
            listing_version_id: 'version-4',
            variants: [
                {
                    id: 'bottle-250',
                    name: '250 ml',
                    price_amount_minor: 12000,
                    is_default: true,
                    availability: { available: 4, availability_status: 'open' },
                },
                {
                    id: 'bottle-500',
                    name: '500 ml',
                    price_amount_minor: 22000,
                    is_default: false,
                    availability: { available: 0, availability_status: 'out_of_stock' },
                },
            ],
            addons: [{
                id: 'gift-wrap-addon',
                code: 'gift_wrap',
                title: 'Gift wrap',
                description: 'Seller-provided gift wrap.',
                price_amount_minor: 5000,
                currency: 'PHP',
                status: 'available',
            }, {
                id: 'independent-install',
                code: 'external_install',
                title: 'Independent installer',
                description: 'Separate provider agreement, not a seller extra.',
                price_amount_minor: 4500,
                currency: 'PHP',
                partner_role: 'technician',
                status: 'available',
                settlement_mode: 'independent_provider_agreement',
            }],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const main = container.querySelector('main') as HTMLElement;

        expect(within(main).getByRole('button', { name: /250 ml.*₱120\.00.*4 available/i })).toBeTruthy();
        expect((within(main).getByRole('button', { name: /500 ml.*₱220\.00.*0 available/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(within(main).queryByText(/1 Unit Standard|Choose Package Tier/)).toBeNull();
        expect(within(main).queryByRole('checkbox', { name: /Independent installer/i })).toBeNull();

        fireEvent.click(within(main).getByRole('checkbox', { name: /Gift wrap/i }));
        fireEvent.click(within(main).getByRole('button', { name: 'Increase quantity' }));
        fireEvent.click(within(main).getByRole('button', { name: /Buy Product Now/i }));
        expect(visit).toHaveBeenCalledTimes(1);
        const booking = new URL(visit.mock.calls[0][0], 'http://localhost');
        expect(booking.searchParams.get('variant_id')).toBe('bottle-250');
        expect(booking.searchParams.get('listing_version_id')).toBe('version-4');
        expect(booking.searchParams.get('quantity')).toBe('2');
        expect(booking.searchParams.getAll('addon_ids[]')).toEqual(['gift-wrap-addon']);

        fireEvent.click(within(main).getByRole('button', { name: /Add to Citizen Picks/i }));
        const saved = JSON.parse(window.localStorage.getItem('serbizyu.picks') ?? '[]');
        expect(saved[0]).toMatchObject({
            variant_id: 'bottle-250',
            listing_version_id: 'version-4',
            quantity: 2,
            addon_ids: ['gift-wrap-addon'],
        });
    });
    it('does not invent a product price when no authored variants exist', () => {
        const listing: ListingRecord = {
            ...mockListing,
            listing_type: 'product',
            listing_version_id: 'version-no-variants',
            price_amount_minor: undefined,
            variants: [],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const purchaseButtons = within(container).getAllByRole('button', { name: 'Unavailable' });

        expect(purchaseButtons).toHaveLength(2);
        purchaseButtons.forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));
        expect(container.textContent).not.toContain('₱0.00');
        expect(within(container).getAllByRole('button', { name: /Add to Citizen Picks/i })
            .every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
        expect(visit).not.toHaveBeenCalled();
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

    it('uses the current cart quantity after an earlier direct partnership review was cancelled', () => {
        const listing: ListingRecord = {
            ...mockListing, listing_version_id: 'version-1',
            deal_chain_combinations: [{
                id: 'with-follow-up', title: 'Service with follow-up', planVersion: 1,
                nodes: [
                    { id: 'host', type: 'labor', isPrimary: true, title: 'Main service' },
                    { id: 'follow-up', type: 'labor', isPrimary: false, title: 'Follow-up', listingId: 'partner-1' },
                ],
                dependencies: [],
            }],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const main = getDesktop(container);
        fireEvent.click(within(main).getByRole('button', { name: 'Service with follow-up' }));
        fireEvent.click(within(main).getByRole('button', { name: /Book Service Now/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        fireEvent.click(within(main).getByRole('button', { name: 'Increase quantity' }));
        fireEvent.click(within(main).getByRole('button', { name: /Add to Citizen Picks/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirm Booking|Review Coordinated Chain/i }));
        fireEvent.click(screen.getByRole('button', { name: /Stage Coordinated Plan/i }));

        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1].items[0].quantity).toBe(2);
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

    it('renders authored product variants and product Work Specification without generated fulfillment scopes', () => {
        const productListing: ListingRecord = {
            ...mockListing,
            id: 'product-1',
            title: 'Weekend bibingka tray',
            listing_type: 'product',
            listing_version_id: 'product-version-2',
            price_amount_minor: 18000,
            variants: [{
                id: 'tray-six',
                name: 'Six-piece tray',
                price_amount_minor: 18000,
                is_default: true,
                availability: { available: 5, availability_status: 'open' },
            }],
            work_specification: {
                nodes: [{
                    id: 'prepare',
                    ordinal: 1,
                    title: 'Prepare and pack',
                    target_duration_minutes: 25,
                    required_proofs: ['photo_proof'],
                    clearance_mode: 'physical_handoff',
                    approval_method: 'presence_otp',
                }],
            },
        };

        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={productListing} />);
        const main = container.querySelector('main') as HTMLElement;

        expect(within(main).getAllByText('Weekend bibingka tray').length).toBeGreaterThan(0);
        expect(within(main).getByRole('button', { name: /Six-piece tray.*₱180\.00.*5 available/i })).toBeTruthy();
        expect(within(main).getByText('Prepare and pack')).toBeTruthy();
        fireEvent.click(within(main).getByRole('button', { name: 'Details' }));
        expect(within(main).getByText(/Target duration: 25 min/)).toBeTruthy();
        expect(within(main).getByText(/Clearance: physical handoff/)).toBeTruthy();
        expect(within(main).queryByText(/Solo Snack Box|In-Store Pickup|Doorstep Delivery/)).toBeNull();
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
            work_specification: {
                nodes: [
                    {
                        id: 'measure',
                        ordinal: 1,
                        title: 'Material measurement & cutting',
                        description: 'Measure and cut material.',
                        duration_label: '45 minutes',
                        required_proofs: ['photo_proof'],
                        control_mode: 'provider_advance',
                        approval_method: 'none',
                    },
                    {
                        id: 'weld',
                        ordinal: 2,
                        title: 'TIG welding and structural test',
                        description: 'Check weld bead penetration.',
                        required_proofs: ['metric_reading'],
                        control_mode: 'customer_confirm',
                        approval_method: 'app_confirm',
                    },
                ],
            },
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

        expect(within(desktop).getByText('Material measurement & cutting')).toBeTruthy();

        const detailsBtn = within(desktop).getByRole('button', { name: /Details/i });
        fireEvent.click(detailsBtn);
        expect(within(desktop).getByText('Target duration: 45 minutes')).toBeTruthy();
        expect(within(desktop).getByText(/Required proof: photo proof/)).toBeTruthy();
        expect(within(desktop).getByText(/Clearance: provider advance/)).toBeTruthy();
        expect(within(desktop).getByText(/Approval: app confirm/)).toBeTruthy();
    });
    it('keeps a product listing unrated when review facts are absent', () => {
        const product: ListingRecord = {
            id: 'new-product',
            title: 'New product',
            listing_type: 'product',
            variants: [{ id: 'one', name: 'One', price_amount_minor: 500, availability: { available: 3 } }],
        };

        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={product} />);

        expect(container.textContent).toContain('New');
        expect(container.textContent).toContain('0 reviews');
        expect(container.textContent).toContain('No reviews yet');
        expect(screen.queryByText(/^(4\.9|5\.0)$/)).toBeNull();
        expect(container.textContent).not.toContain('Maria S.');
    });

    it('restores a saved product fulfillment to review and lets the buyer deliberately choose product only', () => {
        const product: ListingRecord = {
            id: 'product-with-fulfillment',
            title: 'Olive Oil',
            listing_type: 'product',
            listing_version_id: 'product-version-8',
            deal_chain_specification: { selected_combo_id: 'with-delivery' },
            variants: [{
                id: 'bottle',
                name: 'Bottle',
                price_amount_minor: 12000,
                availability: { available: 4, availability_status: 'open' },
            }],
            deal_chain_combinations: [{
                id: 'with-delivery',
                title: 'Product with delivery',
                planVersion: 1,
                dependencies: [],
                nodes: [{
                    id: 'product-node',
                    isPrimary: true,
                    role: 'product',
                    title: 'Olive Oil',
                    sub: 'Primary product',
                    type: 'store',
                }, {
                    id: 'delivery-node',
                    isPrimary: false,
                    role: 'delivery',
                    title: 'Local delivery',
                    sub: 'Rider listing',
                    type: 'delivery',
                    listingId: 'rider-7',
                }],
            }],
        };
        const { container, rerender } = render(<ListingDetail {...baseProps} activeListingDetail={product} />);
        const main = container.querySelector('main') as HTMLElement;

        expect(within(main).getByRole('button', { name: /^Product with delivery/ }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(within(main).getByRole('button', { name: /Buy Product Now/i }));
        expect(screen.getByRole('button', { name: /Stage Coordinated Plan/i })).toBeTruthy();
        expect(screen.getByRole('dialog').textContent).toContain('Local delivery');
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));

        fireEvent.click(within(main).getByRole('button', { name: 'Product only' }));
        rerender(<ListingDetail {...baseProps} activeListingDetail={{ ...product }} />);
        expect(within(main).getByRole('button', { name: 'Product only' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(within(main).getByRole('button', { name: /Buy Product Now/i }));
        expect(screen.queryByRole('button', { name: /Stage Coordinated Plan/i })).toBeNull();
        expect(visit).toHaveBeenCalledTimes(1);
        expect(new URL(visit.mock.calls[0][0], 'http://localhost').searchParams.get('variant_id')).toBe('bottle');
    });

    it('does not present audit or recycle partner fees as direct seller add-ons', () => {
        const listing: ListingRecord = {
            ...mockListing,
            addons: [
                { id: 'audit', code: 'audit_fee', title: 'Audit', description: 'Independent audit', price_amount_minor: 1000, currency: 'PHP', partner_role: 'audit', status: 'available' },
                { id: 'recycle', code: 'recycle_fee', title: 'Recycle', description: 'Independent recovery', price_amount_minor: 2000, currency: 'PHP', partner_role: 'recycle', status: 'available' },
                { id: 'legitimate', code: 'care_kit', title: 'Care kit', description: 'Seller extra', price_amount_minor: 3000, currency: 'PHP', status: 'available' },
            ],
        };
        const { container } = render(<ListingDetail {...baseProps} activeListingDetail={listing} />);
        const main = container.querySelector('main') as HTMLElement;

        expect(within(main).queryAllByRole('checkbox', { name: /Audit|Recycle/i })).toHaveLength(0);
        expect(within(main).getByRole('checkbox', { name: /Care kit/i })).toBeTruthy();
    });
});

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Browse from './Browse';
import type { HomeProps, ListingRecord } from '../types';

const mockVisit = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: (...args: unknown[]) => mockVisit(...args),
    },
}));

describe('Browse Page', () => {
    afterEach(() => {
        cleanup();
        mockVisit.mockClear();
    });

    function getDesktop(container: HTMLElement): HTMLElement {
        const el = container.querySelector('.hidden.lg\\:block');
        if (!el) throw new Error('Desktop container not found');
        return el as HTMLElement;
    }

    function getAside(container: HTMLElement): HTMLElement {
        const el = container.querySelector('aside');
        if (!el) throw new Error('Aside element not found');
        return el as HTMLElement;
    }

    const mockListings: ListingRecord[] = [
        {
            id: 'listing-1',
            title: 'Inverter Split AC Deep Clean',
            description: 'Complete indoor and outdoor AC chemical clean.',
            category_code: 'repairs',
            listing_type: 'service',
            price_amount_minor: 45000,
            owner_name: 'Kuya Ben',
            area: 'Tagudin Centro',
            status: 'active',
        },
        {
            id: 'listing-2',
            title: 'Weekend bibingka tray',
            description: 'Fresh warm bibingka cakes in banana leaf wrapping.',
            category_code: 'local-food',
            listing_type: 'product',
            price_amount_minor: 18000,
            owner_name: 'Auntie Tess',
            area: 'Tagudin Market',
            status: 'active',
        },
        {
            id: 'listing-3',
            title: 'Document scan soft-copy',
            description: 'High-resolution document scanning and PDF prep.',
            category_code: 'print-assist',
            listing_type: 'service',
            price_amount_minor: 8000,
            owner_name: 'Print Hub',
            area: 'Centro',
            status: 'active',
        },
    ];

    const baseProps: HomeProps = {
        publicListings: mockListings,
        session: {
            authenticated: true,
            userId: 'usr_1',
            displayName: 'Juan dela Cruz',
        },
    };

    it('renders desktop layout with verified offerings and inline filters', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Header check
        expect(within(desktop).getAllByText('SERBIZYU').length).toBeGreaterThan(0);
        expect(within(desktop).getByText('Verified Services & Local Products')).toBeTruthy();
        expect(within(desktop).getByText('Showing 3 active public offerings in Tagudin')).toBeTruthy();

        // Cards check
        expect(within(desktop).getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(within(desktop).getByText('Weekend bibingka tray')).toBeTruthy();
        expect(within(desktop).getByText('Document scan soft-copy')).toBeTruthy();

        // Check prices
        expect(within(desktop).getByText('₱450.00')).toBeTruthy();
        expect(within(desktop).getByText('₱180.00')).toBeTruthy();
        expect(within(desktop).getByText('₱80.00')).toBeTruthy();
    });

    it('filters listings by search query in real time', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        const desktopSearch = within(desktop).getByPlaceholderText(/Search services/i);
        fireEvent.change(desktopSearch, { target: { value: 'bibingka' } });

        // Result count updates
        expect(within(desktop).getByText('Showing 1 active public offerings in Tagudin')).toBeTruthy();
        expect(within(desktop).getByText('Weekend bibingka tray')).toBeTruthy();
        expect(within(desktop).queryByText('Inverter Split AC Deep Clean')).toBeNull();

        // Active filter badge displayed
        expect(within(desktop).getByText('"bibingka"')).toBeTruthy();
    });

    it('filters listings by category selection', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);
        const aside = getAside(container as HTMLElement);
        const repairsBtn = within(aside).getByRole('button', { name: /Repairs & AC/i });
        fireEvent.click(repairsBtn);

        expect(within(desktop).getByText('Showing 1 active public offerings in Tagudin')).toBeTruthy();
        expect(within(desktop).getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(within(desktop).queryByText('Weekend bibingka tray')).toBeNull();
    });

    it('filters listings by listing type (service vs product)', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        const productBtn = within(desktop).getByRole('button', { name: /^product$/i });
        fireEvent.click(productBtn);

        expect(within(desktop).getByText('Showing 1 active public offerings in Tagudin')).toBeTruthy();
        expect(within(desktop).getByText('Weekend bibingka tray')).toBeTruthy();
        expect(within(desktop).queryByText('Inverter Split AC Deep Clean')).toBeNull();
    });

    it('filters listings by price range radio presets', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        const under150Radio = within(desktop).getByRole('radio', { name: /Under ₱150/i });
        fireEvent.click(under150Radio);

        // Document scan is 80 (<= 150)
        expect(within(desktop).getByText('Showing 1 active public offerings in Tagudin')).toBeTruthy();
        expect(within(desktop).getByText('Document scan soft-copy')).toBeTruthy();
        expect(within(desktop).queryByText('Inverter Split AC Deep Clean')).toBeNull();
        expect(within(desktop).queryByText('Weekend bibingka tray')).toBeNull();
    });

    it('resets all active filters when Reset button is clicked', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        const desktopSearch = within(desktop).getByPlaceholderText(/Search services/i);
        fireEvent.change(desktopSearch, { target: { value: 'bibingka' } });

        expect(within(desktop).getByText('Showing 1 active public offerings in Tagudin')).toBeTruthy();

        const resetBtn = within(desktop).getByRole('button', { name: /Reset/i });
        fireEvent.click(resetBtn);

        expect(within(desktop).getByText('Showing 3 active public offerings in Tagudin')).toBeTruthy();
        expect(within(desktop).getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(within(desktop).getByText('Weekend bibingka tray')).toBeTruthy();
        expect(within(desktop).getByText('Document scan soft-copy')).toBeTruthy();
    });

    it('adds an item to Picks, increments navbar counter, and opens PicksDrawer', () => {
        const { container } = render(<Browse {...baseProps} />);
        const desktop = getDesktop(container as HTMLElement);

        // Counter initially 0
        const picksBtn = within(desktop).getByRole('button', { name: 'View citizen picks' });
        expect(picksBtn).toBeTruthy();

        // Click "+ Book Now" on the AC cleaning card
        const bookButtons = within(desktop).getAllByRole('button', { name: /Book Now/i });
        fireEvent.click(bookButtons[0]);

        // Counter now shows 1
        expect(within(picksBtn).getByText('1')).toBeTruthy();

        // Click the Picks button to open the drawer
        fireEvent.click(picksBtn);

        // Picks drawer is displayed
        expect(screen.getByText('Citizen Picks')).toBeTruthy();
        expect(screen.getByText('1 item ready for escrow')).toBeTruthy();
        expect(screen.getAllByText('Inverter Split AC Deep Clean').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Total Escrow Authorization/i)).toBeTruthy();
    });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Picks from './Picks';
import type { HomeProps } from '../types';

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

describe('Picks Page', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    const baseProps: HomeProps = {
        session: {
            authenticated: true,
            userId: 'usr_buyer',
            displayName: 'Maria Santos',
        },
    };

    it('renders empty tray state when no items are staged', () => {
        render(<Picks {...baseProps} />);

        expect(screen.getByText('Your Picks Tray is Empty')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Explore Marketplace' })).toBeTruthy();
    });

    it('renders staged items, child orders breakdown, and payment selection', () => {
        const mockPicks = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean (1 Unit Standard)',
                price: 450,
                quantity: 1,
            },
            {
                id: 'listing-2',
                title: 'Weekend bibingka tray (Family Fiesta)',
                price: 180,
                quantity: 2,
            },
        ];
        window.localStorage.setItem('serbizyu.picks', JSON.stringify(mockPicks));

        render(<Picks {...baseProps} />);

        // Header and count: 1 + 2 = 3 items
        expect(screen.getByText(/Staged Offerings \(3\)/i)).toBeTruthy();
        expect(screen.getByText('Inverter Split AC Deep Clean (1 Unit Standard)')).toBeTruthy();
        expect(screen.getByText('Weekend bibingka tray (Family Fiesta)')).toBeTruthy();

        // Subtotal: 450 + 360 = 810
        expect(screen.getAllByText('₱810.00').length).toBeGreaterThanOrEqual(1);

        // Child orders breakdown
        expect(screen.getByText('Itemized Deal Chain Child Orders')).toBeTruthy();
        expect(screen.getByText('Order #ORD-101')).toBeTruthy();
        expect(screen.getByText('Tagudin Hardware Parts Depot')).toBeTruthy();
        expect(screen.getByText('Order #ORD-102')).toBeTruthy();
        expect(screen.getByText('Danny Express Motorcycle Pool')).toBeTruthy();

        // Non-cascading settlement banner
        expect(screen.getByText(/Non-Cascading Settlement Protection/i)).toBeTruthy();

        // Click Proceed to Escrow Checkout
        const checkoutBtn = screen.getByRole('button', { name: /Proceed to Escrow Checkout/i });
        fireEvent.click(checkoutBtn);

        // Checkout Modal opens with payment selection
        expect(screen.getByText('Authorize Deal Chain')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Cash on Delivery/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /GCash QR/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Tiwala Escrow/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Authorize Deal Chain & Escrow/i })).toBeTruthy();
    });
    it('updates quantity and recalculates escrow total', () => {
        const mockPicks = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean',
                price: 450,
                quantity: 1,
            },
        ];
        window.localStorage.setItem('serbizyu.picks', JSON.stringify(mockPicks));

        render(<Picks {...baseProps} />);

        // Initially ₱450.00
        expect(screen.getAllByText('₱450.00').length).toBeGreaterThanOrEqual(1);

        // Click increase quantity
        const incBtn = screen.getByRole('button', { name: 'Increase quantity' });
        fireEvent.click(incBtn);

        // Quantity 2 * 450 = 900
        expect(screen.getAllByText('₱900.00').length).toBeGreaterThanOrEqual(1);
    });

    it('removes item from tray and updates empty state', () => {
        const mockPicks = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean',
                price: 450,
                quantity: 1,
            },
        ];
        window.localStorage.setItem('serbizyu.picks', JSON.stringify(mockPicks));

        render(<Picks {...baseProps} />);

        const removeBtn = screen.getByRole('button', { name: 'Remove item' });
        fireEvent.click(removeBtn);

        // Now empty
        expect(screen.getByText('Your Picks Tray is Empty')).toBeTruthy();
    });
    it('attaches Deal Chain recipe to staged item and displays connected pipeline', () => {
        const mockPicks = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean',
                price: 450,
                quantity: 1,
            },
        ];
        window.localStorage.setItem('serbizyu.picks', JSON.stringify(mockPicks));

        render(<Picks {...baseProps} />);

        // Click attach deal chain button
        const attachBtn = screen.getByRole('button', { name: /\+ Attach Deal Chain/i });
        fireEvent.click(attachBtn);

        // Deal chain attached: title and connected nodes displayed
        expect(screen.getByText(/Turnkey Sourced Parts/i)).toBeTruthy();
        expect(screen.getByText(/STORE: Tagudin HW/i)).toBeTruthy();
        expect(screen.getByText(/COURIER: Danny Exp/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Detach' })).toBeTruthy();
    });
});

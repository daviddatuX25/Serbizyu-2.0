import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Picks from './Picks';
import type { HomeProps } from '../types';

const baseProps: HomeProps = {
    auth: {
        user: {
            id: 'user-1',
            phone: '09171234567',
            name: 'Test Citizen',
            roles: ['buyer'],
        },
    },
    slice: {
        session: null,
        activeListing: null,
    },
};

describe('Picks Page', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    it('renders empty state when no items staged in localStorage', () => {
        render(<Picks {...baseProps} />);

        expect(screen.getByText('Your Picks Tray is Empty')).toBeTruthy();
        expect(screen.getByText(/Explore verified Tagudin marketplace listings/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Explore Marketplace' })).toBeTruthy();
    });

    it('renders staged items and opens checkout modal without fake static orders', () => {
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

        // No fake child orders when items have no deal chain attached
        expect(screen.queryByText('Attached Deal Chain Child Orders')).toBeNull();
        expect(screen.queryByText(/Non-Cascading Settlement Protection/i)).toBeNull();

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

    it('opens recipe selector, attaches Deal Chain recipe, and displays connected pipeline', () => {
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

        // Click attach deal chain button to open recipe selector
        const attachBtn = screen.getByRole('button', { name: /\+ Attach Deal Chain/i });
        fireEvent.click(attachBtn);
        expect(screen.getByText('Bundle & Chain Services')).toBeTruthy();
        const turnkeyOption = screen.getByText(/All-In Parts/i);
        expect(turnkeyOption).toBeTruthy();

        // Select Turnkey Sourced Parts
        fireEvent.click(turnkeyOption);

        // Deal chain attached: title, connected nodes, and Unlink displayed
        expect(screen.getAllByText(/Turnkey Sourced Parts/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Tagudin HW/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Danny Exp/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: 'Unlink' })).toBeTruthy();
        // Child orders breakdown and settlement banner now appear dynamically
        expect(screen.getByText('Attached Deal Chain Child Orders')).toBeTruthy();
        expect(screen.getByText(/Non-Cascading Settlement Protection/i)).toBeTruthy();
    });
});

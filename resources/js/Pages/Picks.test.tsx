import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';
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
    beforeEach(() => {
        vi.spyOn(router, 'visit').mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        window.localStorage.clear();
    });

    it('renders empty state when no items staged in localStorage', () => {
        render(<Picks {...baseProps} />);

        expect(screen.getByText('Your Picks Tray is Empty')).toBeTruthy();
        expect(screen.getByText(/Explore verified Tagudin marketplace listings/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Explore Marketplace' })).toBeTruthy();
    });

    it('renders staged items and opens the planning modal without fake orders', () => {
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

        expect(screen.getByText(/Staged Offerings \(3\)/i)).toBeTruthy();
        expect(screen.getByText('Inverter Split AC Deep Clean (1 Unit Standard)')).toBeTruthy();
        expect(screen.getByText('Weekend bibingka tray (Family Fiesta)')).toBeTruthy();
        expect(screen.getAllByText('₱810.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText('Planned Deal Chain Nodes')).toBeNull();
        expect(screen.queryByText(/Planning boundary/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Confirm Order & Bookings/i }));
        expect(router.visit).toHaveBeenCalledWith('/listings/listing-1/book');
    });

    it('opens the coordinated chain modal when items have a deal chain attached', () => {
        const mockPicksWithChain = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean (1 Unit Standard)',
                price: 450,
                quantity: 1,
                dealChain: {
                    recipeId: 'turnkey_parts',
                    title: 'Turnkey Sourced Parts',
                    extraFee: 215,
                    nodes: [
                        {
                            role: 'STORE',
                            title: 'Tagudin HW',
                            sub: 'Partner quote required',
                            type: 'store',
                        },
                        {
                            role: 'LABOR',
                            title: 'Kuya Ben AC',
                            sub: 'Provider agreement required',
                            type: 'labor',
                        },
                    ],
                },
            },
        ];
        window.localStorage.setItem('serbizyu.picks', JSON.stringify(mockPicksWithChain));
        render(<Picks {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Review.*Chain/i }));
        expect(screen.getByRole('heading', { name: /Review.*Chain/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Stage.*Plan/i })).toBeTruthy();
    });

    it('updates quantity and recalculates planning estimate', () => {
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

    it('opens recipe selector, attaches a Deal Chain recipe, and displays the connected pipeline', () => {
        const mockPicks = [
            {
                id: 'listing-1',
                title: 'Inverter Split AC Deep Clean',
                price: 450,
                quantity: 1,
                category_code: 'repairs',
                listing_type: 'service',
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

        expect(screen.getAllByText(/All-In Parts/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/35uF AC Run Cap/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Danny Express/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: 'Unlink' })).toBeTruthy();
        expect(screen.queryByText('Planned Deal Chain Nodes')).toBeNull();
        expect(screen.queryByText(/Planning boundary/i)).toBeNull();
    });
});

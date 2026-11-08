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
                id: 'listing-1:base:',
                listing_id: 'listing-1',
                title: 'Inverter Split AC Deep Clean (1 Unit Standard)',
                price: 450,
                quantity: 1,
            },
            {
                id: 'listing-2:variant-green:',
                listing_id: 'listing-2',
                variant_id: 'variant-green',
                listing_version_id: 'version-3',
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
        expect(router.visit).toHaveBeenCalledWith('/listings/listing-1/book?quantity=1');
    });

    it('forwards the selected variant, listing version, and quantity from shared Picks', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'listing-variant:variant-blue:',
            listing_id: 'listing-variant',
            listing_type: 'product',
            variant_id: 'variant-blue',
            package_id: null,
            listing_version_id: 'version-9',
            title: 'Capacitor · Blue',
            price: 184,
            quantity: 2,
        }]));

        render(<Picks {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Confirm Order/i }));

        const url = new URL(vi.mocked(router.visit).mock.calls[0][0] as string, 'http://localhost');
        expect(url.pathname).toBe('/listings/listing-variant/book');
        expect(url.searchParams.get('variant_id')).toBe('variant-blue');
        expect(url.searchParams.get('listing_version_id')).toBe('version-9');
        expect(url.searchParams.get('quantity')).toBe('2');
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
                            key: 'part',
                            role: 'STORE',
                            title: 'Tagudin HW',
                            sub: 'Partner quote required',
                            type: 'store',
                        },
                        {
                            key: 'labor',
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
    it('reviews the exact saved graph from Picks instead of ordinary-booking its primary listing', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'primary:combo-1',
            listing_id: 'primary-1',
            listing_version_id: 'version-1',
            deal_chain_combination_id: 'combo-1',
            title: 'Primary service',
            price: 300,
            quantity: 2,
            savedDealChain: {
                combinationId: 'combo-1',
                listingVersionId: 'version-1',
                title: 'Parts then repair',
                nodes: [
                    { id: 'node-primary', key: 'node-primary', isPrimary: true, role: 'Service', title: 'Repair', sub: 'Primary', type: 'labor' },
                    { id: 'node-parts', key: 'node-parts', isPrimary: false, role: 'Store', title: 'Parts', sub: 'Provider selected', type: 'store', listingId: 'store-1' },
                ],
                dependencies: [{
                    predecessorId: 'node-parts', successorId: 'node-primary',
                    conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active',
                }],
            },
        }]));

        render(<Picks {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Review Coordinated Chain/i }));
        expect(screen.getByText('Parts then repair')).toBeTruthy();
        expect(screen.getByText('Parts')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Stage Coordinated Plan/i })).toBeTruthy();
        expect(router.visit).not.toHaveBeenCalled();
    });

    it('routes an old saved pick without its pinned display graph back to its source listing', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'legacy',
            listing_id: 'primary-1',
            listing_version_id: 'version-1',
            deal_chain_combination_id: 'combo-1',
            title: 'Primary service',
            price: 300,
            quantity: 1,
        }]));

        render(<Picks {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Review Coordinated Chain/i }));
        expect(router.visit).toHaveBeenCalledWith('/listings/primary-1');
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

        render(<Picks {...baseProps} dealChainCatalog={[{
            recipeId: 'turnkey_parts', title: 'Service with supplied parts', pattern: 'repair',
            patternCapsule: ['STORE', 'LABOR'], extraFee: 100, rating: '', bookedCount: '', desc: 'Parts supplied by a separate provider.',
            applicableCategories: ['repairs'], applicableListingTypes: ['service'],
            nodes: [
                { key: 'part', isPrimary: false, role: 'Parts', title: 'Chosen parts supplier', sub: 'Parts', type: 'store' },
                { key: 'labor', isPrimary: true, role: 'Service', title: 'Repair work', sub: 'Primary', type: 'labor' },
            ],
            dependencies: [{ predecessorId: 'part', successorId: 'labor', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' }],
        }]} />);

        // Click attach deal chain button to open recipe selector
        const attachBtn = screen.getByRole('button', { name: /\+ Attach Deal Chain/i });
        fireEvent.click(attachBtn);
        expect(screen.getByText('Bundle & Chain Services')).toBeTruthy();
        const turnkeyOption = screen.getByText('Service with supplied parts');

        // Select Turnkey Sourced Parts
        fireEvent.click(turnkeyOption);

        const persisted = JSON.parse(window.localStorage.getItem('serbizyu.picks') || '[]');
        expect(persisted[0].dealChain.recipeId).toBe('turnkey_parts');
        expect(persisted[0].dealChain.nodes.map((node: { key: string }) => node.key)).toEqual(['part', 'labor']);
        expect(screen.getByRole('button', { name: 'Unlink' })).toBeTruthy();
        expect(screen.queryByText('Planned Deal Chain Nodes')).toBeNull();
        expect(screen.queryByText(/Planning boundary/i)).toBeNull();
    });
});

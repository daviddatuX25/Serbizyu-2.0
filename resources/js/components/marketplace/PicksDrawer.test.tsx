import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PicksDrawer } from './PicksDrawer';
import type { BasketItem } from '@/marketplace/types';

describe('PicksDrawer', () => {
    const mockItems: BasketItem[] = [
        {
            id: 'item-1',
            title: 'Inverter Split AC Deep Clean',
            price: 450,
            quantity: 1,
            category_code: 'repairs',
            listing_type: 'service',
        },
        {
            id: 'item-2',
            title: 'Weekend bibingka tray',
            price: 180,
            quantity: 2,
            category_code: 'local-food',
            listing_type: 'product',
        },
    ];

    const mockItemsWithChain: BasketItem[] = [
        {
            id: 'item-1',
            title: 'Inverter Split AC Deep Clean',
            price: 665,
            quantity: 1,
            category_code: 'repairs',
            listing_type: 'service',
            dealChain: {
                recipeId: 'turnkey_parts',
                title: 'Turnkey Sourced Parts',
                extraFee: 215,
                nodes: [
                    {
                        role: 'STORE',
                        title: 'Tagudin Hardware & Supply Depot',
                        sub: 'Partner quote required',
                        type: 'store',
                    },
                    {
                        role: 'COURIER',
                        title: 'Danny Express Motorcycle Pool',
                        sub: 'Partner quote required',
                        type: 'delivery',
                    },
                    {
                        role: 'LABOR',
                        title: 'Kuya Ben Aircon Services',
                        sub: 'Provider agreement required',
                        type: 'labor',
                    },
                ],
            },
        },
    ];

    afterEach(() => {
        cleanup();
    });

    it('does not render when open is false', () => {
        const { container } = render(
            <PicksDrawer
                open={false}
                onClose={vi.fn()}
                items={mockItems}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={vi.fn()}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders empty state when items array is empty', () => {
        render(
            <PicksDrawer
                open={true}
                onClose={vi.fn()}
                items={[]}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={vi.fn()}
            />,
        );

        expect(screen.getByText('Citizen Picks')).toBeTruthy();
        expect(screen.getByText('Your Picks tray is empty')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Explore Marketplace' })).toBeTruthy();
    });

    it('renders standalone items without a planned chain section', () => {
        render(
            <PicksDrawer
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={vi.fn()}
            />,
        );

        expect(screen.getByText(/3 items staged for review/i)).toBeTruthy();
        expect(screen.getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(screen.getByText('Weekend bibingka tray')).toBeTruthy();
        expect(screen.getAllByText('₱450.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('₱180.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('₱810.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/Planned Deal Chain Nodes/i)).toBeNull();
    });

    it('renders attached deal chain pipeline on item card and omits redundant planned nodes section', () => {
        render(
            <PicksDrawer
                open={true}
                onClose={vi.fn()}
                items={mockItemsWithChain}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={vi.fn()}
            />,
        );

        expect(screen.queryByText(/Planned Deal Chain Nodes/i)).toBeNull();
        expect(screen.queryByText(/Planning projection only/i)).toBeNull();
        expect(screen.getByText('Turnkey Sourced Parts')).toBeTruthy();
        expect(screen.getByText('3 Planned')).toBeTruthy();
        expect(
            screen.getAllByText('Tagudin Hardware & Supply Depot').length,
        ).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Danny Express Motorcycle Pool').length).toBeGreaterThanOrEqual(
            1,
        );
        expect(screen.getAllByText('Kuya Ben Aircon Services').length).toBeGreaterThanOrEqual(1);
    });

    it('opens interactive recipe selector and calls onAttachDealChain on selection', () => {
        const onAttachDealChain = vi.fn();

        render(
            <PicksDrawer
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={vi.fn()}
                onAttachDealChain={onAttachDealChain}
            />,
        );

        fireEvent.click(screen.getAllByText(/\+ Attach Deal Chain/i)[0]);

        expect(screen.getByText('Bundle & Chain Services')).toBeTruthy();
        fireEvent.click(screen.getByText(/All-In Parts/i));
        expect(onAttachDealChain).toHaveBeenCalledWith('item-1', 'turnkey_parts');
    });

    it('handles quantity increment, decrement, and removal triggers', () => {
        const onUpdateQuantity = vi.fn();
        const onRemoveItem = vi.fn();

        render(
            <PicksDrawer
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
                onCheckout={vi.fn()}
            />,
        );

        fireEvent.click(screen.getAllByRole('button', { name: 'Increase quantity' })[0]);
        expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', 1);

        fireEvent.click(screen.getAllByRole('button', { name: 'Decrease quantity' })[0]);
        expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', -1);

        fireEvent.click(screen.getAllByRole('button', { name: 'Remove item' })[1]);
        expect(onRemoveItem).toHaveBeenCalledWith('item-2');
    });

    it('handles close and plan review actions', () => {
        const onClose = vi.fn();
        const onCheckout = vi.fn();

        render(
            <PicksDrawer
                open={true}
                onClose={onClose}
                items={mockItems}
                onUpdateQuantity={vi.fn()}
                onRemoveItem={vi.fn()}
                onCheckout={onCheckout}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
        expect(onClose).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Confirm|Review/i }));
        expect(onCheckout).toHaveBeenCalled();
    });
});

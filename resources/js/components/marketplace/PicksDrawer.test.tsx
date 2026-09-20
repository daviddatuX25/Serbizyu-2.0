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
        },
        {
            id: 'item-2',
            title: 'Weekend bibingka tray',
            price: 180,
            quantity: 2,
        },
    ];

    const mockItemsWithChain: BasketItem[] = [
        {
            id: 'item-1',
            title: 'Inverter Split AC Deep Clean',
            price: 665,
            quantity: 1,
            dealChain: {
                recipeId: 'turnkey_parts',
                title: 'Turnkey Sourced Parts',
                extraFee: 215,
                nodes: [
                    { role: 'STORE', title: 'Tagudin Hardware & Supply Depot', sub: 'Part inventory', type: 'store' },
                    { role: 'COURIER', title: 'Danny Express Motorcycle Pool', sub: 'Transit', type: 'delivery' },
                    { role: 'LABOR', title: 'Kuya Ben Aircon Services', sub: 'Execution', type: 'labor' },
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

    it('renders standalone items without fake deal chain section', () => {
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

        // Check header count: 1 + 2 = 3 items
        expect(screen.getByText(/3 items staged for escrow/i)).toBeTruthy();

        // Check item titles
        expect(screen.getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(screen.getByText('Weekend bibingka tray')).toBeTruthy();

        // Check prices: 450 + (180 * 2) = 450 + 360 = 810
        expect(screen.getAllByText('₱450.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('₱180.00').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('₱810.00').length).toBeGreaterThanOrEqual(1);

        // Protection banner should NOT be present when no deal chains are attached
        expect(screen.queryByText(/Attached Deal Chain Child Orders/i)).toBeNull();
        expect(screen.queryByText(/Non-Cascading Settlement Protection/i)).toBeNull();
    });

    it('renders child orders and settlement protection when deal chain is attached', () => {
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

        expect(screen.getByText(/Attached Deal Chain Child Orders/i)).toBeTruthy();
        expect(screen.getByText(/Non-Cascading Settlement Protection/i)).toBeTruthy();
        expect(screen.getByText('Tagudin Hardware & Supply Depot')).toBeTruthy();
        expect(screen.getByText('Danny Express Motorcycle Pool')).toBeTruthy();
        expect(screen.getByText('Kuya Ben Aircon Services')).toBeTruthy();
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

        // Click "+ Attach Deal Chain" on item 1
        const attachButtons = screen.getAllByText(/\+ Attach Deal Chain/i);
        fireEvent.click(attachButtons[0]);

        // Recipe selection options appear
        expect(screen.getByText('Select Deal Chain Partner')).toBeTruthy();
        const turnkeyOption = screen.getByText(/Turnkey Sourced Parts/i);
        expect(turnkeyOption).toBeTruthy();

        // Click Turnkey recipe
        fireEvent.click(turnkeyOption);
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

        const incButtons = screen.getAllByRole('button', { name: 'Increase quantity' });
        fireEvent.click(incButtons[0]);
        expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', 1);

        const decButtons = screen.getAllByRole('button', { name: 'Decrease quantity' });
        fireEvent.click(decButtons[0]);
        expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', -1);

        const removeButtons = screen.getAllByRole('button', { name: 'Remove item' });
        fireEvent.click(removeButtons[1]);
        expect(onRemoveItem).toHaveBeenCalledWith('item-2');
    });

    it('handles close and checkout actions', () => {
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

        const closeBtn = screen.getByRole('button', { name: 'Close drawer' });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();

        const checkoutBtn = screen.getByRole('button', { name: /Proceed to Escrow Checkout/i });
        fireEvent.click(checkoutBtn);
        expect(onCheckout).toHaveBeenCalled();
    });
});

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

    it('renders items with correct subtotal and escrow calculations', () => {
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
        expect(screen.getByText('3 items ready for escrow')).toBeTruthy();

        // Check item titles
        expect(screen.getByText('Inverter Split AC Deep Clean')).toBeTruthy();
        expect(screen.getByText('Weekend bibingka tray')).toBeTruthy();

        // Check prices: 450 + (180 * 2) = 450 + 360 = 810
        expect(screen.getByText('₱450.00')).toBeTruthy();
        expect(screen.getByText('₱180.00')).toBeTruthy();
        expect(screen.getAllByText('₱810.00').length).toBeGreaterThanOrEqual(1);

        // Check escrow badge
        expect(screen.getByText(/Tiwala Escrow Protection/i)).toBeTruthy();
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

        const checkoutBtn = screen.getByRole('button', { name: /Proceed to Escrow Booking/i });
        fireEvent.click(checkoutBtn);
        expect(onCheckout).toHaveBeenCalled();
    });
});

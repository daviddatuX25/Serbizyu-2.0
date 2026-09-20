import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleChainModal } from './BundleChainModal';
import type { BasketItem } from '@/marketplace/types';

const mockItem: BasketItem = {
    id: 'listing-1',
    title: 'Inverter Split AC Deep Clean',
    price: 450,
    quantity: 1,
};

describe('BundleChainModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('does not render when open is false or item is null', () => {
        const { container } = render(
            <BundleChainModal
                open={false}
                onClose={vi.fn()}
                item={mockItem}
                onSelectRecipe={vi.fn()}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders combinations with visual nodes and community ratings', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={mockItem}
                onSelectRecipe={vi.fn()}
            />,
        );

        expect(screen.getByText('Bundle & Chain Services')).toBeTruthy();
        expect(screen.getByText(/All-In Parts/i)).toBeTruthy();
        expect(screen.getByText(/Homeowner Parts/i)).toBeTruthy();
        expect(screen.getByText(/84 booked in Tagudin/i)).toBeTruthy();
        expect(screen.getByText('35uF Cap.')).toBeTruthy();
    });

    it('calls onSelectRecipe and onClose when a combination card is clicked', () => {
        const onSelectRecipe = vi.fn();
        const onClose = vi.fn();

        render(
            <BundleChainModal
                open={true}
                onClose={onClose}
                item={mockItem}
                onSelectRecipe={onSelectRecipe}
            />,
        );

        const turnkeyCard = screen.getByText(/All-In Parts/i);
        fireEvent.click(turnkeyCard);

        expect(onSelectRecipe).toHaveBeenCalledWith('listing-1', 'turnkey_parts');
        expect(onClose).toHaveBeenCalled();
    });

    it('filters combinations by pattern chip', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={mockItem}
                onSelectRecipe={vi.fn()}
            />,
        );

        const deliveryChip = screen.getByRole('button', { name: 'Buy → Deliver' });
        fireEvent.click(deliveryChip);

        expect(screen.queryByText(/All-In Parts/i)).toBeNull();
        expect(screen.getByText(/Homeowner Parts/i)).toBeTruthy();
    });
});

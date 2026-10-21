import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleChainModal } from './BundleChainModal';
import type { BasketItem } from '@/marketplace/types';

const mockItem: BasketItem = {
    id: 'listing-1',
    title: 'Inverter Split AC Deep Clean',
    price: 450,
    quantity: 1,
    category_code: 'repairs',
    listing_type: 'service',
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
        expect(screen.getByText(/Doorstep Courier Transit/i)).toBeTruthy();
        expect(screen.getByText(/84 booked in Tagudin/i)).toBeTruthy();
        expect(screen.getByText('35uF AC Run Cap.')).toBeTruthy();
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

    it('filters combinations by compact node-wire pattern capsule', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={mockItem}
                onSelectRecipe={vi.fn()}
            />,
        );

        // Find the compact pattern selector button for STORE -> COURIER
        const storeCourierBtn = screen.getByRole('button', {
            name: /^Filter by pipeline STORE → COURIER$/i,
        });
        fireEvent.click(storeCourierBtn);
        expect(screen.queryByText(/All-In Parts, Courier & Labor/i)).toBeNull();
        expect(screen.getByText(/Doorstep Courier Transit/i)).toBeTruthy();
    });

    it('scopes pipelines to the listing category', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={{ ...mockItem, category_code: 'local-food' }}
                onSelectRecipe={vi.fn()}
            />,
        );

        expect(screen.getByText(/Doorstep Courier Transit/i)).toBeTruthy();
        expect(screen.queryByText(/All-In Parts/i)).toBeNull();
        expect(screen.queryByText(/Safety Audit/i)).toBeNull();
    });
    it('accepts server catalog work-shape casing', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={{ ...mockItem, work_shape: 'A3' }}
                recipes={[
                    {
                        recipeId: 'turnkey_parts',
                        pattern: 'repair',
                        patternCapsule: ['STORE', 'COURIER', 'LABOR'],
                        title: 'Seeded Parts Relay',
                        extraFee: 215,
                        rating: '4.9',
                        bookedCount: '84 booked in Tagudin',
                        desc: 'Seeded server recipe',
                        applicableCategories: ['repairs'],
                        applicableListingTypes: ['service'],
                        applicableWorkShapes: ['A3'],
                        nodes: [],
                    },
                ]}
                onSelectRecipe={vi.fn()}
            />,
        );

        expect(screen.getByText('Seeded Parts Relay')).toBeTruthy();
    });
});

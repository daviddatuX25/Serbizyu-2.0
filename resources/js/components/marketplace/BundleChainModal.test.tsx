import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleChainModal } from './BundleChainModal';
import type { BasketItem } from '@/marketplace/types';
import type { DealChainRecipeDefinition } from '@/marketplace/dealChainRecipes';

const publishedRecipes: DealChainRecipeDefinition[] = [
    {
        recipeId: 'turnkey_parts', title: 'All-In Parts, Courier & Labor', pattern: 'repair',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'], extraFee: 215, rating: '4.9',
        bookedCount: '84 booked in Tagudin', desc: 'Separate parts, delivery and service providers.',
        applicableCategories: ['repairs'], applicableListingTypes: ['service'],
        nodes: [
            { key: 'part', role: 'Store', title: '35uF AC Run Cap.', sub: 'Parts', type: 'store', isPrimary: false },
            { key: 'courier', role: 'Courier', title: 'Parts transit', sub: 'Delivery', type: 'delivery', isPrimary: false },
            { key: 'labor', role: 'Service', title: 'Repair work', sub: 'Main service', type: 'labor', isPrimary: true },
        ],
    },
    {
        recipeId: 'courier_delivery', title: 'Doorstep Courier Transit', pattern: 'delivery',
        patternCapsule: ['STORE', 'COURIER'], extraFee: 35, rating: '', bookedCount: '', desc: 'Product delivery.',
        applicableCategories: ['repairs', 'local-food'], applicableListingTypes: ['product'], applicableWorkShapes: ['A4'],
        nodes: [
            { key: 'product', role: 'Product', title: 'Selected product', sub: 'Main item', type: 'store', isPrimary: true },
            { key: 'courier', role: 'Courier', title: 'Delivery', sub: 'Courier', type: 'delivery', isPrimary: false },
        ],
    },
    {
        recipeId: 'product_install', title: 'Product with delivery and installation', pattern: 'multi',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'], extraFee: 100, rating: '', bookedCount: '', desc: 'Delivered and installed product.',
        applicableCategories: ['repairs'], applicableListingTypes: ['product'], applicableWorkShapes: ['A4'],
        nodes: [
            { key: 'product', role: 'Product', title: 'Selected product', sub: 'Main item', type: 'store', isPrimary: true },
            { key: 'courier', role: 'Courier', title: 'Delivery', sub: 'Courier', type: 'delivery', isPrimary: false },
            { key: 'install', role: 'Installer', title: 'Installation', sub: 'Service', type: 'labor', isPrimary: false },
        ],
    },
];

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
                recipes={publishedRecipes}
                onSelectRecipe={vi.fn()}
            />,
        );

        expect(screen.getByText('Bundle & Chain Services')).toBeTruthy();
        expect(screen.getByText(/All-In Parts/i)).toBeTruthy();
        expect(screen.queryByText(/Doorstep Courier Transit/i)).toBeNull();
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
                recipes={publishedRecipes}
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
                item={{ ...mockItem, title: 'AC replacement kit', listing_type: 'product', work_shape: 'A4' }}
                recipes={publishedRecipes}
                onSelectRecipe={vi.fn()}
            />,
        );

        // Find the compact pattern selector button for STORE -> COURIER
        const storeCourierBtn = screen.getByRole('button', {
            name: /^Filter by pipeline STORE → COURIER$/i,
        });
        fireEvent.click(storeCourierBtn);
        expect(screen.queryByText('Product with delivery and installation')).toBeNull();
        expect(screen.getByText(/Doorstep Courier Transit/i)).toBeTruthy();
    });

    it('scopes pipelines to the listing category', () => {
        render(
            <BundleChainModal
                open={true}
                onClose={vi.fn()}
                item={{ ...mockItem, title: 'Food tray', category_code: 'local-food', listing_type: 'product', work_shape: 'A4' }}
                recipes={publishedRecipes}
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

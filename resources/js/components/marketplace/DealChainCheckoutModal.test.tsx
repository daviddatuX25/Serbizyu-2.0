import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DealChainCheckoutModal } from './DealChainCheckoutModal';
import type { BasketItem } from '@/marketplace/types';

describe('DealChainCheckoutModal', () => {
    afterEach(() => {
        cleanup();
    });

    const mockItems: BasketItem[] = [
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
                    { role: 'STORE', title: 'Tagudin HW', sub: '₱180', type: 'store' },
                    { role: 'COURIER', title: 'Danny Exp', sub: '₱35', type: 'delivery' },
                    { role: 'LABOR', title: 'Kuya Ben AC', sub: 'On-Site', type: 'labor' },
                ],
            },
        },
    ];

    it('renders child orders breakdown and non-cascading settlement banner', () => {
        render(
            <DealChainCheckoutModal
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                totalAmount={665}
                onAuthorize={vi.fn()}
            />,
        );

        expect(screen.getByText('Authorize Deal Chain')).toBeTruthy();
        expect(screen.getAllByText(/Non-Cascading Settlement/i).length).toBeGreaterThanOrEqual(1);

        // Check child orders
        expect(screen.getByText('Order #ORD-101')).toBeTruthy();
        expect(screen.getByText('Tagudin Hardware Parts Depot')).toBeTruthy();
        expect(screen.getByText('Order #ORD-102')).toBeTruthy();
        expect(screen.getByText('Danny Express Motorcycle Pool')).toBeTruthy();
        expect(screen.getByText('Order #ORD-103')).toBeTruthy();

        // Check soundness banner
        expect(screen.getByText(/Non-Cascading Settlement Protection/i)).toBeTruthy();
    });

    it('allows selecting payment method and authorizing escrow', () => {
        const onAuthorize = vi.fn();

        render(
            <DealChainCheckoutModal
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                totalAmount={665}
                onAuthorize={onAuthorize}
            />,
        );

        // Click Tiwala Escrow payment pill
        const escrowPill = screen.getByRole('button', { name: /Tiwala Escrow/i });
        fireEvent.click(escrowPill);

        // Click Authorize button
        const authBtn = screen.getByRole('button', { name: /Authorize Deal Chain & Escrow/i });
        fireEvent.click(authBtn);

        expect(onAuthorize).toHaveBeenCalledWith('escrow');
    });
});

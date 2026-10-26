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
                    {
                        key: 'store',
                        role: 'STORE',
                        title: 'Tagudin HW',
                        sub: 'Partner quote required',
                        type: 'store',
                    },
                    {
                        key: 'courier',
                        role: 'COURIER',
                        title: 'Danny Exp',
                        sub: 'Partner quote required',
                        type: 'delivery',
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

    it('renders planned nodes and the planning boundary', () => {
        render(
            <DealChainCheckoutModal
                open={true}
                onClose={vi.fn()}
                items={mockItems}
                totalAmount={665}
                onAuthorize={vi.fn()}
            />,
        );

        expect(screen.getByText(/Review.*Deal Chain/i)).toBeTruthy();
        expect(screen.getByText(/3.*Nodes/i)).toBeTruthy();
        expect(screen.getByText('Tagudin HW')).toBeTruthy();
        expect(screen.getByText('Danny Exp')).toBeTruthy();
        expect(screen.getByText('Kuya Ben AC')).toBeTruthy();
        expect(
            screen.getByText(/does not create Orders, Work, or payment obligations/i),
        ).toBeTruthy();
    });

    it('stages the plan without selecting a payment method', () => {
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

        expect(screen.queryByText(/Tiwala Escrow/i)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Stage.*Plan/i }));

        expect(onAuthorize).toHaveBeenCalledOnce();
        expect(onAuthorize).toHaveBeenCalledWith();
    });
});

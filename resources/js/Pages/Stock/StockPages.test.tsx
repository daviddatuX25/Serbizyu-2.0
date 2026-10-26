import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StockIndex from './Index';
import StockShow from './Show';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        post: vi.fn(),
        processing: false,
        errors: {},
        clearErrors: vi.fn(),
    }),
}));

afterEach(cleanup);

const item = {
    id: 'capacity-1',
    listing_id: 'listing-1',
    resource_key: 'variant-cement-40kg',
    listing_title: 'Holcim Excel 40 kg',
    variant_name: '40 kg bag',
    on_hand: 3,
    held: 0,
    committed_unfulfilled: 5,
    available: -2,
    availability_status: 'shortage' as const,
    row_version: 4,
    affected_orders: ['ORD-2722', 'ORD-2712'],
    movements: [{
        id: 'movement-1',
        movement_type: 'recount',
        delta_on_hand: -17,
        balance_on_hand: 3,
        balance_held: 0,
        balance_committed: 5,
        balance_available: -2,
        counted_quantity: 3,
        reason: 'Shelf recount',
        reference: 'INV-1',
        occurred_at: '2026-10-25T10:00:00Z',
        actor_name: 'Rosa Tagudin',
        order_reference: null,
    }],
};

describe('merchant stock ledger pages', () => {
    it('shows exact balances and shortage status in the private index', () => {
        render(<StockIndex items={[item]} />);

        expect(screen.getByRole('heading', { name: 'Stock' })).toBeTruthy();
        expect(screen.getAllByText('Holcim Excel 40 kg')).toHaveLength(2);
        expect(screen.getAllByText('40 kg bag')).toHaveLength(2);
        expect(screen.getAllByText('Shortage')).toHaveLength(2);
        expect(screen.getAllByText('-2').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /holcim excel 40 kg/i })[0].getAttribute('href')).toBe('/stock/capacity-1');
    });

    it('lists affected order references and exposes receiving, damaged and recount controls', () => {
        render(<StockShow stockItem={item} />);

        expect(screen.getByRole('alert').textContent).toContain('have not been cancelled');
        expect(screen.getByText('ORD-2722')).toBeTruthy();
        expect(screen.getByText('ORD-2712')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: /^Receive stock$/ }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /^Record damaged stock$/ }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /^Record physical recount$/ }).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: 'Movement history' })).toBeTruthy();
        expect(screen.getByText('Physical recount')).toBeTruthy();
    });
});

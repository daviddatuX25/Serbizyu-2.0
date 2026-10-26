import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrdersIndex from './Index';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
    router: { visit: vi.fn() },
}));
vi.mock('../../components/layout/DesktopGlobalNav', () => ({ DesktopGlobalNav: () => null }));
vi.mock('../../marketplace/components/BottomNavBar', () => ({ BottomNavBar: () => null }));
vi.mock('../../components/marketplace/CreatorPostModal', () => ({ CreatorPostModal: () => null }));
vi.mock('../../components/marketplace/QuickDealScanModal', () => ({ QuickDealScanModal: () => null }));

afterEach(cleanup);

const order = {
    id: 'order-needs-action',
    type: 'order' as const,
    title: 'Pipe repair',
    order_status: 'proposed',
    work_status: null,
    amount_minor: null,
    currency: null,
    role: 'provider',
    public_reference: 'ORD-1234',
    updated_at: '2026-10-25T12:00:00Z',
    created_at: '2026-10-25T11:00:00Z',
};

describe('Orders queue', () => {
    it('shows server-grouped Needs Action, Active, and Done sections without invented totals or settlement claims', () => {
        render(<OrdersIndex
            needsAction={[order]}
            active={[{ ...order, id: 'active-order', title: 'Replace faucet', order_status: 'accepted', amount_minor: 85000, currency: 'PHP' }]}
            done={[]}
            counts={{ needsAction: 1, active: 1, done: 0 }}
        />);

        expect(screen.getAllByRole('link', { name: 'Stock ledger' }).every((link) => link.getAttribute('href') === '/stock')).toBe(true);
        expect(screen.getAllByRole('link', { name: 'Money history' }).every((link) => link.getAttribute('href') === '/money-history')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /Needs Action/i }));
        expect(screen.getAllByText('Pipe repair').length).toBeGreaterThan(0);
        expect(screen.queryByText(/Bilateral Escrow|Escrow Settled|Settled & Closed/i)).toBeNull();
        expect(screen.queryByText(/PHP\s+0\.00/)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Active/i }));
        expect(screen.getAllByText('Replace faucet').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/PHP 850\.00/).length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: /Done/i }));
        expect(screen.getAllByText(/No completed or cancelled orders yet/i).length).toBeGreaterThan(0);
    });

    it('renders missing chain title and reference without literal null values', () => {
        render(
            <OrdersIndex
                needsAction={[]}
                active={[]}
                done={[{ ...order, type: 'deal_chain', title: null, public_reference: null, order_status: 'cancelled' }]}
                counts={{ needsAction: 0, active: 0, done: 1 }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Done/i }));
        expect(screen.getAllByText('Order').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Terms not yet agreed').length).toBeGreaterThan(0);
        expect(screen.queryByText('null')).toBeNull();
    });
});

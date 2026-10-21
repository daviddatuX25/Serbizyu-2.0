import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import DealChainDetail from './DealChainDetail';

const mockChain = {
    id: '0198a3b1-7c40-7abc-8def-5234567890b8',
    coordinator_user_id: 'user-1',
    status: 'sourcing',
    title: 'Fiesta AC Overhaul',
    goal: 'Multi-party coordinated citizen delivery and labor',
    total_budget_amount: null,
    currency_code: null,
    financial_state: 'pending_child_agreements',
    created_at: '2026-09-21T00:00:00Z',
};

const mockSlots = [
    {
        id: 'slot-1',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 1,
        need_kind: 'product',
        title: '35uF AC Run Capacitor',
        description: 'Partner product need · Quantity 1 · provider agreement required',
        status: 'open',
        requested_at: '2026-09-21T00:00:00Z',
    },
    {
        id: 'slot-2',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 2,
        need_kind: 'service',
        title: 'Danny Express Motorcycle Courier',
        description: 'Partner transit need · Quantity 1 · provider agreement required',
        status: 'open',
        requested_at: '2026-09-21T00:00:00Z',
    },
    {
        id: 'slot-3',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 3,
        need_kind: 'service',
        title: 'Inverter Split AC Deep Clean',
        description: 'Primary listing need · Quantity 1 · provider agreement required',
        status: 'open',
        requested_at: '2026-09-21T00:00:00Z',
    },
];

const mockDependencies = [
    {
        id: 'dep-1',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        predecessor_need_id: 'slot-1',
        successor_need_id: 'slot-2',
        dependency_type: 'blocks',
        status: 'active',
        condition_code: 'part_ready',
    },
    {
        id: 'dep-2',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        predecessor_need_id: 'slot-2',
        successor_need_id: 'slot-3',
        dependency_type: 'blocks',
        status: 'active',
        condition_code: 'delivery_signed',
    },
];

describe('DealChainDetail Page', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the server-projected graph without invented financial or execution state', () => {
        render(
            <DealChainDetail chain={mockChain} slots={mockSlots} dependencies={mockDependencies} />,
        );

        expect(screen.getAllByText(/Deal Chain #0198A3B1/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Fiesta AC Overhaul')).toBeTruthy();
        expect(screen.getByText('No child terms formed')).toBeTruthy();
        expect(screen.getAllByText('Amount pending provider terms')).toHaveLength(3);
        expect(screen.getByText('part_ready → Slot #2')).toBeTruthy();
        expect(screen.getByText('delivery_signed → Slot #3')).toBeTruthy();
        expect(screen.getByText(/this chain has no parent escrow/i)).toBeTruthy();
        expect(screen.queryByText(/Total Escrow/i)).toBeNull();
        expect(screen.queryByText(/8m ETA/i)).toBeNull();
    });

    it('renders actual child status and amount when supplied by the server', () => {
        render(
            <DealChainDetail
                chain={{
                    ...mockChain,
                    total_budget_amount: 180,
                    currency_code: 'PHP',
                    financial_state: 'child_amounts_projected',
                }}
                slots={[
                    {
                        ...mockSlots[0],
                        child_order_id: 'order-1',
                        child_order_status: 'accepted',
                        amount_minor: 18000,
                        currency: 'PHP',
                        amount_source: 'order terms',
                    },
                ]}
                dependencies={[]}
                view="worker"
                worker="worker-1"
            />,
        );

        expect(screen.getByText('PHP 180.00 · Derived child total')).toBeTruthy();
        expect(screen.getByText('PHP 180.00')).toBeTruthy();
        expect(screen.getByText('Accepted')).toBeTruthy();
        expect(screen.getByText('Server projection for worker-1.')).toBeTruthy();
        expect(screen.queryByText('No child Order formed')).toBeNull();
    });
});

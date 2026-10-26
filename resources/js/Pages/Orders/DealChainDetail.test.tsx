import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
        can_view_order: true,
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
        can_view_order: true,
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
        can_view_order: true,
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

    it('renders only the partner agreement and shared readiness in the worker projection', () => {
        render(
            <DealChainDetail
                chain={{
                    ...mockChain,
                    total_budget_amount: 630,
                    currency_code: 'PHP',
                    financial_state: 'child_amounts_projected',
                }}
                slots={[
                    {
                        ...mockSlots[0],
                        child_order_id: 'order-own',
                        child_order_status: 'accepted',
                        amount_minor: 25000,
                        currency: 'PHP',
                        amount_source: 'order terms',
                        can_view_order: true,
                    },
                    {
                        ...mockSlots[1],
                        child_order_id: 'order-sibling',
                        work_status: 'in_progress',
                        can_view_order: false,
                    },
                ]}
                dependencies={[]}
                view="worker"
            />,
        );

        expect(screen.getByText('PHP 250.00')).toBeTruthy();
        expect(screen.getByText('Shared readiness')).toBeTruthy();
        expect(screen.queryByText('PHP 630.00 · Derived child total')).toBeNull();
        expect(screen.queryByText('Amount pending provider terms')).toBeNull();
        expect(screen.getByText('Partner view · your agreement and shared readiness only.')).toBeTruthy();
        expect(screen.getAllByRole('link', { name: /View Task Details/i })).toHaveLength(1);
        expect(screen.getByRole('link', { name: /View Task Details/i }).getAttribute('href')).toBe('/orders/order-own');
    });

    it('shows the server-authorized withdraw action for the current provider in worker view', () => {
        render(
            <DealChainDetail
                chain={mockChain}
                slots={[{ ...mockSlots[1], can_withdraw: true }]}
                dependencies={[]}
                view="worker"
            />,
        );

        expect(screen.getByRole('button', { name: 'Withdraw current partner' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Show eligible listings' })).toBeNull();
    });
    it('keeps the coordinator commercial overview and formed-child details', () => {
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
                        can_view_order: true,
                    },
                ]}
                dependencies={[]}
            />,
        );

        expect(screen.getByText('PHP 180.00 · Derived child total')).toBeTruthy();
        expect(screen.getByText('PHP 180.00')).toBeTruthy();
        expect(screen.getByText('Accepted')).toBeTruthy();
        expect(screen.getByText('Coordinator project projection.')).toBeTruthy();
    });

    it('renders the server-authorized product handoff link on the courier slot', () => {
        render(
            <DealChainDetail
                chain={mockChain}
                slots={[
                    {
                        ...mockSlots[0],
                        child_order_id: 'product-order',
                        child_order_status: 'in_progress',
                    },
                    {
                        ...mockSlots[1],
                        child_order_id: 'courier-order',
                        child_order_status: 'in_progress',
                        handoff_url: '/orders/product-order/handoff',
                    },
                ]}
                dependencies={[mockDependencies[0]]}
            />,
        );

        expect(screen.getByRole('link', { name: /Open product handoff/i }).getAttribute('href'))
            .toBe('/orders/product-order/handoff');
    });

    it('does not report chain completion while a current replacement slot is still vacant', () => {
        render(
            <DealChainDetail
                chain={{ ...mockChain, status: 'completed' }}
                slots={[
                    {
                        ...mockSlots[0],
                        status: 'completed',
                        child_order_id: 'completed-hardware-order',
                        child_order_status: 'completed',
                        can_view_order: true,
                    },
                    {
                        ...mockSlots[1],
                        status: 'replacement_needed',
                        child_order_id: null,
                        can_view_order: true,
                    },
                ]}
                dependencies={[]}
            />,
        );

        expect(screen.queryByTestId('rate-deal-chain-btn')).toBeNull();
        expect(screen.getByText('Partner needed')).toBeTruthy();
    });
});

describe('Deal Chain relay conversation', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('opens the server-authorized shared relay without replacing child Order navigation', async () => {
        const conversation = {
            id: 'relay-conversation',
            scope_type: 'deal_chain_relay',
            scope_id: mockChain.id,
            title: 'Deal Chain handoff relay',
            status: 'open',
            read_only: false,
            can_send: true,
            can_write_internal: false,
            viewer: {
                actor_user_id: 'user-1',
                owner_user_id: 'user-1',
                owner_display_name: 'Coordinator',
                consent_grant_id: null,
            },
            available_attachments: [],
        };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: conversation }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [], conversation, next_before_sequence: null,
                next_after_sequence: 0, has_more_before: false, has_more_after: false,
            }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const { container } = render(
            <DealChainDetail
                chain={mockChain}
                slots={[{ ...mockSlots[0], child_order_id: 'order-relay-child' }, ...mockSlots.slice(1)]}
                dependencies={mockDependencies}
                can_open_relay
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Open handoff relay' }));

        expect(await screen.findByRole('heading', { name: 'Deal Chain handoff relay' })).toBeTruthy();
        expect(fetchMock.mock.calls[0][0]).toBe(`/deal-chains/${mockChain.id}/relay`);
        expect(container.querySelector('a[href="/orders/order-relay-child"]')).toBeTruthy();
    });
});

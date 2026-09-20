import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import DealChainDetail from './DealChainDetail';

const mockChain = {
    id: '0198a3b1-7c40-7abc-8def-5234567890b8',
    coordinator_user_id: 'user-1',
    status: 'sourcing',
    title: 'Fiesta AC Overhaul',
    goal: 'Multi-party coordinated citizen delivery and labor',
    total_budget_amount: 665,
    currency_code: 'PHP',
    created_at: '2026-09-21T00:00:00Z',
};

const mockSlots = [
    {
        id: 'slot-1',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 1,
        need_kind: 'product',
        title: '35uF AC Run Capacitor',
        description: 'Counter pickup ready · Tagudin Hardware & Supply Depot',
        status: 'open',
        requested_at: '2026-09-21T00:00:00Z',
    },
    {
        id: 'slot-2',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 2,
        need_kind: 'service',
        title: 'Danny Express Motorcycle Courier',
        description: 'Counter to jobsite doorstep transit',
        status: 'open',
        requested_at: '2026-09-21T00:00:00Z',
    },
    {
        id: 'slot-3',
        deal_chain_id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        ordinal: 3,
        need_kind: 'service',
        title: 'Inverter Split AC Deep Clean',
        description: 'Kuya Ben AC Services on-site installation',
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

    it('renders Deal Chain execution workspace with live relay and slots', () => {
        render(
            <DealChainDetail
                chain={mockChain}
                slots={mockSlots}
                dependencies={mockDependencies}
            />,
        );

        expect(screen.getAllByText(/Deal Chain #0198A3B1/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Fiesta AC Overhaul')).toBeTruthy();
        expect(screen.getByText(/₱665.00 Total Escrow/i)).toBeTruthy();

        // Slots
        expect(screen.getByText('35uF AC Run Capacitor')).toBeTruthy();
        expect(screen.getByText('Danny Express Motorcycle Courier')).toBeTruthy();
        expect(screen.getByText('Inverter Split AC Deep Clean')).toBeTruthy();

        // Dependencies
        expect(screen.getByText('Part Dispatched to Courier Node')).toBeTruthy();
        expect(screen.getByText('Transit Gating On-Site Labor')).toBeTruthy();

        // Non-cascading settlement badge
        expect(screen.getByText(/Non-Cascading Settlement Protection Active/i)).toBeTruthy();
    });

    it('toggles perspective views', () => {
        render(
            <DealChainDetail
                chain={mockChain}
                slots={mockSlots}
                dependencies={mockDependencies}
            />,
        );

        // Click Technician perspective
        const techBtn = screen.getByRole('button', { name: /Technician \(Gated\)/i });
        fireEvent.click(techBtn);

        expect(screen.getByText(/Technician View: Work step gated on Danny Express/i)).toBeTruthy();

        // Click Courier perspective
        const courierBtn = screen.getByRole('button', { name: /Courier \(En Route\)/i });
        fireEvent.click(courierBtn);

        expect(screen.getByText(/Courier View: Active route from Tagudin Hardware/i)).toBeTruthy();
    });
});

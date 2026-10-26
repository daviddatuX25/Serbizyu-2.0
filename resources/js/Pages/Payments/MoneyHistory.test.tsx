import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MoneyHistory from './MoneyHistory';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <>{title}</>,
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('../../components/AppShell', () => ({
    AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const groups = [
    {
        currency: 'PHP',
        receivable_minor: 85000,
        awaiting_acknowledgement_minor: 25000,
        under_review_minor: 5000,
        settled_minor: 78000,
        records: [
            { id: '1', public_reference: 'OBL-1048', order_id: 'ORD-1', title: 'Aircon cleaning', party_name: 'Maria Santos', role: 'recipient' as const, lane: 'external_cash', status: 'due', amount_minor: 85000, updated_at: '2026-10-25' },
            { id: '2', public_reference: 'OBL-1049', order_id: 'ORD-2', title: 'Fan repair', party_name: 'Kuya Ben', role: 'recipient' as const, lane: 'GCash P2P', status: 'payer_reported_cash', amount_minor: 25000, updated_at: '2026-10-24' },
            { id: '3', public_reference: 'OBL-1050', order_id: 'ORD-3', title: 'Pipe repair', party_name: 'Maria Santos', role: 'payer' as const, lane: 'External Cash', status: 'disputed_mismatch', amount_minor: 5000, updated_at: '2026-10-23' },
            { id: '4', public_reference: 'OBL-1051', order_id: 'ORD-4', title: 'Fan installation', party_name: 'Maria Santos', role: 'recipient' as const, lane: 'GCash P2P', status: 'settled', amount_minor: 78000, updated_at: '2026-10-22' },
            { id: '6', public_reference: 'OBL-1053', order_id: 'ORD-6', title: 'Tool rental', party_name: 'Kuya Ben', role: 'payer' as const, lane: 'External Cash', status: 'due', amount_minor: 15000, updated_at: '2026-10-20' },
        ],
    },
    {
        currency: 'USD',
        receivable_minor: 1000,
        awaiting_acknowledgement_minor: 0,
        under_review_minor: 0,
        settled_minor: 0,
        records: [
            { id: '5', public_reference: 'OBL-1052', order_id: 'ORD-5', title: 'Consultation', party_name: 'Alex Rivera', role: 'recipient' as const, lane: 'External Digital', status: 'due', amount_minor: 1000, updated_at: '2026-10-21' },
        ],
    },
];

afterEach(cleanup);

describe('MoneyHistory', () => {
    it('renders records individually and keeps summary amounts grouped by currency', () => {
        render(<MoneyHistory groups={groups} />);

        expect(screen.getByRole('heading', { name: 'Money history' })).toBeTruthy();
        expect(screen.getAllByText('₱850.00')).toHaveLength(2);
        expect(screen.getAllByText('$10.00')).toHaveLength(2);
        expect(screen.getAllByText('Settled outside Serbizyu')).toHaveLength(2);
        expect(screen.getByText('Aircon cleaning')).toBeTruthy();
        expect(screen.getAllByText(/External cash · direct between parties/).length).toBeGreaterThan(0);
        expect(screen.getByText(/OBL-1048/)).toBeTruthy();
        expect(screen.getByText('History is not a wallet, withdrawal balance, or escrow service. Settled cash and personal-wallet payments are recorded between the parties.')).toBeTruthy();
    });

    it('filters actions by participant role and recorded obligations by settled status', () => {
        render(<MoneyHistory groups={groups} />);

        fireEvent.click(screen.getByRole('button', { name: 'Needs action' }));
        expect(screen.getByText('Fan repair')).toBeTruthy();
        expect(screen.getByText('Tool rental')).toBeTruthy();
        expect(screen.queryByText('Aircon cleaning')).toBeNull();
        expect(screen.queryByText('Pipe repair')).toBeNull();
        expect(screen.queryByText('Fan installation')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Recorded' }));
        expect(screen.getByText('Fan installation')).toBeTruthy();
        expect(screen.queryByText('Aircon cleaning')).toBeNull();
        expect(screen.queryByText('Consultation')).toBeNull();
    });

    it('shows a useful filtered-empty state and can return to all records', () => {
        render(<MoneyHistory groups={groups.map((group) => ({ ...group, records: group.records.filter((record) => record.status === 'disputed_mismatch') }))} />);

        fireEvent.click(screen.getByRole('button', { name: 'Needs action' }));
        expect(screen.getByText('No records match this filter')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'All' }));
        expect(screen.getByText('Pipe repair')).toBeTruthy();
    });

    it('renders a genuine empty state without implying a zero wallet balance', () => {
        render(<MoneyHistory groups={[]} />);

        expect(screen.getByText('No payment records yet')).toBeTruthy();
        expect(screen.getByText('Recorded payment activity will appear here. This history is not a wallet or balance.')).toBeTruthy();
        expect(within(screen.getByRole('main')).queryByText(/₱0\.00|\$0\.00/)).toBeNull();
    });
});

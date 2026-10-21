import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import OrderShow from './Show';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
        <form {...props}>{children}</form>
    ),
    router: {
        post: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: null },
            flash: {},
        },
    }),
}));

const mockOrder = {
    id: '0192a000-0000-7000-8000-000000000001',
    status: 'accepted',
    version: 1,
    listing_id: '0192a000-0000-7000-8000-000000000002',
    mechanism: 'ordinary',
    origin: 'request',
    can_finalize: false,
    can_signoff: false,
    can_view_work_evidence: true,
    is_order_buyer: true,
    can_contact: true,
    counterparty_name: 'Kuya Ben AC Services',
    counterparty_phone: '0917-111-1001',
    actor_role: 'buyer' as const,
    customer_name: 'Maria Santos',
    customer_phone: '0917-222-2001',
    provider_name: 'Kuya Ben AC Services',
    provider_phone: '0917-111-1001',
    listing_title: 'Kitchen Pipe & Gate Valve Overhaul',
    bidding_lineage: {
        request_id: '0192a000-0000-7000-8000-000000000099',
        request_ref: '#REQ-0192A000',
        request_title: 'Repair water line and replace gate valve',
        tender_mode: 'sealed_tender',
        quote_id: '0192a000-0000-7000-8000-000000000088',
        quote_ref: '#QTE-0192A000',
        quote_version: 2,
        winning_amount_minor: 65000,
        total_quotes_received: 3,
        is_sealed: true,
    },
};

describe('OrderShow Page - Tender Lineage', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders Tender Lineage banner when order originated from a request tender', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="customer"
                correlationId="corr-ord-1"
            />,
        );

        expect(screen.getByTestId('tender-lineage-banner')).toBeTruthy();
        expect(screen.getByText('Sealed Bidding Award')).toBeTruthy();
        expect(screen.getByText('#REQ-0192A000')).toBeTruthy();
        expect(screen.getByText(/Awarded from: Repair water line and replace gate valve/i)).toBeTruthy();
        expect(screen.getByTestId('view-bidding-lineage-btn')).toBeTruthy();
    });

    it('opens Bidding Lineage drawer with details upon clicking Bidding Lineage button', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="customer"
                correlationId="corr-ord-1"
            />,
        );

        const viewBtn = screen.getByTestId('view-bidding-lineage-btn');
        fireEvent.click(viewBtn);

        expect(screen.getByText('Tender & Bidding Lineage')).toBeTruthy();
        expect(screen.getByText('Winning Proposal Details')).toBeTruthy();
        expect(screen.getByText('v2 (Final)')).toBeTruthy();
        expect(screen.getByText('₱650.00')).toBeTruthy();
        expect(screen.getByText(/3 proposals/i)).toBeTruthy();
        expect(screen.getByText(/Sealed Tender Confidentiality/i)).toBeTruthy();
    });
});

describe('OrderShow Page - Work Evidence & Tools', () => {
    afterEach(() => {
        cleanup();
    });

    const activeWorkOrder = {
        ...mockOrder,
        can_signoff: true,
        can_view_work_evidence: true,
        is_order_buyer: false,
        can_contact: true,
        counterparty_name: 'Maria Santos',
        counterparty_phone: '0917-222-2001',
    };

    it('renders native work tools on active provider node requiring photo and measurements', () => {
        render(
            <OrderShow
                order={activeWorkOrder}
                actor_perspective="provider"
                correlationId="corr-ord-tools"
                work={{
                    id: 'work-1',
                    status: 'in_progress',
                    work_shape: 'A1',
                    active_node_id: 'gate-2',
                    nodes: [
                        {
                            id: 'gate-1',
                            ordinal: 1,
                            title: 'Intake and arrival',
                            description: 'Check-in on site',
                            node_kind: 'checkin_intake',
                            evidence_type: 'none',
                            control_mode: 'provider_advance',
                            mandatory: true,
                            evidence_description: 'None required.',
                            status: 'completed',
                        },
                        {
                            id: 'gate-2',
                            ordinal: 2,
                            title: 'Capacitor replacement',
                            description: 'Install replacement run capacitor and verify load',
                            node_kind: 'execution_proof',
                            evidence_type: 'photo_required',
                            control_mode: 'provider_advance',
                            evidence_description: 'Photo and amperage reading required.',
                            required_proofs: ['photo_proof', 'metric_reading'],
                            metric_unit: 'A',
                            mandatory: true,
                            status: 'active',
                        },
                    ],
                }}
            />,
        );

        expect(screen.getByTestId('work-photo-proof')).toBeTruthy();
        expect(screen.getByTestId('work-metric-readings')).toBeTruthy();
        expect(screen.getByText(/Choose or take a photo/i)).toBeTruthy();
        expect(screen.getByText('Measurements')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Submit proof & complete step/i })).toBeTruthy();
    });

    it('renders submitted evidence on customer confirmation gate without duplicate dock chat', () => {
        render(
            <OrderShow
                order={{
                    ...activeWorkOrder,
                    is_order_buyer: true,
                    can_signoff: true,
                }}
                actor_perspective="customer"
                correlationId="corr-ord-confirm"
                work={{
                    id: 'work-1',
                    status: 'awaiting_signoff',
                    work_shape: 'A1',
                    active_node_id: 'gate-final',
                    nodes: [
                        {
                            id: 'gate-final',
                            ordinal: 3,
                            title: 'Final sign-off',
                            description: 'Confirm repair completion',
                            node_kind: 'final_signoff',
                            evidence_type: 'dual_sign',
                            control_mode: 'customer_confirm',
                            approval_method: 'app_confirm',
                            evidence_description: 'Dual sign-off confirmation.',
                            mandatory: true,
                            status: 'awaiting_customer_confirmation',
                            can_confirm: true,
                            evidence: {
                                 notes: 'Capacitor replaced. Operating at 4.2A steady load.',
                                 location: {
                                     latitude: 17.0851,
                                     longitude: 120.4482,
                                     accuracy_m: 8,
                                     source: 'gps',
                                     observed_at: '2026-10-01T05:00:00Z',
                                     received_at: '2026-10-01T05:00:01Z',
                                     landmark: 'Near Barangay Health Center · Blue Gate',
                                 },
                                 metric_readings: [
                                     { value: 4.2, unit: 'A', observed_at: '2026-10-01T05:00:00Z', received_at: '2026-10-01T05:00:01Z' },
                                 ],
                                 checklist_completed: true,
                                 photos: [
                                     { id: 'photo-1', url: '/orders/1/work-evidence/photo-1', media_type: 'image/png' },
                                 ],
                                 pending_photo_count: 0,
                            },
                        },
                    ],
                }}
            />,
        );

        const review = screen.getByTestId('work-node-evidence-review');
        expect(review).toBeTruthy();
        expect(within(review).getByText('Capacitor replaced. Operating at 4.2A steady load.')).toBeTruthy();
        expect(within(review).getByText(/Near Barangay Health Center · Blue Gate/i)).toBeTruthy();
        expect(screen.getByText('4.2')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Review work & release payment/i })).toBeTruthy();
        expect(screen.queryByText(/Chat with Provider ·/i)).toBeNull();
    });
});

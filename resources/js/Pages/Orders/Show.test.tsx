import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { router } from '@inertiajs/react';
import OrderShow from './Show';
import type { WorkNodeRecord } from '../../types';

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
    status: 'accepted' as const,
    version: 1,
    listing_id: '0192a000-0000-7000-8000-000000000002',
    mechanism: 'ordinary',
    origin: 'request',
    can_accept: false,
    can_decline: false,
    can_counter: false,
    can_amend: false,
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
                    version: 1,
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
                    version: 1,
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
                            metric_requirements: [{ id: 'voltage', name: 'Line voltage', unit: 'V', required: true }],
                            checklist_items: [{ id: 'ground', label: 'Verify grounding', required: true }],
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
                                     { id: 'voltage', value: 220, unit: 'V', observed_at: '2026-10-01T05:00:00Z', received_at: '2026-10-01T05:00:01Z' },
                                 ],
                                 checklist_responses: [{ id: 'ground', completed: true }],
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
        expect(screen.getByText('220')).toBeTruthy();
        expect(within(review).getByText(/Line voltage/)).toBeTruthy();
        expect(within(review).getByText(/Verify grounding: Complete/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Review and confirm Work/i })).toBeTruthy();
        expect(screen.queryByText(/Chat with Provider ·/i)).toBeNull();
    });
});
describe('OrderShow Page - Independent Agreement, Work & Payment rails', () => {
    afterEach(() => cleanup());

    it('shows completed Work independently from a cash report awaiting recipient acknowledgement', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'accepted', can_signoff: false }}
                work={{ id: 'work-1', version: 1, status: 'completed', work_shape: 'A1' }}
                obligation={{
                    id: 'obligation-1',
                    status: 'payer_reported_cash',
                    lane: 'external_cash',
                    amount_minor: 85000,
                    currency: 'PHP',
                    eligible_lanes: ['external_cash', 'p2p_transfer'],
                    can_select_lane: false,
                    can_report_cash: false,
                    can_acknowledge_cash: false,
                }}
                actor_perspective="customer"
            />,
        );

        const rails = screen.getByTestId('order-progress-rails');
        expect(within(rails).getByText('Accepted')).toBeTruthy();
        expect(within(rails).getByText('Completed')).toBeTruthy();
        expect(within(rails).getByText('payer reported cash')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Cash report details/i })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Cash report details/i }));
        expect(screen.getByText(/Cash was reported by the payer/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Report cash handed over/i })).toBeNull();
    });

    it('keeps the agreement rail accepted once canonical order status reaches in progress', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'in_progress' }}
                work={{ id: 'work-active', version: 1, status: 'in_progress', work_shape: 'A1' }}
                actor_perspective="customer"
            />,
        );

        const rails = screen.getByTestId('order-progress-rails');
        expect(within(rails).getByText('Accepted')).toBeTruthy();
        expect(within(rails).getByText('in progress')).toBeTruthy();
        expect(within(rails).getByText('Not available')).toBeTruthy();
        expect(screen.getByText('Work Underway')).toBeTruthy();
    });


    it('does not imply a payment obligation from financial labels alone', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed' }}
                proposal={{
                    id: 'proposal-financial-label',
                    version: 1,
                    kind: 'initial',
                    status: 'proposed',
                    proposed_by_user_id: 'merchant-1',
                    amount_minor: 85000,
                    currency: 'PHP',
                    note: null,
                    can_accept: false,
                    can_decline: false,
                    can_counter: false,
                    can_amend: false,
                    expected_order_version: 1,
                }}
                financials={{
                    amount_minor: 85000,
                    currency: 'PHP',
                    label: 'Payment obligation',
                    status: 'due',
                    breakdown: [],
                }}
                actor_perspective="customer"
            />,
        );

        expect(within(screen.getByTestId('order-progress-rails')).getByText('Not available')).toBeTruthy();
        expect(screen.queryByText(/payment obligation/i)).toBeNull();
        expect(screen.queryByRole('button', { name: /payment details/i })).toBeNull();
    });
    it('renders the Glovo payment sheet with cash reporting only while a due external-cash obligation is active', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="customer"
                obligation={{
                    id: 'obligation-1',
                    status: 'due',
                    lane: 'external_cash',
                    amount_minor: 85000,
                    currency: 'PHP',
                    eligible_lanes: ['external_cash', 'p2p_transfer'],
                    can_select_lane: true,
                    can_report_cash: true,
                    can_acknowledge_cash: false,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Payment details/i }));
        expect(screen.getByTestId('payment-obligation-sheet')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /External cash/i })).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Personal wallet transfer/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Report cash handed over/i })).toBeTruthy();
    });
    it('explains that payment options are not yet due without claiming evidence is locked', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="customer"
                obligation={{
                    id: 'obligation-1',
                    status: 'not_due',
                    lane: 'external_cash',
                    amount_minor: 85000,
                    currency: 'PHP',
                    eligible_lanes: ['external_cash'],
                    can_select_lane: false,
                    can_report_cash: false,
                    can_acknowledge_cash: false,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Payment details/i }));
        expect(screen.getByText(/Payment options will be available when this obligation becomes due/i)).toBeTruthy();
        expect(screen.queryByText(/locked after payment evidence/i)).toBeNull();
    });
    it('offers recipient acknowledgement only while cash is awaiting their response', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, actor_role: 'provider', is_order_buyer: false }}
                actor_perspective="provider"
                obligation={{
                    id: 'obligation-1',
                    status: 'payer_reported_cash',
                    lane: 'external_cash',
                    amount_minor: 85000,
                    currency: 'PHP',
                    eligible_lanes: ['external_cash'],
                    can_select_lane: false,
                    can_report_cash: false,
                    can_acknowledge_cash: true,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Cash report details/i }));
        expect(screen.getByRole('button', { name: /Confirm cash received/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Report cash handed over/i })).toBeNull();
    });
    it('keeps A9 authored steps planned and uses only native delivery upload and QA actions', () => {
        const a9Node: WorkNodeRecord = {
            id: 'a9-inspect',
            ordinal: 1,
            title: 'Inspect delivered equipment',
            description: 'Verify the equipment at delivery.',
            node_kind: 'execution_proof',
            evidence_type: 'none',
            evidence_description: '',
            control_mode: 'provider_advance',
            mandatory: true,
            status: 'active',
            required_proofs: ['checklist_steps', 'metric_reading'],
            checklist_items: [{ id: 'count', label: 'Verify equipment count', required: true }],
            metric_requirements: [{ id: 'weight', name: 'Delivered weight', unit: 'kg', required: true }],
        };
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="provider"
                work={{ id: 'work-a9', version: 9, status: 'in_progress', work_shape: 'A9', nodes: [a9Node] }}
                a9Delivery={{
                    enabled: true,
                    viewer: 'provider',
                    workStatus: 'in_progress',
                    revisionsAllowed: 2,
                    revisionsUsed: 0,
                    currentDelivery: null,
                    deliveries: [{ id: 'draft-a9', version: 1, status: 'draft', submittedAt: null, nodeProofs: {}, files: [] }],
                    nodes: [a9Node],
                }}
            />,
        );

        expect(screen.getByTestId('a9-delivery-panel')).toBeTruthy();
        expect(screen.getByLabelText('Choose deliverable files')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Attach proof to this delivery' })).toBeTruthy();
        expect(screen.getByText('Planned step')).toBeTruthy();
        expect(screen.queryByText('Active Gate')).toBeNull();
        expect(screen.queryByText('Done')).toBeNull();
        expect(screen.queryByRole('button', { name: /Complete step|Submit proof & complete step|Propose completion|Review and confirm Work/i })).toBeNull();
    });
    it('uses native exact-version acceptance for A9 customers without generic Work confirmation', () => {
        const a9Node: WorkNodeRecord = {
            id: 'a9-final',
            ordinal: 3,
            title: 'Approve delivered files',
            description: 'Review delivery and decide whether to accept.',
            node_kind: 'final_signoff',
            evidence_type: 'none',
            evidence_description: '',
            control_mode: 'customer_confirm',
            mandatory: true,
            status: 'awaiting_customer_confirmation',
            required_proofs: [],
        };
        const version = {
            id: 'delivery-v7',
            version: 7,
            status: 'submitted' as const,
            submittedAt: '2026-10-25T12:00:00Z',
            nodeProofs: {},
            files: [],
        };
        render(
            <OrderShow
                order={{ ...mockOrder, can_signoff: true }}
                actor_perspective="customer"
                work={{ id: 'work-a9', version: 9, status: 'awaiting_signoff', work_shape: 'A9', nodes: [a9Node] }}
                a9Delivery={{
                    enabled: true,
                    viewer: 'customer',
                    workStatus: 'awaiting_signoff',
                    revisionsAllowed: 2,
                    revisionsUsed: 0,
                    currentDelivery: version,
                    deliveries: [version],
                    nodes: [a9Node],
                }}
            />,
        );

        expect(screen.getByRole('button', { name: 'Accept version 7' })).toBeTruthy();
        expect(screen.getByText('Planned step')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Review and confirm Work|Confirm step|Confirm final receipt/i })).toBeNull();
        expect(screen.queryByText('Needs Customer Approval')).toBeNull();
        expect(screen.queryByText('Active Gate')).toBeNull();
    });
    });

describe('Order proposal actions', () => {
    afterEach(() => {
        cleanup();
        vi.mocked(router.post).mockClear();
    });

    it('posts acceptance only when the current proposal says the actor may accept it', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed', version: 7, can_accept: false }}
                proposal={{
                    id: 'proposal-1',
                    version: 2,
                    kind: 'initial',
                    status: 'proposed',
                    proposed_by_user_id: 'merchant-1',
                    amount_minor: 73500,
                    currency: 'PHP',
                    note: 'Parts and labor',
                    can_accept: true,
                    can_decline: false,
                    can_counter: false,
                    can_amend: false,
                    expected_order_version: 7,
                }}
                actor_perspective="customer"
            />,
        );

        expect(screen.getAllByText('PHP 735.00').length).toBeGreaterThan(0);
        expect(screen.queryByText('Agreed amount')).toBeNull();
        expect(screen.queryByText(/Estimated Arrival|Escrow Settled|Bilateral Escrow/i)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Order Options/i }));
        expect(screen.getByRole('link', { name: /Stock ledger/i }).getAttribute('href')).toBe('/stock');
        expect(screen.getAllByRole('link', { name: /Money history/i }).some((link) => link.getAttribute('href') === '/money-history')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /Accept proposal/i }));
        expect(router.post).toHaveBeenCalledWith(
            `/orders/${mockOrder.id}/proposals/proposal-1/accept`,
            { expected_order_version: 7, idempotency_key: expect.any(String) },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });

    it('keeps counter inputs visible in the Glovo sheet and posts their exact values with server concurrency fields', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed', version: 4, can_counter: true }}
                proposal={{
                    id: 'proposal-2',
                    version: 1,
                    kind: 'initial',
                    status: 'proposed',
                    proposed_by_user_id: 'customer-1',
                    amount_minor: 50000,
                    currency: 'PHP',
                    note: null,
                    can_accept: false,
                    can_decline: false,
                    can_counter: true,
                    can_amend: false,
                    expected_order_version: 4,
                }}
                actor_perspective="provider"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Counter proposal/i }));
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '825.50' } });
        fireEvent.change(screen.getByLabelText(/Scope/i), { target: { value: 'Replace the valve assembly' } });
        fireEvent.change(screen.getByLabelText(/Note/i), { target: { value: 'Includes supplied parts' } });
        fireEvent.click(screen.getByRole('button', { name: /Send counterproposal/i }));

        expect(router.post).toHaveBeenCalledWith(
            `/orders/${mockOrder.id}/counter`,
            {
                expected_order_version: 4,
                idempotency_key: expect.any(String),
                amount_minor: 82550,
                scope: 'Replace the valve assembly',
                note: 'Includes supplied parts',
            },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
        expect(screen.getByLabelText(/Amount/i)).toHaveProperty('value', '825.50');
        expect(screen.getByLabelText(/Note/i)).toHaveProperty('value', 'Includes supplied parts');
    });

    it('honors decline permission from the server proposal snapshot', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed', version: 6 }}
                proposal={{
                    id: 'proposal-3',
                    version: 3,
                    kind: 'counter',
                    status: 'proposed',
                    proposed_by_user_id: 'customer-1',
                    amount_minor: 90000,
                    currency: 'PHP',
                    note: null,
                    can_accept: false,
                    can_decline: true,
                    can_counter: false,
                    can_amend: false,
                    expected_order_version: 6,
                }}
                actor_perspective="provider"
            />,
        );

        expect(screen.queryByRole('button', { name: /Accept proposal/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /Counter proposal/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /Amend proposal/i })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Decline proposal/i }));
        expect(router.post).toHaveBeenCalledWith(
            `/orders/${mockOrder.id}/decline`,
            { expected_order_version: 6, idempotency_key: expect.any(String) },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });

    it('posts amended amount and note from the Glovo sheet', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed', version: 6 }}
                proposal={{
                    id: 'proposal-3',
                    version: 3,
                    kind: 'counter',
                    status: 'proposed',
                    proposed_by_user_id: 'customer-1',
                    amount_minor: 90000,
                    currency: 'PHP',
                    note: null,
                    can_accept: false,
                    can_decline: false,
                    can_counter: false,
                    can_amend: true,
                    expected_order_version: 6,
                }}
                actor_perspective="provider"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Amend proposal/i }));
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '945.25' } });
        fireEvent.change(screen.getByLabelText(/Note/i), { target: { value: 'Updated delivery terms' } });
        fireEvent.click(screen.getByRole('button', { name: /Send amended proposal/i }));
        expect(router.post).toHaveBeenCalledWith(
            `/orders/${mockOrder.id}/amend`,
            {
                expected_order_version: 6,
                idempotency_key: expect.any(String),
                amount_minor: 94525,
                note: 'Updated delivery terms',
            },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });

    it('uses the order acceptance endpoint only when the order action flag grants it', () => {
        render(
            <OrderShow
                order={{ ...mockOrder, status: 'proposed', version: 8, can_accept: true }}
                proposal={{
                    id: 'proposal-4',
                    version: 1,
                    kind: 'initial',
                    status: 'proposed',
                    proposed_by_user_id: 'merchant-1',
                    amount_minor: 73500,
                    currency: 'PHP',
                    note: null,
                    can_accept: false,
                    can_decline: false,
                    can_counter: false,
                    can_amend: false,
                    expected_order_version: 8,
                }}
                actor_perspective="customer"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Accept proposal/i }));
        expect(router.post).toHaveBeenCalledWith(
            `/orders/${mockOrder.id}/accept`,
            { expected_order_version: 8, idempotency_key: expect.any(String) },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });
});

describe('Order work panels', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('mounts the persisted appointment panel from the order projection', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="customer"
                appointment={{
                    scheduledAt: '2026-11-01T09:00:00Z',
                    scheduleChangeRequests: [],
                    canPropose: true,
                    viewerUserId: 'buyer-1',
                }}
            />,
        );

        expect(screen.getByTestId('appointment-panel')).toBeTruthy();
        expect(screen.getByText(/Booked for/i)).toBeTruthy();
    });
 
    it('mounts the governed A4 handoff panel from the server projection', () => {
        render(
            <OrderShow
                order={mockOrder}
                actor_perspective="provider"
                a4Handoff={{
                    enabled: true,
                    listingType: 'product',
                    status: 'not_prepared',
                    transfer: null,
                    couriers: [],
                    canMarkPrepared: true,
                    canOfferCustody: false,
                    canAcceptCustody: false,
                    canRecordReceipt: false,
                    workVersion: 5,
                    proofNode: {
                        id: 'a4-prepared-node',
                        ordinal: 1,
                        title: 'Preparation',
                        description: 'Prepare goods',
                        node_kind: 'checkin_intake',
                        evidence_type: 'photo_required',
                        evidence_description: 'Clean photo.',
                        control_mode: 'provider_advance',
                        mandatory: true,
                        required_proofs: ['photo_proof'],
                        candidate_evidence: [{ id: 'proof-1', scan_status: 'clean', media_type: 'image' }],
                    } as WorkNodeRecord,
                }}
            />,
        );

        expect(screen.getByText('Product handoff')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Mark prepared' })).toBeTruthy();
    });
});

describe('Order conversations and support cases', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    });

    it('creates a real support case from the report and opens its persisted conversation', async () => {
        const conversation = {
            id: 'conversation-case-1',
            scope_type: 'support_case',
            scope_id: 'case-1',
            title: 'Case CASE-010 messages',
            status: 'open',
            read_only: false,
            can_send: true,
            can_write_internal: false,
            viewer: {
                actor_user_id: 'buyer-1',
                owner_user_id: 'buyer-1',
                owner_display_name: 'Maria Santos',
                consent_grant_id: null,
            },
            available_attachments: [],
        };
        const initialReport = {
            id: 'message-case-1',
            sequence: 1,
            content: 'The appointment time needs to be corrected.',
            actor_user_id: 'buyer-1',
            owner_user_id: 'buyer-1',
            consent_grant_id: null,
            actor_display_name: 'Maria Santos',
            owner_display_name: 'Maria Santos',
            audience: 'participants',
            created_at: '2026-10-26T10:00:00Z',
            attachment: null,
        };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'case-1', public_reference: 'CASE-010', conversation_id: conversation.id } }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: conversation }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [initialReport], conversation, next_before_sequence: null,
                next_after_sequence: 1, has_more_before: false, has_more_after: false,
            }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('crypto', { randomUUID: () => 'support-key-1' });
        document.cookie = 'XSRF-TOKEN=current-token';

        render(<OrderShow order={mockOrder} />);
        fireEvent.click(screen.getByRole('button', { name: 'Support' }));
        fireEvent.change(screen.getByLabelText('What do you need help with?'), {
            target: { value: 'The appointment time needs to be corrected.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Open support case' }));

        const messageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(messageLog).findByText('The appointment time needs to be corrected.')).toBeTruthy();
        expect(fetchMock.mock.calls.some(([url]) => url === '/support-cases')).toBe(true);
        expect(fetchMock.mock.calls.some(([url]) => url === '/support-cases/case-1/conversation')).toBe(true);
        expect(fetchMock.mock.calls.some(([url]) => url === `/conversations/${conversation.id}/messages`)).toBe(true);
        const createRequest = fetchMock.mock.calls.find(([url]) => url === '/support-cases')?.[1] as RequestInit;
        expect(JSON.parse(String(createRequest.body))).toMatchObject({
            order_id: mockOrder.id,
            category: 'fulfillment',
            content: 'The appointment time needs to be corrected.',
        });
    });

    it('opens the Order’s existing support case without creating a duplicate', async () => {
        const conversation = {
            id: 'conversation-case-2',
            scope_type: 'support_case',
            scope_id: 'case-2',
            title: 'Existing case messages',
            status: 'open',
            read_only: false,
            can_send: true,
            can_write_internal: false,
            viewer: {
                actor_user_id: 'buyer-1',
                owner_user_id: 'buyer-1',
                owner_display_name: 'Maria Santos',
                consent_grant_id: null,
            },
            available_attachments: [],
        };
        const existingMessage = {
            id: 'message-case-2',
            sequence: 1,
            content: 'This existing case is still being reviewed.',
            actor_user_id: 'buyer-1',
            owner_user_id: 'buyer-1',
            consent_grant_id: null,
            actor_display_name: 'Maria Santos',
            owner_display_name: 'Maria Santos',
            audience: 'participants',
            created_at: '2026-10-26T10:00:00Z',
            attachment: null,
        };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: conversation }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [existingMessage], conversation, next_before_sequence: null,
                next_after_sequence: 1, has_more_before: false, has_more_after: false,
            }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const props = { order: mockOrder, active_support_case_id: 'case-2' } as Parameters<typeof OrderShow>[0];
        render(<OrderShow {...props} />);
        fireEvent.click(screen.getByRole('button', { name: 'Support' }));

        const messageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(messageLog).findByText('This existing case is still being reviewed.')).toBeTruthy();
        expect(fetchMock.mock.calls.some(([url]) => url === '/support-cases/case-2/conversation')).toBe(true);
        expect(fetchMock.mock.calls.some(([url]) => url === `/conversations/${conversation.id}/messages`)).toBe(true);
    });
});

describe('Order support case reuse', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('reopens the case it just created instead of creating a duplicate', async () => {
        const conversation = {
            id: 'conversation-case-3',
            scope_type: 'support_case',
            scope_id: 'case-3',
            title: 'New case messages',
            status: 'open',
            read_only: false,
            can_send: true,
            can_write_internal: false,
            viewer: {
                actor_user_id: 'buyer-1',
                owner_user_id: 'buyer-1',
                owner_display_name: 'Maria Santos',
                consent_grant_id: null,
            },
            available_attachments: [],
        };
        const reportMessage = {
            id: 'message-case-3',
            sequence: 1,
            content: 'Please review the revised appointment time.',
            actor_user_id: 'buyer-1',
            owner_user_id: 'buyer-1',
            consent_grant_id: null,
            actor_display_name: 'Maria Santos',
            owner_display_name: 'Maria Santos',
            audience: 'participants',
            created_at: '2026-10-26T10:00:00Z',
            attachment: null,
        };
        const conversationPage = new Response(JSON.stringify({
            data: [reportMessage], conversation, next_before_sequence: null,
            next_after_sequence: 1, has_more_before: false, has_more_after: false,
        }), { status: 200 });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'case-3', public_reference: 'CASE-011', conversation_id: conversation.id } }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: conversation }), { status: 201 }))
            .mockResolvedValueOnce(conversationPage)
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: conversation }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [reportMessage], conversation, next_before_sequence: null,
                next_after_sequence: 1, has_more_before: false, has_more_after: false,
            }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('crypto', { randomUUID: () => 'support-key-3' });

        render(<OrderShow order={mockOrder} />);
        fireEvent.click(screen.getByRole('button', { name: 'Support' }));
        fireEvent.change(screen.getByLabelText('What do you need help with?'), {
            target: { value: 'Please review the revised appointment time.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Open support case' }));
        const firstMessageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(firstMessageLog).findByText('Please review the revised appointment time.')).toBeTruthy();
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: 'Support' }));

        const reopenedMessageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(reopenedMessageLog).findByText('Please review the revised appointment time.')).toBeTruthy();
        expect(fetchMock.mock.calls.filter(([url]) => url === '/support-cases')).toHaveLength(1);
        expect(fetchMock.mock.calls.filter(([url]) => url === '/support-cases/case-3/conversation')).toHaveLength(2);
    });
});

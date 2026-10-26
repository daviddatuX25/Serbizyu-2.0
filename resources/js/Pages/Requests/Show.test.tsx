import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import RequestShow from './Show';
import { router } from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string;
        [key: string]: unknown;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        post: vi.fn(),
        visit: vi.fn(),
        reload: vi.fn(),
    },
}));

vi.mock('../../components/AppShell', () => ({
    AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockRequest = {
    id: 'req-101',
    requester_user_id: 'usr-buyer-1',
    requester_name: 'Aling Nena',
    title: 'Kitchen gate valve leaking',
    description: 'Under sink pipe needs immediate replacement.',
    item_list: {
        title: 'Kitchen gate valve leaking',
        tender_mode: 'open_tender',
        requirements: ['Inspect valve', 'Replace with brass ball valve'],
    },
    budget_amount_minor: 85000,
    budget_currency: 'PHP',
    timing: { urgency: 'today' },
    location: { barangay: 'Tagudin Centro' },
    status: 'published',
    expires_at: '2026-10-10',
    created_at: '2026-09-30',
    quotes_count: 2,
};

const mockQuotes = [
    {
        id: 'qte-1',
        request_id: 'req-101',
        provider_user_id: 'prov-1',
        provider_name: 'Kuya Ben AC Services',
        quote_version: 1,
        amount_minor: 55000,
        currency: 'PHP',
        scope: {
            proposal: 'Full replacement with new brass ball valve part included.',
            estimated_duration: '1.5 hours',
        },
        work_shape: 'A1',
        status: 'submitted',
        can_accept: true,
        can_counter: true,
        created_at: '2026-09-30',
    },
    {
        id: 'qte-2',
        request_id: 'req-101',
        provider_user_id: 'prov-2',
        provider_name: 'Mang Cardo Plumbing',
        quote_version: 1,
        amount_minor: 30000,
        currency: 'PHP',
        scope: {
            proposal: 'Labor only. Customer supplies the gate valve.',
            estimated_duration: '1 hour',
        },
        work_shape: 'A1',
        status: 'submitted',
        can_accept: true,
        can_counter: true,
        created_at: '2026-09-30',
    },
];

describe('RequestShow Page', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('renders request details, tender mode badge, and active quotes', () => {
        render(
            <RequestShow
                request={mockRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="corr-1"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: true, is_owner: true }}
            />,
        );

        expect(screen.getByTestId('tender-mode-badge')).toBeTruthy();
        expect(screen.getByText('Open Citizen Tender')).toBeTruthy();
        expect(screen.getAllByText('Kitchen gate valve leaking').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Kuya Ben AC Services')).toBeTruthy();
        expect(screen.getByText('Mang Cardo Plumbing')).toBeTruthy();
        expect(screen.getByText('₱550.00')).toBeTruthy();
        expect(screen.getByText('₱300.00')).toBeTruthy();
    });

    it('renders Sealed Bidding badge and confidential notice when in sealed mode', () => {
        const sealedRequest = {
            ...mockRequest,
            item_list: {
                ...mockRequest.item_list,
                tender_mode: 'sealed_tender',
            },
        };

        render(
            <RequestShow
                request={sealedRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-other' }}
                correlationId="corr-2"
                viewer_role="eligible_responder"
                actions={{ can_quote: true, can_accept: false, is_owner: false }}
            />,
        );

        expect(screen.getAllByText('Sealed Bidding').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Quotes remain confidential until bidding closes/i)).toBeTruthy();
    });

    it('filters proposals using flexible agnostic filter pills', () => {
        render(
            <RequestShow
                request={mockRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="corr-1"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: true, is_owner: true }}
            />,
        );

        expect(screen.getByTestId('bids-filter-bar')).toBeTruthy();
        const partsPill = screen.getByRole('button', { name: /Parts Included/i });
        fireEvent.click(partsPill);

        expect(screen.getByText('Kuya Ben AC Services')).toBeTruthy();
        expect(screen.queryByText('Mang Cardo Plumbing')).toBeNull();

        const laborPill = screen.getByRole('button', { name: /Labor Only/i });
        fireEvent.click(laborPill);

        expect(screen.getByText('Mang Cardo Plumbing')).toBeTruthy();
        expect(screen.queryByText('Kuya Ben AC Services')).toBeNull();
    });

    it('opens side-by-side comparison matrix modal upon clicking Matrix button', () => {
        render(
            <RequestShow
                request={mockRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="corr-1"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: true, is_owner: true }}
            />,
        );

        const matrixBtn = screen.getByTestId('matrix-compare-btn');
        fireEvent.click(matrixBtn);

        expect(screen.getByText('Compare Offers')).toBeTruthy();
        expect(screen.getByText('Total Cost')).toBeTruthy();
        expect(screen.getByText('Turnaround')).toBeTruthy();
    });

    it('opens counter-offer modal upon clicking Counter button', () => {
        render(
            <RequestShow
                request={mockRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="corr-1"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: true, is_owner: true }}
            />,
        );

        const counterBtns = screen.getAllByTestId('negotiate-quote-btn');
        expect(counterBtns.length).toBeGreaterThan(0);
        fireEvent.click(counterBtns[0]);

        expect(screen.getByText('Counter Offer')).toBeTruthy();
        expect(screen.getByText('Proposed Rate (PHP)')).toBeTruthy();
        expect(screen.getByText(/Include Parts & Materials/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Submit Counter/i })).toBeTruthy();
    });

    it('renders courier category photo and category badge when request is in courier category', () => {
        const courierRequest = {
            ...mockRequest,
            category_code: 'courier',
            category_name: 'Courier',
            title: 'I need someone to buy me a milk tea from Big Brew',
            item_list: {
                ...mockRequest.item_list,
                title: 'I need someone to buy me a milk tea from Big Brew',
                preferred_fulfillment: 'direct',
                payment_lane: 'external_cash',
            },
        };

        render(
            <RequestShow
                request={courierRequest}
                quotes={[]}
                session={{ authenticated: true, user_id: 'usr-prov-1' }}
                correlationId="corr-3"
                viewer_role="eligible_responder"
                actions={{ can_quote: true, can_accept: false, is_owner: false }}
            />,
        );

        const img = screen.getByRole('img', {
            name: /I need someone to buy me a milk tea from Big Brew/i,
        });
        expect(img.getAttribute('src')).toBe('/photos/courier.jpg');
        expect(screen.getByText('Courier')).toBeTruthy();
        expect(screen.getByText(/Fulfillment:/i)).toBeTruthy();
        expect(screen.getByText(/Direct Cash \(COD\)/i)).toBeTruthy();
    });

    it('renders planned work pipeline stages, template, and evidence requirements when present', () => {
        const pipelineRequest = {
            ...mockRequest,
            title: 'I need someone to buy me a milk tea from Big Brew',
            category_code: 'courier',
            category_name: 'Courier',
            item_list: {
                ...mockRequest.item_list,
                pipeline: {
                    template: 'Local Errand & Pickup',
                    stages: [
                        {
                            id: 'errand-scope',
                            num: '01',
                            title: 'Meetup',
                            desc: 'Kunin sakin yung pera',
                            evidence: 'Verification proof required at this gate.',
                            evidenceType: 'dual_sign',
                        },
                        {
                            id: 'errand-task',
                            num: '02',
                            title: 'Buy',
                            desc: 'Magbili',
                            dur: '30m',
                            evidence: 'Verification proof required at this gate.',
                            evidenceType: 'photo_required',
                        },
                        {
                            id: 'errand-handoff',
                            num: '03',
                            title: 'Deliver',
                            desc: 'I bag yung ma gamit papunta sa kin.',
                            dur: '15m',
                            evidence: 'Take picture of receipt',
                            evidenceType: 'dual_sign',
                        },
                    ],
                },
            },
        };

        render(
            <RequestShow
                request={pipelineRequest}
                quotes={[]}
                session={{ authenticated: true, user_id: 'usr-prov-1' }}
                correlationId="corr-4"
                viewer_role="eligible_responder"
                actions={{ can_quote: true, can_accept: false, is_owner: false }}
            />,
        );

        expect(screen.getByTestId('request-work-pipeline')).toBeTruthy();
        expect(screen.getByText('Local Errand & Pickup')).toBeTruthy();
        expect(screen.getByText('Meetup')).toBeTruthy();
        expect(screen.getByText('Kunin sakin yung pera')).toBeTruthy();
        expect(screen.getByText('Buy')).toBeTruthy();
        expect(screen.getByText('Magbili')).toBeTruthy();
        expect(screen.getByText('Deliver')).toBeTruthy();
        expect(screen.getByText('I bag yung ma gamit papunta sa kin.')).toBeTruthy();
        expect(screen.getByText('Proof: Take picture of receipt')).toBeTruthy();
    });
    it('resets the quote composer when it switches to a different request', () => {
        const props = {
            quotes: [],
            session: { authenticated: true, user_id: 'usr-prov-1' },
            correlationId: 'corr-switch',
            viewer_role: 'eligible_responder',
            actions: { can_quote: true, can_accept: false, is_owner: false },
        };
        const firstRequest = { ...mockRequest, title: 'First request' };
        const { rerender } = render(<RequestShow request={firstRequest} {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Submit Your Quote' }));
        fireEvent.click(screen.getByRole('button', { name: /Continue to Work Plan/i }));
        expect(screen.getByText(/Step 2 of 5 · Work Plan/i)).toBeTruthy();

        rerender(
            <RequestShow
                request={{ ...firstRequest, id: 'req-102', title: 'Second request' }}
                {...props}
            />,
        );

        expect(screen.getByText(/Step 1 of 5 · Foundation/i)).toBeTruthy();
        expect(screen.getByText('Responding to Second request')).toBeTruthy();
    });
    it('holds a full appointment before awarding an A3 quote', async () => {
        const startsAt = '2030-01-04T10:00:00Z';
        const endsAt = '2030-01-04T11:15:00Z';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: {
                            duration_minutes: 75,
                            slots: [{ starts_at: startsAt, ends_at: endsAt }],
                        },
                    }),
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: {
                            id: 'appointment-hold-7',
                            starts_at: startsAt,
                            ends_at: endsAt,
                            duration_minutes: 75,
                            hold_expires_at: '2030-01-04T09:10:00Z',
                        },
                    }),
                ),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ data: { order_id: 'a3-order-7' } })),
            );
        vi.stubGlobal('fetch', fetchMock);
        render(
            <RequestShow
                request={mockRequest}
                quotes={[
                    {
                        ...mockQuotes[0],
                        work_shape: 'A3',
                        quote_version: 7,
                        can_choose_appointment: true,
                    },
                ]}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="appointment-quote"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: true, is_owner: true }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Accept & Hire' }));
        const picker = await screen.findByTestId('appointment-slot-picker');
        await waitFor(() =>
            expect(within(picker).queryByText(/Loading available times/)).toBeNull(),
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        fireEvent.click(within(picker).getByRole('button'));
        fireEvent.click(within(picker).getByRole('button', { name: 'Continue' }));
        const confirm = await screen.findByRole('button', {
            name: 'Confirm appointment and accept quote',
        });
        await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        fireEvent.click(confirm);

        await waitFor(() => expect(router.visit).toHaveBeenCalledWith('/orders/a3-order-7'));
        const awardRequest = fetchMock.mock.calls[2];
        expect(awardRequest[0]).toBe('/requests/req-101/quotes/qte-1/accept');
        expect(JSON.parse(awardRequest[1].body)).toEqual({
            appointment_reservation_id: 'appointment-hold-7',
            quote_version: 7,
        });
    });
    it('lets the requester hold a slot for their counter without accepting their own terms', async () => {
        const startsAt = '2030-01-04T10:00:00Z';
        const endsAt = '2030-01-04T11:15:00Z';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: {
                            duration_minutes: 75,
                            slots: [{ starts_at: startsAt, ends_at: endsAt }],
                        },
                    }),
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        data: {
                            id: 'counter-hold',
                            starts_at: startsAt,
                            ends_at: endsAt,
                            duration_minutes: 75,
                            hold_expires_at: '2030-01-04T09:10:00Z',
                        },
                    }),
                ),
            );
        vi.stubGlobal('fetch', fetchMock);
        render(
            <RequestShow
                request={mockRequest}
                quotes={[
                    {
                        ...mockQuotes[0],
                        work_shape: 'A3',
                        can_accept: false,
                        can_choose_appointment: true,
                    },
                ]}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="counter-slot"
                viewer_role="requester"
                actions={{ can_quote: false, can_accept: false, is_owner: true }}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Choose appointment for this counter-offer' }),
        );
        const picker = await screen.findByTestId('appointment-slot-picker');
        await waitFor(() =>
            expect(within(picker).queryByText(/Loading available times/)).toBeNull(),
        );
        fireEvent.click(within(picker).getByRole('button'));
        fireEvent.click(within(picker).getByRole('button', { name: 'Continue' }));
        const save = screen.getByRole('button', {
            name: 'Save appointment for the provider to review',
        });
        await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
        fireEvent.click(save);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(router.post).not.toHaveBeenCalled();
        expect(router.visit).not.toHaveBeenCalled();
        expect(router.reload).toHaveBeenCalled();
    });

    it('lets the provider accept an A3 counter only with the customer-selected hold', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(
                new Response(JSON.stringify({ data: { order_id: 'counter-order' } })),
            );
        vi.stubGlobal('fetch', fetchMock);
        render(
            <RequestShow
                request={mockRequest}
                quotes={[
                    {
                        ...mockQuotes[0],
                        work_shape: 'A3',
                        can_choose_appointment: false,
                        appointment_hold: {
                            id: 'customer-hold',
                            starts_at: '2030-01-04T10:00:00Z',
                            ends_at: '2030-01-04T11:15:00Z',
                            hold_expires_at: '2030-01-04T09:10:00Z',
                            duration_minutes: 75,
                        },
                    },
                ]}
                session={{ authenticated: true, user_id: 'prov-1' }}
                correlationId="provider-counter-slot"
                viewer_role="bidder"
                actions={{ can_quote: false, can_accept: true, is_owner: false }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Accept & Hire' }));
        expect(screen.queryByTestId('appointment-slot-picker')).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm appointment and accept quote' }),
        );
        await waitFor(() => expect(router.visit).toHaveBeenCalledWith('/orders/counter-order'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
            appointment_reservation_id: 'customer-hold',
            quote_version: 1,
        });
    });
});

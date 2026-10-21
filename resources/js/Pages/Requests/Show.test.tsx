import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RequestShow from './Show';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        post: vi.fn(),
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
        created_at: '2026-09-30',
    },
];

describe('RequestShow Page', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders request details, tender mode badge, and active quotes', () => {
        render(
            <RequestShow
                request={mockRequest}
                quotes={mockQuotes}
                session={{ authenticated: true, user_id: 'usr-buyer-1' }}
                correlationId="corr-1"
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
});

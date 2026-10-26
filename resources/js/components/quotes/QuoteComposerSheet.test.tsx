import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import QuoteComposerSheet from './QuoteComposerSheet';

const mockListings = [
    {
        id: 'lst-1',
        title: 'AC Inverter Deep Clean & Diagnostic',
        listing_type: 'service',
        work_shape: 'A1',
        price_amount_minor: 45000,
    },
];

describe('QuoteComposerSheet Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders Step 1 of 5 in Guided mode by default', () => {
        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-101"
                requestTitle="Water line repair"
                budgetFormatted="₱850.00"
                myListings={mockListings}
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.getByText(/Step 1 of 5 · Foundation/i)).toBeTruthy();
        expect(screen.getByText(/Choose your trade or listing foundation/i)).toBeTruthy();
        expect(screen.getByText('AC Inverter Deep Clean & Diagnostic')).toBeTruthy();
        expect(screen.getByText('Independent Labor & Custom Quote')).toBeTruthy();
    });

    it('toggles to Standard mode rendering all 5 sections in all-in-one view', () => {
        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-101"
                requestTitle="Water line repair"
                budgetFormatted="₱850.00"
                myListings={mockListings}
                onSubmit={vi.fn()}
            />,
        );

        const switcher = screen.getByTestId('composer-mode-switcher');
        const standardBtn = within(switcher).getByRole('button', { name: /Standard/i });
        fireEvent.click(standardBtn);

        expect(screen.getByText('Standard Form')).toBeTruthy();
        expect(screen.getByText(/1\. Foundation Listing & Base Craft/i)).toBeTruthy();
        expect(screen.getByText(/2\. Work Flow Pipeline & Evidence/i)).toBeTruthy();
        expect(screen.getByText(/3\. Labor Rate & Material Breakdown/i)).toBeTruthy();
        expect(screen.getByText(/4\. Logistics & Sourcing Mode/i)).toBeTruthy();
        expect(screen.getByText(/5\. Schedule, Warranty & Review/i)).toBeTruthy();
    });

    it('calculates a quote from listing price and user-entered parts without adding an invented courier rate', () => {
        const mockSubmit = vi.fn();
        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-101"
                requestTitle="Water line repair"
                budgetFormatted="₱850.00"
                myListings={mockListings}
                onSubmit={mockSubmit}
            />,
        );

        // Step 1 -> Step 2
        fireEvent.click(screen.getByRole('button', { name: /Continue to Work Plan/i }));
        expect(screen.getByText(/Step 2 of 5 · Work Plan/i)).toBeTruthy();

        // Step 2 -> Step 3
        fireEvent.click(screen.getByRole('button', { name: /Continue to Rates/i }));
        expect(screen.getByText(/Step 3 of 5 · Rates & Parts/i)).toBeTruthy();

        // Toggle parts and enter the actual offered amount.
        const partsToggle = screen.getByTestId('quote-include-parts-toggle');
        fireEvent.click(partsToggle);
        fireEvent.change(screen.getByPlaceholderText(/Hardware name/i), {
            target: { value: 'Replacement part' },
        });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Parts amount' }), {
            target: { value: '180' },
        });

        // Step 3 -> Step 4
        fireEvent.click(screen.getByRole('button', { name: /Continue to Logistics/i }));
        expect(screen.getByText(/Step 4 of 5 · Logistics/i)).toBeTruthy();

        // Select courier fulfillment; it does not assert a made-up price.
        fireEvent.click(screen.getByRole('button', { name: /Bundle Courier/i }));

        // Step 4 -> Step 5
        fireEvent.click(screen.getByRole('button', { name: /Continue to Schedule/i }));
        expect(screen.getByText(/Step 5 of 5 · Schedule & Submit/i)).toBeTruthy();

        // Total is the listing's ₱450 plus the entered ₱180 part price.
        expect(screen.getByText('₱630.00')).toBeTruthy();

        fireEvent.click(screen.getByTestId('submit-quote-proposal-btn'));
        expect(mockSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                amount_minor: 63000,
                currency: 'PHP',
                work_shape: 'A1',
                listing_id: 'lst-1',
                proposal: expect.stringContaining('Courier fulfillment'),
            }),
        );
    });

    it('does not assume a quote price from the request target budget', () => {
        const mockSubmit = vi.fn();
        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-courier-1"
                requestTitle="I need someone to buy me a milk tea from Big Brew"
                budgetFormatted="₱100.00"
                budgetAmountMinor={10000}
                categoryCode="courier"
                myListings={[]}
                onSubmit={mockSubmit}
            />,
        );

        // The budget remains context, not an assumed provider price.
        expect(screen.getByText('Target: ₱100.00')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Continue to Work Plan/i }));
        fireEvent.click(screen.getByRole('button', { name: /Continue to Rates/i }));
        const laborRateInput = screen.getByRole('spinbutton', {
            name: 'Base labor rate',
        }) as HTMLInputElement;
        fireEvent.change(laborRateInput, { target: { value: '73' } });
        expect(laborRateInput.value).toBe('73');
    });

    it('renders request pipeline stages as planned work gates and preserves custom scope step in submission', () => {
        const mockSubmit = vi.fn();
        const mockPipeline = {
            template: 'Local Errand & Pickup',
            stages: [
                {
                    num: '01',
                    title: 'Meetup',
                    desc: 'Kunin sakin yung pera',
                    evidenceType: 'dual_sign',
                },
                {
                    id: 'stage-1',
                    num: '02',
                    title: 'Buy',
                    desc: 'Magbili',
                    dur: '30m',
                    evidenceType: 'photo_required',
                },
                {
                    id: 'stage-custom',
                    num: '03',
                    title: 'Deliver',
                    desc: 'I bag yung ma gamit papunta sa kin.',
                    dur: '15m',
                    evidenceType: 'dual_sign',
                },
            ],
        };

        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-courier-1"
                requestTitle="I need someone to buy me a milk tea from Big Brew"
                budgetFormatted="₱100.00"
                budgetAmountMinor={10000}
                categoryCode="courier"
                requestPipeline={mockPipeline}
                preferredFulfillment="direct"
                myListings={[]}
                onSubmit={mockSubmit}
            />,
        );

        // Step 1 -> Step 2
        fireEvent.click(screen.getByRole('button', { name: /Continue to Work Plan/i }));
        expect(screen.getByText('01. Meetup')).toBeTruthy();
        expect(screen.getByText('Kunin sakin yung pera')).toBeTruthy();
        expect(screen.getByText('02. Buy')).toBeTruthy();
        expect(screen.getByText('Magbili')).toBeTruthy();
        expect(screen.getByText('03. Deliver')).toBeTruthy();
        expect(screen.getByText('I bag yung ma gamit papunta sa kin.')).toBeTruthy();

        // Add custom scope step
        const addStepBtn = screen.getByRole('button', { name: /\+ Add Custom Scope Step/i });
        fireEvent.click(addStepBtn);

        const customInput = screen.getByPlaceholderText(/Enter custom scope step description/i);
        fireEvent.change(customInput, { target: { value: 'Inspect cup seal & receipt' } });

        // Step 2 -> Step 3 -> Step 4 -> Step 5
        fireEvent.click(screen.getByRole('button', { name: /Continue to Rates/i }));
        for (let i = 0; i < 4; i += 1) {
            fireEvent.click(screen.getByRole('button', { name: /Increase labor rate/i }));
        }
        fireEvent.click(screen.getByRole('button', { name: /Continue to Logistics/i }));
        fireEvent.click(screen.getByRole('button', { name: /Continue to Schedule/i }));

        // The proposal textarea begins empty instead of making claims for the provider.
        expect(
            (screen.getByPlaceholderText(/Explain your tools/i) as HTMLTextAreaElement).value,
        ).toBe('');

        // Submit Proposal
        const submitBtn = screen.getByTestId('submit-quote-proposal-btn');
        fireEvent.click(submitBtn);

        expect(mockSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                amount_minor: 10000,
                currency: 'PHP',
                proposal: expect.stringContaining('Inspect cup seal & receipt'),
                milestone_stages: expect.arrayContaining([
                    expect.objectContaining({ title: 'Meetup' }),
                    expect.objectContaining({ title: 'Buy' }),
                    expect.objectContaining({ title: 'Deliver' }),
                    expect.objectContaining({ title: 'Inspect cup seal & receipt' }),
                ]),
            }),
        );
        expect(
            mockSubmit.mock.calls[0][0].milestone_stages?.map((stage: { id?: string }) => stage.id),
        ).toContain('stage-custom-2');
        expect(
            mockSubmit.mock.calls[0][0].milestone_stages?.map((stage: { id?: string }) => stage.id),
        ).toEqual([undefined, 'stage-1', 'stage-custom', 'stage-custom-2']);
    });
    it('preserves all inherited work gate mechanics, including explicitly empty proofs', () => {
        const mockSubmit = vi.fn();
        render(
            <QuoteComposerSheet
                isOpen={true}
                onClose={vi.fn()}
                requestId="req-mechanics"
                requestTitle="Test request"
                budgetAmountMinor={10000}
                requestPipeline={{
                    stages: [
                        {
                            id: 'approval',
                            title: 'Approve work',
                            evidence: 'Customer approval',
                            evidenceType: 'none',
                            clearanceMode: 'customer_approval',
                            approvalMethod: 'app_confirm',
                            requiredProofs: [],
                            handoffParty: 'recipient_confirm',
                            metricRequirements: [{ id: 'volume', name: 'Delivered volume', unit: 'litre', required: false, target: 0 }],
                        },
                    ],
                }}
                myListings={[]}
                onSubmit={mockSubmit}
            />,
        );

        for (const label of ['Continue to Work Plan', 'Continue to Rates']) {
            fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
        }
        for (let i = 0; i < 4; i += 1) {
            fireEvent.click(screen.getByRole('button', { name: /Increase labor rate/i }));
        }
        for (const label of ['Continue to Logistics', 'Continue to Schedule']) {
            fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
        }
        fireEvent.click(screen.getByTestId('submit-quote-proposal-btn'));

        expect(mockSubmit.mock.calls[0][0].milestone_stages).toEqual([
            expect.objectContaining({
                id: 'approval',
                evidence: 'Customer approval',
                evidenceType: 'none',
                clearanceMode: 'customer_approval',
                approvalMethod: 'app_confirm',
                requiredProofs: [],
                handoffParty: 'recipient_confirm',
                metric_requirements: [{ id: 'volume', name: 'Delivered volume', unit: 'litre', required: false, target: 0 }],
            }),
        ]);
    });
    it('requires a provider-authored duration for an independent appointment quote', () => {
        const onSubmit = vi.fn();
        render(
            <QuoteComposerSheet
                isOpen
                onClose={vi.fn()}
                requestId="req-appointment"
                requestTitle="Appointment request"
                requestPipeline={{ work_shape: 'A3', stages: [] }}
                myListings={[]}
                onSubmit={onSubmit}
            />,
        );
        fireEvent.click(
            within(screen.getByTestId('composer-mode-switcher')).getByRole('button', {
                name: /Standard/i,
            }),
        );
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Base labor rate' }), {
            target: { value: '200' },
        });
        const submit = screen.getByTestId('submit-quote-proposal-btn') as HTMLButtonElement;
        expect(submit.disabled).toBe(true);
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Appointment duration (minutes)' }),
            { target: { value: '75' } },
        );
        expect(submit.disabled).toBe(false);
        fireEvent.click(submit);
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                appointment_duration_minutes: 75,
                work_shape: 'A3',
                listing_id: null,
                amount_minor: 20000,
            }),
        );
    });
    it('pins the selected authored product variant and quantity in a product-linked quote', () => {
        const onSubmit = vi.fn();
        render(<QuoteComposerSheet isOpen onClose={vi.fn()} requestId="req-product" requestTitle="Product supply"
            myListings={[{ id: 'product-1', title: 'Authored product', listing_type: 'product', work_shape: 'A4',
                listing_version_id: 'version-4', price_amount_minor: 12000,
                variants: [{ id: 'small', name: 'Small package', is_default: true, price_amount_minor: 12050 },
                    { id: 'large', name: 'Large package', price_amount_minor: 25000 }] }]}
            onSubmit={onSubmit} />);
        fireEvent.click(within(screen.getByTestId('composer-mode-switcher')).getByRole('button', { name: /Standard/i }));
        expect(screen.getByRole('spinbutton', { name: 'Proposed product total' })).toHaveProperty('value', '120.5');
        fireEvent.change(screen.getByRole('combobox', { name: 'Product variant' }), { target: { value: 'large' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Product quantity' }), { target: { value: '3' } });
        fireEvent.click(screen.getByTestId('submit-quote-proposal-btn'));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            listing_id: 'product-1', listing_version_id: 'version-4', variant_id: 'large',
            quantity: 3, work_shape: 'A4', amount_minor: 75000,
        }));
    });
});

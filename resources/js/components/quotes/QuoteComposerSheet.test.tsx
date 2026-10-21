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

    it('steps through all 5 steps in Guided mode and dynamically calculates total with parts and courier', () => {
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

        // Toggle parts (+₱180)
        const partsToggle = screen.getByTestId('quote-include-parts-toggle');
        fireEvent.click(partsToggle);

        // Step 3 -> Step 4
        fireEvent.click(screen.getByRole('button', { name: /Continue to Logistics/i }));
        expect(screen.getByText(/Step 4 of 5 · Logistics/i)).toBeTruthy();

        // Select Bundle Courier (+₱80)
        fireEvent.click(screen.getByRole('button', { name: /Bundle Courier/i }));

        // Step 4 -> Step 5
        fireEvent.click(screen.getByRole('button', { name: /Continue to Schedule/i }));
        expect(screen.getByText(/Step 5 of 5 · Schedule & Submit/i)).toBeTruthy();

        // Total should be Base (450) + Parts (180) + Courier (80) = ₱710.00
        expect(screen.getByText('₱710.00')).toBeTruthy();
        expect(screen.getByText(/· Courier: \+₱80.00/i)).toBeTruthy();

        // Submit Proposal
        const submitBtn = screen.getByTestId('submit-quote-proposal-btn');
        fireEvent.click(submitBtn);

        expect(mockSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                amount_minor: 71000,
                currency: 'PHP',
                work_shape: 'A1',
                listing_id: 'lst-1',
            }),
        );
    });
});

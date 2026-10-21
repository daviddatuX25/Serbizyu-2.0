import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { router } from '@inertiajs/react';
import CreateRequest from './CreateRequest';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock window.scrollTo
window.scrollTo = vi.fn();

const mockCategories = [
    { id: 'cat-repairs', code: 'repairs', name: 'Repairs & Appliance Care' },
    { id: 'cat-electrical', code: 'electrical', name: 'Electrical & Power' },
    { id: 'cat-plumbing', code: 'plumbing', name: 'Home Plumbing & Water' },
];

describe('CreateRequest Page', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders Step 1 of 5 in Guided mode by default', () => {
        render(
            <CreateRequest
                session={{ authenticated: true, user_id: 'usr-1' }}
                categories={mockCategories}
            />,
        );

        expect(screen.getByText(/Step 1 of 5/i)).toBeTruthy();
        expect(screen.getByText(/What do you need help with\?/i)).toBeTruthy();
        expect(screen.getByTestId('request-title-input')).toBeTruthy();
        expect(screen.getByTestId('request-description-input')).toBeTruthy();
    });

    it('toggles to Standard mode and back to Guided mode cleanly', () => {
        render(
            <CreateRequest
                session={{ authenticated: true, user_id: 'usr-1' }}
                categories={mockCategories}
            />,
        );

        const switcher = screen.getByTestId('builder-mode-switcher');
        const standardBtn = switcher.querySelector('button:last-child');
        const guidedBtn = switcher.querySelector('button:first-child');

        expect(standardBtn).toBeTruthy();
        fireEvent.click(standardBtn!);

        expect(screen.getByText('Standard Form')).toBeTruthy();
        expect(screen.getByText(/1\. Request Identity & Category/i)).toBeTruthy();
        expect(screen.getByText(/2\. Scope & Governed Pipeline/i)).toBeTruthy();
        expect(screen.getByText(/3\. Location & Execution Window/i)).toBeTruthy();
        expect(screen.getByText(/4\. Budget Semantics & Tender Rules/i)).toBeTruthy();
        expect(screen.getByText(/5\. Fulfillment & Final Review/i)).toBeTruthy();

        fireEvent.click(guidedBtn!);
        expect(screen.getByText(/Step 1 of 5/i)).toBeTruthy();
    });

    it('advances through steps in Guided mode with validation', () => {
        render(
            <CreateRequest
                session={{ authenticated: true, user_id: 'usr-1' }}
                categories={mockCategories}
            />,
        );

        const titleInput = screen.getByTestId('request-title-input');
        fireEvent.change(titleInput, { target: { value: 'Fix kitchen water pipe' } });

        const continueBtn = screen.getByRole('button', { name: /Continue to Scope/i });
        expect(continueBtn.getAttribute('disabled')).toBeNull();
        fireEvent.click(continueBtn);

        // Step 2
        expect(screen.getByText(/Step 2 of 5/i)).toBeTruthy();
        expect(screen.getByText(/Detail the scope and required work steps/i)).toBeTruthy();

        // Add a requirement item
        const addBtn = screen.getByTestId('add-requirement-btn');
        const reqInput = screen.getByPlaceholderText(/Add task for/i);
        fireEvent.change(reqInput, { target: { value: 'Check under-sink drainage valve' } });
        fireEvent.click(addBtn);

        expect(screen.getAllByText('Check under-sink drainage valve').length).toBeGreaterThanOrEqual(1);

        // Continue to Step 3
        const toScheduleBtn = screen.getByRole('button', { name: /Continue to Schedule/i });
        fireEvent.click(toScheduleBtn);

        // Step 3
        expect(screen.getByText(/Step 3 of 5/i)).toBeTruthy();
        expect(screen.getByText(/When and where should the work take place\?/i)).toBeTruthy();
        expect(screen.getByTestId('barangay-select')).toBeTruthy();

        // Continue to Step 4
        const toBudgetBtn = screen.getByRole('button', { name: /Continue to Budget/i });
        fireEvent.click(toBudgetBtn);

        // Step 4
        expect(screen.getByText(/Step 4 of 5/i)).toBeTruthy();
        expect(screen.getByText(/Set your budget and bidding rules/i)).toBeTruthy();
        expect(screen.getByTestId('budget-mode-switcher')).toBeTruthy();
        expect(screen.getByTestId('tender-mode-switcher')).toBeTruthy();

        // Toggle to Sealed Bidding
        const tenderSwitcher = screen.getByTestId('tender-mode-switcher');
        const sealedBtn = within(tenderSwitcher).getByRole('button', { name: /Sealed Bidding/i });
        fireEvent.click(sealedBtn);

        // Continue to Step 5
        const toReviewBtn = screen.getByRole('button', { name: /Continue to Review/i });
        fireEvent.click(toReviewBtn);

        // Step 5
        expect(screen.getByText(/Step 5 of 5/i)).toBeTruthy();
        expect(screen.getByText(/Review your request and publish/i)).toBeTruthy();
        expect(screen.getByTestId('submit-request-btn')).toBeTruthy();
    });

    it('submits form payload with tender mode and budget settings when authenticated', () => {
        render(
            <CreateRequest
                session={{ authenticated: true, user_id: 'usr-1' }}
                categories={mockCategories}
            />,
        );

        const titleInput = screen.getByTestId('request-title-input');
        fireEvent.change(titleInput, { target: { value: 'Emergency electrical checkup' } });

        // Switch to standard mode to submit directly
        const switcher = screen.getByTestId('builder-mode-switcher');
        const standardBtn = switcher.querySelector('button:last-child');
        fireEvent.click(standardBtn!);

        const submitBtn = screen.getByTestId('submit-request-btn');
        fireEvent.click(submitBtn);

        expect(router.post).toHaveBeenCalledWith(
            '/requests',
            expect.objectContaining({
                title: 'Emergency electrical checkup',
                category_code: 'repairs',
                tender_mode: 'open_tender',
                budget_mode: 'exact',
                preferred_fulfillment: 'direct',
            }),
            expect.any(Object),
        );
    });

    it('redirects unauthenticated guest to sign-in and preserves draft in sessionStorage', () => {
        render(
            <CreateRequest
                session={{ authenticated: false }}
                categories={mockCategories}
            />,
        );

        const titleInput = screen.getByTestId('request-title-input');
        fireEvent.change(titleInput, { target: { value: 'Guest custom request draft' } });

        // Switch to standard mode
        const switcher = screen.getByTestId('builder-mode-switcher');
        const standardBtn = switcher.querySelector('button:last-child');
        fireEvent.click(standardBtn!);

        const submitBtn = screen.getByTestId('submit-request-btn');
        fireEvent.click(submitBtn);

        expect(router.visit).toHaveBeenCalledWith(
            expect.stringContaining('/auth/sign-in?return_to='),
        );

        const stored = window.sessionStorage.getItem('serbizyu.pending-request.v1');
        expect(stored).not.toBeNull();
        expect(stored).toContain('Guest custom request draft');
    });

    it('adaptively updates pipeline template and task suggestions when category changes', () => {
        render(
            <CreateRequest
                session={{ authenticated: true, user_id: 'usr-1' }}
                categories={[
                    { id: 'cat-repairs', code: 'repairs', name: 'Repairs' },
                    { id: 'cat-food', code: 'local-food', name: 'Local Food & Cookery' },
                ]}
            />,
        );

        // Switch category to local-food in Step 1
        const foodBtn = screen.getByRole('button', { name: 'Local Food & Cookery' });
        fireEvent.click(foodBtn);

        // Advance to Step 2
        const titleInput = screen.getByTestId('request-title-input');
        fireEvent.change(titleInput, { target: { value: 'Order 20 boxes bibingka' } });
        fireEvent.click(screen.getByRole('button', { name: /Continue to Scope/i }));

        // Verify category-adaptive task suggestion prompt
        expect(screen.getByText(/Load Suggested Tasks for Local Food & Cookery/i)).toBeTruthy();
        const suggestBtn = screen.getByTestId('load-suggested-tasks-btn');
        fireEvent.click(suggestBtn);

        expect(screen.getAllByText(/Prepare fresh food order per recipe specifications/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Package securely in clean food-grade containers/i).length).toBeGreaterThanOrEqual(1);

        // Toggle pipeline ON
        const pipelineToggle = screen.getByTestId('attach-pipeline-toggle');
        fireEvent.click(pipelineToggle);

        // Pipeline must adapt to Food Preparation (A4 shape)
        expect(screen.getAllByText(/Food Preparation, Packaging & Safe Dispatch/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Shape: A4/i)).toBeTruthy();
        expect(screen.getByTestId('browse-work-templates-btn')).toBeTruthy();
        expect(screen.getByTestId('customize-work-stages-btn')).toBeTruthy();
    });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CreateService from './CreateService';

// Mock Inertia router and Link
vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: null },
            flash: {},
        },
    }),
}));

const mockWorkOptions = {
    recommended: [
        {
            option_id: 'tmpl-1',
            set_code: 'tmpl-1',
            title: 'Standard Inverter Deep Clean',
            summary: 'Standard 4-stage cleaning with chemical wash.',
            work_shape: 'A1 Linear Project',
            category_codes: ['repairs'],
            catalog_code: 'tagudin-work-a1',
            set_version: 1,
            listing_types: ['service'],
            target_duration_label: '1h',
            steps: [
                { id: 's1', title: 'Inspection', duration_label: '15m', description: 'Initial diagnostic inspection.' },
                { id: 's2', title: 'Chemical Wash', duration_label: '45m', description: 'Chemical foam flush and cleanse.' },
            ],
        },
    ],
    other_archetypes: [],
};

describe('CreateService Component — Granular Guided & Standard Modes', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the compact 1-row header with Step 1 of 7 in Guided mode', () => {
        render(<CreateService workOptions={mockWorkOptions} />);

        // Header compact elements
        expect(screen.getByTestId('builder-header')).toBeTruthy();
        expect(screen.getByText('Service Listing')).toBeTruthy();
        expect(screen.getByText(/Step 1 of 7 · Craft & Title/i)).toBeTruthy();

        // Mode switcher buttons
        expect(screen.getByRole('button', { name: /^guided$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^standard$/i })).toBeTruthy();

        // Conversational Q&A prompt in Step 1
        expect(screen.getByText('What do you want to call your service?')).toBeTruthy();
        expect(
            screen.getByText(
                /Use a clear trade title with your primary craft/i,
            ),
        ).toBeTruthy();
    });

    it('advances from Step 1 to Step 2 when title is provided', () => {
        render(<CreateService workOptions={mockWorkOptions} />);

        const continueBtn = screen.getByRole('button', { name: /continue to visual proof/i });
        expect(continueBtn.getAttribute('disabled')).toBeDefined();

        // Enter service title
        const input = screen.getByPlaceholderText(/e\.g\. Inverter Split AC Deep Clean/i);
        fireEvent.change(input, { target: { value: 'Inverter Split AC Cleaning' } });

        // Click continue
        fireEvent.click(continueBtn);

        // Now on Step 2 (Proof & Photos)
        expect(screen.getByText(/Step 2 of 7 · Proof & Photos/i)).toBeTruthy();
        expect(screen.getByText('Show proof of your craft')).toBeTruthy();
        expect(screen.getByRole('button', { name: /continue to work plan/i })).toBeTruthy();
    });

    it('switches to Standard mode with high-density plain labels and all-in-one form', () => {
        render(<CreateService workOptions={mockWorkOptions} />);

        // Switch to standard mode
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Header reflects standard mode
        expect(screen.getByText('Standard Form')).toBeTruthy();

        // Plain labels visible
        expect(screen.getByText('Trade Scope & Craft')).toBeTruthy();
        expect(screen.getByText('Service Title')).toBeTruthy();
        expect(screen.getByText('Trade Category')).toBeTruthy();
        expect(screen.getByText('Media Attachments')).toBeTruthy();

        // Bottom save draft button in Standard mode
        expect(screen.getByText('Standard All-in-One Form')).toBeTruthy();
    });

    it('toggles mode via the bottom switcher button', () => {
        render(<CreateService workOptions={mockWorkOptions} />);

        const bottomSwitcher = screen.getByTestId('bottom-mode-switcher-btn');
        expect(bottomSwitcher.textContent).toContain('Switch to all-in-one standard form');

        // Toggle to standard
        fireEvent.click(bottomSwitcher);
        expect(screen.getByText('Standard Form')).toBeTruthy();
        expect(bottomSwitcher.textContent).toContain('Switch to step-by-step guided mode');

        // Toggle back to guided
        fireEvent.click(bottomSwitcher);
        expect(screen.getByText(/Step 1 of 7/i)).toBeTruthy();
        expect(bottomSwitcher.textContent).toContain('Switch to all-in-one standard form');
    });

    it('initializes with blank values without hardcoded AC repair defaults', () => {
        render(<CreateService workOptions={mockWorkOptions} />);

        // Switch to standard mode
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Preview card shows neutral fallback, NOT hardcoded AC deep clean
        expect(screen.queryByText(/Inverter Split AC Deep Clean & Checkup/i)).toBeNull();
        expect(screen.getByText('Untitled Service')).toBeTruthy();

        // Category dropdown starts unselected
        const categorySelect = screen.getByDisplayValue('Select trade category...') as HTMLSelectElement;
        expect(categorySelect.value).toBe('');

        // Deliverables shows friendly empty state
        expect(screen.getByText(/No deliverables added yet/i)).toBeTruthy();
        expect(screen.queryByText(/Evaporator coil chemical foam/i)).toBeNull();

        // Package tiers start blank
        const tierInput = screen.getByPlaceholderText(/Tier name \(e\.g\. Basic, Standard, Full Day\)/i) as HTMLInputElement;
        expect(tierInput).toBeTruthy();
        expect(tierInput.value).toBe('');

        // Add tier adds a blank tier
        const addTierBtn = screen.getByRole('button', { name: /add tier/i });
        fireEvent.click(addTierBtn);
        expect(screen.getByText('Package Tiers (2)')).toBeTruthy();
    });
});

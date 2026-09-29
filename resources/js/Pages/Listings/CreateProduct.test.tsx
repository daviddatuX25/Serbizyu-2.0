import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CreateProduct, { defaultCombosForCategory, isInstallationApplicable } from './CreateProduct';

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

describe('CreateProduct Component — Granular Guided & Standard Modes', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the compact 1-row header with Step 1 of 5 in Guided mode', () => {
        render(<CreateProduct />);

        // Header compact elements
        expect(screen.getByTestId('builder-header')).toBeTruthy();
        expect(screen.getByText('Product Listing')).toBeTruthy();
        expect(screen.getByText(/Step 1 of 5 · Item & Aisle/i)).toBeTruthy();

        // Mode switcher buttons
        expect(screen.getByRole('button', { name: /^guided$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^standard$/i })).toBeTruthy();

        // Conversational Q&A prompt in Step 1
        expect(screen.getByText('What merchandise or part are you selling?')).toBeTruthy();
        expect(
            screen.getByText(
                /Include brand, part number, and key technical specifications/i,
            ),
        ).toBeTruthy();
    });

    it('advances from Step 1 to Step 2 when title is provided', () => {
        render(<CreateProduct />);

        const continueBtn = screen.getByRole('button', { name: /continue to product photos/i });
        expect(continueBtn.getAttribute('disabled')).toBeDefined();

        // Enter product name
        const input = screen.getByPlaceholderText(/e\.g\. AC Run Capacitor/i);
        fireEvent.change(input, { target: { value: 'AC Run Capacitor 35uF 450V' } });

        // Click continue
        fireEvent.click(continueBtn);

        // Now on Step 2 (Product Photos)
        expect(screen.getByText(/Step 2 of 5 · Photos/i)).toBeTruthy();
        expect(screen.getByText('Add authentic product photos')).toBeTruthy();
        expect(screen.getByRole('button', { name: /continue to pickup point/i })).toBeTruthy();
    });

    it('switches to Standard mode with high-density plain labels and all-in-one form', () => {
        render(<CreateProduct />);

        // Switch to standard mode
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Header reflects standard mode
        expect(screen.getByText('Standard Form')).toBeTruthy();

        // Plain labels visible
        expect(screen.getByText('Product Identity & Aisle')).toBeTruthy();
        expect(screen.getByText('Product Name')).toBeTruthy();
        expect(screen.getByText('Product Category')).toBeTruthy();
        expect(screen.getByText('Product Photos & Proof')).toBeTruthy();

        // Bottom save draft button in Standard mode
        expect(screen.getByText('Standard All-in-One Form')).toBeTruthy();
    });

    it('toggles mode via the bottom switcher button', () => {
        render(<CreateProduct />);

        const bottomSwitcher = screen.getByTestId('bottom-mode-switcher-btn');
        expect(bottomSwitcher.textContent).toContain('Switch to all-in-one standard form');

        // Toggle to standard
        fireEvent.click(bottomSwitcher);
        expect(screen.getByText('Standard Form')).toBeTruthy();
        expect(bottomSwitcher.textContent).toContain('Switch to step-by-step guided mode');

        // Toggle back to guided
        fireEvent.click(bottomSwitcher);
        expect(screen.getByText(/Step 1 of 5/i)).toBeTruthy();
        expect(bottomSwitcher.textContent).toContain('Switch to all-in-one standard form');
    });

    it('initializes with blank values without hardcoded AC capacitor defaults and displays prominent variant input fields', () => {
        render(<CreateProduct />);

        // Switch to standard mode to see all fields at once
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Category dropdown starts with prompt option, not defaulted to repairs
        const categorySelect = screen.getByDisplayValue('Select product category...') as HTMLSelectElement;
        expect(categorySelect.value).toBe('');

        // Preview card shows neutral fallback, NOT hardcoded AC capacitor
        expect(screen.queryByText(/AC Run Capacitor \(35uF 450V\)/i)).toBeNull();
        expect(screen.getAllByText('Untitled Product').length).toBeGreaterThanOrEqual(1);

        // Prominent variation input fields with explicit labels
        expect(screen.getByText('Variation Title / Option Name')).toBeTruthy();
        expect(screen.getByText('Unit Price (₱)')).toBeTruthy();
        expect(screen.getByText('Stock Quantity')).toBeTruthy();

        // Input placeholder is visible and inviting
        const nameInput = screen.getByPlaceholderText(/e\.g\. Regular, Small, 500g/i) as HTMLInputElement;
        expect(nameInput).toBeTruthy();
        expect(nameInput.value).toBe('');

        // Clicking Add Variation adds another blank variant
        const addVariantBtn = screen.getByRole('button', { name: /add variation/i });
        fireEvent.click(addVariantBtn);
        expect(screen.getByText('Variant 2')).toBeTruthy();
    });

    it('places Detailed Description in Step 1 (Product Identity) and keeps Step 3 (Pickup Point) focused strictly on location', () => {
        render(<CreateProduct />);

        // Step 1 contains Title, Category, and Detailed Description
        expect(screen.getByText('What merchandise or part are you selling?')).toBeTruthy();
        expect(screen.getByLabelText(/Detailed Description/i)).toBeTruthy();

        // Advance to Step 2 (Photos)
        const nameInput = screen.getByTestId('product-title-input');
        fireEvent.change(nameInput, { target: { value: 'Fresh Banana Bread Loaf' } });
        fireEvent.click(screen.getByRole('button', { name: /continue to product photos/i }));

        // Advance to Step 3 (Pickup Point)
        expect(screen.getByText('Add authentic product photos')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /continue to pickup point/i }));

        // Step 3 is strictly "Where can buyers collect this item?" with location picker
        expect(screen.getByText('Where can buyers collect this item?')).toBeTruthy();
        expect(screen.getByText(/Barangay/i)).toBeTruthy();
        // Step 3 does NOT contain Detailed Description
        expect(screen.queryByLabelText(/Detailed Description/i)).toBeNull();
    });

    it('filters out installation labor for non-installation categories like food and defaults to Counter Pickup', () => {
        // Pure helper verification
        expect(isInstallationApplicable('local-food')).toBe(false);
        expect(isInstallationApplicable('crafts')).toBe(false);
        expect(isInstallationApplicable('repairs')).toBe(true);

        const foodCombos = defaultCombosForCategory('local-food');
        expect(foodCombos.length).toBe(1);
        expect(foodCombos[0].id).toBe('combo-delivery');
        expect(foodCombos.some((c) => c.id === 'combo-installation')).toBe(false);

        const repairCombos = defaultCombosForCategory('repairs');
        expect(repairCombos.length).toBe(2);
        expect(repairCombos.some((c) => c.id === 'combo-installation')).toBe(true);

        // Render in standard mode with local-food category
        render(
            <CreateProduct
                editingDraft={{
                    id: 'draft-food-1',
                    category_code: 'local-food',
                    title: 'Fresh Tagudin Bibingka',
                } as any}
            />,
        );

        // Switch to standard mode to see fulfillment section
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Counter Pickup is active default
        expect(screen.getByText('✓ Active Default')).toBeTruthy();

        // Installation labor must NOT be present
        expect(screen.queryByText(/Delivery \+ Installation Labor/i)).toBeNull();

        // Because pickup is active, the noisy DAG pipeline and slot binding selectors are hidden
        expect(screen.queryByText('Deal Chain Pipeline View')).toBeNull();
        expect(screen.queryByText(/Attached Partner Slots/i)).toBeNull();

        // Doorstep Delivery is offered cleanly as an inactive option with an activate button
        const activateBtn = screen.getByRole('button', { name: /Select as Active/i });
        expect(activateBtn).toBeTruthy();

        // Activating Doorstep Delivery expands the pipeline view
        fireEvent.click(activateBtn);
        expect(screen.getByText('Deal Chain Pipeline View')).toBeTruthy();
        expect(screen.getByText(/Attached Partner Slots/i)).toBeTruthy();

        // Counter Pickup now shows "Switch to Pickup Only"
        const switchBtn = screen.getByRole('button', { name: /Switch to Pickup Only/i });
        expect(switchBtn).toBeTruthy();

        // Switching back collapses the pipeline view again
        fireEvent.click(switchBtn);
        expect(screen.getByText('✓ Active Default')).toBeTruthy();
        expect(screen.queryByText('Deal Chain Pipeline View')).toBeNull();
        expect(screen.queryByText(/Attached Partner Slots/i)).toBeNull();
    });
});

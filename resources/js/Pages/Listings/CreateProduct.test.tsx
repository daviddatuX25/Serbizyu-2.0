import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { router } from '@inertiajs/react';
import type { ListingRecord, SliceSession } from '../../types';
import type * as MobileComponents from '../../components/mobile';
import type { DealChainCustomizerModalProps } from '../../components/mobile/DealChainCustomizerModal';
import CreateProduct, {
    defaultCombosForCategory,
    isInstallationApplicable,
    type WorkSetOption,
} from './CreateProduct';

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

vi.mock('../../components/mobile', async (importOriginal) => {
    const actual = await importOriginal<typeof MobileComponents>();

    return {
        ...actual,
        DealChainCustomizerModal: (
            props: DealChainCustomizerModalProps,
        ) => (
            <>
                <div
                    data-testid="deal-chain-customizer-contract"
                    data-primary-listing-type={props.primaryListingType}
                    data-combination-id={props.combination?.id ?? ''}
                />
                <actual.DealChainCustomizerModal {...props} />
            </>
        ),
    };
});

const dealChainOptions = {
    recommended: [
        {
            recipeId: 'courier-delivery',
            catalogVersion: 1,
            pattern: 'delivery',
            patternCapsule: ['Courier', 'Doorstep'],
            title: 'Tagudin Courier Delivery',
            extraFee: 35,
            extraFeeMinor: 3500,
            rating: '4.9',
            bookedCount: '24',
            desc: 'Courier transit for product orders.',
            applicableCategories: [],
            applicableListingTypes: ['product'],
            applicableWorkShapes: [],
            nodes: [
                {
                    key: 'courier',
                    role: 'Courier',
                    title: 'Danny Express',
                    sub: 'Doorstep transit',
                    type: 'delivery',
                },
            ],
        },
        {
            recipeId: 'safety-audit',
            catalogVersion: 1,
            pattern: 'audit',
            patternCapsule: ['Safety', 'Audit'],
            title: 'Product Safety Audit',
            extraFee: 50,
            extraFeeMinor: 5000,
            rating: '4.8',
            bookedCount: '12',
            desc: 'Inspection for listed products.',
            applicableCategories: [],
            applicableListingTypes: ['product'],
            applicableWorkShapes: [],
            nodes: [
                {
                    key: 'audit',
                    role: 'Auditor',
                    title: 'Safety Inspector',
                    sub: 'Product inspection',
                    type: 'audit',
                },
            ],
        },
    ],
    other_recipes: [],
};



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

    it('hydrates stored snake-case variant defaults and shows the governed A4 handoff steps', () => {
        render(
            <CreateProduct
                editingDraft={{
                    id: 'product-draft',
                    title: 'Rice flour',
                    category_code: 'food',
                    variants: [
                        { id: 'plain', name: 'Plain', price: 125, stock: 7, is_default: true },
                        { id: 'sweet', name: 'Sweet', price: 150, stock: 4, is_default: false },
                    ],
                } as ListingRecord}
            />,
        );

        expect(screen.getByText('Sourcing and package preparation')).toBeTruthy();
        expect(screen.getByText('Handoff and recipient confirmation')).toBeTruthy();
        expect(screen.getByText('Condition close-out')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /^Standard$/i }));
        expect(screen.getByText('Default Variant')).toBeTruthy();
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

    it('separates viewing the deal chain flow from setting it as active fulfillment', () => {
        render(<CreateProduct />);

        // Switch to standard mode
        const standardBtn = screen.getByRole('button', { name: /^standard$/i });
        fireEvent.click(standardBtn);

        // Counter Pickup is active default
        expect(screen.getByText('✓ Active Default')).toBeTruthy();

        // Deal chain pipeline is initially collapsed
        expect(screen.queryByText('Deal Chain Pipeline View')).toBeNull();

        // Touchpoint 1: Click "View Flow" on Doorstep Delivery
        const viewFlowBtn = screen.getByTestId('toggle-flow-combo-delivery');
        expect(viewFlowBtn).toBeTruthy();
        expect(viewFlowBtn.textContent).toContain('View Flow');
        fireEvent.click(viewFlowBtn);

        // The flow expands to explore without activating it
        expect(screen.getByText('Deal Chain Pipeline View')).toBeTruthy();
        expect(screen.getByText(/Attached Partner Slots/i)).toBeTruthy();
        // Expanded flow remains uncluttered; active state is communicated by the fulfillment control.
        expect(screen.queryByText(/Exploring flow \(Inactive\)/i)).toBeNull();

        // Baseline Counter Pickup remains the active default!
        expect(screen.getByText('✓ Active Default')).toBeTruthy();
        expect(screen.queryByText('Switch to Pickup Only')).toBeNull();

        // User can collapse it using "Hide Flow"
        expect(viewFlowBtn.textContent).toContain('Hide Flow');
        fireEvent.click(viewFlowBtn);
        expect(screen.queryByText('Deal Chain Pipeline View')).toBeNull();

        // Touchpoint 2: Click "Select as Active" to set it active
        const activateBtn = screen.getByRole('button', { name: /Select as Active/i });
        fireEvent.click(activateBtn);

        // Now it is the active selection and the flow is expanded
        expect(screen.getAllByText('✓ Active Selection').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Deal Chain Pipeline View')).toBeTruthy();

        // Counter pickup reflects that it is no longer the active default
        expect(screen.getByRole('button', { name: /Switch to Pickup Only/i })).toBeTruthy();
    });

    it('opens the Deal Chain Catalog with live search and pattern filters from Attach Delivery / Service Extension', () => {
        render(<CreateProduct dealChainOptions={dealChainOptions} />);
        fireEvent.click(screen.getByRole('button', { name: /^standard$/i }));
        fireEvent.click(screen.getByRole('button', { name: /Attach Delivery \/ Service Extension/i }));

        expect(screen.getByRole('dialog', { name: /Select or Build a Partner Deal Chain/i })).toBeTruthy();
        expect(screen.getByPlaceholderText(/Search Deal Chain sets/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'All Deal Chains' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Courier Transit' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Safety & Quality Audit' })).toBeTruthy();
    });

    it('filters the available deal chain recipes as the catalog search is typed', () => {
        render(<CreateProduct dealChainOptions={dealChainOptions} />);
        fireEvent.click(screen.getByRole('button', { name: /^standard$/i }));
        fireEvent.click(screen.getByRole('button', { name: /Attach Delivery \/ Service Extension/i }));
        fireEvent.click(screen.getByRole('button', { name: /Browse All Compatible/i }));

        const search = screen.getByPlaceholderText(/Search Deal Chain sets/i);
        expect(screen.getByText('Tagudin Courier Delivery')).toBeTruthy();
        expect(screen.getByText('Product Safety Audit')).toBeTruthy();

        fireEvent.change(search, { target: { value: 'safety' } });

        expect(screen.getByText('Product Safety Audit')).toBeTruthy();
        expect(screen.queryByText('Tagudin Courier Delivery')).toBeNull();
    });

    it('opens Deal Chain Studio for a product when building a custom chain', () => {
        render(<CreateProduct dealChainOptions={dealChainOptions} />);
        fireEvent.click(screen.getByRole('button', { name: /^standard$/i }));
        fireEvent.click(screen.getByRole('button', { name: /Attach Delivery \/ Service Extension/i }));
        fireEvent.click(screen.getByRole('button', { name: /Build Custom.*Studio/i }));

        const studio = screen.getByRole('dialog', { name: /Deal Chain Studio/i });
        expect(studio).toBeTruthy();
        expect(screen.getByTestId('deal-chain-customizer-contract').getAttribute('data-primary-listing-type')).toBe('product');
    });

    it('opens Deal Chain Studio for the expanded combo with its bound partner listing', () => {
        const testPartnerListings = [
            {
                id: 'can_cour_bicycle',
                name: 'Barangay Centro Bicycle Runner',
                providerName: 'Centro Eco Courier',
                barangay: 'Poblacion Centro',
                feeMinor: 2500,
                price: 25,
                role: 'courier',
                sub: 'Eco transit ~15 mins',
                rating: '4.8',
            },
        ];
        render(<CreateProduct partnerListings={testPartnerListings} />);
        fireEvent.click(screen.getByRole('button', { name: /^Standard$/i }));
        fireEvent.click(screen.getByTestId('toggle-flow-combo-delivery'));
        fireEvent.click(screen.getByTestId('customize-deal-chain-combo-delivery'));

        const studio = screen.getByRole('dialog', { name: /Deal Chain Studio/i });
        expect(studio).toBeTruthy();
        expect(screen.getByTestId('deal-chain-customizer-contract').getAttribute('data-combination-id')).toBe('combo-delivery');

        fireEvent.click(within(studio).getByRole('button', { name: /Change Partner/i }));
        fireEvent.click(screen.getByText('Barangay Centro Bicycle Runner'));
        fireEvent.click(screen.getByRole('button', { name: /Confirm Partner Selection/i }));
        expect(within(studio).getAllByText('Barangay Centro Bicycle Runner').length).toBeGreaterThan(0);
    });

    it('renders preparation lead time controls on inventory options without leaked protocol jargon', () => {
        render(<CreateProduct />);
        fireEvent.click(screen.getByRole('button', { name: /^Standard$/i }));

        expect(screen.getByText(/Order Preparation Lead Time/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /In Stock \(Ready\)/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /1–2 Hours Prep/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /1 Day Lead Time/i })).toBeTruthy();

        // Can toggle lead time
        fireEvent.click(screen.getByRole('button', { name: /1–2 Hours Prep/i }));
        expect(screen.getByRole('button', { name: /1–2 Hours Prep/i }).className).toContain('bg-[#0F2F58]');

        // Counter pickup is clean without leaked internal protocol codes
        expect(screen.getByText('Counter Pickup at Stall')).toBeTruthy();
        expect(screen.queryByText('A4 Handoff')).toBeNull();
        expect(screen.queryByText(/Counter Custody/i)).toBeNull();
    });

    it('submits all governed A4 node mechanics from the selected Work Set', () => {
        const mockPost = vi.fn();
        vi.mocked(router.post).mockImplementation(mockPost);

        const session = {
            authenticated: true,
            user: { id: 'usr-1', name: 'Vendor Kuya', email: 'vendor@tagudin.ph' },
            current_slice: 'product',
        } as unknown as SliceSession;
        const productSet = {
            catalog_code: 'tagudin-product-handoff-a4',
            set_code: 'set-product-market-handoff',
            set_version: 1,
            work_shape: 'A4',
            title: 'Market Product Preparation & Handoff',
            summary: 'Prepare package, confirm recipient or courier handoff, and record condition close-out.',
            steps: [
                {
                    id: 'a4-prepare',
                    ordinal: 1,
                    title: 'Sourcing and package preparation',
                    description: 'Verify the product count, condition, packaging, and dispatch details.',
                    node_kind: 'checkin_intake',
                    evidence_type: 'receipt_upload',
                    evidence_description: 'Receipt, inventory slip, or prepared package evidence.',
                    control_mode: 'provider_advance',
                    mandatory: true,
                    duration_label: null,
                    required_proofs: ['photo_proof'],
                    approval_method: 'none',
                    handoff_party: null,
                    checklist_items: [{ id: 'count-item', label: 'Verify product count', required: true }],
                    metric_requirements: [{ id: 'weight', name: 'Package weight', unit: 'kg', required: true, target: 2 }],
                },
                {
                    id: 'a4-handoff',
                    ordinal: 2,
                    title: 'Handoff and recipient confirmation',
                    description: 'Transfer the product to the recipient or independently contracted courier.',
                    node_kind: 'handoff_ready',
                    evidence_type: 'dual_sign',
                    evidence_description: 'Recipient confirmation and product count evidence.',
                    control_mode: 'counterparty_handoff',
                    mandatory: true,
                    duration_label: null,
                    required_proofs: [],
                    approval_method: 'none',
                    handoff_party: null,
                },
                {
                    id: 'a4-close',
                    ordinal: 3,
                    title: 'Condition close-out',
                    description: 'Record the delivered condition and close the product work instance.',
                    node_kind: 'final_signoff',
                    evidence_type: 'photo_required',
                    evidence_description: 'Final package or recipient handoff photo where applicable.',
                    control_mode: 'customer_confirm',
                    mandatory: true,
                    duration_label: null,
                    required_proofs: ['photo_proof'],
                    approval_method: 'app_confirm',
                    handoff_party: null,
                },
            ],
        } as unknown as WorkSetOption;

        render(
            <CreateProduct
                session={session}
                workOptions={{ recommended: [productSet], other_archetypes: [] }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /^Standard$/i }));
        fireEvent.change(screen.getByTestId('product-title-input'), {
            target: { value: 'Fresh Tagudin Bibingka' },
        });
        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '120' } });
        fireEvent.click(screen.getByRole('button', { name: /Save Private Draft/i }));

        expect(mockPost).toHaveBeenCalled();
        expect(mockPost.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                work_catalog_code: 'set-product-market-handoff',
                milestone_stages: [
                    expect.objectContaining({
                        id: 'a4-prepare',
                        ordinal: 1,
                        node_kind: 'checkin_intake',
                        evidence_type: 'receipt_upload',
                        evidence_description: 'Receipt, inventory slip, or prepared package evidence.',
                        control_mode: 'provider_advance',
                        required_proofs: ['photo_proof'],
                        approval_method: 'none',
                        checklist_items: [{ id: 'count-item', label: 'Verify product count', required: true }],
                        metric_requirements: [{ id: 'weight', name: 'Package weight', unit: 'kg', required: true, target: 2 }],
                    }),
                    expect.objectContaining({
                        id: 'a4-handoff',
                        ordinal: 2,
                        node_kind: 'handoff_ready',
                        evidence_type: 'dual_sign',
                        control_mode: 'counterparty_handoff',
                        approval_method: 'none',
                    }),
                    expect.objectContaining({
                        id: 'a4-close',
                        ordinal: 3,
                        node_kind: 'final_signoff',
                        evidence_type: 'photo_required',
                        control_mode: 'customer_confirm',
                        required_proofs: ['photo_proof'],
                        approval_method: 'app_confirm',
                    }),
                ],
            }),
        );
    });

    it('submits draft with canonical A4 work shape, work_catalog_code, and governed milestone stages', () => {
        const mockPost = vi.fn();
        vi.mocked(router.post).mockImplementation(mockPost);

        const session = {
            authenticated: true,
            user: { id: 'usr-1', name: 'Vendor Kuya', email: 'vendor@tagudin.ph' },
            current_slice: 'product',
        } as unknown as SliceSession;

        render(
            <CreateProduct session={session} />,
        );
        fireEvent.click(screen.getByRole('button', { name: /^Standard$/i }));

        // Fill minimal required title and price
        const titleInput = screen.getByTestId('product-title-input');
        fireEvent.change(titleInput, { target: { value: 'Fresh Tagudin Bibingka' } });

        const priceInput = screen.getAllByRole('spinbutton')[0];
        fireEvent.change(priceInput, { target: { value: '120' } });

        // Click save draft
        const saveBtn = screen.getByRole('button', { name: /Save Private Draft/i });
        fireEvent.click(saveBtn);

        expect(mockPost).toHaveBeenCalled();
        expect(mockPost.mock.calls[0][0]).toBe('/listings');
        expect(mockPost.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                listing_type: 'product',
                work_shape: 'A4',
                work_catalog_code: 'set-product-market-handoff',
                work_set_version: 1,
                prep_lead_time: 'in_stock',
                milestone_stages: expect.arrayContaining([
                    expect.objectContaining({ id: 'a4-prepare', title: 'Sourcing and package preparation' }),
                    expect.objectContaining({ id: 'a4-handoff', title: 'Handoff and recipient confirmation' }),
                    expect.objectContaining({ id: 'a4-close', title: 'Condition close-out' }),
                ]),
            }),
        );
    });
});

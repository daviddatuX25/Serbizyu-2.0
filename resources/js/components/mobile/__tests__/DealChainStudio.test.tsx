import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DealChainCanvas from '../DealChainCanvas';
import DealChainCustomizerModal from '../DealChainCustomizerModal';
import type { DealChainCombination, DealChainNode, SlotType } from '../types';

afterEach(cleanup);

describe('DealChain Studio & n8n Canvas Architecture', () => {
    describe('DealChainCanvas (Authentic n8n DAG Flow)', () => {
        const sampleNodes: DealChainNode[] = [
            {
                id: 'node-store-1',
                role: 'STORE',
                title: '35uF Capacitor',
                sub: '₱180.00',
                type: 'store',
                bg: '#FEF3C7',
                color: '#B45309',
                tier: 0,
            },
            {
                id: 'node-courier-1',
                role: 'COURIER',
                title: 'Danny Express',
                sub: '₱35.00',
                type: 'delivery',
                bg: '#E0F2FE',
                color: '#0284C7',
                tier: 1,
            },
            {
                id: 'node-labor-1',
                role: 'LABOR',
                title: 'Kuya Ben AC Labor',
                sub: '₱450.00',
                type: 'labor',
                bg: '#DCFCE7',
                color: '#15803D',
                tier: 2,
                isPrimary: true,
            },
        ];

        it('renders squircle node cards with role icons, titles, and prices', () => {
            render(
                <DealChainCanvas
                    nodes={sampleNodes}
                    selectedNodeId="node-store-1"
                />,
            );

            expect(screen.getByTestId('deal-chain-canvas')).toBeDefined();
            expect(screen.getByText('35uF Capacitor')).toBeDefined();
            expect(screen.getByText('Danny Express')).toBeDefined();
            expect(screen.getByText('Kuya Ben AC Labor')).toBeDefined();
            expect(screen.getByText('3 Nodes · 3 Tiers')).toBeDefined();
        });

        it('triggers onNodeClick when an n8n squircle node is clicked', () => {
            const onNodeClick = vi.fn();
            render(
                <DealChainCanvas
                    nodes={sampleNodes}
                    selectedNodeId="node-store-1"
                    onNodeClick={onNodeClick}
                />,
            );

            const courierNode = screen.getByTestId('n8n-node-node-courier-1');
            fireEvent.click(courierNode);
            expect(onNodeClick).toHaveBeenCalledWith('node-courier-1');
        });

        it('triggers onAddStepClick when the edge [+] button is clicked without selecting the node', () => {
            const onNodeClick = vi.fn();
            const onAddStep = vi.fn();

            render(
                <DealChainCanvas
                    nodes={sampleNodes}
                    selectedNodeId="node-store-1"
                    onNodeClick={onNodeClick}
                    onAddStepClick={onAddStep}
                />,
            );

            const addBtn = screen.getByTestId('add-step-btn-node-store-1');
            fireEvent.click(addBtn);

            expect(onAddStep).toHaveBeenCalledTimes(1);
            expect(onAddStep.mock.calls[0][0]).toBe('node-store-1');
            expect(onNodeClick).not.toHaveBeenCalled();
        });

        it('renders parallel fork and join barriers when multiple nodes occupy the same tier', () => {
            const parallelNodes: DealChainNode[] = [
                {
                    id: 'node-bakery',
                    role: 'STORE',
                    title: 'Tagudin Bakery',
                    sub: '₱850.00',
                    type: 'store',
                    bg: '#FEF3C7',
                    color: '#B45309',
                    tier: 0,
                },
                {
                    id: 'node-florist',
                    role: 'STORE',
                    title: 'Centro Florist',
                    sub: '₱400.00',
                    type: 'store',
                    bg: '#FEF3C7',
                    color: '#B45309',
                    tier: 0, // Same tier 0 = parallel
                },
                {
                    id: 'node-courier',
                    role: 'COURIER',
                    title: 'Danny Express',
                    sub: '₱80.00',
                    type: 'delivery',
                    bg: '#E0F2FE',
                    color: '#0284C7',
                    tier: 1, // Downstream join
                },
            ];

            render(
                <DealChainCanvas
                    nodes={parallelNodes}
                    selectedNodeId="node-bakery"
                />,
            );

            expect(screen.getByText('Tagudin Bakery')).toBeDefined();
            expect(screen.getByText('Centro Florist')).toBeDefined();
            expect(screen.getByText('Danny Express')).toBeDefined();
            expect(screen.getByText('3 Nodes · 2 Tiers')).toBeDefined();
            expect(screen.getByText(/ALL OF · Wait for all inputs/)).toBeDefined();
            expect(screen.getByText('2 INPUTS')).toBeDefined();
        });
        it('selects and highlights a clickable visual gate node', () => {
            const onGateClick = vi.fn();
            const { rerender } = render(
                <DealChainCanvas
                    nodes={[
                        { ...sampleNodes[0], tier: 0 },
                        { ...sampleNodes[1], id: 'node-store-2', title: 'Second Store', type: 'store', tier: 0 },
                        { ...sampleNodes[2], tier: 1 },
                    ]}
                    onGateClick={onGateClick}
                />,
            );
            const gate = screen.getByTestId('gate-node-node-labor-1');
            expect(gate).toBeDefined();
            fireEvent.click(gate);
            expect(onGateClick).toHaveBeenCalledWith('gate-node-labor-1');
            rerender(
                <DealChainCanvas
                    nodes={[
                        { ...sampleNodes[0], tier: 0 },
                        { ...sampleNodes[1], id: 'node-store-2', title: 'Second Store', type: 'store', tier: 0 },
                        { ...sampleNodes[2], tier: 1 },
                    ]}
                    selectedGateId="gate-node-labor-1"
                />,
            );
            expect(screen.getByTestId('gate-node-node-labor-1').getAttribute('style')).toContain('rgba(16, 185, 129, 0.7)');
        });
    });

    describe('DealChainCustomizerModal (Dual-Pane Studio)', () => {
        const sampleCombo: DealChainCombination = {
            id: 'combo-test-1',
            title: 'Turnkey Split AC Parts & Transit Relay',
            icon: 'Sliders',
            isDefault: true,
            recipeId: 'turnkey_parts',
            catalogVersion: 1,
            nodes: [],
            slots: [
                {
                    id: 'slot-store-1',
                    type: 'store',
                    role: 'Hardware / Part Partner',
                    name: 'Tagudin Hardware Depot',
                    meta: '₱180.00 parts budget',
                    feeMinor: 18000,
                    coverThumbnailUrl: '/photos/ac-capacitor.jpg',
                    tier: 0,
                    conditionCode: 'all_inputs_ready',
                },
                {
                    id: 'slot-courier-1',
                    type: 'delivery',
                    role: 'Doorstep Courier Runner',
                    name: 'Danny Express Motorcycle Pool',
                    meta: '₱35.00 route fee',
                    feeMinor: 3500,
                    coverThumbnailUrl: '/photos/courier.jpg',
                    tier: 1,
                    conditionCode: 'all_inputs_ready',
                },
            ],
        };

        it('renders modal with title, canvas preview, and left/right dual-pane split', () => {
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={vi.fn()}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            expect(screen.getByText(/Deal Chain Studio · Multi-Agency Relay/i)).toBeDefined();
            expect(screen.getByDisplayValue('Turnkey Split AC Parts & Transit Relay')).toBeDefined();
            expect(screen.getByTestId('deal-chain-canvas')).toBeDefined();
            expect(screen.getAllByText('Tagudin Hardware Depot').length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Danny Express Motorcycle Pool')).toBeDefined();
            expect(screen.getByText(/Total Partner Addon:/i)).toBeDefined();
        });
        it('opens the Dependency Gate Inspector and applies gate edits to the combination', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo,
                slots: [
                    { ...sampleCombo.slots[0], tier: 0 },
                    { ...sampleCombo.slots[0], id: 'slot-store-2', name: 'Centro Florist', tier: 0 },
                    { ...sampleCombo.slots[1], id: 'slot-courier-join', tier: 1, allowBypass: true },
                ],
            };
            render(
                <DealChainCustomizerModal
                    open
                    onClose={vi.fn()}
                    combination={combo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByTestId('gate-node-slot-courier-join'));
            expect(screen.getByTestId('dependency-gate-inspector')).toBeDefined();
            expect(screen.getByText('Tagudin Hardware Depot')).toBeDefined();
            expect(screen.getAllByText('Centro Florist').length).toBeGreaterThan(0);
            fireEvent.change(screen.getByLabelText('Condition code'), { target: { value: 'all_inputs_ready' } });
            const apply = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            expect(apply).toHaveProperty('disabled', true);
            fireEvent.click(apply);
            expect(onSave).not.toHaveBeenCalled();
            fireEvent.click(screen.getByRole('button', { name: 'Remove bypass' }));
            fireEvent.click(apply);
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.dependencies?.filter((edge) => edge.successorId === 'slot-courier-join').map((edge) => edge.conditionCode))
                .toEqual(['part_ready', 'part_ready']);
        });
        it('keeps a gate on the primary listing editable and saves it in combination nodes', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo,
                slots: [
                    { ...sampleCombo.slots[0], tier: 0 },
                    { ...sampleCombo.slots[0], id: 'slot-store-2', name: 'Centro Florist', tier: 0 },
                ],
            };
            render(
                <DealChainCustomizerModal
                    open
                    onClose={vi.fn()}
                    combination={combo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByTestId('gate-node-node-primary-anchor'));
            expect(screen.getByTestId('dependency-gate-inspector')).toBeDefined();
            fireEvent.change(screen.getByLabelText('Condition code'), { target: { value: 'all_inputs_ready' } });
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes.find((node) => node.isPrimary)?.id).toBe('node-primary-anchor');
            expect(saved.dependencies?.filter((edge) => edge.successorId === 'node-primary-anchor').map((edge) => edge.predecessorId))
                .toEqual(['slot-store-1', 'slot-store-2']);
            expect(saved.nodes.some((node) => node.allowBypass === true)).toBe(false);
        });

        it('moves a slot between parallel and sequential tiers with structured controls', () => {
            const onSave = vi.fn();
            render(
                <DealChainCustomizerModal
                    open
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            const courierCard = screen.getByText('Danny Express Motorcycle Pool').closest('div.group');
            expect(courierCard).not.toBeNull();
            const cardButtons = Array.from(courierCard!.querySelectorAll('button'));
            fireEvent.click(cardButtons.find((button) => button.textContent?.includes('Run in Parallel'))!);
            fireEvent.click(cardButtons.find((button) => button.textContent?.includes('Make Sequential'))!);
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots[0].tier).toBe(0);
            expect(saved.slots[1].tier).toBe(1);
        });

        it('allows modifying slot name, fee, and condition code in the inspector', () => {
            const onSave = vi.fn();
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            // Change slot title
            const titleInput = screen.getByDisplayValue('Tagudin Hardware Depot');
            fireEvent.change(titleInput, { target: { value: 'Centro Hardware Express' } });

            // Change fee
            const feeInput = screen.getByDisplayValue('180');
            fireEvent.change(feeInput, { target: { value: '220' } });

            // Save chain
            const saveBtn = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            fireEvent.click(saveBtn);

            expect(onSave).toHaveBeenCalledTimes(1);
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots[0].name).toBe('Centro Hardware Express');
            expect(saved.slots[0].feeMinor).toBe(22000);
            expect(saved.isCustom).toBe(true);
        });

        it('toggles partner assignment mode across Preferred Partner, Buyer Choice, and Community Open Pool', () => {
            const onSave = vi.fn();
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            // Test Community Open Pool
            const openPoolBtn = screen.getByRole('button', { name: /Community Open Pool/i });
            fireEvent.click(openPoolBtn);

            const saveBtn = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            fireEvent.click(saveBtn);

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots[0].isOpenSlot).toBe(true);
            expect(saved.slots[0].assignmentMode).toBe('open_pool');
            expect(saved.slots[0].listingId).toBeUndefined();
        });

        it('triggers onPickPartnerForSlot when Change Partner button is clicked', () => {
            const onPickPartner = vi.fn();
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={vi.fn()}
                    onPickPartnerForSlot={onPickPartner}
                />,
            );

            const changeBtn = screen.getByRole('button', { name: /Change Partner ▾/i });
            fireEvent.click(changeBtn);

            expect(onPickPartner).toHaveBeenCalledTimes(1);
            expect(onPickPartner.mock.calls[0][0]).toBe('store');
        });

        it('allows adding a new step from the slot library as sequential or parallel', () => {
            const onSave = vi.fn();
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            // Open library tab
            const libraryTabBtn = screen.getByRole('button', { name: /From Slot Library/i });
            fireEvent.click(libraryTabBtn);

            // Add sequential step
            fireEvent.click(screen.getByRole('button', { name: 'Add Certified Safety & Quality Auditor as sequential step' }));

            const saveBtn = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            fireEvent.click(saveBtn);

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots.length).toBe(3);
            expect(saved.slots[2].type).toBe('audit');
        });

        it('allows reordering and deleting slots', () => {
            const onSave = vi.fn();
            render(
                <DealChainCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            // Down button on first slot
            const downButtons = screen.getAllByRole('button', { name: /Move slot down/i });
            fireEvent.click(downButtons[0]);

            const saveBtn = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            fireEvent.click(saveBtn);

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots[0].type).toBe('delivery');
            expect(saved.slots[1].type).toBe('store');
        });

        it('preserves an explicit saved graph and buyer-choice mode when only its title changes', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo,
                planVersion: 1,
                nodes: [
                    { id: 'host-service', role: 'Service', title: 'Main service', sub: '', type: 'labor', bg: '', color: '', isPrimary: true },
                    { id: 'node-materials', role: 'Store', title: 'Later materials', sub: '', type: 'store', bg: '', color: '', isPrimary: false, listingId: 'preferred-display-only', assignmentMode: 'buyer_choice', isOpenSlot: true },
                ],
                slots: [{ ...sampleCombo.slots[0], listingId: 'preferred-display-only', assignmentMode: 'buyer_choice', isOpenSlot: true }],
                dependencies: [{ id: 'host-materials', predecessorId: 'host-service', successorId: 'node-materials', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' }],
            };
            render(<DealChainCustomizerModal
                open onClose={vi.fn()} combination={combo}
                primaryListingTitle="Main service" primaryListingPricePesos={450}
                primaryListingType="service" primaryListingCategoryCode="repairs"
                onSave={onSave} onPickPartnerForSlot={vi.fn()}
            />);
            fireEvent.change(screen.getByDisplayValue(sampleCombo.title), { target: { value: 'Service with later materials' } });
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes.find((node) => node.isPrimary)?.id).toBe('host-service');
            expect(saved.dependencies).toEqual(combo.dependencies);
            expect(saved.nodes.find((node) => node.id === 'node-materials')).toMatchObject({ assignmentMode: 'buyer_choice', isOpenSlot: true });
        });
        it('preserves a sparse branched graph and primary placement after editing a condition and reopening', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo,
                planVersion: 1,
                nodes: [
                    { id: 'primary-main', role: 'Service', title: 'Main service', sub: '', type: 'labor', bg: '', color: '', isPrimary: true, tier: 2 },
                    { id: 'parts-independent', role: 'Store', title: 'Parts', sub: '', type: 'store', bg: '', color: '', isPrimary: false, tier: 0 },
                    { id: 'courier-independent', role: 'Courier', title: 'Courier', sub: '', type: 'delivery', bg: '', color: '', isPrimary: false, tier: 0 },
                    { id: 'labor-join', role: 'Labor', title: 'Install', sub: '', type: 'labor', bg: '', color: '', isPrimary: false, tier: 3 },
                    { id: 'audit-final', role: 'Audit', title: 'Audit', sub: '', type: 'audit', bg: '', color: '', isPrimary: false, tier: 4 },
                ],
                slots: [
                    { id: 'parts-independent', type: 'store', role: 'Store', name: 'Parts', meta: 'Preferred parts', listingId: 'parts-listing', assignmentMode: 'preferred_partner', tier: 0, conditionCode: 'part_ready' },
                    { id: 'courier-independent', type: 'delivery', role: 'Courier', name: 'Courier', meta: 'Preferred courier', listingId: 'courier-listing', assignmentMode: 'preferred_partner', tier: 0, conditionCode: 'delivery_signed' },
                    { id: 'labor-join', type: 'installation', role: 'Labor', name: 'Install', meta: 'Preferred labor', listingId: 'labor-listing', assignmentMode: 'preferred_partner', tier: 3, conditionCode: 'work_completed' },
                    { id: 'audit-final', type: 'audit', role: 'Audit', name: 'Audit', meta: 'Buyer choice', assignmentMode: 'buyer_choice', isOpenSlot: true, tier: 4, conditionCode: 'work_completed' },
                ],
                dependencies: [
                    { id: 'edge-primary-parts', predecessorId: 'parts-independent', successorId: 'primary-main', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
                    { id: 'edge-parts-labor', predecessorId: 'parts-independent', successorId: 'labor-join', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
                    { id: 'edge-primary-labor', predecessorId: 'primary-main', successorId: 'labor-join', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
                    { id: 'edge-courier-audit', predecessorId: 'courier-independent', successorId: 'audit-final', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
                    { id: 'edge-labor-audit', predecessorId: 'labor-join', successorId: 'audit-final', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
                ],
            };
            const props = {
                open: true,
                onClose: vi.fn(),
                primaryListingTitle: 'Main service',
                primaryListingPricePesos: 450,
                primaryListingType: 'service' as const,
                primaryListingCategoryCode: 'repairs',
                onPickPartnerForSlot: vi.fn(),
            };
            const { rerender } = render(<DealChainCustomizerModal {...props} combination={combo} onSave={onSave} />);
            fireEvent.click(screen.getByTestId('gate-node-primary-main'));
            fireEvent.change(screen.getByLabelText('Condition code'), { target: { value: 'work_completed' } });
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.dependencies).toEqual([
                { ...combo.dependencies![0], conditionCode: 'work_completed' },
                combo.dependencies![1],
                combo.dependencies![2],
                combo.dependencies![3],
                combo.dependencies![4],
            ]);
            expect(saved.nodes.map(({ id, type, isPrimary, tier }) => ({ id, type, isPrimary, tier })))
                .toEqual(combo.nodes.map(({ id, type, isPrimary, tier }) => ({ id, type, isPrimary, tier })));

            const onReopenSave = vi.fn();
            rerender(<DealChainCustomizerModal {...props} combination={saved} onSave={onReopenSave} />);
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));
            const reopened: DealChainCombination = onReopenSave.mock.calls[0][0];
            expect(reopened.nodes.map(({ id, type, isPrimary, tier }) => ({ id, type, isPrimary, tier })))
                .toEqual(combo.nodes.map(({ id, type, isPrimary, tier }) => ({ id, type, isPrimary, tier })));
            expect(reopened.dependencies).toEqual(saved.dependencies);
        });

        it('saves a deliberate role change, explicitly reconciles its source gate, and rebinds the partner', () => {
            const onSave = vi.fn();
            const onPickPartnerForSlot = vi.fn((
                _type: SlotType,
                onPicked: (partner: { id: string; title: string; providerName: string; priceMinor: number }) => void,
            ) => onPicked({
                id: 'labor-provider-listing',
                title: 'Local Installer',
                providerName: 'Local Installer',
                priceMinor: 25000,
            }));
            const combo: DealChainCombination = {
                ...sampleCombo,
                planVersion: 1,
                nodes: [
                    { id: 'primary-main', role: 'Service', title: 'Main service', sub: '', type: 'labor', bg: '', color: '', isPrimary: true, tier: 0 },
                    { id: 'partner-node', role: 'Store', title: 'Hardware Depot', sub: 'Old store facts', type: 'store', bg: '', color: '', isPrimary: false, tier: 1, listingId: 'hardware-listing', feeMinor: 18000, coverThumbnailUrl: '/hardware.png', assignmentMode: 'preferred_partner' },
                    { id: 'followup-audit', role: 'Audit', title: 'Final check', sub: '', type: 'audit', bg: '', color: '', isPrimary: false, tier: 2, assignmentMode: 'buyer_choice', isOpenSlot: true },
                ],
                slots: [
                    { id: 'partner-node', type: 'store', role: 'Store', name: 'Hardware Depot', meta: 'Old store facts', listingId: 'hardware-listing', feeMinor: 18000, coverThumbnailUrl: '/hardware.png', assignmentMode: 'preferred_partner', tier: 1, conditionCode: 'work_completed' },
                    { id: 'followup-audit', type: 'audit', role: 'Audit', name: 'Final check', meta: 'Buyer choice', assignmentMode: 'buyer_choice', isOpenSlot: true, tier: 2, conditionCode: 'part_ready' },
                ],
                dependencies: [
                    { id: 'edge-main-partner', predecessorId: 'primary-main', successorId: 'partner-node', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
                    { id: 'edge-partner-audit', predecessorId: 'partner-node', successorId: 'followup-audit', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
                ],
            };
            const props = {
                open: true,
                onClose: vi.fn(),
                primaryListingTitle: 'Main service',
                primaryListingPricePesos: 450,
                primaryListingType: 'service' as const,
                primaryListingCategoryCode: 'repairs',
            };
            const { rerender } = render(<DealChainCustomizerModal {...props} combination={combo} onSave={onSave} onPickPartnerForSlot={onPickPartnerForSlot} />);
            fireEvent.click(screen.getByTestId('n8n-node-partner-node'));
            fireEvent.change(screen.getByText('Slot Title & Role').parentElement!.querySelector('select')!, { target: { value: 'installation' } });
            expect(screen.queryByText('Old store facts')).toBeNull();
            const saveButton = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            expect(saveButton).toHaveProperty('disabled', true);
            fireEvent.click(screen.getByTestId('n8n-node-followup-audit'));
            fireEvent.change(screen.getByText('Condition Code:').parentElement!.querySelector('select')!, { target: { value: 'work_completed' } });
            fireEvent.click(screen.getByTestId('n8n-node-partner-node'));
            fireEvent.click(screen.getByRole('button', { name: /Change Partner/i }));
            expect(onPickPartnerForSlot).toHaveBeenCalledWith('installation', expect.any(Function));
            expect(saveButton).toHaveProperty('disabled', false);
            fireEvent.click(saveButton);

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes.find((node) => node.id === 'partner-node')).toMatchObject({
                type: 'labor',
                listingId: 'labor-provider-listing',
                title: 'Local Installer',
            });
            expect(saved.dependencies).toEqual([
                combo.dependencies![0],
                { ...combo.dependencies![1], conditionCode: 'work_completed' },
            ]);
            rerender(<DealChainCustomizerModal {...props} combination={saved} onSave={vi.fn()} onPickPartnerForSlot={onPickPartnerForSlot} />);
            expect(screen.getByText('Slot Title & Role').parentElement!.querySelector('select')).toHaveProperty('value', 'installation');
            expect(screen.getByDisplayValue('Local Installer')).toBeDefined();
        });

        it('uses canonical node facts instead of stale slot cache when the bound listing differs', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo,
                planVersion: 1,
                nodes: [
                    { id: 'primary-main', role: 'Service', title: 'Main service', sub: '', type: 'labor', bg: '', color: '', isPrimary: true, tier: 0 },
                    { id: 'courier-node', role: 'Courier', title: 'Canonical courier', sub: 'Canonical terms', type: 'delivery', bg: '', color: '', isPrimary: false, tier: 1, listingId: 'canonical-courier', feeMinor: 7200, assignmentMode: 'preferred_partner' },
                ],
                slots: [
                    { id: 'courier-node', type: 'store', role: 'Old store role', name: 'Old cached partner', meta: 'Old cached facts', listingId: 'old-store-listing', feeMinor: 18000, assignmentMode: 'preferred_partner', tier: 1, conditionCode: 'work_completed' },
                ],
                dependencies: [
                    { id: 'edge-primary-courier', predecessorId: 'primary-main', successorId: 'courier-node', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
                ],
            };
            render(
                <DealChainCustomizerModal
                    open
                    onClose={vi.fn()}
                    combination={combo}
                    primaryListingTitle="Main service"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );
            expect(screen.getAllByText('Canonical courier').length).toBeGreaterThan(0);
            expect(screen.queryByText('Old cached partner')).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes.find((node) => node.id === 'courier-node')).toMatchObject({
                type: 'delivery',
                listingId: 'canonical-courier',
                title: 'Canonical courier',
                feeMinor: 7200,
            });
            expect(saved.dependencies).toEqual(combo.dependencies);
        });

        it('preserves canonical preferred defaults and valid role aliases despite stale cached assignment flags', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo, planVersion: 1,
                nodes: [
                    { id: 'courier-source', role: 'Courier Partner', title: 'Current courier', sub: '', type: 'courier', bg: '', color: '', isPrimary: false, tier: 0, listingId: 'current-courier' },
                    { id: 'host', role: 'Service', title: 'Host', sub: '', type: 'service', bg: '', color: '', isPrimary: true, tier: 2 },
                ],
                slots: [{ id: 'courier-source', type: 'delivery', role: 'Courier', name: 'Current courier', meta: '', listingId: 'current-courier', assignmentMode: 'buyer_choice', isOpenSlot: true }],
                dependencies: [{ id: 'courier-host', predecessorId: 'courier-source', successorId: 'host', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' }],
            };
            render(<DealChainCustomizerModal open onClose={vi.fn()} combination={combo} primaryListingTitle="Host"
                primaryListingPricePesos={100} primaryListingType="service" primaryListingCategoryCode="repairs"
                onSave={onSave} onPickPartnerForSlot={vi.fn()} />);

            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes[0]).toMatchObject({ id: 'courier-source', type: 'courier', listingId: 'current-courier', assignmentMode: 'preferred_partner', isOpenSlot: false });
            expect(saved.dependencies).toEqual(combo.dependencies);
        });

        it('allows deliberate deletion of a saved predecessor without keeping stale dependencies that block apply', () => {
            const onSave = vi.fn();
            const combo: DealChainCombination = {
                ...sampleCombo, planVersion: 1,
                nodes: [
                    { id: 'supply', role: 'Store', title: 'Supply', sub: '', type: 'store', bg: '', color: '', isPrimary: false, tier: 0, listingId: 'current-store' },
                    { id: 'host', role: 'Service', title: 'Host', sub: '', type: 'labor', bg: '', color: '', isPrimary: true, tier: 2 },
                ],
                slots: [],
                dependencies: [{ id: 'supply-host', predecessorId: 'supply', successorId: 'host', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' }],
            };
            render(<DealChainCustomizerModal open onClose={vi.fn()} combination={combo} primaryListingTitle="Host"
                primaryListingPricePesos={100} primaryListingType="service" primaryListingCategoryCode="repairs"
                onSave={onSave} onPickPartnerForSlot={vi.fn()} />);

            fireEvent.click(screen.getByRole('button', { name: 'Delete slot' }));
            const apply = screen.getByRole('button', { name: /Apply Deal Chain to Listing/i });
            expect(apply).toHaveProperty('disabled', false);
            fireEvent.click(apply);

            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.nodes.map(node => ({ id: node.id, primary: node.isPrimary }))).toEqual([{ id: 'host', primary: true }]);
            expect(saved.dependencies).toEqual([]);
        });

        it('does not render when open is false', () => {
            render(
                <DealChainCustomizerModal
                    open={false}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    primaryListingCategoryCode="repairs"
                    onSave={vi.fn()}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            expect(screen.queryByText(/Deal Chain Studio · Multi-Agency Relay/i)).toBeNull();
        });
    });
});

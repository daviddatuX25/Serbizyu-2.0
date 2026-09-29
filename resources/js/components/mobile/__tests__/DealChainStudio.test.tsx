import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DealChainCanvas from '../DealChainCanvas';
import DealChainCustomizerModal from '../DealChainCustomizerModal';
import type { DealChainCombination, DealChainNode } from '../types';

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
                    conditionCode: 'source_ready',
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
                    conditionCode: 'delivered_to_site',
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
                    { ...sampleCombo.slots[1], id: 'slot-courier-join', tier: 1 },
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
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByTestId('gate-node-slot-courier-join'));
            expect(screen.getByTestId('dependency-gate-inspector')).toBeDefined();
            expect(screen.getByText('Tagudin Hardware Depot')).toBeDefined();
            expect(screen.getAllByText('Centro Florist').length).toBeGreaterThan(0);
            fireEvent.change(screen.getByLabelText('Condition code'), { target: { value: 'all_inputs_ready' } });
            fireEvent.click(screen.getByLabelText('Allow customer bypass'));
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            expect(saved.slots[2].conditionCode).toBe('all_inputs_ready');
            expect(saved.slots[2].allowBypass).toBe(true);
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
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByTestId('gate-node-node-primary-anchor'));
            expect(screen.getByTestId('dependency-gate-inspector')).toBeDefined();
            fireEvent.change(screen.getByLabelText('Condition code'), { target: { value: 'all_inputs_ready' } });
            fireEvent.click(screen.getByLabelText('Allow customer bypass'));
            fireEvent.click(screen.getByRole('button', { name: /Apply Deal Chain to Listing/i }));
            const saved: DealChainCombination = onSave.mock.calls[0][0];
            const primary = saved.nodes.find((node) => node.id === 'node-primary-anchor');
            expect(primary?.conditionCode).toBe('all_inputs_ready');
            expect(primary?.allowBypass).toBe(true);
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
                    onSave={onSave}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            // Open library tab
            const libraryTabBtn = screen.getByRole('button', { name: /From Slot Library/i });
            fireEvent.click(libraryTabBtn);

            // Add sequential step
            const addButtons = screen.getAllByRole('button', { name: /\+ Sequential Step/i });
            fireEvent.click(addButtons[addButtons.length - 1]); // Add audit step

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

        it('does not render when open is false', () => {
            render(
                <DealChainCustomizerModal
                    open={false}
                    onClose={vi.fn()}
                    combination={sampleCombo}
                    primaryListingTitle="Inverter Split AC Deep Clean"
                    primaryListingPricePesos={450}
                    primaryListingType="service"
                    onSave={vi.fn()}
                    onPickPartnerForSlot={vi.fn()}
                />,
            );

            expect(screen.queryByText(/Deal Chain Studio · Multi-Agency Relay/i)).toBeNull();
        });
    });
});

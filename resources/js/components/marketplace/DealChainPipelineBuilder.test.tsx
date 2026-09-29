import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DealChainPipelineBuilder,
    type PipelineNode,
    type PipelineDependency,
} from './DealChainPipelineBuilder';

const sampleNodes: PipelineNode[] = [
    {
        key: 'step_1',
        needKind: 'product',
        title: 'Hardware Part Sourcing',
        role: 'Hardware / Part Supply',
        type: 'store',
        feeMinor: 18000,
    },
    {
        key: 'step_2',
        needKind: 'service',
        title: 'Doorstep Courier Transit',
        role: 'Doorstep Courier Runner',
        type: 'delivery',
        feeMinor: 3500,
    },
    {
        key: 'step_3',
        needKind: 'service',
        title: 'AC Installation Labor',
        role: 'Trade Technician / Labor',
        type: 'labor',
        feeMinor: 25000,
    },
];

const sampleDependencies: PipelineDependency[] = [
    {
        predecessor: 'step_1',
        successor: 'step_2',
        conditionCode: 'source_ready',
        allowBypass: false,
    },
    {
        predecessor: 'step_2',
        successor: 'step_3',
        conditionCode: 'delivered_to_site',
        allowBypass: false,
    },
];

describe('DealChainPipelineBuilder', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders all step cards with role badges and total estimated fee', () => {
        const onChange = vi.fn();

        render(
            <DealChainPipelineBuilder
                nodes={sampleNodes}
                dependencies={sampleDependencies}
                onChange={onChange}
            />,
        );

        expect(screen.getByText('Sequential Relay Pipeline')).toBeTruthy();
        expect(screen.getByText('STORE / SUPPLY')).toBeTruthy();
        expect(screen.getByText('COURIER / TRANSIT')).toBeTruthy();
        expect(screen.getByText('TECHNICIAN / LABOR')).toBeTruthy();
        expect(screen.getByDisplayValue('Hardware Part Sourcing')).toBeTruthy();
        expect(screen.getByDisplayValue('Doorstep Courier Transit')).toBeTruthy();
        expect(screen.getByDisplayValue('AC Installation Labor')).toBeTruthy();

        // Total fee: 180 + 35 + 250 = 465.00
        expect(screen.getByText(/Total est\. fee: ₱465\.00/)).toBeTruthy();
    });

    it('triggers onChange with new step appended when clicking bottom preset', () => {
        const onChange = vi.fn();

        render(
            <DealChainPipelineBuilder
                nodes={sampleNodes}
                dependencies={sampleDependencies}
                onChange={onChange}
            />,
        );

        const addAuditBtn = screen.getByText('+ Quality & Safety Auditor');
        fireEvent.click(addAuditBtn);

        expect(onChange).toHaveBeenCalledTimes(1);
        const [nextNodes, nextDeps] = onChange.mock.calls[0];

        expect(nextNodes).toHaveLength(4);
        expect(nextNodes[3].type).toBe('audit');
        expect(nextDeps).toHaveLength(3);
        expect(nextDeps[2].predecessor).toBe('step_3');
        expect(nextDeps[2].successor).toBe(nextNodes[3].key);
    });

    it('moves steps and updates order when clicking Move Up / Move Down', () => {
        const onChange = vi.fn();

        render(
            <DealChainPipelineBuilder
                nodes={sampleNodes}
                dependencies={sampleDependencies}
                onChange={onChange}
            />,
        );

        const moveDownButtons = screen.getAllByLabelText('Move step down');
        fireEvent.click(moveDownButtons[0]); // Move step 1 down to position 2

        expect(onChange).toHaveBeenCalledTimes(1);
        const [nextNodes, nextDeps] = onChange.mock.calls[0];

        expect(nextNodes[0].key).toBe('step_2');
        expect(nextNodes[1].key).toBe('step_1');
        expect(nextNodes[2].key).toBe('step_3');

        // Verify re-stitched dependencies
        expect(nextDeps[0].predecessor).toBe('step_2');
        expect(nextDeps[0].successor).toBe('step_1');
    });

    it('deletes a middle step, triggers undo toast, and auto-heals gate conditions', () => {
        const onChange = vi.fn();

        render(
            <DealChainPipelineBuilder
                nodes={sampleNodes}
                dependencies={sampleDependencies}
                onChange={onChange}
            />,
        );

        const deleteButtons = screen.getAllByLabelText('Delete step');
        fireEvent.click(deleteButtons[1]); // Delete step_2 (Courier)

        expect(onChange).toHaveBeenCalledTimes(1);
        const [nextNodes, nextDeps] = onChange.mock.calls[0];

        expect(nextNodes).toHaveLength(2);
        expect(nextNodes.map((n: PipelineNode) => n.key)).toEqual(['step_1', 'step_3']);

        // Healed dependency bridge between step_1 and step_3
        expect(nextDeps).toHaveLength(1);
        expect(nextDeps[0].predecessor).toBe('step_1');
        expect(nextDeps[0].successor).toBe('step_3');
        expect(nextDeps[0].conditionCode).toBe('source_ready');

        // Verify Undo toast appears
        expect(screen.getByText(/Step 'Doorstep Courier Transit' removed/)).toBeTruthy();
        expect(screen.getByText('Undo (5s)')).toBeTruthy();
    });

    it('disables delete button when only 2 steps remain to enforce minimum guardrail', () => {
        const onChange = vi.fn();
        const twoNodes = sampleNodes.slice(0, 2);

        render(
            <DealChainPipelineBuilder
                nodes={twoNodes}
                dependencies={[sampleDependencies[0]]}
                onChange={onChange}
            />,
        );

        const deleteButtons = screen.getAllByLabelText('Delete step') as HTMLButtonElement[];
        expect(deleteButtons).toHaveLength(2);
        expect(deleteButtons[0].disabled).toBe(true);
        expect(deleteButtons[1].disabled).toBe(true);
    });

    it('updates hand-off condition code when changing select dropdown', () => {
        const onChange = vi.fn();

        render(
            <DealChainPipelineBuilder
                nodes={sampleNodes}
                dependencies={sampleDependencies}
                onChange={onChange}
            />,
        );

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'work_completed' } });

        expect(onChange).toHaveBeenCalledTimes(1);
        const [, nextDeps] = onChange.mock.calls[0];
        expect(nextDeps[0].conditionCode).toBe('work_completed');
    });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkNodeEvidenceTools from './WorkNodeEvidenceTools';
import type { WorkNodeRecord } from '../../types';

const node = {
    id: 'node-1', ordinal: 1, title: 'Inspect', description: 'Inspect equipment', node_kind: 'execution_proof',
    evidence_type: 'none', evidence_description: '', control_mode: 'provider_advance', mandatory: true,
    required_proofs: ['checklist_steps', 'metric_reading'],
    checklist_items: [{ id: 'ground', label: 'Confirm grounding', required: true }, { id: 'label', label: 'Check label', required: false }],
    metric_requirements: [{ id: 'voltage', name: 'Voltage', unit: 'V', required: true, target: 220 }],
} as WorkNodeRecord;

describe('WorkNodeEvidenceTools', () => {
    afterEach(() => cleanup());
    it('submits itemized checklist responses and named unit readings', () => {
        const onSubmit = vi.fn();
        render(<WorkNodeEvidenceTools orderId="order-1" node={node} action="complete_step" processing={false} onSubmit={onSubmit} onPreviewPhoto={vi.fn()} />);
        fireEvent.click(screen.getByLabelText(/Confirm grounding/));
        fireEvent.change(screen.getByLabelText(/Voltage \(V\)/), { target: { value: '221.5' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit proof/ }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            checklist_responses: [{ id: 'ground', completed: true }, { id: 'label', completed: false }],
            metric_readings: [{ id: 'voltage', value: 221.5, unit: 'V' }],
        }));
    });

    it('does not allow advancement until required checklist items and named measurements are entered', () => {
        render(<WorkNodeEvidenceTools orderId="order-1" node={node} action="complete_step" processing={false} onSubmit={vi.fn()} onPreviewPhoto={vi.fn()} />);
        expect((screen.getByRole('button', { name: /Submit proof/ }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByLabelText(/Confirm grounding/));
        expect((screen.getByRole('button', { name: /Submit proof/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('blocks submission when required named measurements are not configured', () => {
        const onSubmit = vi.fn();
        render(<WorkNodeEvidenceTools orderId="order-1" node={{ ...node, required_proofs: ['metric_reading'], metric_requirements: undefined }} action="complete_step" processing={false} onSubmit={onSubmit} onPreviewPhoto={vi.fn()} />);
        const submit = screen.getByRole('button', { name: /Submit proof/ });
        expect(submit).toHaveProperty('disabled', true);
        fireEvent.click(submit);
        expect(onSubmit).not.toHaveBeenCalled();
    });
});

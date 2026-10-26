import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { WorkNodeRecord } from '../../types';
import WorkChecklistStepsInput from './WorkChecklistStepsInput';
import WorkLocationPinInput from './WorkLocationPinInput';
import WorkMetricReadingsInput, { type MetricReadingDraft } from './WorkMetricReadingsInput';
import WorkPhotoProofInput from './WorkPhotoProofInput';
import { WORK_TOOL_REGISTRY } from './workNodeCatalog';

export type WorkNodeAction = 'complete_step' | 'request_confirmation' | 'mark_ready_for_handoff' | 'propose_completion';
export type LocationProof = {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    source: 'gps' | 'manual';
    observed_at: string;
    landmark?: string | null;
};
export type WorkProofPayload = {
    notes?: string;
    evidence_file_ids?: string[];
    location?: LocationProof;
    metric_readings?: MetricReadingDraft[];
    checklist_responses?: Array<{ id: string; completed: boolean }>;
};

type WorkNodeEvidenceToolsProps = {
    orderId: string;
    node: WorkNodeRecord;
    action: WorkNodeAction;
    processing: boolean;
    onSubmit: (payload: WorkProofPayload) => void;
    onPreviewPhoto: (url: string) => void;
    submitLabel?: string;
};

const NO_METRIC_REQUIREMENTS: NonNullable<WorkNodeRecord['metric_requirements']> = [];

const actionLabels: Record<WorkNodeAction, string> = {
    complete_step: 'Submit proof & complete step',
    request_confirmation: 'Submit proof for customer approval',
    mark_ready_for_handoff: 'Submit proof & mark ready for handoff',
    propose_completion: 'Submit proof for final sign-off',
};

export default function WorkNodeEvidenceTools({
    orderId,
    node,
    action,
    processing,
    onSubmit,
    onPreviewPhoto,
    submitLabel,
}: WorkNodeEvidenceToolsProps) {
    const requiredProofs = node.required_proofs ?? [];
    const unsupportedTools = requiredProofs.filter((toolKey) =>
        !WORK_TOOL_REGISTRY.some((tool) => tool.toolKey === toolKey && tool.kind === 'native'),
    );
    const checklistItems = node.checklist_items ?? [];
    const metricRequirements = node.metric_requirements ?? NO_METRIC_REQUIREMENTS;
    const [evidenceFileIds, setEvidenceFileIds] = useState<string[]>(
        (node.candidate_evidence ?? [])
            .filter((candidate) => candidate.scan_status === 'clean')
            .map((candidate) => candidate.id),
    );
    const [location, setLocation] = useState<LocationProof | null>(null);
    const [metricReadings, setMetricReadings] = useState<MetricReadingDraft[]>([]);
    const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState('');

    const canSubmit = !processing
        && unsupportedTools.length === 0
        && (!requiredProofs.includes('photo_proof') || evidenceFileIds.length > 0)
        && (!requiredProofs.includes('gps_checkin') || location !== null)
        && (!requiredProofs.includes('metric_reading') || (metricRequirements.length > 0 && metricRequirements.filter((item) => item.required).every((item) => metricReadings.some((reading) => reading.id === item.id))))
        && (!requiredProofs.includes('checklist_steps') || (checklistItems.length > 0 && checklistItems.filter((item) => item.required).every((item) => checklistResponses[item.id] === true)))
        && notes.length <= 2000;

    const submit = () => {
        if (!canSubmit) {
            return;
        }

        const payload: WorkProofPayload = {};
        if (notes.trim() !== '') {
            payload.notes = notes.trim();
        }
        if (requiredProofs.includes('photo_proof')) {
            payload.evidence_file_ids = evidenceFileIds;
        }
        if (requiredProofs.includes('gps_checkin') && location !== null) {
            payload.location = location;
        }
        if (requiredProofs.includes('metric_reading')) {
            payload.metric_readings = metricReadings;
        }
        if (requiredProofs.includes('checklist_steps')) {
            payload.checklist_responses = checklistItems.map((item) => ({
                id: item.id,
                completed: checklistResponses[item.id] === true,
            }));
        }
        onSubmit(payload);
    };

    return (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4" data-testid={`work-node-tools-${node.id}`}>
            <div>
                <h4 className="text-xs font-extrabold text-slate-900">Work tools for this step</h4>
                {requiredProofs.length === 0 ? (
                    <p className="mt-0.5 text-[11px] text-slate-600">No attachment is required. Add a note if useful, then continue.</p>
                ) : (
                    <p className="mt-0.5 text-[11px] text-slate-600">Only the proof required by this Work node appears here.</p>
                )}
            </div>

            {unsupportedTools.map((toolKey) => {
                const tool = WORK_TOOL_REGISTRY.find((item) => item.toolKey === toolKey);
                return (
                    <p key={toolKey} className="flex items-start gap-2 text-xs text-amber-900" role="alert">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>{tool?.label ?? toolKey} is not available in this workspace. This step cannot advance through a substitute.</span>
                    </p>
                );
            })}

            {requiredProofs.includes('photo_proof') && (
                <WorkPhotoProofInput
                    orderId={orderId}
                    nodeId={node.id}
                    candidates={node.candidate_evidence}
                    disabled={processing}
                    onEvidenceIdsChange={setEvidenceFileIds}
                    onPreviewPhoto={onPreviewPhoto}
                />
            )}
            {requiredProofs.includes('gps_checkin') && (
                <WorkLocationPinInput disabled={processing} onChange={setLocation} />
            )}
            {requiredProofs.includes('metric_reading') && (
                <WorkMetricReadingsInput requirements={metricRequirements} disabled={processing} onChange={setMetricReadings} />
            )}
            {requiredProofs.includes('checklist_steps') && (
                <WorkChecklistStepsInput items={checklistItems} responses={checklistResponses} disabled={processing} onChange={setChecklistResponses} />
            )}

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
                Work notes <span className="font-normal text-slate-500">(optional)</span>
                <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.currentTarget.value)}
                    maxLength={2000}
                    rows={3}
                    disabled={processing}
                    placeholder="Record observations for this step."
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                />
            </label>

            <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 py-3 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {processing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {processing ? 'Saving work step…' : submitLabel ?? actionLabels[action]}
            </button>
        </div>
    );
}

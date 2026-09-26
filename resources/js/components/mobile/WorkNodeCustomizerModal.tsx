import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowDown,
    ArrowUp,
    Check,
    Clock,
    Plus,
    RotateCcw,
    Sliders,
    Trash2,
} from 'lucide-react';
import WorkPipelineCanvas from './WorkPipelineCanvas';
import {
    INTERACTION_TYPE_DEFINITIONS,
    EVIDENCE_PROTOCOL_DEFINITIONS,
    WORK_NODE_CATALOG,
} from './workNodeCatalog';
import type {
    WorkStage,
    WorkStageGateType,
    WorkInteractionType,
    WorkEvidenceProtocol,
    WorkNodePrimitive,
} from './types';

export interface WorkNodeCustomizerModalProps {
    open: boolean;
    onClose: () => void;
    stages: WorkStage[];
    onSave: (stages: WorkStage[]) => void;
    onResetToTemplate?: () => void;
    flowType?: 'linear' | 'parallel' | 'branch';
}

export interface GateClassificationOption {
    type: WorkStageGateType;
    icon: string;
    title: string;
    subtitle: string;
    defaultEvidence: string;
    color: string;
    bg: string;
    border: string;
    badgeStyle: string;
}

export const GATE_CLASSIFICATIONS: GateClassificationOption[] = [
    {
        type: 'arrival',
        icon: '🚪',
        title: 'Arrival / Intake Gate',
        subtitle: 'Lock-out photo, initial inspection, site safety triage',
        defaultEvidence: 'Breaker lock-out / arrival photo gate',
        color: '#0D715F',
        bg: '#E8F7F1',
        border: '#A7F3D0',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
        type: 'execution',
        icon: '📸',
        title: 'Execution Proof Gate',
        subtitle: 'Chemical foam coverage photo, repair progress photo, installation',
        defaultEvidence: 'Workmanship & progress photo gate',
        color: '#0F766E',
        bg: '#CCFBF1',
        border: '#99F6E4',
        badgeStyle: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
        type: 'diagnostic',
        icon: '⚡',
        title: 'Diagnostic / Measurement Gate',
        subtitle: 'Amperage test reading, pressure gauge photo, delta temperature',
        defaultEvidence: 'Amperage reading / gauge photo gate',
        color: '#B45309',
        bg: '#FEF3C7',
        border: '#FDE68A',
        badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
        type: 'signoff',
        icon: '✍️',
        title: 'Final Sign-off Gate',
        subtitle: 'Dual customer signature + digital OTP milestone release',
        defaultEvidence: 'Dual customer signature & OTP release',
        color: '#047857',
        bg: '#D1FAE5',
        border: '#6EE7B7',
        badgeStyle: 'bg-green-50 text-green-900 border-green-200',
    },
];

const PRESET_DURATIONS = ['15m', '30m', '45m', '60m', '90m', '120m'] as const;

function resolveStageInteractionType(stage: WorkStage, index: number, total: number): WorkInteractionType {
    if (stage.interactionType) return stage.interactionType;
    if (index === 0) return 'co_presence';
    if (index === total - 1) return 'client_signoff';
    const text = `${stage.title} ${stage.desc}`.toLowerCase();
    if (
        text.includes('pickup') ||
        text.includes('dropoff') ||
        text.includes('deliver') ||
        text.includes('courier') ||
        text.includes('handoff') ||
        text.includes('custody')
    ) {
        return 'custody_transfer';
    }
    if (
        text.includes('test') ||
        text.includes('check') ||
        text.includes('diagnostic') ||
        text.includes('scan') ||
        text.includes('reading') ||
        text.includes('temp') ||
        text.includes('pressure')
    ) {
        return 'quality_check';
    }
    return 'solo_execution';
}

function resolveStageEvidenceProtocol(stage: WorkStage, index: number, total: number): WorkEvidenceProtocol {
    if (stage.evidenceProtocol) return stage.evidenceProtocol;
    if (index === total - 1) return 'customer_otp';
    const text = `${stage.title} ${stage.evidence} ${stage.desc}`.toLowerCase();
    if (text.includes('otp') || text.includes('signature') || text.includes('sign-off')) return 'customer_otp';
    if (text.includes('file') || text.includes('pdf') || text.includes('cad') || text.includes('upload') || text.includes('download')) return 'file_artifact';
    if (text.includes('reading') || text.includes('delta') || text.includes('gauge') || text.includes('amp') || text.includes('volt')) return 'metric_reading';
    if (text.includes('checklist') || text.includes('intake') || text.includes('steps')) return 'checklist_declaration';
    return 'photo_proof';
}

export function resolveStageGateType(stage: WorkStage, index: number, total: number): WorkStageGateType {
    if (stage.gateType) return stage.gateType;
    if (index === 0) return 'arrival';
    if (index === total - 1) return 'signoff';
    const text = `${stage.title} ${stage.desc} ${stage.evidence}`.toLowerCase();
    if (
        text.includes('amp') ||
        text.includes('volt') ||
        text.includes('temp') ||
        text.includes('delta') ||
        text.includes('pressure') ||
        text.includes('diagnostic') ||
        text.includes('test') ||
        text.includes('multimeter') ||
        text.includes('reading')
    ) {
        return 'diagnostic';
    }
    return 'execution';
}
function WaveCap() {
    return (
        <svg
            aria-hidden="true"
            className="glovo-wave-cap block w-full shrink-0 sm:hidden"
            style={{ height: 34, marginBottom: -1 }}
            viewBox="0 0 390 34"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z"
                fill="#FFFFFF"
            />
        </svg>
    );
}

function CloseCircle({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Close"
            className="flex h-8 min-h-[44px] w-8 min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
            >
                <path d="M18 6 6 18M6 6l12 12" />
            </svg>
        </button>
    );
}

export default function WorkNodeCustomizerModal({
    open,
    onClose,
    stages,
    onSave,
    onResetToTemplate,
    flowType = 'linear',
}: WorkNodeCustomizerModalProps) {
    const titleId = useId();
    const [localStages, setLocalStages] = useState<WorkStage[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    // Sync from props when modal opens
    useEffect(() => {
        if (open) {
            const initial = stages.length > 0 ? stages : [];
            setLocalStages(initial);
            if (initial.length > 0) {
                setSelectedStageId(initial[0].id);
            }
        }
    }, [open, stages]);

    // Keyboard & body scroll management
    useEffect(() => {
        if (!open) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [open, onClose]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose],
    );

    const selectedIndex = useMemo(() => {
        return localStages.findIndex((s) => s.id === selectedStageId);
    }, [localStages, selectedStageId]);

    const currentStage = useMemo(() => {
        if (selectedIndex >= 0) return localStages[selectedIndex];
        return localStages[0] || null;
    }, [localStages, selectedIndex]);

    const totalMinutes = useMemo(() => {
        return localStages.reduce((acc, s) => acc + (parseInt(s.dur, 10) || 0), 0);
    }, [localStages]);

    const [inspectorTab, setInspectorTab] = useState<'configure' | 'catalog'>('configure');

    const currentInteractionType = useMemo(() => {
        if (!currentStage) return 'solo_execution';
        return resolveStageInteractionType(currentStage, selectedIndex, localStages.length);
    }, [currentStage, selectedIndex, localStages.length]);

    const currentEvidenceProtocol = useMemo(() => {
        if (!currentStage) return 'photo_proof';
        return resolveStageEvidenceProtocol(currentStage, selectedIndex, localStages.length);
    }, [currentStage, selectedIndex, localStages.length]);

    const updateCurrentStage = (patch: Partial<WorkStage>) => {
        if (!currentStage) return;
        setLocalStages((prev) =>
            prev.map((s) => (s.id === currentStage.id ? { ...s, ...patch } : s)),
        );
    };

    const handleReorder = (idx: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= localStages.length) return;

        const updated = [...localStages];
        const temp = updated[idx];
        updated[idx] = updated[target];
        updated[target] = temp;

        const renumbered = updated.map((s, i) => ({
            ...s,
            num: String(i + 1),
        }));

        setLocalStages(renumbered);
    };

    const handleRemoveStage = (idx: number) => {
        if (localStages.length <= 1) return;
        const targetId = localStages[idx].id;
        const next = localStages
            .filter((_, i) => i !== idx)
            .map((s, i) => ({
                ...s,
                num: String(i + 1),
            }));

        setLocalStages(next);

        if (selectedStageId === targetId) {
            const nextIdx = Math.min(idx, next.length - 1);
            setSelectedStageId(next[nextIdx].id);
        }
    };

    const handleAddFromCatalog = (primitive: WorkNodePrimitive) => {
        const count = localStages.length + 1;
        const newId = `stage-${primitive.id}-${Date.now()}`;
        const newStage: WorkStage = {
            id: newId,
            num: String(count),
            title: primitive.title,
            dur: primitive.dur,
            desc: primitive.desc,
            evidence: primitive.evidence,
            color: primitive.color,
            bg: primitive.bg,
            interactionType: primitive.interactionType,
            evidenceProtocol: primitive.evidenceProtocol,
        };

        const next = [...localStages, newStage];
        setLocalStages(next);
        setSelectedStageId(newId);
        setInspectorTab('configure');
    };

    const handleAddStage = () => {
        const count = localStages.length + 1;
        const newId = `stage-custom-${Date.now()}-${count}`;
        const newStage: WorkStage = {
            id: newId,
            num: String(count),
            title: 'Custom Task Node',
            dur: '30m',
            desc: 'Describe procedures, tool usage, safety precautions...',
            evidence: 'Time-stamped photo or digital completion token',
            color: '#0F2F58',
            bg: '#EBF2FA',
            interactionType: 'solo_execution',
            evidenceProtocol: 'photo_proof',
        };

        const next = [...localStages, newStage];
        setLocalStages(next);
        setSelectedStageId(newId);
        setInspectorTab('configure');
    };

    const handleSave = () => {
        onSave(localStages);
        onClose();
    };
    const handleReset = () => {
        if (onResetToTemplate) {
            onResetToTemplate();
        }
    };

    if (!open) return null;

    const dialogContent = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-modal-state="open"
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-0 opacity-100 backdrop-blur-xs transition-opacity duration-200 sm:items-center sm:p-4 lg:p-6"
        >
            <div
                data-modal-surface="true"
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92vh] w-full translate-y-0 flex-col overflow-hidden bg-transparent transition-transform duration-300 sm:max-h-[90vh] sm:max-w-4xl lg:max-w-5xl sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-2xl"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <WaveCap />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-4 pt-2 pb-3 sm:px-6 sm:pt-4">
                    {/* Header */}
                    <div className="shrink-0 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#0F2F58] text-white">
                                        <Sliders className="size-4" />
                                    </div>
                                    <div>
                                        <h3
                                            id={titleId}
                                            className="m-0 text-base sm:text-lg font-extrabold text-[#0F2F58]"
                                        >
                                            Work Studio · Workflow Customizer
                                        </h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            Configure verified order gates, target SLAs, and milestone escrow evidence.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {onResetToTemplate && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                                    >
                                        <RotateCcw className="size-3" />
                                        <span>Reset to Archetype</span>
                                    </button>
                                )}
                                <CloseCircle onClick={onClose} />
                            </div>
                        </div>

                        {/* Top Canvas Preview Banner */}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-2.5">
                            <div className="mb-1 flex items-center justify-between px-1 text-[10px]">
                                <span className="font-extrabold uppercase tracking-wide text-slate-500">
                                    DAG Pipeline Overview
                                </span>
                                <span className="font-mono font-bold text-emerald-700">
                                    {localStages.length} Verified Gates · {totalMinutes}m Total SLA
                                </span>
                            </div>
                            <div className="overflow-x-auto py-1">
                                <WorkPipelineCanvas
                                    stages={localStages}
                                    flowType={flowType}
                                    onStageClick={(st) => setSelectedStageId(st.id)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Split: Left Stage List & Right Inspector */}
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-3 md:flex-row">
                        {/* Left Column: Stage Node List */}
                        <div className="flex min-h-0 flex-col md:w-5/12 lg:w-4/12 border-b border-slate-100 pb-3 md:border-b-0 md:border-r md:pr-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#0F2F58] uppercase">
                                    Stage Nodes ({localStages.length})
                                </span>
                                <span className="text-[10px] text-slate-500">Click to configure</span>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                {localStages.map((stage, idx) => {
                                    const isSelected = stage.id === (currentStage?.id || selectedStageId);
                                    const interaction = resolveStageInteractionType(stage, idx, localStages.length);
                                    const interactionMeta = INTERACTION_TYPE_DEFINITIONS.find((i) => i.type === interaction);
                                    const protocol = resolveStageEvidenceProtocol(stage, idx, localStages.length);
                                    const protocolMeta = EVIDENCE_PROTOCOL_DEFINITIONS.find((p) => p.protocol === protocol);

                                    return (
                                        <div
                                            key={stage.id}
                                            onClick={() => {
                                                setSelectedStageId(stage.id);
                                                setInspectorTab('configure');
                                            }}
                                            className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 transition-all ${
                                                isSelected && inspectorTab === 'configure'
                                                    ? 'border-[#0F2F58] bg-slate-50/80 shadow-xs ring-1 ring-[#0F2F58]'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                    <span
                                                        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold"
                                                        style={{
                                                            background: stage.bg || '#E8F7F1',
                                                            color: stage.color || '#0D715F',
                                                        }}
                                                    >
                                                        {stage.num || String(idx + 1)}
                                                    </span>
                                                    <span className="truncate text-xs font-extrabold text-[#0F2F58]">
                                                        {stage.title}
                                                    </span>
                                                </div>

                                                {/* Reorder & Delete Actions */}
                                                <div
                                                    className="flex shrink-0 items-center gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleReorder(idx, 'up')}
                                                        aria-label="Move stage up"
                                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                                                    >
                                                        <ArrowUp className="size-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === localStages.length - 1}
                                                        onClick={() => handleReorder(idx, 'down')}
                                                        aria-label="Move stage down"
                                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                                                    >
                                                        <ArrowDown className="size-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={localStages.length <= 1}
                                                        onClick={() => handleRemoveStage(idx)}
                                                        aria-label="Delete stage node"
                                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-20"
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${interactionMeta?.badgeStyle || 'bg-slate-100 text-slate-700'}`}>
                                                        <span>{interactionMeta?.icon}</span>
                                                        <span>{interactionMeta?.label}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">
                                                        <span>{protocolMeta?.icon}</span>
                                                    </span>
                                                </div>
                                                <span className="flex items-center gap-1 font-mono font-bold text-slate-600">
                                                    <Clock className="size-2.5 text-slate-400" />
                                                    {stage.dur}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setInspectorTab('catalog')}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 py-2 text-xs font-bold text-indigo-900 transition-colors hover:bg-indigo-100 min-h-[38px]"
                                >
                                    <span>📚 Add from Node Catalog</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddStage}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 min-h-[38px]"
                                >
                                    <Plus className="size-3.5" />
                                    <span>+ Add Stage Node</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Stage Inspector & Node Catalog */}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pl-0 md:pl-2" style={{ scrollbarWidth: 'thin' }}>
                            {/* Tab Switcher */}
                            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('configure')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                            inspectorTab === 'configure'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        Stage Inspector
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('catalog')}
                                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                            inspectorTab === 'catalog'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-indigo-900 hover:bg-indigo-50'
                                        }`}
                                    >
                                        <span>📚 Node Catalog Primitives</span>
                                        <span className="rounded-full bg-indigo-200/50 px-1.5 text-[9px] font-mono">8</span>
                                    </button>
                                </div>

                                {currentStage && inspectorTab === 'configure' && (
                                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                                        Node #{currentStage.num} · {currentStage.dur}
                                    </span>
                                )}
                            </div>

                            {inspectorTab === 'catalog' && (
                                <div className="space-y-3 pb-2">
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
                                        <div className="text-xs font-extrabold text-indigo-950">
                                            Universal Work Node Catalog (Atomic Lego Blocks)
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-indigo-900/80">
                                            Universal interaction primitives applicable across trades, digital delivery, physical transport, and Deal Chains. 1-click to append to your pipeline.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {WORK_NODE_CATALOG.map((prim) => {
                                            const intMeta = INTERACTION_TYPE_DEFINITIONS.find((i) => i.type === prim.interactionType);
                                            const protoMeta = EVIDENCE_PROTOCOL_DEFINITIONS.find((p) => p.protocol === prim.evidenceProtocol);

                                            return (
                                                <div
                                                    key={prim.id}
                                                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-base">{prim.icon}</span>
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {prim.title}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[10px] font-bold text-slate-500">
                                                                {prim.dur}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10.5px] leading-relaxed text-slate-600">
                                                            {prim.desc}
                                                        </p>
                                                    </div>

                                                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${intMeta?.badgeStyle || 'bg-slate-100'}`}>
                                                                <span>{intMeta?.icon}</span>
                                                                <span>{intMeta?.label}</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                                                                <span>{protoMeta?.icon}</span>
                                                                <span>{protoMeta?.label}</span>
                                                            </span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddFromCatalog(prim)}
                                                            className="shrink-0 cursor-pointer rounded-lg bg-[#0F2F58] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-[#153e74]"
                                                        >
                                                            + Add Node
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {inspectorTab === 'configure' && currentStage && (
                                <div className="space-y-3.5 pb-2">
                                    {/* Title Field */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Stage Title
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.title}
                                            onChange={(e) => updateCurrentStage({ title: e.target.value })}
                                            placeholder="e.g. Site Check-in, Fabrication, Quality Testing..."
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>

                                    {/* Description / Instructions */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Operational Scope / Description
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={currentStage.desc || ''}
                                            onChange={(e) => updateCurrentStage({ desc: e.target.value })}
                                            placeholder="Describe step-by-step procedures, tool usage, safety precautions..."
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>

                                    {/* SLA / Target Duration */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                SLA / Target Duration
                                            </label>
                                            <span className="font-mono text-[10px] font-bold text-emerald-700">
                                                Current: {currentStage.dur}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {PRESET_DURATIONS.map((dur) => {
                                                const isActive = currentStage.dur === dur;
                                                return (
                                                    <button
                                                        key={dur}
                                                        type="button"
                                                        onClick={() => updateCurrentStage({ dur })}
                                                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                                                            isActive
                                                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {dur}
                                                    </button>
                                                );
                                            })}

                                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-[#FAFCFB] px-2 py-0.5">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={480}
                                                    value={parseInt(currentStage.dur, 10) || 15}
                                                    onChange={(e) => {
                                                        const val = Math.max(1, Math.min(480, Number(e.target.value) || 1));
                                                        updateCurrentStage({ dur: `${val}m` });
                                                    }}
                                                    className="w-10 border-none bg-transparent text-right font-mono text-xs font-extrabold text-[#0F2F58] outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-500">min</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Axis 1: Interaction & Accountability Model */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                1. Interaction &amp; Accountability Model
                                            </label>
                                            <span className="text-[10px] text-slate-500">Who executes or verifies?</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {INTERACTION_TYPE_DEFINITIONS.map((def) => {
                                                const isSelected = currentInteractionType === def.type;
                                                return (
                                                    <div
                                                        key={def.type}
                                                        onClick={() => {
                                                            let gateType: WorkStageGateType = 'execution';
                                                            let color = '#0F766E';
                                                            let bg = '#CCFBF1';
                                                            if (def.type === 'co_presence') {
                                                                gateType = 'arrival';
                                                                color = '#0D715F';
                                                                bg = '#E8F7F1';
                                                            } else if (def.type === 'quality_check') {
                                                                gateType = 'diagnostic';
                                                                color = '#B45309';
                                                                bg = '#FEF3C7';
                                                            } else if (def.type === 'client_signoff') {
                                                                gateType = 'signoff';
                                                                color = '#047857';
                                                                bg = '#D1FAE5';
                                                            } else if (def.type === 'custody_transfer') {
                                                                gateType = 'execution';
                                                                color = '#4F46E5';
                                                                bg = '#EEF2FF';
                                                            }
                                                            updateCurrentStage({
                                                                interactionType: def.type,
                                                                gateType,
                                                                color,
                                                                bg,
                                                            });
                                                        }}
                                                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 transition-all ${
                                                            isSelected
                                                                ? 'border-[#0F2F58] bg-[#F8FAFC] shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span className="shrink-0 text-base">{def.icon}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {def.label}
                                                                </span>
                                                                {isSelected && <Check className="size-3 stroke-[3] text-[#0F2F58]" />}
                                                            </div>
                                                            {def.type === 'quality_check' && (
                                                                <div className="text-[9.5px] font-bold text-amber-800">
                                                                    <span>Diagnostic / Measurement Gate</span>
                                                                </div>
                                                            )}
                                                            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                                                {def.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Axis 2: Required Evidence Protocol */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                2. Required Evidence Protocol
                                            </label>
                                            <span className="text-[10px] text-slate-500">How is milestone proven?</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {EVIDENCE_PROTOCOL_DEFINITIONS.map((def) => {
                                                const isSelected = currentEvidenceProtocol === def.protocol;
                                                return (
                                                    <div
                                                        key={def.protocol}
                                                        onClick={() => updateCurrentStage({ evidenceProtocol: def.protocol })}
                                                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 transition-all ${
                                                            isSelected
                                                                ? 'border-indigo-600 bg-indigo-50/40 shadow-2xs ring-1 ring-indigo-600'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span className="shrink-0 text-base">{def.icon}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {def.label}
                                                                </span>
                                                                {isSelected && <Check className="size-3 stroke-[3] text-indigo-600" />}
                                                            </div>
                                                            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                                                {def.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Evidence Description / Requirement label */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Specific Evidence Guidance / Instructions
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.evidence || ''}
                                            onChange={(e) => updateCurrentStage({ evidence: e.target.value })}
                                            placeholder="e.g. Clear photo showing serial number & gauge reading"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            Instructions displayed to the operator when uploading proof for milestone progression.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {inspectorTab === 'configure' && !currentStage && (
                                <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-400">
                                    No stage selected. Select or add a stage from the catalog to configure.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="shrink-0 border-t border-slate-200 bg-white pt-3">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 min-h-[44px]"
                            >
                                Cancel
                            </button>

                            <div className="flex items-center gap-2">
                                {onResetToTemplate && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="sm:hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[44px]"
                                    >
                                        Reset Archetype
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-[#0D284C] transition-colors min-h-[44px]"
                                >
                                    <Check className="size-4 stroke-[2.5]" />
                                    <span>Apply Workflow to Listing</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar { width: 4px; }
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 9999px; }
            `}</style>
        </div>
    );

    return typeof document === 'undefined' ? dialogContent : createPortal(dialogContent, document.body);
}

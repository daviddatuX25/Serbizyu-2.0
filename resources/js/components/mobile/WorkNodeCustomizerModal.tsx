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
import type { WorkStage, WorkStageGateType } from './types';

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

function resolveStageGateType(stage: WorkStage, index: number, total: number): WorkStageGateType {
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

    const currentGateType = useMemo(() => {
        if (!currentStage) return 'execution';
        return resolveStageGateType(currentStage, selectedIndex, localStages.length);
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

    const handleAddStage = () => {
        const count = localStages.length + 1;
        const newId = `stage-custom-${Date.now()}-${count}`;
        const newStage: WorkStage = {
            id: newId,
            num: String(count),
            title: 'Quality Verification Gate',
            dur: '15m',
            desc: 'Operational safety inspection and customer handoff checklist.',
            evidence: 'Verification sign-off photo gate',
            color: '#0D715F',
            bg: '#E8F7F1',
            gateType: 'execution',
        };

        const next = [...localStages, newStage];
        setLocalStages(next);
        setSelectedStageId(newId);
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
                                    const gate = resolveStageGateType(stage, idx, localStages.length);
                                    const gateMeta = GATE_CLASSIFICATIONS.find((g) => g.type === gate);

                                    return (
                                        <div
                                            key={stage.id}
                                            onClick={() => setSelectedStageId(stage.id)}
                                            className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 transition-all ${
                                                isSelected
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
                                                <span className="flex items-center gap-1 font-mono font-bold text-slate-600">
                                                    <Clock className="size-2.5 text-slate-400" />
                                                    {stage.dur}
                                                </span>
                                                <span className="truncate text-[9.5px] font-semibold text-emerald-700">
                                                    {gateMeta?.icon} {stage.evidence || 'Evidence gate'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddStage}
                                className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-[#0F2F58] transition-colors hover:border-[#0F2F58] hover:bg-slate-50"
                            >
                                <Plus className="size-3.5" />
                                <span>+ Add Stage Node</span>
                            </button>
                        </div>

                        {/* Right Column: Stage Inspector Form */}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pl-0 md:pl-2" style={{ scrollbarWidth: 'thin' }}>
                            {currentStage ? (
                                <div className="space-y-3.5 pb-2">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="flex size-6 items-center justify-center rounded-lg text-xs font-extrabold"
                                                style={{
                                                    background: currentStage.bg || '#E8F7F1',
                                                    color: currentStage.color || '#0D715F',
                                                }}
                                            >
                                                #{currentStage.num}
                                            </span>
                                            <span className="text-xs font-extrabold text-[#0F2F58]">
                                                Stage Inspector Configuration
                                            </span>
                                        </div>
                                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                            Node ID: {currentStage.id}
                                        </span>
                                    </div>

                                    {/* Title Field */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Stage Title
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.title}
                                            onChange={(e) => updateCurrentStage({ title: e.target.value })}
                                            placeholder="e.g. Intake Triage & Breaker Lockout"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>

                                    {/* Description / Instructions */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Stage Description / Operational Scope
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

                                    {/* Gate & Evidence Classification */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Gate &amp; Evidence Classification
                                            </label>
                                            <span className="text-[10px] text-slate-500">Escrow verification type</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {GATE_CLASSIFICATIONS.map((cat) => {
                                                const isSelected = currentGateType === cat.type;

                                                return (
                                                    <div
                                                        key={cat.type}
                                                        onClick={() => {
                                                            updateCurrentStage({
                                                                gateType: cat.type,
                                                                color: cat.color,
                                                                bg: cat.bg,
                                                                evidence: currentStage.evidence
                                                                    ? currentStage.evidence
                                                                    : cat.defaultEvidence,
                                                            });
                                                        }}
                                                        className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-2.5 transition-all ${
                                                            isSelected
                                                                ? 'border-[#0F2F58] bg-[#F8FAFC] shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-base">{cat.icon}</span>
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {cat.title}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                                                    isSelected
                                                                        ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                                                        : 'border-slate-300 bg-white'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                        <p className="mt-1 text-[10.5px] leading-tight text-slate-500">
                                                            {cat.subtitle}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Evidence Description / Requirement label */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Evidence Requirement / Label
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.evidence || ''}
                                            onChange={(e) => updateCurrentStage({ evidence: e.target.value })}
                                            placeholder="e.g. Breaker lock-out photo gate"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            Required proof uploaded by provider before customer milestone sign-off.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-400">
                                    No stage selected. Select or add a stage to edit its attributes.
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

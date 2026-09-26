import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowDown,
    ArrowUp,
    Check,
    Clock,
    Plus,
    RotateCcw,
    SlidersHorizontal,
    Trash2,
    Eye,
    Camera,
    Gauge,
    KeyRound,
    ListChecks,
    UserCheck,
    ShieldAlert,
    Handshake,
    MapPin,
    PackageCheck,
    Wrench,
    SearchCheck,
    FileText,
    Truck,
    FileSignature,
    AlertCircle,
    X,
} from 'lucide-react';
import WorkPipelineCanvas from './WorkPipelineCanvas';
import {
    CLEARANCE_MODE_DEFINITIONS,
    REQUIRED_PROOF_DEFINITIONS,
    WORK_NODE_CATALOG,
} from './workNodeCatalog';
import type {
    WorkStage,
    WorkStageGateType,
    WorkClearanceMode,
    WorkEvidenceType,
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
        icon: '',
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
        icon: '',
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
        icon: '',
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
        icon: '',
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

export function resolveStageGateType(stage: WorkStage, index: number, total: number): WorkStageGateType {
    if (stage.gateType) return stage.gateType;
    if (stage.clearanceMode === 'customer_approval') return 'signoff';
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

function resolveStageClearanceMode(stage: WorkStage, index: number, total: number): WorkClearanceMode {
    if (stage.clearanceMode) return stage.clearanceMode;
    if (index === total - 1) return 'customer_approval';
    const text = `${stage.title} ${stage.desc}`.toLowerCase();
    if (text.includes('pickup') || text.includes('dropoff') || text.includes('deliver') || text.includes('courier') || text.includes('handoff')) {
        return 'physical_handoff';
    }
    if (text.includes('approval') || text.includes('inspect') || text.includes('sign-off')) {
        return 'customer_approval';
    }
    return 'worker_direct';
}

function resolveStageProofs(stage: WorkStage, index: number, total: number): WorkEvidenceType[] {
    if (stage.requiredProofs && stage.requiredProofs.length > 0) return stage.requiredProofs;
    const list: WorkEvidenceType[] = [];
    const text = `${stage.title} ${stage.desc} ${stage.evidence}`.toLowerCase();

    if (text.includes('photo') || text.includes('camera') || text.includes('foam') || text.includes('lockout') || index === 0) {
        list.push('photo_proof');
    }
    if (text.includes('reading') || text.includes('delta') || text.includes('temp') || text.includes('gauge') || text.includes('amp') || text.includes('volt')) {
        list.push('metric_reading');
    }
    if (text.includes('otp') || text.includes('signature') || text.includes('sign-off') || index === total - 1) {
        list.push('customer_otp');
    }
    if (text.includes('checklist') || text.includes('intake')) {
        list.push('checklist_steps');
    }

    return list.length > 0 ? list : ['photo_proof'];
}

function renderLucideIcon(name: string, className = 'size-4') {
    switch (name) {
        case 'MapPin':
            return <MapPin className={className} />;
        case 'PackageCheck':
            return <PackageCheck className={className} />;
        case 'SearchCheck':
            return <SearchCheck className={className} />;
        case 'Wrench':
            return <Wrench className={className} />;
        case 'Gauge':
            return <Gauge className={className} />;
        case 'FileText':
            return <FileText className={className} />;
        case 'Truck':
            return <Truck className={className} />;
        case 'Signature':
        case 'FileSignature':
            return <FileSignature className={className} />;
        case 'Camera':
            return <Camera className={className} />;
        case 'KeyRound':
            return <KeyRound className={className} />;
        case 'ListChecks':
            return <ListChecks className={className} />;
        case 'UserCheck':
            return <UserCheck className={className} />;
        case 'ShieldAlert':
            return <ShieldAlert className={className} />;
        case 'Handshake':
            return <Handshake className={className} />;
        default:
            return <Check className={className} />;
    }
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
    const [inspectorTab, setInspectorTab] = useState<'configure' | 'simulator' | 'catalog'>('configure');
    const [simulatorPerspective, setSimulatorPerspective] = useState<'worker' | 'customer'>('worker');

    useEffect(() => {
        if (open) {
            const deepCopy = JSON.parse(JSON.stringify(stages)) as WorkStage[];
            setLocalStages(deepCopy);
            setSelectedStageId(deepCopy[0]?.id || null);
            setInspectorTab('configure');
        }
    }, [open, stages]);

    // Body scroll lock
    useEffect(() => {
        if (!open) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
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

    const currentClearanceMode = useMemo(() => {
        if (!currentStage) return 'worker_direct';
        return resolveStageClearanceMode(currentStage, selectedIndex, localStages.length);
    }, [currentStage, selectedIndex, localStages.length]);

    const currentProofs = useMemo(() => {
        if (!currentStage) return ['photo_proof'];
        return resolveStageProofs(currentStage, selectedIndex, localStages.length);
    }, [currentStage, selectedIndex, localStages.length]);

    const updateCurrentStage = (patch: Partial<WorkStage>) => {
        if (!currentStage) return;
        setLocalStages((prev) =>
            prev.map((s) => (s.id === currentStage.id ? { ...s, ...patch } : s)),
        );
    };

    const handleToggleProof = (proofType: WorkEvidenceType) => {
        const existing = new Set(currentProofs);
        if (existing.has(proofType)) {
            existing.delete(proofType);
        } else {
            existing.add(proofType);
        }
        updateCurrentStage({ requiredProofs: Array.from(existing) as WorkEvidenceType[] });
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
            clearanceMode: primitive.clearanceMode,
            handoffParty: primitive.handoffParty,
            requiredProofs: primitive.requiredProofs,
            metricUnit: primitive.metricUnit || '',
            interactionType: primitive.interactionType,
            evidenceProtocol: primitive.evidenceProtocol,
            gateType: primitive.clearanceMode === 'customer_approval' ? 'signoff' : 'execution',
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
            title: 'Custom Execution Step',
            dur: '30m',
            desc: 'Describe step procedures, required equipment, and milestone instructions.',
            evidence: 'Visual progress photo or completion verification.',
            color: '#0F2F58',
            bg: '#EBF2FA',
            clearanceMode: 'worker_direct',
            requiredProofs: ['photo_proof'],
            gateType: 'execution',
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
                className="flex max-h-[94vh] w-full translate-y-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 sm:max-h-[90vh] sm:max-w-4xl lg:max-w-5xl sm:rounded-2xl"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-4 pt-3 pb-3 sm:px-6 sm:pt-4">
                    {/* Header */}
                    <div className="shrink-0 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#0F2F58] text-white">
                                        <SlidersHorizontal className="size-4" />
                                    </div>
                                    <div>
                                        <h3
                                            id={titleId}
                                            className="m-0 text-base sm:text-lg font-extrabold text-[#0F2F58] tracking-tight"
                                        >
                                            Work Studio · Execution Pipeline
                                        </h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            Configure step clearance authority, evidence verification, and customer approval gates.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {onResetToTemplate && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        <RotateCcw className="size-3 text-slate-500" />
                                        <span>Reset to Archetype</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="flex h-8 w-8 min-h-[36px] min-w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Top Canvas Preview Banner */}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-2.5">
                            <div className="mb-1 flex items-center justify-between px-1 text-[10px]">
                                <span className="font-extrabold uppercase tracking-wide text-slate-500">
                                    Pipeline Sequence
                                </span>
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    {localStages.length} Verified Steps · {totalMinutes}m Total SLA
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
                                <span className="text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                                    Steps ({localStages.length})
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Select to edit</span>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                {localStages.map((stage, idx) => {
                                    const isSelected = stage.id === (currentStage?.id || selectedStageId);
                                    const mode = resolveStageClearanceMode(stage, idx, localStages.length);
                                    const modeMeta = CLEARANCE_MODE_DEFINITIONS.find((m) => m.mode === mode);
                                    const proofs = resolveStageProofs(stage, idx, localStages.length);

                                    return (
                                        <div
                                            key={stage.id}
                                            onClick={() => {
                                                setSelectedStageId(stage.id);
                                                if (inspectorTab === 'catalog') setInspectorTab('configure');
                                            }}
                                            className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 transition-all ${
                                                isSelected && inspectorTab !== 'catalog'
                                                    ? 'border-[#0F2F58] bg-[#FAFCFB] shadow-xs ring-1 ring-[#0F2F58]'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span
                                                        className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-extrabold"
                                                        style={{
                                                            background: stage.bg || '#E8F7F1',
                                                            color: stage.color || '#0D715F',
                                                        }}
                                                    >
                                                        {stage.num || String(idx + 1)}
                                                    </span>
                                                    <span className="truncate text-xs font-extrabold text-slate-900">
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

                                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${modeMeta?.badgeStyle || 'bg-slate-100 text-slate-700'}`}>
                                                        {modeMeta?.label}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-slate-400">
                                                        {proofs.map((p) => {
                                                            const iconDef = REQUIRED_PROOF_DEFINITIONS.find((d) => d.type === p);
                                                            if (!iconDef) return null;
                                                            return (
                                                                <span key={p} title={iconDef.label}>
                                                                    {renderLucideIcon(iconDef.lucideIcon, 'size-3 text-slate-500')}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
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
                                    className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all min-h-[38px] ${
                                        inspectorTab === 'catalog'
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                            : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>From Step Library</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddStage}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-[#0F2F58] transition-colors hover:border-[#0F2F58] hover:bg-slate-50 min-h-[38px]"
                                >
                                    <Plus className="size-3.5" />
                                    <span>+ Add Stage Node</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Stage Inspector & Node Catalog & Live Simulator */}
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
                                        Step Configuration
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('simulator')}
                                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                            inspectorTab === 'simulator'
                                                ? 'bg-emerald-700 text-white shadow-xs'
                                                : 'text-emerald-800 hover:bg-emerald-50'
                                        }`}
                                    >
                                        <Eye className="size-3.5" />
                                        <span>Live Order Simulator</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('catalog')}
                                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                            inspectorTab === 'catalog'
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>Step Library</span>
                                        <span className="rounded-full bg-slate-200/60 px-1.5 text-[9px] font-mono text-slate-700">8</span>
                                    </button>
                                </div>

                                {currentStage && inspectorTab !== 'catalog' && (
                                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                                        Step #{currentStage.num} · {currentStage.dur}
                                    </span>
                                )}
                            </div>

                            {/* TAB 1: STEP CONFIGURATION */}
                            {inspectorTab === 'configure' && currentStage && (
                                <div className="space-y-3.5 pb-2">
                                    {/* Title Field */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Step Title
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.title}
                                            onChange={(e) => updateCurrentStage({ title: e.target.value })}
                                            placeholder="e.g. Site Check-In, Disinfection Flush, Delta Temp Test..."
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>

                                    {/* Scope / Description */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Scope &amp; Operating Instructions
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={currentStage.desc || ''}
                                            onChange={(e) => updateCurrentStage({ desc: e.target.value })}
                                            placeholder="Describe step procedures, required equipment, safety isolation steps..."
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>

                                    {/* Duration Presets */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Target Duration (SLA)
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

                                    {/* 1. Who Clears This Step? */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Who Clears This Step?
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-semibold">Milestone authority</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            {CLEARANCE_MODE_DEFINITIONS.map((def) => {
                                                const isSelected = currentClearanceMode === def.mode;
                                                return (
                                                    <div
                                                        key={def.mode}
                                                        onClick={() => {
                                                            let gateType: WorkStageGateType = 'execution';
                                                            if (def.mode === 'customer_approval') gateType = 'signoff';
                                                            else if (def.mode === 'physical_handoff') gateType = 'execution';
                                                            else gateType = selectedIndex === 0 ? 'arrival' : 'execution';

                                                            updateCurrentStage({
                                                                clearanceMode: def.mode,
                                                                gateType,
                                                            });
                                                        }}
                                                        className={`flex cursor-pointer flex-col justify-between rounded-xl border p-2.5 transition-all ${
                                                            isSelected
                                                                ? 'border-[#0F2F58] bg-[#FAFCFB] shadow-xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {renderLucideIcon(def.lucideIcon, `size-4 ${isSelected ? 'text-[#0F2F58]' : 'text-slate-500'}`)}
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {def.label}
                                                                </span>
                                                            </div>
                                                            {isSelected && <Check className="size-3.5 stroke-[3] text-[#0F2F58]" />}
                                                        </div>
                                                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                                            {def.description}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Physical handoff sub-choice */}
                                        {currentClearanceMode === 'physical_handoff' && (
                                            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 space-y-1.5">
                                                <span className="text-[11px] font-extrabold text-[#0F2F58]">
                                                    Handoff Receipt Authority:
                                                </span>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                                        <input
                                                            type="radio"
                                                            name="handoffParty"
                                                            checked={currentStage.handoffParty !== 'worker_dropoff'}
                                                            onChange={() => updateCurrentStage({ handoffParty: 'recipient_confirm' })}
                                                            className="accent-[#0F2F58]"
                                                        />
                                                        <span>Recipient Confirms (OTP / App Tap)</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                                        <input
                                                            type="radio"
                                                            name="handoffParty"
                                                            checked={currentStage.handoffParty === 'worker_dropoff'}
                                                            onChange={() => updateCurrentStage({ handoffParty: 'worker_dropoff' })}
                                                            className="accent-[#0F2F58]"
                                                        />
                                                        <span>Worker Drop-off Photo (Porch / Counter)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Required Proof (Multi-Select) */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Required Proof (Multi-Select)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-semibold">Select all that apply</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {REQUIRED_PROOF_DEFINITIONS.map((def) => {
                                                const isChecked = currentProofs.includes(def.type);
                                                return (
                                                    <label
                                                        key={def.type}
                                                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-all ${
                                                            isChecked
                                                                ? 'border-[#0F2F58] bg-[#FAFCFB] shadow-2xs'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleProof(def.type)}
                                                            className="mt-0.5 size-4 accent-[#0F2F58] cursor-pointer rounded"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {renderLucideIcon(def.lucideIcon, 'size-3.5 text-slate-600')}
                                                                <span className="text-xs font-extrabold text-slate-900">
                                                                    {def.label}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                                                {def.description}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Metric reading unit input */}
                                        {currentProofs.includes('metric_reading') && (
                                            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-xs">
                                                <span className="font-bold text-amber-950 shrink-0">Measurement Unit:</span>
                                                <input
                                                    type="text"
                                                    value={currentStage.metricUnit || '°C delta'}
                                                    onChange={(e) => updateCurrentStage({ metricUnit: e.target.value })}
                                                    placeholder="e.g. °C delta, Volts, psi, kg"
                                                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 outline-none w-36"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Specific Instructions / Label */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Evidence Guidance for Worker &amp; Customer
                                        </label>
                                        <input
                                            type="text"
                                            value={currentStage.evidence || ''}
                                            onChange={(e) => updateCurrentStage({ evidence: e.target.value })}
                                            placeholder="e.g. Clear photo showing cold air thermometer reading"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: LIVE ORDER SIMULATOR */}
                            {inspectorTab === 'simulator' && currentStage && (
                                <div className="space-y-3 pb-2">
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                        <div>
                                            <span className="text-xs font-extrabold text-slate-900">
                                                Production Screen Preview
                                            </span>
                                            <p className="text-[10px] text-slate-500">
                                                Interactive preview of how this step appears on /orders/{'{id}'}.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setSimulatorPerspective('worker')}
                                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                                    simulatorPerspective === 'worker'
                                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Worker View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSimulatorPerspective('customer')}
                                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                                    simulatorPerspective === 'customer'
                                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Customer View
                                            </button>
                                        </div>
                                    </div>

                                    {/* Simulated Phone Shell */}
                                    <div className="mx-auto max-w-md rounded-2xl border-2 border-slate-800 bg-white p-4 shadow-xl space-y-3 font-sans">
                                        {/* Status Header */}
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                                    ORDER #ORD-104 · STEP {currentStage.num} OF {localStages.length}
                                                </span>
                                                <div className="text-sm font-extrabold text-slate-900">
                                                    {currentStage.title}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-bold text-slate-600">
                                                ~{currentStage.dur}
                                            </span>
                                        </div>

                                        {/* Scope */}
                                        {currentStage.desc && (
                                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                {currentStage.desc}
                                            </p>
                                        )}

                                        {/* Perspective Details */}
                                        {simulatorPerspective === 'worker' ? (
                                            <div className="space-y-3 border-t border-slate-100 pt-2">
                                                <span className="text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider">
                                                    Worker Execution Inputs
                                                </span>

                                                {/* Proof Inputs */}
                                                <div className="space-y-2">
                                                    {currentProofs.includes('photo_proof') && (
                                                        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center bg-slate-50/50">
                                                            <Camera className="mx-auto size-5 text-slate-400 mb-1" />
                                                            <div className="text-xs font-bold text-slate-800">
                                                                Photo Proof Required
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">
                                                                {currentStage.evidence || 'Snap photo before continuing'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {currentProofs.includes('metric_reading') && (
                                                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Gauge className="size-4 text-amber-700" />
                                                                <span className="text-xs font-bold text-slate-900">
                                                                    Measurement Reading
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 font-mono text-xs font-bold">
                                                                <input
                                                                    type="text"
                                                                    placeholder="12.4"
                                                                    disabled
                                                                    className="w-14 rounded border border-amber-300 bg-white px-2 py-0.5 text-right text-xs"
                                                                />
                                                                <span>{currentStage.metricUnit || '°C'}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {currentProofs.includes('customer_otp') && (
                                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-2.5 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <KeyRound className="size-4 text-indigo-700" />
                                                                <span className="text-xs font-bold text-slate-900">
                                                                    Customer 4-Digit OTP
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-xs font-bold text-slate-400 tracking-widest">
                                                                [ · · · · ]
                                                            </span>
                                                        </div>
                                                    )}

                                                    {currentProofs.includes('checklist_steps') && (
                                                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 text-xs font-semibold text-slate-700">
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked disabled className="accent-[#0F2F58]" />
                                                                <span>1. Safety Breaker Lockout verified</span>
                                                            </label>
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked disabled className="accent-[#0F2F58]" />
                                                                <span>2. Customer area cleared and protected</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action CTA */}
                                                {currentClearanceMode === 'customer_approval' ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-extrabold text-white shadow-xs"
                                                    >
                                                        <span>Submit for Customer Approval ➔</span>
                                                    </button>
                                                ) : currentClearanceMode === 'physical_handoff' ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-xs font-extrabold text-white shadow-xs"
                                                    >
                                                        <span>Confirm Custody Handover ➔</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F2F58] py-2.5 text-xs font-extrabold text-white shadow-xs"
                                                    >
                                                        <span>Complete Step &amp; Advance ➔</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3 border-t border-slate-100 pt-2">
                                                <span className="text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider">
                                                    Customer Experience
                                                </span>

                                                {currentClearanceMode === 'customer_approval' ? (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs">
                                                            <AlertCircle className="size-4 text-amber-700" />
                                                            <span>Action Required: Approve Step</span>
                                                        </div>
                                                        <p className="text-[11px] text-amber-900 leading-tight">
                                                            Provider has completed this milestone. Please inspect the work and confirm to release milestone progression.
                                                        </p>
                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                disabled
                                                                className="flex-1 rounded-lg bg-emerald-700 py-1.5 text-[11px] font-extrabold text-white text-center"
                                                            >
                                                                Approve &amp; Advance
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled
                                                                className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-700 text-center"
                                                            >
                                                                Request Adjustment
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : currentProofs.includes('customer_otp') ? (
                                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-1 text-center">
                                                        <div className="text-xs font-bold text-indigo-950">
                                                            Your Milestone Release OTP
                                                        </div>
                                                        <div className="font-mono text-xl font-extrabold text-[#0F2F58] tracking-widest">
                                                            8 4 2 1
                                                        </div>
                                                        <span className="text-[10px] text-slate-500">
                                                            Provide to technician only when physically satisfied with the completed task.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs text-slate-600">
                                                        <div className="font-bold text-slate-900">
                                                            Service Underway
                                                        </div>
                                                        <p className="text-[11px]">
                                                            Provider is currently performing this step (~{currentStage.dur}). Live status will update automatically.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: STEP LIBRARY */}
                            {inspectorTab === 'catalog' && (
                                <div className="space-y-3 pb-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                        <div className="text-xs font-extrabold text-slate-900">
                                            Universal Step Library
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            Operational primitives for service trades, goods delivery, diagnostic inspections, and client sign-offs. 1-click to append to your sequence.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {WORK_NODE_CATALOG.map((prim) => {
                                            const modeMeta = CLEARANCE_MODE_DEFINITIONS.find((m) => m.mode === prim.clearanceMode);

                                            return (
                                                <div
                                                    key={prim.id}
                                                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-all hover:border-[#0F2F58] hover:shadow-xs"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-slate-700">
                                                                    {renderLucideIcon(prim.lucideIcon, 'size-4')}
                                                                </span>
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
                                                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${modeMeta?.badgeStyle || 'bg-slate-100 text-slate-700'}`}>
                                                            {modeMeta?.label}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddFromCatalog(prim)}
                                                            className="shrink-0 cursor-pointer rounded-lg bg-[#0F2F58] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-[#153e74] transition-colors"
                                                        >
                                                            + Add Step
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {inspectorTab !== 'catalog' && !currentStage && (
                                <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-400">
                                    No step selected. Select or add a step from the library to configure.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-3 flex shrink-0 items-center justify-between border-t border-slate-100 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
                        >
                            Cancel
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                className="cursor-pointer rounded-xl bg-[#0F2F58] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74] min-h-[44px] transition-colors"
                            >
                                Apply Workflow to Listing ➔
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(dialogContent, document.body);
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Lock,
    Plus,
    RotateCcw,
    Search,
    ShieldCheck,
    Store,
    Trash2,
    Truck,
    Wrench,
    X,
} from 'lucide-react';
import {
    PartnerSelectionDrawer,
    type PartnerCandidate,
} from './PartnerSelectionDrawer';

export interface PipelineNode {
    key: string;
    needKind: string;
    title: string;
    descriptionTemplate?: string;
    role: string;
    type: 'store' | 'delivery' | 'labor' | 'audit';
    feeMinor: number;
    assignedPartner?: {
        id: string;
        title: string;
        providerName: string;
        priceMinor: number;
        photoUrl?: string;
        barangay?: string;
    } | null;
}

export interface PipelineDependency {
    predecessor: string;
    successor: string;
    conditionCode: string;
    allowBypass?: boolean;
}

export interface DealChainPipelineBuilderProps {
    nodes: PipelineNode[];
    dependencies: PipelineDependency[];
    onChange: (nodes: PipelineNode[], dependencies: PipelineDependency[]) => void;
    partnerCandidates?: PartnerCandidate[];
    readOnly?: boolean;
}

export const GATE_CONDITIONS: Array<{ code: string; label: string; description: string }> = [
    {
        code: 'source_ready',
        label: 'Source Ready',
        description: 'Wait until parts/materials are prepared and ready at merchant counter.',
    },
    {
        code: 'delivered_to_site',
        label: 'Delivered to Site',
        description: 'Wait until courier arrives on site and hands over materials.',
    },
    {
        code: 'work_completed',
        label: 'Work Completed',
        description: 'Wait until previous technical labor/installation is marked done.',
    },
    {
        code: 'inspection_cleared',
        label: 'Inspection Cleared',
        description: 'Wait until quality or safety inspection certificate is signed.',
    },
];

export const PRESET_STEP_TEMPLATES: Array<{
    type: 'store' | 'delivery' | 'labor' | 'audit';
    role: string;
    title: string;
    needKind: string;
    defaultFeeMinor: number;
    defaultConditionCode: string;
}> = [
    {
        type: 'store',
        role: 'Hardware / Part Supply',
        title: 'Replacement Parts & Materials',
        needKind: 'product',
        defaultFeeMinor: 18000,
        defaultConditionCode: 'source_ready',
    },
    {
        type: 'delivery',
        role: 'Doorstep Courier Runner',
        title: 'Direct Moto Transit',
        needKind: 'service',
        defaultFeeMinor: 3500,
        defaultConditionCode: 'delivered_to_site',
    },
    {
        type: 'labor',
        role: 'Trade Technician / Labor',
        title: 'On-Site Technical Labor',
        needKind: 'service',
        defaultFeeMinor: 25000,
        defaultConditionCode: 'work_completed',
    },
    {
        type: 'audit',
        role: 'Quality & Safety Auditor',
        title: 'Compliance Sign-off',
        needKind: 'verification',
        defaultFeeMinor: 10000,
        defaultConditionCode: 'inspection_cleared',
    },
];

export function getRoleMeta(type: 'store' | 'delivery' | 'labor' | 'audit') {
    switch (type) {
        case 'store':
            return {
                label: 'STORE / SUPPLY',
                badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                cardBorder: 'hover:border-amber-400 focus-within:border-amber-500',
                accentBg: 'bg-amber-500/10 text-amber-700',
                icon: <Store className="size-5 text-amber-600" />,
            };
        case 'delivery':
            return {
                label: 'COURIER / TRANSIT',
                badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
                cardBorder: 'hover:border-sky-400 focus-within:border-sky-500',
                accentBg: 'bg-sky-500/10 text-sky-700',
                icon: <Truck className="size-5 text-sky-600" />,
            };
        case 'labor':
            return {
                label: 'TECHNICIAN / LABOR',
                badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                cardBorder: 'hover:border-emerald-400 focus-within:border-emerald-500',
                accentBg: 'bg-emerald-500/10 text-emerald-700',
                icon: <Wrench className="size-5 text-emerald-600" />,
            };
        case 'audit':
            return {
                label: 'QUALITY / AUDIT',
                badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
                cardBorder: 'hover:border-purple-400 focus-within:border-purple-500',
                accentBg: 'bg-purple-500/10 text-purple-700',
                icon: <ShieldCheck className="size-5 text-purple-600" />,
            };
    }
}

export function DealChainPipelineBuilder({
    nodes,
    dependencies,
    onChange,
    partnerCandidates = [],
    readOnly = false,
}: DealChainPipelineBuilderProps) {
    // Undo Toast State
    const [deletedHistory, setDeletedHistory] = useState<{
        nodes: PipelineNode[];
        dependencies: PipelineDependency[];
        deletedTitle: string;
    } | null>(null);
    const undoTimerRef = useRef<number | null>(null);

    // Partner Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDrawerNodeKey, setActiveDrawerNodeKey] = useState<string | null>(null);

    const activeDrawerNode = useMemo(
        () => nodes.find((n) => n.key === activeDrawerNodeKey) || null,
        [nodes, activeDrawerNodeKey],
    );

    // Calculate total chain minor fee
    const totalChainFeePesos = useMemo(
        () => nodes.reduce((sum, n) => sum + (n.feeMinor || 0), 0) / 100,
        [nodes],
    );

    // Clear undo timer on unmount
    useEffect(() => {
        return () => {
            if (undoTimerRef.current) {
                window.clearTimeout(undoTimerRef.current);
            }
        };
    }, []);

    const triggerUndoToast = (
        prevNodes: PipelineNode[],
        prevDependencies: PipelineDependency[],
        deletedTitle: string,
    ) => {
        if (undoTimerRef.current) {
            window.clearTimeout(undoTimerRef.current);
        }
        setDeletedHistory({ nodes: prevNodes, dependencies: prevDependencies, deletedTitle });
        undoTimerRef.current = window.setTimeout(() => {
            setDeletedHistory(null);
            undoTimerRef.current = null;
        }, 5000);
    };

    const handleUndoDelete = () => {
        if (!deletedHistory) return;
        onChange(deletedHistory.nodes, deletedHistory.dependencies);
        setDeletedHistory(null);
        if (undoTimerRef.current) {
            window.clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
    };

    // Auto-heal dependencies after deletion or insertion
    const healDependenciesAfterRemoval = (
        deletedKey: string,
        currentNodes: PipelineNode[],
        currentDependencies: PipelineDependency[],
    ): PipelineDependency[] => {
        // Find dependencies going into deletedKey and out of deletedKey
        const incoming = currentDependencies.filter((d) => d.successor === deletedKey);
        const outgoing = currentDependencies.filter((d) => d.predecessor === deletedKey);

        const withoutDeleted = currentDependencies.filter(
            (d) => d.predecessor !== deletedKey && d.successor !== deletedKey,
        );

        // If there is an incoming and outgoing chain, stitch them together
        const newBridges: PipelineDependency[] = [];
        for (const inc of incoming) {
            for (const out of outgoing) {
                const predNode = currentNodes.find((n) => n.key === inc.predecessor);
                const condition =
                    predNode?.type === 'store'
                        ? 'source_ready'
                        : predNode?.type === 'delivery'
                          ? 'delivered_to_site'
                          : 'work_completed';

                // Prevent duplicates
                if (
                    !withoutDeleted.some(
                        (d) => d.predecessor === inc.predecessor && d.successor === out.successor,
                    )
                ) {
                    newBridges.push({
                        predecessor: inc.predecessor,
                        successor: out.successor,
                        conditionCode: condition,
                        allowBypass: false,
                    });
                }
            }
        }

        return [...withoutDeleted, ...newBridges];
    };

    const handleRemoveNode = (key: string) => {
        if (readOnly || nodes.length <= 2) return;
        const targetNode = nodes.find((n) => n.key === key);
        const title = targetNode?.title || 'Step';

        const updatedNodes = nodes.filter((n) => n.key !== key);
        const updatedDeps = healDependenciesAfterRemoval(key, updatedNodes, dependencies);

        triggerUndoToast(nodes, dependencies, title);
        onChange(updatedNodes, updatedDeps);
    };

    const handleMoveNode = (index: number, direction: 'up' | 'down') => {
        if (readOnly) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= nodes.length) return;

        const nextNodes = [...nodes];
        const temp = nextNodes[index];
        nextNodes[index] = nextNodes[targetIndex];
        nextNodes[targetIndex] = temp;

        // Rebuild sequential dependencies for pipeline order
        const nextDeps: PipelineDependency[] = [];
        for (let i = 0; i < nextNodes.length - 1; i++) {
            const pred = nextNodes[i];
            const succ = nextNodes[i + 1];
            const existing = dependencies.find(
                (d) => d.predecessor === pred.key && d.successor === succ.key,
            );
            const condition =
                existing?.conditionCode ||
                (pred.type === 'store'
                    ? 'source_ready'
                    : pred.type === 'delivery'
                      ? 'delivered_to_site'
                      : 'work_completed');

            nextDeps.push({
                predecessor: pred.key,
                successor: succ.key,
                conditionCode: condition,
                allowBypass: existing?.allowBypass ?? false,
            });
        }

        onChange(nextNodes, nextDeps);
    };

    const handleInsertStepBetween = (
        index: number,
        template: (typeof PRESET_STEP_TEMPLATES)[number],
    ) => {
        if (readOnly) return;
        const newKey = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newNode: PipelineNode = {
            key: newKey,
            needKind: template.needKind,
            title: template.title,
            role: template.role,
            type: template.type,
            feeMinor: template.defaultFeeMinor,
        };

        const nextNodes = [...nodes];
        nextNodes.splice(index + 1, 0, newNode);

        // Reconnect dependencies
        const prevNode = nodes[index];
        const nextNode = nodes[index + 1];

        const filteredDeps = dependencies.filter(
            (d) => !(d.predecessor === prevNode.key && d.successor === nextNode.key),
        );

        const newDeps: PipelineDependency[] = [
            ...filteredDeps,
            {
                predecessor: prevNode.key,
                successor: newKey,
                conditionCode:
                    prevNode.type === 'store'
                        ? 'source_ready'
                        : prevNode.type === 'delivery'
                          ? 'delivered_to_site'
                          : 'work_completed',
                allowBypass: false,
            },
            {
                predecessor: newKey,
                successor: nextNode.key,
                conditionCode: template.defaultConditionCode,
                allowBypass: false,
            },
        ];

        onChange(nextNodes, newDeps);
    };

    const handleAddStepAtEnd = (template: (typeof PRESET_STEP_TEMPLATES)[number]) => {
        if (readOnly) return;
        const newKey = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newNode: PipelineNode = {
            key: newKey,
            needKind: template.needKind,
            title: template.title,
            role: template.role,
            type: template.type,
            feeMinor: template.defaultFeeMinor,
        };

        const lastNode = nodes[nodes.length - 1];
        const nextNodes = [...nodes, newNode];

        const nextDeps = [...dependencies];
        if (lastNode) {
            nextDeps.push({
                predecessor: lastNode.key,
                successor: newKey,
                conditionCode:
                    lastNode.type === 'store'
                        ? 'source_ready'
                        : lastNode.type === 'delivery'
                          ? 'delivered_to_site'
                          : 'work_completed',
                allowBypass: false,
            });
        }

        onChange(nextNodes, nextDeps);
    };

    const handleUpdateNodeField = (
        key: string,
        updates: Partial<Omit<PipelineNode, 'key'>>,
    ) => {
        if (readOnly) return;
        const nextNodes = nodes.map((node) => (node.key === key ? { ...node, ...updates } : node));
        onChange(nextNodes, dependencies);
    };

    const handleUpdateGateCondition = (
        predKey: string,
        succKey: string,
        conditionCode: string,
    ) => {
        if (readOnly) return;
        const nextDeps = dependencies.map((d) =>
            d.predecessor === predKey && d.successor === succKey
                ? { ...d, conditionCode }
                : d,
        );
        onChange(nodes, nextDeps);
    };

    const handleOpenPartnerDrawer = (nodeKey: string) => {
        if (readOnly) return;
        setActiveDrawerNodeKey(nodeKey);
        setIsDrawerOpen(true);
    };

    const handleSelectPartner = (candidate: PartnerCandidate) => {
        if (!activeDrawerNodeKey) return;
        const mappedRole: 'store' | 'delivery' | 'labor' | 'audit' =
            candidate.role === 'courier'
                ? 'delivery'
                : candidate.role === 'technician'
                  ? 'labor'
                  : candidate.role === 'store'
                    ? 'store'
                    : 'audit';

        handleUpdateNodeField(activeDrawerNodeKey, {
            title: candidate.name,
            role: candidate.category || candidate.role,
            type: mappedRole,
            feeMinor: candidate.fee * 100,
            assignedPartner: {
                id: candidate.id,
                title: candidate.name,
                providerName: candidate.name,
                priceMinor: candidate.fee * 100,
                barangay: candidate.sub,
            },
        });
        setIsDrawerOpen(false);
        setActiveDrawerNodeKey(null);
    };

    const handleClearPartnerAssignment = (nodeKey: string) => {
        if (readOnly) return;
        handleUpdateNodeField(nodeKey, {
            assignedPartner: null,
        });
    };

    // Filter drawer candidates by the active step's role
    const drawerRole = useMemo<'store' | 'courier' | 'technician' | 'auditor' | null>(() => {
        if (!activeDrawerNode) return null;
        switch (activeDrawerNode.type) {
            case 'store':
                return 'store';
            case 'delivery':
                return 'courier';
            case 'labor':
                return 'technician';
            case 'audit':
                return 'auditor';
            default:
                return null;
        }
    }, [activeDrawerNode]);

    return (
        <div className="relative flex flex-col gap-6 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Pipeline Header Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-[#0F2F58] font-mono text-xs font-bold text-white">
                        {nodes.length}
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0F2F58]">
                            Sequential Relay Pipeline
                        </h3>
                        <p className="text-xs text-slate-500">
                            {nodes.length} coordinated steps · Total est. fee: ₱
                            {totalChainFeePesos.toFixed(2)}
                        </p>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">Quick Add:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_STEP_TEMPLATES.map((tmpl) => (
                                <button
                                    key={tmpl.type}
                                    type="button"
                                    onClick={() => handleAddStepAtEnd(tmpl)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:border-[#0F2F58] hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                    title={`Append new ${tmpl.role} step`}
                                >
                                    <Plus className="size-3" />
                                    <span>{tmpl.type.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Tactile Pipeline Cards */}
            <div className="space-y-4">
                {nodes.map((node, index) => {
                    const meta = getRoleMeta(node.type);
                    const isFirst = index === 0;
                    const isLast = index === nodes.length - 1;
                    const canDelete = nodes.length > 2 && !readOnly;

                    // Find dependency between this node and next node
                    const nextNode = nodes[index + 1];
                    const outDep = nextNode
                        ? dependencies.find(
                              (d) => d.predecessor === node.key && d.successor === nextNode.key,
                          )
                        : null;

                    return (
                        <React.Fragment key={node.key}>
                            {/* Step Card */}
                            <div
                                className={`group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all sm:p-5 ${meta.cardBorder}`}
                            >
                                {/* Step Card Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-extrabold ${meta.accentBg}`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${meta.badgeBg}`}
                                            >
                                                {meta.icon}
                                                <span>{meta.label}</span>
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">
                                                ID: {node.key}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Move Up, Move Down, Delete */}
                                    {!readOnly && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={isFirst}
                                                onClick={() => handleMoveNode(index, 'up')}
                                                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                                                title="Move Step Up"
                                                aria-label="Move step up"
                                            >
                                                <ArrowUp className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isLast}
                                                onClick={() => handleMoveNode(index, 'down')}
                                                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                                                title="Move Step Down"
                                                aria-label="Move step down"
                                            >
                                                <ArrowDown className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!canDelete}
                                                onClick={() => handleRemoveNode(node.key)}
                                                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                title={
                                                    canDelete
                                                        ? 'Delete this step'
                                                        : 'Deal chains require at least 2 coordinated steps'
                                                }
                                                aria-label="Delete step"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Step Form Fields */}
                                <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="text-[11px] font-extrabold uppercase text-slate-500">
                                            Step Title &amp; Task
                                        </label>
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            value={node.title}
                                            onChange={(e) =>
                                                handleUpdateNodeField(node.key, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder="e.g. Sourcing 35uF Run Capacitor"
                                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-2xs outline-none focus:border-[#0F2F58]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-extrabold uppercase text-slate-500">
                                            Role Specification
                                        </label>
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            value={node.role}
                                            onChange={(e) =>
                                                handleUpdateNodeField(node.key, {
                                                    role: e.target.value,
                                                })
                                            }
                                            placeholder="e.g. Hardware / Parts Supply"
                                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-2xs outline-none focus:border-[#0F2F58]"
                                        />
                                    </div>
                                </div>

                                {/* Partner Assignment & Fee Strip */}
                                <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2.5">
                                        {node.assignedPartner ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 className="size-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-900">
                                                            {node.assignedPartner.providerName}
                                                        </span>
                                                        {node.assignedPartner.barangay && (
                                                            <span className="text-[11px] text-slate-500">
                                                                · {node.assignedPartner.barangay}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-500">
                                                        Preferred partner listing attached
                                                    </span>
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleClearPartnerAssignment(node.key)
                                                        }
                                                        className="ml-1 cursor-pointer text-slate-400 hover:text-slate-600"
                                                        title="Unassign partner (revert to Open Pool)"
                                                    >
                                                        <X className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-600">
                                                    🌐 Open Pool (Any qualified Tagudin provider)
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenPartnerDrawer(node.key)}
                                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[#0F2F58] hover:underline"
                                            >
                                                <Search className="size-3.5" />
                                                <span>
                                                    {node.assignedPartner
                                                        ? 'Change Partner'
                                                        : 'Assign Partner'}
                                                </span>
                                            </button>
                                        )}

                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-extrabold text-slate-400">
                                                ₱
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="5"
                                                disabled={readOnly}
                                                value={(node.feeMinor / 100).toFixed(0)}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    handleUpdateNodeField(node.key, {
                                                        feeMinor: Math.round(val * 100),
                                                    });
                                                }}
                                                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-[#0F2F58]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Connector Wire & Gate Hand-Off (Between Step i and Step i+1) */}
                            {nextNode && (
                                <div className="relative flex flex-col items-center py-1">
                                    {/* Vertical Connecting Wire */}
                                    <div className="h-3 w-0.5 bg-slate-300"></div>

                                    {/* Middle Insert Step Button */}
                                    {!readOnly && (
                                        <div className="group/insert relative my-1">
                                            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xs transition-all hover:border-[#0F2F58]">
                                                <span className="text-[10.5px] font-bold text-slate-500">
                                                    Insert step:
                                                </span>
                                                {PRESET_STEP_TEMPLATES.map((tmpl) => (
                                                    <button
                                                        key={tmpl.type}
                                                        type="button"
                                                        onClick={() =>
                                                            handleInsertStepBetween(index, tmpl)
                                                        }
                                                        className="cursor-pointer rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] hover:bg-[#EBF2FA]"
                                                        title={`Insert ${tmpl.role} between step ${index + 1} and ${index + 2}`}
                                                    >
                                                        + {tmpl.type.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hand-Off Gate Condition Card */}
                                    <div className="my-1.5 flex w-full max-w-lg items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Lock className="size-3.5 text-amber-700" />
                                            <span className="font-extrabold text-amber-950">
                                                Hand-off Gate:
                                            </span>
                                            <span className="font-medium text-amber-900">
                                                {GATE_CONDITIONS.find(
                                                    (g) => g.code === outDep?.conditionCode,
                                                )?.label ||
                                                    outDep?.conditionCode ||
                                                    'Sequential handoff'}
                                            </span>
                                        </div>

                                        {!readOnly && (
                                            <select
                                                value={outDep?.conditionCode || 'source_ready'}
                                                onChange={(e) =>
                                                    handleUpdateGateCondition(
                                                        node.key,
                                                        nextNode.key,
                                                        e.target.value,
                                                    )
                                                }
                                                className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs outline-none"
                                            >
                                                {GATE_CONDITIONS.map((cond) => (
                                                    <option key={cond.code} value={cond.code}>
                                                        {cond.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Downward Wire */}
                                    <div className="h-3 w-0.5 bg-slate-300"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Bottom Add Step Toolbar */}
            {!readOnly && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                    <p className="text-xs font-extrabold text-slate-600">
                        Add Next Relay Step to Chain
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        Drop in a pre-configured role template instantly
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {PRESET_STEP_TEMPLATES.map((tmpl) => {
                            const meta = getRoleMeta(tmpl.type);
                            return (
                                <button
                                    key={tmpl.type}
                                    type="button"
                                    onClick={() => handleAddStepAtEnd(tmpl)}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-800 shadow-2xs transition-all hover:border-[#0F2F58] hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                >
                                    {meta.icon}
                                    <span>+ {tmpl.role}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Instant Undo Toast Notification */}
            {deletedHistory && (
                <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Step '{deletedHistory.deletedTitle}' removed</span>
                    <button
                        type="button"
                        onClick={handleUndoDelete}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-800 px-3 py-1 font-extrabold text-[#FFC72C] transition-colors hover:bg-slate-700"
                    >
                        <RotateCcw className="size-3" />
                        <span>Undo (5s)</span>
                    </button>
                </div>
            )}

            {/* Responsive Partner Selection Drawer */}
            {drawerRole && (
                <PartnerSelectionDrawer
                    open={isDrawerOpen}
                    onClose={() => {
                        setIsDrawerOpen(false);
                        setActiveDrawerNodeKey(null);
                    }}
                    role={drawerRole}
                    candidates={partnerCandidates}
                    currentSelectedId={activeDrawerNode?.assignedPartner?.id}
                    onSelect={handleSelectPartner}
                />
            )}
        </div>
    );
}
export default DealChainPipelineBuilder;

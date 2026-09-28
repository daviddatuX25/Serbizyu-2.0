import React, { useMemo } from 'react';
import {
    Plus,
    Store,
    Truck,
    Wrench,
    ShieldCheck,
} from 'lucide-react';
import type { DealChainNode, DealChainDependencyEdge } from './types';

export interface DealChainCanvasProps {
    nodes: DealChainNode[];
    dependencies?: DealChainDependencyEdge[];
    selectedNodeId?: string | null;
    onNodeClick?: (nodeId: string) => void;
    selectedGateId?: string;
    onGateClick?: (gateId: string) => void;
    onAddStepClick?: (sourceNodeId: string, event: React.MouseEvent) => void;
    theme?: 'dark' | 'light';
    title?: string;
}

/**
 * Returns role-based color, accent border, and icon for an n8n squircle node
 */
function getNodeCategoryMeta(type: string, role: string) {
    const t = (type || '').toLowerCase();
    const r = (role || '').toLowerCase();

    if (t === 'store' || t === 'part' || r.includes('part') || r.includes('store') || r.includes('bakery') || r.includes('produce')) {
        return {
            stripeColor: '#F59E0B', // Amber
            icon: <Store className="size-5 text-[#F59E0B]" />,
            roleBadgeBg: '#FEF3C7',
            roleBadgeText: '#92400E',
            label: 'PART / STORE',
        };
    }
    if (t === 'delivery' || t === 'transit' || r.includes('courier') || r.includes('rider') || r.includes('hauler') || r.includes('transit')) {
        return {
            stripeColor: '#38BDF8', // Sky Blue
            icon: <Truck className="size-5 text-[#38BDF8]" />,
            roleBadgeBg: '#E0F2FE',
            roleBadgeText: '#0369A1',
            label: 'COURIER',
        };
    }
    if (t === 'audit' || r.includes('audit') || r.includes('cert') || r.includes('inspect')) {
        return {
            stripeColor: '#A855F7', // Purple
            icon: <ShieldCheck className="size-5 text-[#A855F7]" />,
            roleBadgeBg: '#F3E8FF',
            roleBadgeText: '#7E22CE',
            label: 'AUDIT',
        };
    }
    // Default to Labor / Primary offering
    return {
        stripeColor: '#10B981', // Emerald
        icon: <Wrench className="size-5 text-[#10B981]" />,
        roleBadgeBg: '#DCFCE7',
        roleBadgeText: '#15803D',
        label: 'LABOR',
    };
}

/* ── Dashed Wire (Horizontal) ── */
function DashedWire({ width = 36, stroke = '#10B981' }: { width?: number; stroke?: string }) {
    return (
        <div className="flex h-[66px] items-center justify-center shrink-0" style={{ width }}>
            <svg width={width} height="12" viewBox={`0 0 ${width} 12`} fill="none" className="shrink-0" aria-hidden="true">
                <line
                    x1="0"
                    y1="6"
                    x2={width}
                    y2="6"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                />
            </svg>
        </div>
    );
}

/* ── Fork SVG (1 In -> 2 Out Lanes) ── */
function ForkSvg({ height = 150, stroke = '#10B981' }: { height?: number; stroke?: string }) {
    const half = height / 2;
    const topY = 33;
    const btmY = height - 33;
    return (
        <div className="flex items-center justify-center shrink-0" style={{ width: 32, height }}>
            <svg width="32" height={height} viewBox={`0 0 32 ${height}`} fill="none" className="shrink-0" aria-hidden="true">
                <path
                    d={`M0 ${half} H10 C18 ${half} 18 ${topY} 32 ${topY}`}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
                <path
                    d={`M0 ${half} H10 C18 ${half} 18 ${btmY} 32 ${btmY}`}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
            </svg>
        </div>
    );
}

/* ── Join SVG (2 In Lanes -> 1 Out) ── */
function JoinSvg({ height = 150, stroke = '#10B981' }: { height?: number; stroke?: string }) {
    const half = height / 2;
    const topY = 33;
    const btmY = height - 33;
    return (
        <div className="flex items-center justify-center shrink-0" style={{ width: 32, height }}>
            <svg width="32" height={height} viewBox={`0 0 32 ${height}`} fill="none" className="shrink-0" aria-hidden="true">
                <path
                    d={`M0 ${topY} C14 ${topY} 14 ${half} 22 ${half} H32`}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
                <path
                    d={`M0 ${btmY} C14 ${btmY} 14 ${half} 22 ${half} H32`}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
            </svg>
        </div>
    );
}

/* ── Single n8n Squircle Node Component ── */
function SquircleNode({
    node,
    isSelected,
    onClick,
    onAddStepClick,
    showInPort = true,
    showOutPort = true,
}: {
    node: DealChainNode;
    isSelected: boolean;
    onClick?: () => void;
    onAddStepClick?: (e: React.MouseEvent) => void;
    showInPort?: boolean;
    showOutPort?: boolean;
}) {
    const meta = getNodeCategoryMeta(node.type, node.role);
    const feeText = typeof node.feeMinor === 'number' ? `₱${(node.feeMinor / 100).toFixed(2)}` : node.sub;

    return (
        <div
            data-testid={`n8n-node-${node.id}`}
            onClick={onClick}
            className="group relative flex w-[96px] shrink-0 cursor-pointer flex-col items-center select-none"
        >
            {/* The 66x66 n8n squircle box */}
            <div
                className={`relative flex size-[66px] items-center justify-center rounded-[16px] bg-[#1E293B] shadow-md transition-all duration-150 ${
                    isSelected
                        ? 'border-2 border-[#10B981] shadow-[0_0_0_2.5px_rgba(16,185,129,0.7),0_8px_20px_rgba(0,0,0,0.55)]'
                        : 'border-[1.5px] border-[#334155] hover:border-[#64748B] hover:shadow-lg'
                }`}
                style={{
                    borderTop: `3.5px solid ${meta.stripeColor}`,
                }}
            >
                {/* Node icon */}
                <div className="flex size-8 items-center justify-center">
                    {meta.icon}
                </div>

                {/* Left In-Port */}
                {showInPort && (
                    <div
                        className="absolute -left-[5px] top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-[#64748B] bg-[#334155]"
                        title="Input dependency port"
                        aria-hidden="true"
                    />
                )}

                {/* Right Out-Port */}
                {showOutPort && (
                    <div
                        className="absolute -right-[5px] top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#10B981]"
                        title="Output dependency port"
                        aria-hidden="true"
                    />
                )}

                {/* Attached Edge Add [+] Button with min 44px mobile touch target */}
                {showOutPort && onAddStepClick && (
                    <button
                        type="button"
                        data-testid={`add-step-btn-${node.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddStepClick(e);
                        }}
                        title="Chain or fork next step"
                        aria-label={`Add step after ${node.title}`}
                        className="absolute -right-[22px] top-1/2 flex size-[44px] -translate-y-1/2 items-center justify-center cursor-pointer z-20 outline-none"
                    >
                        <span className="flex size-[18px] items-center justify-center rounded-[5px] border border-[#475569] bg-[#0F172A] text-[12px] font-extrabold text-[#94A3B8] shadow-sm transition-transform hover:scale-110 hover:border-[#10B981] hover:bg-[#10B981] hover:text-white">
                            <Plus className="size-3 stroke-[2.5]" />
                        </span>
                    </button>
                )}
            </div>

            {/* External typography below node box */}
            <div className="mt-1.5 flex flex-col items-center text-center">
                <span className="text-[10px] font-extrabold text-[#F8FAFC] truncate max-w-[96px]">
                    {node.title}
                </span>
                <span className="text-[8.5px] font-semibold text-[#94A3B8] truncate max-w-[96px]">
                    {feeText || meta.label}
                </span>
            </div>
        </div>
    );
}

/**
 * DealChainCanvas — Authentic n8n DAG Canvas for Serbizyu Deal Chains
 */
export default function DealChainCanvas({
    nodes,
    dependencies = [],
    selectedNodeId,
    onNodeClick,
    selectedGateId,
    onGateClick,
    onAddStepClick,
    theme = 'dark',
    title = 'Chain Graph Nodes',
}: DealChainCanvasProps) {
    // Group nodes by topological tier
    const tiers = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        // Check if any nodes have explicit tier numbers
        const hasExplicitTiers = nodes.some((n) => typeof n.tier === 'number');
        if (hasExplicitTiers) {
            const map = new Map<number, DealChainNode[]>();
            nodes.forEach((n) => {
                const t = n.tier ?? 0;
                const arr = map.get(t) || [];
                arr.push(n);
                map.set(t, arr);
            });
            return Array.from(map.entries())
                .sort(([a], [b]) => a - b)
                .map(([, nList]) => nList);
        }

        // Infer parallel nodes based on dependency edges
        // If two nodes share the same predecessor or have no dependencies, they can be grouped
        // Default fallback: 1 node per tier (sequential) unless multiple nodes are marked parallel
        const result: DealChainNode[][] = [];
        let i = 0;
        while (i < nodes.length) {
            const current = nodes[i];
            const next = nodes[i + 1];

            // If current and next are both non-primary partner nodes and have same type/predecessor
            const areParallel =
                Boolean(next) &&
                Boolean(current.type === next.type && current.type === 'store' && nodes.length >= 4);

            if (areParallel && next) {
                result.push([current, next]);
                i += 2;
            } else {
                result.push([current]);
                i += 1;
            }
        }
        return result;
    }, [nodes, dependencies]);

    const isDark = theme === 'dark';

    return (
        <div
            data-testid="deal-chain-canvas"
            className={`relative flex w-full flex-col overflow-hidden rounded-2xl border transition-colors ${
                isDark
                    ? 'border-[#1E293B] bg-[#060A17]'
                    : 'border-slate-200 bg-[#F8FAFC]'
            }`}
            style={{
                backgroundImage: isDark
                    ? 'radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px)'
                    : 'radial-gradient(rgba(100, 116, 139, 0.25) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
            }}
        >
            {/* Canvas Header Bar */}
            <div className="flex items-center justify-between border-b border-[#1E293B]/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                        {title}
                    </span>
                    <span className="rounded-md bg-[#1E293B] px-1.5 py-0.5 text-[9px] font-bold text-[#38BDF8]">
                        {nodes.length} Nodes · {tiers.length} Tiers
                    </span>
                </div>
                <span className="text-[9.5px] font-semibold text-[#10B981]">
                    Tap [+] on port to chain step
                </span>
            </div>

            {/* Horizontal Flow Track */}
            <div
                className="flex items-center gap-0 overflow-x-auto p-4 sm:p-5"
                style={{
                    scrollbarWidth: 'thin',
                    touchAction: 'pan-x',
                }}
            >
                <div className="flex items-center gap-0 min-w-max py-2">
                    {tiers.map((tierNodes, tIdx) => {
                        const isFirstTier = tIdx === 0;
                        const isParallelTier = tierNodes.length > 1;
                        const prevTier = tiers[tIdx - 1];
                        const prevWasParallel = prevTier && prevTier.length > 1;

                        return (
                            <React.Fragment key={`tier-${tIdx}`}>
                                {/* Connector Wire between tiers */}
                                {!isFirstTier && (
                                    <>
                                        {prevWasParallel && !isParallelTier ? (
                                            <div className="flex items-center gap-1">
                                                <JoinSvg height={160} />
                                                <button
                                                    type="button"
                                                    data-testid={`gate-node-${tierNodes[0].id || tIdx}`}
                                                    aria-label={`Dependency gate: wait for all inputs, ${prevTier.length} inputs`}
                                                    onClick={() => onGateClick?.(`gate-${tierNodes.map((node) => node.id).join('-')}`)}
                                                    className="flex min-h-[60px] min-w-[116px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-emerald-400/60 bg-[#052E2B] px-2 py-1.5 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.16)] transition-shadow"
                                                    style={selectedGateId === `gate-${tierNodes.map((node) => node.id).join('-')}` ? { boxShadow: '0 0 0 2.5px rgba(16, 185, 129, 0.7)' } : undefined}
                                                    title="Synchronization barrier: waits for all parallel predecessors"
                                                >
                                                    <span className="text-[8px] font-black uppercase tracking-wide">⬡ ALL OF · Wait for all inputs</span>
                                                    <span className="mt-0.5 rounded bg-emerald-950 px-1 font-mono text-[7px] text-emerald-200">{tierNodes[0].conditionCode || 'all_inputs_ready'}</span>
                                                    <span className="text-[7px] font-bold text-emerald-100">{prevTier.length} INPUTS</span>
                                                </button>
                                                <DashedWire width={20} />
                                            </div>
                                        ) : !prevWasParallel && isParallelTier ? (
                                            /* Single node branching into multiple parallel nodes */
                                            <div className="flex items-center gap-1">
                                                <DashedWire width={20} />
                                                <div
                                                    className="flex flex-col items-center rounded-md border border-[#334155] bg-[#0F172A] px-1.5 py-1 text-[8px] font-extrabold text-[#10B981] uppercase tracking-wide shrink-0"
                                                    title="Parallel fork: executes simultaneously"
                                                >
                                                    <span>FORK</span>
                                                    <span className="text-[6.5px] text-[#94A3B8]">PARALLEL</span>
                                                </div>
                                                <ForkSvg height={160} />
                                            </div>
                                        ) : (
                                            /* Standard sequential wire */
                                            <DashedWire width={36} />
                                        )}
                                    </>
                                )}

                                {/* Render Tier Nodes */}
                                {isParallelTier ? (
                                    <div className="flex flex-col gap-3 py-1">
                                        {tierNodes.map((node) => (
                                            <SquircleNode
                                                key={node.id || node.role}
                                                node={node}
                                                isSelected={node.id === selectedNodeId}
                                                onClick={() => node.id && onNodeClick?.(node.id)}
                                                onAddStepClick={onAddStepClick ? (e) => node.id && onAddStepClick(node.id, e) : undefined}
                                                showInPort={!isFirstTier}
                                                showOutPort={true}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <SquircleNode
                                        node={tierNodes[0]}
                                        isSelected={tierNodes[0].id === selectedNodeId}
                                        onClick={() => tierNodes[0].id && onNodeClick?.(tierNodes[0].id)}
                                        onAddStepClick={onAddStepClick ? (e) => tierNodes[0].id && onAddStepClick(tierNodes[0].id, e) : undefined}
                                        showInPort={!isFirstTier}
                                        showOutPort={true}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import type { WorkStage } from './types';

interface WorkPipelineCanvasProps {
    stages: WorkStage[];
    flowType?: 'linear' | 'parallel' | 'branch';
    onStageClick?: (stage: WorkStage) => void;
}

/* ── Inline node card ─────────────────────────────────────── */

function NodeCard({
    stage,
    width = 82,
    borderColor = '#CBD5E1',
    shadow,
    label,
    onClick,
}: {
    stage: WorkStage;
    width?: number;
    borderColor?: string;
    shadow?: string;
    label?: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="shrink-0 flex flex-col gap-0.5 rounded-lg bg-white transition-[border-color,transform] duration-150
                       hover:border-[#0d715f] hover:-translate-y-0.5"
            style={{
                width,
                border: `1.5px solid ${borderColor}`,
                padding: '4px 8px',
                boxShadow: shadow ?? '0 1px 3px rgba(0,0,0,0.03)',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <span className="flex items-center justify-between gap-1">
                <span
                    className="text-[7.5px] font-extrabold px-1 py-[1px] rounded"
                    style={{ background: stage.bg || '#E8F7F1', color: stage.color || '#0D715F' }}
                >
                    {label ?? stage.num}
                </span>
                <span className="text-[8px] font-mono font-bold text-[#64748B]">{stage.dur}</span>
            </span>
            <span className="text-[9.5px] font-extrabold text-[#0F2F58] whitespace-nowrap overflow-hidden text-ellipsis text-left">
                {stage.title}
            </span>
        </button>
    );
}

/* ── Dashed wire (horizontal) ─────────────────────────────── */

function DashedWire({ width = 18 }: { width?: number }) {
    return (
        <svg
            width={width}
            height={10}
            viewBox={`0 0 ${width} 10`}
            fill="none"
            className="shrink-0"
            aria-hidden
        >
            <line
                x1={0}
                y1={5}
                x2={width}
                y2={5}
                stroke="#10B981"
                strokeWidth={1.8}
                strokeDasharray="3 2"
            />
        </svg>
    );
}

/* ── Fork / Join SVG bezier curves ────────────────────────── */

function ForkSvg() {
    return (
        <svg width={26} height={70} viewBox="0 0 26 70" fill="none" className="shrink-0" aria-hidden>
            <path d="M0 35 H8 C14 35 14 17 26 17" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
            <path d="M0 35 H8 C14 35 14 53 26 53" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
        </svg>
    );
}

function JoinSvg() {
    return (
        <svg width={26} height={70} viewBox="0 0 26 70" fill="none" className="shrink-0" aria-hidden>
            <path d="M0 17 C12 17 12 35 18 35 H26" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
            <path d="M0 53 C12 53 12 35 18 35 H26" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
        </svg>
    );
}

/* ── Branch fork/join with amber "YES" path ───────────────── */

function BranchForkSvg() {
    return (
        <svg width={22} height={70} viewBox="0 0 22 70" fill="none" className="shrink-0" aria-hidden>
            <path d="M0 35 H6 C12 35 12 17 22 17" stroke="#D97706" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
            <path d="M0 35 H6 C12 35 12 53 22 53" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
        </svg>
    );
}

function BranchJoinSvg() {
    return (
        <svg width={22} height={70} viewBox="0 0 22 70" fill="none" className="shrink-0" aria-hidden>
            <path d="M0 17 C10 17 10 35 16 35 H22" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
            <path d="M0 53 C10 53 10 35 16 35 H22" stroke="#10B981" strokeWidth={1.8} strokeDasharray="3 2" fill="none" />
        </svg>
    );
}

/* ── Layout: Linear ───────────────────────────────────────── */

function LinearLayout({ stages, onStageClick }: Omit<WorkPipelineCanvasProps, 'flowType'>) {
    return (
        <div className="flex items-center gap-1.5" style={{ minWidth: 340 }}>
            {stages.map((s, i) => (
                <React.Fragment key={s.id}>
                    <NodeCard stage={s} width={74} onClick={onStageClick ? () => onStageClick(s) : undefined} />
                    {i < stages.length - 1 && <DashedWire />}
                </React.Fragment>
            ))}
        </div>
    );
}

/* ── Layout: Parallel ─────────────────────────────────────── */

function ParallelLayout({ stages, onStageClick }: Omit<WorkPipelineCanvasProps, 'flowType'>) {
    const s1 = stages[0];
    const s2a = stages[1];
    const s2b = stages[2];
    const s3 = stages[3];
    if (!s1 || !s2a || !s2b || !s3) return <LinearLayout stages={stages} onStageClick={onStageClick} />;

    const click = (s: WorkStage) => onStageClick ? () => onStageClick(s) : undefined;

    return (
        <div className="flex items-center gap-1" style={{ minWidth: 380 }}>
            <NodeCard stage={s1} onClick={click(s1)} />
            <ForkSvg />
            <div className="flex flex-col gap-1.5 shrink-0">
                <NodeCard
                    stage={s2a}
                    width={98}
                    borderColor="#0284C7"
                    shadow="0 2px 6px rgba(2,132,199,0.12)"
                    label={`${s2a.num} · PARALLEL`}
                    onClick={click(s2a)}
                />
                <NodeCard
                    stage={s2b}
                    width={98}
                    borderColor="#166534"
                    shadow="0 2px 6px rgba(22,101,52,0.12)"
                    label={`${s2b.num} · PARALLEL`}
                    onClick={click(s2b)}
                />
            </div>
            <JoinSvg />
            <NodeCard stage={s3} onClick={click(s3)} />
        </div>
    );
}

/* ── Layout: Decision Branch ──────────────────────────────── */

function BranchLayout({ stages, onStageClick }: Omit<WorkPipelineCanvasProps, 'flowType'>) {
    const s1 = stages[0];
    const gate = stages[1];
    const s2a = stages[2];
    const s3 = stages[3];
    if (!s1 || !gate || !s2a || !s3) return <LinearLayout stages={stages} onStageClick={onStageClick} />;

    const click = (s: WorkStage) => onStageClick ? () => onStageClick(s) : undefined;

    return (
        <div className="flex items-center gap-1" style={{ minWidth: 380 }}>
            <NodeCard stage={s1} onClick={click(s1)} />
            <DashedWire width={14} />

            {/* Decision diamond card */}
            <button
                type="button"
                onClick={click(gate)}
                className="shrink-0 flex flex-col items-center rounded-lg"
                style={{
                    background: '#FFFBEB',
                    border: '1.5px solid #D97706',
                    padding: '4px 6px',
                    width: 58,
                    cursor: onStageClick ? 'pointer' : 'default',
                }}
            >
                <span className="text-[7.5px] font-extrabold text-[#B45309]">GATE</span>
                <span className="text-[8px] font-extrabold text-[#92400E] whitespace-nowrap">
                    {gate.title}
                </span>
            </button>

            <BranchForkSvg />

            <div className="flex flex-col gap-1.5 shrink-0">
                {/* YES branch */}
                <NodeCard
                    stage={s2a}
                    width={98}
                    borderColor="#D97706"
                    label="YES · BRAZE"
                    onClick={click(s2a)}
                />
                {/* NO / PASS branch */}
                <div
                    className="flex flex-col gap-0.5 rounded-lg bg-white"
                    style={{
                        width: 98,
                        border: '1.5px solid #10B981',
                        padding: '4px 8px',
                    }}
                >
                    <span className="flex items-center justify-between">
                        <span className="text-[7.5px] font-extrabold px-1 py-[1px] rounded bg-[#E8F7F1] text-[#0D715F]">
                            NO · PASS
                        </span>
                        <span className="text-[8px] font-mono font-bold text-[#64748B]">15m</span>
                    </span>
                    <span className="text-[9.5px] font-extrabold text-[#0F2F58] whitespace-nowrap overflow-hidden text-ellipsis">
                        Standard Wash
                    </span>
                </div>
            </div>

            <BranchJoinSvg />
            <NodeCard stage={s3} onClick={click(s3)} />
        </div>
    );
}

/* ── Public component ─────────────────────────────────────── */

export default function WorkPipelineCanvas({ stages, flowType = 'linear', onStageClick }: WorkPipelineCanvasProps) {
    const Layout =
        flowType === 'parallel'
            ? ParallelLayout
            : flowType === 'branch'
              ? BranchLayout
              : LinearLayout;

    return (
        <div
            className="work-pipeline-canvas"
            style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                padding: '10px 12px',
                overflowX: 'auto',
                /* thin scrollbar */
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(13, 113, 95, 0.25) transparent',
            }}
        >
            <style>{`
                .work-pipeline-canvas::-webkit-scrollbar { height: 3px; }
                .work-pipeline-canvas::-webkit-scrollbar-track { background: transparent; }
                .work-pipeline-canvas::-webkit-scrollbar-thumb { background: rgba(13,113,95,0.25); border-radius: 9999px; }
            `}</style>
            <Layout stages={stages} onStageClick={onStageClick} />
        </div>
    );
}

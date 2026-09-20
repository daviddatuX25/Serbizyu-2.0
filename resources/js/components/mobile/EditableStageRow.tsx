import React from 'react';
import type { WorkStage } from './types';

interface EditableStageRowProps {
    stage: WorkStage;
    index: number;
    onChange: (index: number, updated: Partial<WorkStage>) => void;
    onRemove: (index: number) => void;
}

export default function EditableStageRow({ stage, index, onChange, onRemove }: EditableStageRowProps) {
    return (
        <div
            className="flex flex-col gap-[5px] bg-white"
            style={{
                border: '1px solid var(--line, #E2E8F0)',
                borderRadius: 10,
                padding: '8px 10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
        >
            {/* Row 1: Stage badge + title input + duration pill + delete */}
            <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                        className="text-[8px] font-extrabold px-[5px] py-[2px] rounded shrink-0"
                        style={{ background: stage.bg || '#E8F7F1', color: stage.color || '#0D715F' }}
                    >
                        {stage.num || String(index + 1)}
                    </span>
                    <input
                        type="text"
                        value={stage.title}
                        onChange={(e) => onChange(index, { title: e.target.value })}
                        placeholder="Stage title..."
                        className="flex-1 min-w-0 outline-none"
                        style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#0F2F58',
                            border: '1px solid #D1D5DB',
                            background: '#FAFCFB',
                            borderRadius: 6,
                            padding: '3px 8px',
                            height: 26,
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div className="flex items-center gap-1">
                    {/* Duration pill */}
                    <div
                        className="flex items-center gap-[3px] shrink-0"
                        style={{
                            background: '#FAFCFB',
                            border: '1px solid #D1D5DB',
                            borderRadius: 6,
                            padding: '0 6px',
                            height: 26,
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Clock icon */}
                        <svg
                            width={11}
                            height={11}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--forest-700, #0a574a)"
                            strokeWidth={2.5}
                            className="shrink-0"
                            aria-hidden
                        >
                            <circle cx={12} cy={12} r={10} />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <input
                            type="number"
                            min={1}
                            max={480}
                            value={parseInt(stage.dur) || 15}
                            onChange={(e) => {
                                const v = Math.max(1, Math.min(480, Number(e.target.value) || 1));
                                onChange(index, { dur: `${v}m` });
                            }}
                            className="outline-none"
                            style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'var(--forest-700, #0a574a)',
                                width: 28,
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'right',
                                padding: 0,
                                MozAppearance: 'textfield' as React.CSSProperties['MozAppearance'],
                            }}
                        />
                        <span
                            style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'var(--forest-700, #0a574a)',
                            }}
                        >
                            m
                        </span>
                    </div>

                    {/* Delete button */}
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label="Remove stage"
                        className="shrink-0 flex items-center justify-center transition-colors duration-150
                                   text-[#64748b] hover:bg-red-100 hover:text-red-600"
                        style={{
                            width: 24,
                            height: 26,
                            borderRadius: 6,
                            fontSize: 15,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Row 2: Scope description input */}
            <input
                type="text"
                value={stage.desc || ''}
                onChange={(e) => onChange(index, { desc: e.target.value })}
                placeholder="Stage scope description..."
                className="w-full outline-none"
                style={{
                    fontSize: '10px',
                    color: 'var(--ink, #12201c)',
                    border: '1px solid #E2E8F0',
                    background: '#FAFCFB',
                    borderRadius: 6,
                    padding: '3px 8px',
                    height: 26,
                    boxSizing: 'border-box',
                }}
            />

            {/* Row 3: Evidence tag */}
            <div
                className="flex items-center justify-between gap-1.5"
                style={{
                    borderTop: '1px dashed var(--line, #E2E8F0)',
                    paddingTop: 4,
                    marginTop: 2,
                }}
            >
                <span className="flex items-center gap-[3px] shrink-0 text-[9px] font-bold text-[#0284C7]">
                    {/* Camera icon */}
                    <svg
                        width={10}
                        height={10}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden
                    >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx={12} cy={13} r={4} />
                    </svg>
                    <span>Evidence:</span>
                </span>
                <input
                    type="text"
                    value={stage.evidence || ''}
                    onChange={(e) => onChange(index, { evidence: e.target.value })}
                    placeholder="Evidence required (photo, sensor, sign-off)..."
                    className="flex-1 outline-none"
                    style={{
                        fontSize: '9.5px',
                        fontWeight: 600,
                        color: 'var(--ink, #12201c)',
                        border: '1px solid #E2E8F0',
                        background: '#FAFCFB',
                        borderRadius: 6,
                        padding: '2px 8px',
                        height: 24,
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Hide number spinners */}
            <style>{`
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
}

import React, { useState, useMemo, useCallback } from 'react';
import type { WorkTemplate } from './types';

/* ── Props ────────────────────────────────────────────────── */

interface WorkCatalogModalProps {
    open: boolean;
    onClose: () => void;
    templates: WorkTemplate[];
    activeTemplateId: string | null;
    onSelect: (template: WorkTemplate) => void;
    onBuildCustom?: () => void;
}

/* ── Category chip definitions ────────────────────────────── */

const CATEGORIES = [
    { key: 'all', label: 'All Workflows' },
    { key: 'plumbing', label: 'Plumbing' },
    { key: 'electrical', label: 'Electrical' },
    { key: 'appliance', label: 'Appliance' },
    { key: 'carpentry', label: 'Carpentry' },
] as const;

/* ── Component ────────────────────────────────────────────── */

export default function WorkCatalogModal({
    open,
    onClose,
    templates,
    activeTemplateId,
    onSelect,
    onBuildCustom,
}: WorkCatalogModalProps) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('all');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return templates.filter((t) => {
            const matchCategory = category === 'all' || t.category === category;
            const matchSearch =
                !q ||
                t.title.toLowerCase().includes(q) ||
                t.shape.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q);
            return matchCategory && matchSearch;
        });
    }, [templates, search, category]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose],
    );

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{
                background: 'rgba(11, 19, 43, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={handleBackdropClick}
        >
            {/* Modal sheet */}
            <div
                className="relative flex w-full flex-col"
                style={{ maxHeight: '88%' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glovo organic wave cap */}
                <svg
                    className="block w-full shrink-0"
                    viewBox="0 0 390 34"
                    preserveAspectRatio="none"
                    style={{ height: 34, marginBottom: -1 }}
                    aria-hidden
                >
                    <path
                        d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z"
                        fill="#FFFFFF"
                    />
                </svg>

                {/* Content area */}
                <div
                    className="flex min-h-0 flex-1 flex-col bg-white"
                    style={{ padding: '4px 18px 16px', maxHeight: '84vh' }}
                >
                    {/* Fixed top: header + search + chips */}
                    <div className="shrink-0 pb-1.5">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 800,
                                        color: 'var(--ink, #12201c)',
                                        margin: 0,
                                    }}
                                >
                                    Work Execution Catalog
                                </h3>
                                <p
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--ink-muted, #64748b)',
                                        margin: '2px 0 0',
                                    }}
                                >
                                    Pick a standardized workflow template for your service category
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="flex shrink-0 items-center justify-center transition-colors duration-150 hover:bg-gray-200"
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: '#F3F4F6',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#111827',
                                }}
                            >
                                <svg
                                    width={14}
                                    height={14}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search bar */}
                        <div
                            className="flex items-center gap-2"
                            style={{
                                background: '#F1F5F9',
                                border: '1px solid var(--line, #E2E8F0)',
                                borderRadius: 9999,
                                padding: '7px 12px',
                                margin: '8px 0 6px',
                            }}
                        >
                            <svg
                                width={15}
                                height={15}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#64748B"
                                strokeWidth={2.5}
                                aria-hidden
                            >
                                <circle cx={11} cy={11} r={8} />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search workflows, stages, or shapes..."
                                className="outline-none"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontFamily: 'inherit',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: 'var(--ink, #12201c)',
                                    width: '100%',
                                }}
                            />
                        </div>

                        {/* Category filter chips */}
                        <div
                            className="flex gap-1.5 overflow-x-auto"
                            style={{
                                scrollbarWidth: 'none',
                                padding: '2px 2px 6px',
                                marginBottom: 8,
                            }}
                        >
                            {CATEGORIES.map((c) => {
                                const active = category === c.key;
                                return (
                                    <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => setCategory(c.key)}
                                        className="shrink-0 transition-colors duration-150"
                                        style={{
                                            background: active ? '#0F2F58' : '#FFFFFF',
                                            border: `1px solid ${active ? '#0F2F58' : 'var(--line, #E2E8F0)'}`,
                                            borderRadius: 9999,
                                            padding: '3px 10px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: active ? '#FFFFFF' : 'var(--ink-muted, #64748b)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            fontFamily: 'inherit',
                                            minHeight: 28,
                                        }}
                                    >
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: 'var(--ink-muted, #64748b)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                margin: '2px 0 4px',
                            }}
                        >
                            Available Work Templates
                        </div>
                    </div>

                    {/* Scrollable template list */}
                    <div
                        className="flex flex-1 flex-col gap-2 overflow-y-auto"
                        style={{ padding: '4px 2px 10px' }}
                    >
                        {filtered.length === 0 ? (
                            <div
                                className="py-5 text-center text-[11px]"
                                style={{ color: 'var(--ink-muted, #64748b)' }}
                            >
                                No matching workflows found in catalog.
                            </div>
                        ) : (
                            filtered.map((t) => {
                                const isActive = t.id === activeTemplateId;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onSelect(t)}
                                        className="flex w-full items-start justify-between gap-2.5 text-left transition-all duration-150"
                                        style={{
                                            background: isActive ? '#F0FDF4' : '#FAFCFB',
                                            border: isActive
                                                ? '1.5px solid var(--forest-600, #0d715f)'
                                                : '1px solid var(--line, #E2E8F0)',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-center gap-1.5">
                                                <span className="text-[12px] font-extrabold text-[#0F2F58]">
                                                    {t.title}
                                                </span>
                                                {isActive && (
                                                    <span
                                                        className="rounded px-[5px] py-[1px] text-[8px] font-extrabold text-white"
                                                        style={{
                                                            background:
                                                                'var(--forest-600, #0d715f)',
                                                        }}
                                                    >
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className="mb-1 text-[10px]"
                                                style={{
                                                    color: 'var(--ink-muted, #64748b)',
                                                    lineHeight: 1.35,
                                                }}
                                            >
                                                {t.description}
                                            </div>
                                            <div className="flex items-center gap-2 font-mono text-[9.5px]">
                                                <span
                                                    className="font-bold"
                                                    style={{ color: 'var(--forest-700, #0a574a)' }}
                                                >
                                                    {t.shape}
                                                </span>
                                                <span
                                                    style={{ color: 'var(--ink-muted, #64748b)' }}
                                                >
                                                    ·
                                                </span>
                                                <span className="font-bold text-[#0284C7]">
                                                    {t.stages.length} Stages
                                                </span>
                                                <span
                                                    style={{ color: 'var(--ink-muted, #64748b)' }}
                                                >
                                                    ·
                                                </span>
                                                <span className="font-bold text-[#D97706]">
                                                    {t.sla} SLA
                                                </span>
                                            </div>
                                        </div>
                                        <span
                                            className="shrink-0 text-[10.5px] font-bold"
                                            style={{
                                                color: isActive
                                                    ? 'var(--forest-700, #0a574a)'
                                                    : 'var(--ink, #12201c)',
                                                background: isActive ? '#FFFFFF' : '#F1F5F9',
                                                border: `1px solid ${
                                                    isActive
                                                        ? 'var(--forest-300, #6ee7b7)'
                                                        : 'var(--line, #E2E8F0)'
                                                }`,
                                                borderRadius: 9999,
                                                padding: '3px 8px',
                                            }}
                                        >
                                            {isActive ? 'Selected' : 'Use Template'}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom: Build Custom Workflow action */}
                    <div
                        className="shrink-0 bg-white"
                        style={{
                            paddingTop: 10,
                            borderTop: '1.5px solid var(--line, #E2E8F0)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onBuildCustom?.();
                            }}
                            className="flex w-full items-center justify-center gap-2 transition-opacity duration-150 hover:opacity-90"
                            style={{
                                height: 38,
                                background: '#0F2F58',
                                color: '#FFFFFF',
                                borderRadius: 9999,
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 800,
                                letterSpacing: '0.2px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(15,47,88,0.2)',
                                fontFamily: 'inherit',
                                minHeight: 44 /* Touch target */,
                            }}
                        >
                            <svg
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                aria-hidden
                            >
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            <span>Build Custom Workflow in Work Studio ↗</span>
                        </button>
                        <div
                            className="mt-1 text-center"
                            style={{
                                fontSize: '9.5px',
                                color: 'var(--ink-muted, #64748b)',
                            }}
                        >
                            Design complex multi-branch DAGs, parallel lanes, and custom sensor
                            gates
                        </div>
                    </div>
                </div>
            </div>

            {/* Hide scrollbar on category chips */}
            <style>{`
                .work-catalog-chips::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

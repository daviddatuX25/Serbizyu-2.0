import React, { useCallback, useEffect, useRef } from 'react';
import type { DealChainCombination, DealChainNode, PartnerSlot, SlotType } from './types';

/* ── Props ── */
export interface DealChainCarouselProps {
    combinations: DealChainCombination[];
    activeIndex: number;
    onIndexChange: (index: number) => void;
    onSlotChangeClick: (comboId: string, slotType: SlotType) => void;
    onToggleDefault?: (comboId: string) => void;
    onRemoveCombo?: (comboId: string) => void;
    onAddComboClick?: () => void;
}

/* ── Compact DAG Node ── */
function DagNode({ node }: { node: DealChainNode }) {
    return (
        <div className="flex min-w-[82px] shrink-0 flex-col gap-0.5 rounded-lg border border-slate-300 bg-white px-[7px] py-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-1">
                <span
                    className="rounded px-1 text-[7px] leading-tight font-extrabold"
                    style={{ background: node.bg, color: node.color }}
                >
                    {node.role}
                </span>
                <span className="font-mono text-[8px] font-bold text-slate-500">{node.sub}</span>
            </div>
            <div className="truncate text-[9.5px] font-extrabold text-[#0F2F58]">{node.title}</div>
        </div>
    );
}

/* ── DAG Connector Arrow ── */
function DagArrow() {
    return (
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0">
            <line
                x1="0"
                y1="5"
                x2="16"
                y2="5"
                stroke="#10B981"
                strokeWidth="1.8"
                strokeDasharray="3 2"
            />
        </svg>
    );
}

/* ── Slot Binder Row ── */
function SlotBinderRow({
    slot,
    comboId,
    onChangeClick,
}: {
    slot: PartnerSlot;
    comboId: string;
    onChangeClick: (comboId: string, slotType: SlotType) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onChangeClick(comboId, slot.type)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-[5px] text-left transition-colors hover:border-[#0F2F58]"
        >
            <div>
                <div className="text-[8.5px] font-bold text-slate-500 uppercase">{slot.role}</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-[#0F2F58]">{slot.name}</span>
                    <span className="font-mono text-[9.5px] font-bold text-[--forest-700,#0a574a]">
                        {slot.meta}
                    </span>
                </div>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[#0F2F58]">
                Change ▾
            </span>
        </button>
    );
}

/* ── Compact DAG Canvas ── */
function CompactDagCanvas({ nodes }: { nodes: DealChainNode[] }) {
    return (
        <div className="mb-2 overflow-x-auto rounded-[10px] border border-slate-200 bg-[#F8FAFC] px-2.5 py-[7px]">
            <div className="flex min-w-[260px] items-center gap-1.5">
                {nodes.map((node, i) => (
                    <React.Fragment key={`${node.role}-${i}`}>
                        <DagNode node={node} />
                        {i < nodes.length - 1 && <DagArrow />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/* ── Single Combo Slide ── */
function ComboSlide({
    combo,
    onSlotChangeClick,
    onToggleDefault,
    onRemoveCombo,
}: {
    combo: DealChainCombination;
    onSlotChangeClick: (comboId: string, slotType: SlotType) => void;
    onToggleDefault?: (comboId: string) => void;
    onRemoveCombo?: (comboId: string) => void;
}) {
    return (
        <div className="box-border min-w-full flex-[0_0_100%] snap-start">
            <div
                className="rounded-xl border-[1.5px] p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                style={{
                    background: '#FAFCFB',
                    borderColor: combo.isDefault ? '#0F2F58' : '#E2E8F0',
                }}
            >
                {/* Top Header */}
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[13px] text-[#0F2F58]">
                            {combo.icon && combo.icon.length <= 3 ? combo.icon : <LinkChainIcon />}
                        </span>
                        <span className="text-xs font-extrabold text-[#0F2F58]">{combo.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => onToggleDefault?.(combo.id)}
                            aria-label={combo.isDefault ? 'Currently default' : 'Set as default'}
                            className={`inline-flex cursor-pointer items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all ${
                                combo.isDefault
                                    ? 'border-transparent bg-[#0F2F58] text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {combo.isDefault ? '★ Default' : 'Make Default'}
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemoveCombo?.(combo.id)}
                            aria-label="Remove option"
                            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-none bg-transparent text-[15px] text-slate-500 transition-colors hover:text-red-500"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Compact DAG Canvas */}
                <CompactDagCanvas nodes={combo.nodes} />

                {/* Slot Binding Rows */}
                <div className="flex flex-col gap-[5px]">
                    {combo.slots.length === 0 ? (
                        <div className="py-1 text-[10px] text-slate-500 italic">
                            No external partner dependencies. Fulfilled directly by your team.
                        </div>
                    ) : (
                        combo.slots.map((slot) => (
                            <SlotBinderRow
                                key={`${combo.id}-${slot.type}`}
                                slot={slot}
                                comboId={combo.id}
                                onChangeClick={onSlotChangeClick}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Empty State ── */
function EmptyDeck() {
    return (
        <div className="w-full rounded-xl border-[1.5px] border-dashed border-slate-200 bg-[#FAFCFB] p-4 text-center">
            <div className="mb-0.5 text-xs font-extrabold text-[#0F2F58]">
                No Partnered Options Attached
            </div>
            <div className="text-[10px] text-slate-500">
                This listing will be fulfilled as Direct Service only.
            </div>
        </div>
    );
}

/* ── Pagination Dot ── */
function PaginationDot({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Go to slide"
            className="h-[5px] cursor-pointer rounded-full border-none p-0 transition-all duration-200"
            style={{
                width: active ? 14 : 5,
                background: active ? '#0F2F58' : '#CBD5E1',
            }}
        />
    );
}

/* ── Nav Button (Prev / Next) ── */
function NavButton({
    direction,
    disabled,
    onClick,
}: {
    direction: 'prev' | 'next';
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex min-h-[44px] cursor-pointer items-center gap-0.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
        >
            {direction === 'prev' ? '‹ Prev' : 'Next ›'}
        </button>
    );
}

/* ── Link Chain Icon SVG ── */
function LinkChainIcon() {
    return (
        <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
        >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DealChainCarousel — Horizontal Paginated Carousel Deck
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DealChainCarousel({
    combinations,
    activeIndex,
    onIndexChange,
    onSlotChangeClick,
    onToggleDefault,
    onRemoveCombo,
    onAddComboClick,
}: DealChainCarouselProps) {
    const deckRef = useRef<HTMLDivElement>(null);

    /* Sync the selected option only after swipe or smooth-scroll settles. */
    useEffect(() => {
        const deck = deckRef.current;
        if (!deck) return;

        let settleTimer: number | undefined;

        const syncActiveIndex = () => {
            const deckLeft = deck.getBoundingClientRect().left;
            let nearestIndex = 0;
            let nearestDistance = Number.POSITIVE_INFINITY;

            Array.from(deck.children).forEach((slide, index) => {
                const distance = Math.abs(
                    (slide as HTMLElement).getBoundingClientRect().left - deckLeft,
                );
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            const clamped = Math.max(0, Math.min(combinations.length - 1, nearestIndex));
            if (clamped !== activeIndex) {
                onIndexChange(clamped);
            }
        };

        const onScroll = () => {
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(syncActiveIndex, 220);
        };

        deck.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            deck.removeEventListener('scroll', onScroll);
            window.clearTimeout(settleTimer);
        };
    }, [activeIndex, combinations.length, onIndexChange]);

    /* ── Programmatic scroll on activeIndex change ── */
    useEffect(() => {
        const deck = deckRef.current;
        if (!deck) return;
        const slide = deck.children[activeIndex] as HTMLElement | undefined;
        slide?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }, [activeIndex]);
    /* ── Navigation helpers ── */
    const goPrev = useCallback(() => {
        onIndexChange(Math.max(0, activeIndex - 1));
    }, [activeIndex, onIndexChange]);

    const goNext = useCallback(() => {
        onIndexChange(Math.min(combinations.length - 1, activeIndex + 1));
    }, [activeIndex, combinations.length, onIndexChange]);

    const isEmpty = combinations.length === 0;

    return (
        <div className="relative mt-1.5">
            {/* ── Swipe Deck ── */}
            {isEmpty ? (
                <EmptyDeck />
            ) : (
                <div
                    ref={deckRef}
                    className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-0.5"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x pinch-zoom',
                    }}
                >
                    {combinations.map((combo) => (
                        <ComboSlide
                            key={combo.id}
                            combo={combo}
                            onSlotChangeClick={onSlotChangeClick}
                            onToggleDefault={onToggleDefault}
                            onRemoveCombo={onRemoveCombo}
                        />
                    ))}
                </div>
            )}

            {/* ── Navigation Bar ── */}
            {!isEmpty && (
                <div className="mt-2 flex items-center justify-between px-0.5">
                    <NavButton direction="prev" disabled={activeIndex === 0} onClick={goPrev} />
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                            {combinations.map((_, i) => (
                                <PaginationDot
                                    key={i}
                                    active={i === activeIndex}
                                    onClick={() => onIndexChange(i)}
                                />
                            ))}
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                            Option {activeIndex + 1} of {combinations.length}
                        </span>
                    </div>
                    <NavButton
                        direction="next"
                        disabled={activeIndex === combinations.length - 1}
                        onClick={goNext}
                    />
                </div>
            )}

            {/* ── Add Combo Action Button ── */}
            <div className="mt-2.5">
                <button
                    type="button"
                    onClick={onAddComboClick}
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-[7px] rounded-full border-[1.5px] border-dashed border-[--forest-600,#0d715f] bg-white text-xs font-bold text-[--forest-600,#0d715f] transition-all hover:border-[--forest-700,#0a574a] hover:bg-[#EFFCF6] hover:text-[--forest-700,#0a574a]"
                >
                    <LinkChainIcon />
                    <span>Attach Partner Combination</span>
                    <span className="rounded-full bg-[#0F2F58] px-[7px] py-0.5 text-[9.5px] font-extrabold tracking-wide text-white">
                        DEAL CHAIN
                    </span>
                </button>
            </div>

            {/* Hide scrollbar in webkit */}
            <style>{`
                .snap-x::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Glovo-style progress pill dots                                    */
/* ------------------------------------------------------------------ */

interface IndicatorDotsProps {
    /** Total number of steps */
    total: number;
    /** Zero-based active step index */
    activeIndex: number;
    /** Click handler; only completed (index < activeIndex) steps are clickable */
    onDotClick?: (index: number) => void;
}

function IndicatorDots({ total, activeIndex, onDotClick }: IndicatorDotsProps) {
    return (
        <div className="flex items-center justify-center gap-[7px] pb-2 pt-1" aria-label="Step progress">
            {Array.from({ length: total }, (_, i) => {
                const isActive = i === activeIndex;
                const isCompleted = i < activeIndex;
                return (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Step ${i + 1}${isActive ? ' (current)' : ''}`}
                        aria-current={isActive ? 'step' : undefined}
                        disabled={!isCompleted}
                        onClick={() => isCompleted && onDotClick?.(i)}
                        className={cn(
                            'h-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                            isActive
                                ? 'w-[26px] bg-[var(--sz-forest-600)]'
                                : 'w-2 bg-[#E2E8F0]',
                            isCompleted && 'cursor-pointer bg-[var(--sz-forest-300)]',
                            !isCompleted && !isActive && 'cursor-default',
                        )}
                    />
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Mode switcher toggle                                              */
/* ------------------------------------------------------------------ */

interface ModeSwitcherProps {
    isAdvanced: boolean;
    onToggle: () => void;
}

function ModeSwitcher({ isAdvanced, onToggle }: ModeSwitcherProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="mx-auto mt-0.5 inline-flex items-center justify-center gap-[5px] rounded-full px-3.5 py-1.5 text-xs font-bold text-[var(--sz-ink-muted)] transition-colors hover:bg-[var(--sz-forest-50)] hover:text-[var(--sz-forest-700)]"
        >
            <span>⚡</span>
            <span>{isAdvanced ? 'Switch to guided steps' : 'Switch to all-in-one form'}</span>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  StickyDock — bottom action bar                                    */
/* ------------------------------------------------------------------ */

interface StickyDockProps {
    /** Primary CTA button content */
    primaryAction: ReactNode;
    /** Handler for the primary CTA */
    onPrimaryAction: () => void;
    /** Whether the primary CTA is disabled */
    primaryDisabled?: boolean;
    /** Optional secondary content shown left of the CTA (e.g. price summary) */
    secondaryContent?: ReactNode;
    /** Step indicator config; omit to hide dots */
    steps?: {
        total: number;
        activeIndex: number;
        onDotClick?: (index: number) => void;
    };
    /** Mode switcher config; omit to hide the toggle */
    modeSwitcher?: {
        isAdvanced: boolean;
        onToggle: () => void;
    };
    /** Extra classes on the dock root */
    className?: string;
}

/**
 * Mobile-first sticky bottom action bar.
 *
 * Uses `position: sticky; bottom: 0` with glassmorphic background.
 * Includes a `window.visualViewport` resize listener so that the dock
 * stays visible above on-screen virtual keyboards.
 */
export function StickyDock({
    primaryAction,
    onPrimaryAction,
    primaryDisabled,
    secondaryContent,
    steps,
    modeSwitcher,
    className,
}: StickyDockProps) {
    const [bottomOffset, setBottomOffset] = useState(0);

    /* --------------------------------------------------------------- */
    /*  Virtual keyboard avoidance                                     */
    /* --------------------------------------------------------------- */
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        function handleResize() {
            const isInputFocused =
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement;

            if (!isInputFocused) {
                setBottomOffset(0);
                return;
            }

            const keyboardHeight = window.innerHeight - (vv?.height ?? window.innerHeight);
            setBottomOffset(Math.max(0, keyboardHeight));
        }
        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
        };
    }, []);

    return (
        <footer
            className={cn(
                'flex w-full flex-col gap-1.5 border-t border-slate-200 px-[18px] pb-[18px] pt-2.5',
                className,
            )}
            style={{
                bottom: bottomOffset,
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 -4px 20px rgba(18, 32, 28, 0.08)',
            }}
        >
            {/* Glovo indicator dots */}
            {steps && (
                <IndicatorDots
                    total={steps.total}
                    activeIndex={steps.activeIndex}
                    onDotClick={steps.onDotClick}
                />
            )}

            {/* Action row: optional secondary content + primary CTA */}
            <div className="flex w-full items-center justify-between gap-3">
                {secondaryContent && <div className="flex flex-col">{secondaryContent}</div>}

                <button
                    type="button"
                    disabled={primaryDisabled}
                    onClick={onPrimaryAction}
                    className={cn(
                        'inline-flex h-[46px] flex-1 max-w-[200px] items-center justify-center gap-1.5 rounded-full px-5 text-[13.5px] font-extrabold text-white shadow-[0_3px_12px_rgba(13,113,95,0.3)] transition-colors',
                        'bg-[var(--sz-forest-600)] hover:bg-[#0A5A4C] active:bg-[#084a3e]',
                        'disabled:pointer-events-none disabled:opacity-50',
                        !secondaryContent && 'ml-auto',
                    )}
                >
                    {primaryAction}
                </button>
            </div>

            {/* Mode switcher */}
            {modeSwitcher && (
                <ModeSwitcher
                    isAdvanced={modeSwitcher.isAdvanced}
                    onToggle={modeSwitcher.onToggle}
                />
            )}
        </footer>
    );
}

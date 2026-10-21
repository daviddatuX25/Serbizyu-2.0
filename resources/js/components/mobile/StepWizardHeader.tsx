import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  StepWizardHeader — top bar for guided editors                     */
/* ------------------------------------------------------------------ */

interface StepWizardHeaderProps {
    /** Editor title shown center-aligned (e.g. "Service Listing") */
    title: string;
    /** Draft version label (e.g. "v1", "v3") */
    draftVersion?: string;
    /** Whether the document has unsaved changes */
    isDirty?: boolean;
    /** Back button handler */
    onBack: () => void;
    /** Save-draft handler */
    onSaveDraft?: () => void;
    /** Step indicator config; omit to hide dots */
    steps?: {
        total: number;
        activeIndex: number;
        onDotClick?: (index: number) => void;
    };
    /** Extra classes on the header root */
    className?: string;
}

/**
 * Top bar for step-wizard editors.
 *
 * Layout: `[← back]  Title  Draft·v1  [Save]`
 * Optionally renders Glovo-style indicator dots below the top bar
 * for step navigation.
 */
export function StepWizardHeader({
    title,
    draftVersion,
    isDirty,
    onBack,
    onSaveDraft,
    steps,
    className,
}: StepWizardHeaderProps) {
    return (
        <header className={cn('flex-shrink-0', className)}>
            {/* Main bar */}
            <div className="flex h-[52px] items-center justify-between border-b border-[var(--sz-border)] bg-white px-4">
                {/* Back button */}
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sz-border)] bg-white text-[var(--sz-ink)] transition-colors hover:bg-[var(--sz-forest-50)] active:bg-[var(--sz-forest-100)]"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                {/* Title + draft status pill */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[14.5px] font-extrabold text-[var(--sz-ink)]">
                        {title}
                    </span>
                    {draftVersion && (
                        <span className="rounded-full bg-[#FEF3C7] px-[7px] py-[2px] text-[9.5px] font-extrabold text-[#B45309] uppercase">
                            {isDirty ? '● ' : ''}Draft · {draftVersion}
                        </span>
                    )}
                </div>

                {/* Save draft action */}
                {onSaveDraft ? (
                    <button
                        type="button"
                        onClick={onSaveDraft}
                        className="border-none bg-transparent text-xs font-bold text-[var(--sz-forest-600)] transition-colors hover:text-[var(--sz-forest-700)] active:text-[var(--sz-forest-700)]"
                    >
                        Save
                    </button>
                ) : (
                    /* Spacer to keep title centered */
                    <div className="w-9" aria-hidden="true" />
                )}
            </div>

            {/* Step indicator dots row */}
            {steps && (
                <div
                    className="flex items-center justify-center gap-[7px] bg-white py-2"
                    aria-label="Step navigation"
                >
                    {Array.from({ length: steps.total }, (_, i) => {
                        const isActive = i === steps.activeIndex;
                        const isCompleted = i < steps.activeIndex;
                        return (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Step ${i + 1}${isActive ? ' (current)' : ''}`}
                                aria-current={isActive ? 'step' : undefined}
                                disabled={!isCompleted}
                                onClick={() => isCompleted && steps.onDotClick?.(i)}
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
            )}
        </header>
    );
}

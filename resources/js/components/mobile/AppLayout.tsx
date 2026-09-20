import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ActingContextData } from './types';

interface AppLayoutProps {
    /** Optional acting-on-behalf-of context banner data */
    actingContext?: ActingContextData;
    /** Slot: top bar / wizard header */
    header?: ReactNode;
    /** Slot: bottom sticky dock */
    dock?: ReactNode;
    /** Main scrollable content */
    children: ReactNode;
    /** Optional desktop preview slot for dual-pane creation layouts */
    previewSlot?: ReactNode;
    /** Layout variant: centered (default), split (desktop dual-pane), or fluid (widescreen) */
    variant?: 'centered' | 'split' | 'fluid';
    /** Extra classes on the outer wrapper */
    className?: string;
}

/**
 * Mobile-first responsive page shell.
 *
 * - Full-bleed 100vw on viewports < 640px.
 * - Centered max-w-xl container with auto margins on sm+ breakpoints.
 * - Pinned acting-for banner, header slot, scrollable body, dock slot.
 */
export function AppLayout({
    actingContext,
    header,
    dock,
    children,
    previewSlot,
    variant = 'centered',
    className,
}: AppLayoutProps) {
    const showBanner = actingContext?.isActingOnBehalf;
    const isSplit = variant === 'split' && previewSlot != null;

    const containerClasses = isSplit
        ? 'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F6F5] lg:max-w-7xl lg:mx-auto'
        : variant === 'fluid'
          ? 'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F6F5] max-w-7xl mx-auto'
          : 'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F6F5] sm:mx-auto sm:max-w-xl sm:border sm:border-slate-200 sm:shadow-xl';

    return (
        <div className={cn(containerClasses, className)}>
            {/* Acting-on-behalf banner */}
            {showBanner && (
                <div className="flex-shrink-0 border-b border-amber-200 bg-[#FEF3C7] px-4 py-2">
                    <p className="text-center font-[var(--sz-font-display)] text-xs font-bold text-[#92400E]">
                        👤 Acting on behalf of: {actingContext.ownerName}
                    </p>
                </div>
            )}

            {/* Header slot */}
            {header && <div className="flex-shrink-0 z-30">{header}</div>}

            {/* Scrollable content area */}
            <main className="flex flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {isSplit ? (
                    <div className="grid w-full grid-cols-1 lg:grid-cols-12 lg:gap-8 p-4 pb-48">
                        {/* Form Pane (Left 58%) */}
                        <div className="flex flex-col gap-4 lg:col-span-7">
                            {children}
                        </div>
                        {/* Live WYSIWYG Customer Preview Pane (Right 42% on desktop) */}
                        <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-4 lg:self-start">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Live Customer Preview (WYSIWYG)
                                </div>
                                {previewSlot}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col gap-4 p-4 pb-48 w-full">
                        {children}
                    </div>
                )}
            </main>

            {/* Bottom dock slot */}
            {dock && <div className="absolute bottom-0 left-0 right-0 z-40">{dock}</div>}
        </div>
    );
}

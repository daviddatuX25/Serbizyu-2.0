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
    className,
}: AppLayoutProps) {
    const showBanner = actingContext?.isActingOnBehalf;

    return (
        <div
            className={cn(
                'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F6F5] sm:mx-auto sm:max-w-xl sm:border sm:border-slate-200 sm:shadow-xl',
                className,
            )}
        >
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
            <main className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-48 [-webkit-overflow-scrolling:touch]">
                {children}
            </main>

            {/* Bottom dock slot */}
            {dock && <div className="absolute bottom-0 left-0 right-0 z-40">{dock}</div>}
        </div>
    );
}

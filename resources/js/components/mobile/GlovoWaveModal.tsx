import React, { useCallback, useEffect, useRef } from 'react';

/* ── Props ── */
export interface GlovoWaveModalProps {
    open?: boolean;
    isOpen?: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    /** Slot rendered in the pinned header area below title (search input, filter chips, etc.) */
    headerSlot?: React.ReactNode;
    /** Main scrollable body content */
    children: React.ReactNode;
    /** Pinned bottom action slot (studio links, action buttons) */
    bottomSlot?: React.ReactNode;
}

/* ── Close Circle Button ── */
function CloseCircle({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Close"
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
            >
                <path d="M18 6 6 18M6 6l12 12" />
            </svg>
        </button>
    );
}

/* ── Wave Cap SVG ── */
function WaveCap() {
    return (
        <svg
            className="block w-full shrink-0"
            style={{ height: 34, marginBottom: -1 }}
            viewBox="0 0 390 34"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z"
                fill="#FFFFFF"
            />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GlovoWaveModal
   - Bottom slide-up sheet on mobile (<640px)
   - Centered modal on desktop (≥640px)
   - Asymmetrical organic wave cap SVG
   - Pinned header, scrollable body, pinned bottom action
   ═══════════════════════════════════════════════════════════════════════════ */
export default function GlovoWaveModal({
    open,
    isOpen,
    onClose,
    title,
    subtitle,
    headerSlot,
    children,
    bottomSlot,
}: GlovoWaveModalProps) {
    const isModalOpen = open ?? isOpen ?? false;
    const modalContentRef = useRef<HTMLDivElement>(null);

    /* ── Close on Escape ── */
    useEffect(() => {
        if (!isModalOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isModalOpen, onClose]);

    /* ── Lock body scroll when open ── */
    useEffect(() => {
        if (!isModalOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isModalOpen]);

    /* ── Click backdrop to close ── */
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose],
    );

    /* ── Prevent content click from propagating to backdrop ── */
    const stopProp = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!isModalOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={handleBackdropClick}
            className={`fixed inset-0 z-50 transition-opacity duration-250 ease-out ${
                open
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
            }`}
            style={{
                background: 'rgba(11, 19, 43, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
            }}
        >
            {/* ── Mobile: bottom-anchored sheet | Desktop: centered modal ── */}
            <div
                className={`
                    flex flex-col
                    transition-transform duration-300
                    /* Mobile: bottom sheet */
                    fixed inset-x-0 bottom-0
                    max-h-[88vh] w-full
                    /* Desktop ≥640px: centered modal */
                    sm:static sm:inset-auto
                    sm:mx-auto sm:my-auto sm:mt-[5vh]
                    sm:max-w-xl sm:max-h-[85vh]
                    sm:rounded-t-none
                    ${open ? 'translate-y-0' : 'translate-y-full sm:translate-y-8 sm:opacity-0'}
                `}
                style={{
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={stopProp}
            >
                {/* ── Wave Cap ── */}
                <WaveCap />

                {/* ── Modal Content Shell ── */}
                <div
                    ref={modalContentRef}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-[18px] pb-4 pt-1"
                >
                    {/* ── Pinned Fixed Header ── */}
                    <div className="shrink-0 pb-1.5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-lg font-extrabold text-gray-900">
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <CloseCircle onClick={onClose} />
                        </div>
                        {headerSlot && (
                            <div className="mt-1.5">{headerSlot}</div>
                        )}
                    </div>

                    {/* ── Scrollable Body ── */}
                    <div
                        className="flex-1 overflow-y-auto overscroll-contain"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {children}
                    </div>

                    {/* ── Pinned Bottom Action Slot ── */}
                    {bottomSlot && (
                        <div className="shrink-0 border-t border-slate-200 bg-white pt-2.5">
                            {bottomSlot}
                        </div>
                    )}
                </div>
            </div>

            {/* WebKit thin scrollbar */}
            <style>{`
                .overflow-y-auto::-webkit-scrollbar { width: 4px; }
                .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
                .overflow-y-auto::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 9999px; }
            `}</style>
        </div>
    );
}

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

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

function CloseCircle({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Close"
            className="flex h-8 min-h-[44px] w-8 min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200"
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

function WaveCap() {
    return (
        <svg
            aria-hidden="true"
            className="glovo-wave-cap block w-full shrink-0 sm:hidden"
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

/**
 * Responsive modal primitive for marketplace workflows.
 *
 * Mobile uses the locked Glovo wave bottom sheet. Desktop uses a centered,
 * bounded modal. The portal keeps nested marketplace drawers from clipping or
 * stacking above the popup.
 */
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
    const titleId = useId();

    useEffect(() => {
        if (!isModalOpen) return;

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [isModalOpen, onClose]);

    const handleBackdropClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) onClose();
        },
        [onClose],
    );

    const stopPropagation = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    if (!isModalOpen) return null;

    const dialog = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-modal-state="open"
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-0 opacity-100 backdrop-blur-xs transition-opacity duration-200 sm:items-center sm:p-6"
        >
            <div
                data-modal-surface="true"
                onClick={stopPropagation}
                className="flex max-h-[88vh] w-full translate-y-0 flex-col overflow-hidden bg-transparent transition-transform duration-300 sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-2xl"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <WaveCap />

                <div
                    ref={modalContentRef}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-[18px] pt-1 pb-4 sm:rounded-2xl sm:px-6 sm:pt-5"
                >
                    <div className="shrink-0 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <h3
                                    id={titleId}
                                    className="m-0 text-lg font-extrabold text-gray-900"
                                >
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>
                                )}
                            </div>
                            <CloseCircle onClick={onClose} />
                        </div>
                        {headerSlot && <div className="mt-1.5">{headerSlot}</div>}
                    </div>

                    <div
                        className="flex-1 overflow-y-auto overscroll-contain"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {children}
                    </div>

                    {bottomSlot && (
                        <div
                            className="shrink-0 border-t border-slate-200 bg-white pt-2.5"
                            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                        >
                            {bottomSlot}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar { width: 4px; }
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
                [data-modal-surface] .overflow-y-auto::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 9999px; }
            `}</style>
        </div>
    );

    return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}

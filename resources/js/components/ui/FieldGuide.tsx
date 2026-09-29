import { useState, useRef, useEffect } from 'react';
import { Info, X, HelpCircle } from 'lucide-react';
import type { FieldGuidanceItem } from '@/lib/builderGuidance';

interface FieldGuideProps {
    guidance: FieldGuidanceItem;
    mode?: 'guided' | 'standard' | 'advanced';
    className?: string;
    inline?: boolean;
}

export function FieldGuide({
    guidance,
    mode = 'guided',
    className = '',
    inline = false,
}: FieldGuideProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside (for popover mode)
    useEffect(() => {
        if (!isOpen || inline) return;

        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inline]);

    return (
        <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`group inline-flex size-6 sm:size-6.5 items-center justify-center rounded-full transition-all cursor-pointer ${
                    isOpen
                        ? 'bg-[#0F2F58] text-[#FFC72C] ring-2 ring-[#0F2F58]/20'
                        : mode === 'guided'
                          ? 'text-slate-400 hover:bg-[#EBF2FA] hover:text-[#0F2F58] focus:bg-[#EBF2FA] focus:text-[#0F2F58]'
                          : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={`Help: ${guidance.question}`}
                aria-expanded={isOpen}
                aria-label={`Guidance for ${guidance.id}: ${guidance.question}`}
            >
                {mode === 'guided' ? (
                    <Info className="size-3.5 sm:size-4 transition-transform group-hover:scale-110" />
                ) : (
                    <HelpCircle className="size-3.5 transition-transform group-hover:scale-110" />
                )}
            </button>

            {/* Contextual Q&A Guidance Popover */}
            {isOpen && !inline && (
                <div
                    data-testid={`field-guide-popover-${guidance.id}`}
                    role="tooltip"
                    className="absolute right-0 top-full z-40 mt-1.5 w-[280px] sm:w-[320px] max-w-[calc(100vw-40px)] rounded-xl border border-blue-200/80 bg-[#F4F8FC] p-3 text-xs shadow-lg backdrop-blur-xs transition-all animate-in fade-in-0 zoom-in-95"
                >
                    <div className="flex items-start justify-between gap-2 border-b border-blue-200/60 pb-2">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0F2F58]">
                            <Info className="size-3 text-[#0F2F58]" />
                            <span>Onboarding Tip</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-blue-100 hover:text-slate-700 transition-colors"
                            aria-label="Close guide"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>

                    <div className="mt-2 space-y-1.5">
                        <p className="font-extrabold text-[#0F2F58] text-[11.5px] leading-tight">
                            {guidance.question}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                            {guidance.answer}
                        </p>
                        {guidance.example && (
                            <div className="mt-2 rounded-lg border border-blue-200/60 bg-white/90 px-2.5 py-1.5 text-[10.5px] text-slate-700">
                                <span className="font-bold text-[#0F2F58]">Example: </span>
                                <span className="italic">{guidance.example}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Contextual Q&A Guidance Inline Drawer */}
            {isOpen && inline && (
                <div
                    data-testid={`field-guide-inline-${guidance.id}`}
                    className="mt-2 w-full rounded-xl border border-blue-200/80 bg-[#F4F8FC] p-3 text-xs shadow-2xs transition-all animate-in fade-in-0 duration-200"
                >
                    <div className="flex items-start justify-between gap-2 border-b border-blue-200/60 pb-1.5">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0F2F58]">
                            <Info className="size-3 text-[#0F2F58]" />
                            <span>Guidance</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-blue-100 hover:text-slate-700 transition-colors"
                            aria-label="Close guide"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>

                    <div className="mt-2 space-y-1.5">
                        <p className="font-extrabold text-[#0F2F58] text-[11.5px] leading-tight">
                            {guidance.question}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                            {guidance.answer}
                        </p>
                        {guidance.example && (
                            <div className="mt-2 rounded-lg border border-blue-200/60 bg-white/90 px-2.5 py-1.5 text-[10.5px] text-slate-700">
                                <span className="font-bold text-[#0F2F58]">Example: </span>
                                <span className="italic">{guidance.example}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default FieldGuide;

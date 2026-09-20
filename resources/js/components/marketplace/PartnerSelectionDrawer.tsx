import { useState, useMemo, useEffect } from 'react';
import {
    X,
    ArrowLeft,
    Search,
    Store,
    Truck,
    Wrench,
    FileCheck,
    Check,
    ShieldCheck,
} from 'lucide-react';

export interface PartnerCandidate {
    id: string;
    role: 'courier' | 'technician' | 'store' | 'auditor';
    name: string;
    sub: string;
    fee: number;
    category: string;
    icon: 'truck' | 'labor' | 'store' | 'audit';
}

interface PartnerSelectionDrawerProps {
    open: boolean;
    onClose: () => void;
    role: 'store' | 'courier' | 'technician' | 'auditor' | null;
    candidates: PartnerCandidate[];
    currentSelectedId?: string;
    onSelect: (candidate: PartnerCandidate) => void;
}

export function PartnerSelectionDrawer({
    open,
    onClose,
    role,
    candidates,
    currentSelectedId,
    onSelect,
}: PartnerSelectionDrawerProps) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Reset filters on role change or drawer open
    useEffect(() => {
        setSearch('');
        setCategoryFilter('all');
    }, [role, open]);

    // Body scroll lock to eliminate double scrollbars and background scrolling
    useEffect(() => {
        if (!open) return;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    const title = useMemo(() => {
        switch (role) {
            case 'store':
                return 'Select Hardware Store';
            case 'courier':
                return 'Select Courier Partner';
            case 'technician':
                return 'Select Technician';
            case 'auditor':
                return 'Select Safety Auditor';
            default:
                return 'Select Partner';
        }
    }, [role]);

    const filteredCandidates = useMemo(() => {
        return candidates.filter((cand) => {
            if (categoryFilter !== 'all' && cand.category !== categoryFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    cand.name.toLowerCase().includes(q) ||
                    cand.sub.toLowerCase().includes(q) ||
                    cand.category.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [candidates, categoryFilter, search]);

    if (!open || !role) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over Drawer from the right */}
            <div className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 flex w-full lg:max-w-lg z-50">
                <div className="w-full h-full bg-white shadow-2xl flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] overscroll-contain">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            {/* Mobile Back Button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex size-8 lg:hidden items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
                                aria-label="Back"
                            >
                                <ArrowLeft className="size-5" />
                            </button>

                            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]">
                                {role === 'store' && <Store className="size-5" />}
                                {role === 'courier' && <Truck className="size-5" />}
                                {role === 'technician' && <Wrench className="size-5" />}
                                {role === 'auditor' && <FileCheck className="size-5" />}
                            </div>

                            <div>
                                <h2 className="text-sm sm:text-base font-extrabold text-[#0F2F58]">
                                    {title}
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    Verified Tagudin partners · Direct counter settlement
                                </p>
                            </div>
                        </div>

                        {/* Desktop Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="hidden lg:flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="border-b border-slate-100 px-4 py-3 sm:px-6 bg-slate-50/70 space-y-2.5">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search verified ${role}s by name or specialty...`}
                                className="h-9 w-full rounded-full border border-slate-200 bg-white pr-4 pl-9 text-xs text-slate-900 outline-none focus:border-[#0F2F58] shadow-xs"
                            />
                        </div>

                        {/* Role-specific Filter Chips */}
                        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('all')}
                                className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                    categoryFilter === 'all'
                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                All {role}s
                            </button>

                            {role === 'store' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('depot')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'depot'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Hardware Depot
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('oem')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'oem'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        OEM Electrical
                                    </button>
                                </>
                            )}

                            {role === 'courier' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('motorcycle')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'motorcycle'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Motorcycle Pool
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('tricycle')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'tricycle'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Tricycle Cargo
                                    </button>
                                </>
                            )}

                            {role === 'technician' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('hvac')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'hvac'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        HVAC & Aircon
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFilter('electrician')}
                                        className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                            categoryFilter === 'electrician'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Electrician
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Body: Partner List */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-3">
                        {filteredCandidates.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-500">
                                No verified {role}s match &ldquo;{search}&rdquo;. Try another search term.
                            </div>
                        ) : (
                            filteredCandidates.map((cand) => {
                                const isSelected = currentSelectedId === cand.id;
                                return (
                                    <div
                                        key={cand.id}
                                        onClick={() => {
                                            onSelect(cand);
                                            onClose();
                                        }}
                                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                                            isSelected
                                                ? 'border-[#0F2F58] bg-[#F8FAFD] shadow-xs ring-1 ring-[#0F2F58]'
                                                : 'border-slate-200 bg-white hover:border-[#0F2F58]/50 hover:bg-slate-50/80 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F2F58] font-bold mt-0.5">
                                                {cand.icon === 'truck' && <Truck className="size-4.5" />}
                                                {cand.icon === 'labor' && <Wrench className="size-4.5" />}
                                                {cand.icon === 'store' && <Store className="size-4.5" />}
                                                {cand.icon === 'audit' && <FileCheck className="size-4.5" />}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-extrabold text-slate-900">
                                                        {cand.name}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EBF2FA] px-1.5 py-0.5 text-[9px] font-extrabold text-[#0F2F58]">
                                                            <Check className="size-2.5" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {cand.sub}
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                    <span className="inline-flex items-center gap-1 text-emerald-700">
                                                        <ShieldCheck className="size-3" />
                                                        Verified Tagudin Partner
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 ml-3">
                                            <div className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                ₱{cand.fee.toFixed(2)}
                                            </div>
                                            <button
                                                type="button"
                                                className={`mt-2 rounded-full px-3 py-1 text-[10px] font-extrabold cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#0F2F58] text-white'
                                                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]'
                                                }`}
                                            >
                                                {isSelected ? 'Selected' : 'Select'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <ShieldCheck className="size-4 shrink-0 text-[#0F2F58]" />
                            <span>
                                Partner slot changes maintain <strong>Non-Cascading Settlement</strong> and independent child order escrow.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

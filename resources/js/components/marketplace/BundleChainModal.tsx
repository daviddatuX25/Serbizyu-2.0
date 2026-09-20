import { useState, useMemo } from 'react';
import {
    X,
    Search,
    Package,
    Truck,
    Wrench,
    FileCheck,
    Star,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react';
import type { BasketItem } from '@/marketplace/types';

interface BundleChainModalProps {
    open: boolean;
    onClose: () => void;
    item: BasketItem | null;
    onSelectRecipe: (
        itemId: string,
        recipeId: 'turnkey_parts' | 'courier_delivery' | 'safety_audit',
    ) => void;
}

export function BundleChainModal({
    open,
    onClose,
    item,
    onSelectRecipe,
}: BundleChainModalProps) {
    const [search, setSearch] = useState('');
    const [activePattern, setActivePattern] = useState<'all' | 'repair' | 'delivery' | 'multi'>('all');

    const combinations = useMemo(() => {
        return [
            {
                id: 'turnkey_parts' as const,
                pattern: 'repair' as const,
                title: 'All-In Parts, Courier & Labor',
                extraFee: 215,
                rating: '4.9',
                bookedCount: '84 booked in Tagudin',
                desc: 'Genuine parts sourced from Tagudin Hardware + Danny Express motorcycle runner + professional installation.',
                nodes: [
                    { role: 'Part', title: '35uF Cap.', sub: 'Tagudin HW', price: '₱180', icon: 'store' },
                    { role: 'Rider', title: 'Danny Exp.', sub: 'Route', price: '₱35', icon: 'courier' },
                    { role: 'Labor', title: 'Kuya Ben', sub: 'On-Site', price: '₱450', icon: 'labor' },
                ],
            },
            {
                id: 'courier_delivery' as const,
                pattern: 'delivery' as const,
                title: 'Homeowner Parts + Courier Runner',
                extraFee: 35,
                rating: '4.8',
                bookedCount: '31 booked in Tagudin',
                desc: 'Danny Express collects your pre-bought parts or tools and delivers them directly to the job site.',
                nodes: [
                    { role: 'Free Slot', title: 'Citizen Part', sub: 'Homeowner', price: 'Self', icon: 'store' },
                    { role: 'Rider', title: 'Danny Exp.', sub: 'Route', price: '₱35', icon: 'courier' },
                    { role: 'Labor', title: 'Kuya Ben', sub: 'On-Site', price: '₱450', icon: 'labor' },
                ],
            },
            {
                id: 'safety_audit' as const,
                pattern: 'repair' as const,
                title: 'Labor + Post-Service Safety Inspection',
                extraFee: 65,
                rating: '4.9',
                bookedCount: '19 booked in Tagudin',
                desc: 'Master electrician electrical load safety certification and barangay safety compliance audit.',
                nodes: [
                    { role: 'Labor', title: 'Kuya Ben', sub: 'Execution', price: '₱450', icon: 'labor' },
                    { role: 'Audit', title: 'Safety Check', sub: 'Inspection', price: '₱65', icon: 'audit' },
                ],
            },
        ];
    }, []);

    const filteredCombinations = useMemo(() => {
        return combinations.filter((combo) => {
            if (activePattern !== 'all' && combo.pattern !== activePattern && activePattern !== 'multi') {
                return false;
            }
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    combo.title.toLowerCase().includes(q) ||
                    combo.desc.toLowerCase().includes(q) ||
                    combo.nodes.some((n) => n.title.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [combinations, activePattern, search]);

    if (!open || !item) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]"
            onClick={onClose}
        >
            {/* Modal Box */}
            <div
                className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-[#EBF2FA] text-[#0F2F58] font-bold">
                                🔗
                            </span>
                            <h2 className="text-base font-extrabold text-[#0F2F58]">
                                Bundle &amp; Chain Services
                            </h2>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Verified fulfillment and partner combinations for <strong className="text-slate-800">{item.title}</strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        aria-label="Close"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Search & Pattern Chips Bar */}
                <div className="border-b border-slate-100 bg-white px-5 py-3 space-y-2.5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search services, parts, or chain types..."
                            className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pr-4 pl-9 text-xs text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Pattern Chips */}
                    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                        <button
                            type="button"
                            onClick={() => setActivePattern('all')}
                            className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                activePattern === 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            All Patterns
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePattern('repair')}
                            className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                activePattern === 'repair'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Parts → Repair
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePattern('delivery')}
                            className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                activePattern === 'delivery'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Buy → Deliver
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePattern('multi')}
                            className={`rounded-full px-3 py-1 text-[10.5px] font-bold cursor-pointer transition-colors ${
                                activePattern === 'multi'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Multi-Stop
                        </button>
                    </div>
                </div>

                {/* Scrollable Combinations List */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-slate-50/50">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Suggested Combinations for this Service
                    </div>

                    {filteredCombinations.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-500">
                            No combinations match &ldquo;{search}&rdquo;. Try another search.
                        </div>
                    ) : (
                        filteredCombinations.map((combo) => (
                            <article
                                key={combo.id}
                                onClick={() => {
                                    onSelectRecipe(item.id, combo.id);
                                    onClose();
                                }}
                                className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-[#0F2F58] hover:shadow-md transition-all cursor-pointer group"
                            >
                                {/* Top Row */}
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#0F2F58] transition-colors">
                                        {combo.title}
                                    </h3>
                                    <button
                                        type="button"
                                        className="rounded-full bg-[#EBF2FA] px-3 py-1 text-xs font-extrabold text-[#0F2F58] group-hover:bg-[#0F2F58] group-hover:text-white transition-colors cursor-pointer shrink-0"
                                    >
                                        + ₱{combo.extraFee.toFixed(2)}
                                    </button>
                                </div>

                                {/* Community Trust Badge */}
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                                    <Star className="size-3 fill-emerald-600 text-emerald-600" />
                                    <span>{combo.rating}</span>
                                    <span>·</span>
                                    <span>{combo.bookedCount}</span>
                                </div>

                                {/* Visual n8n Node Chain Preview */}
                                <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-[#F8FAFC] p-2.5 [scrollbar-width:none]">
                                    {combo.nodes.map((node, nIdx) => (
                                        <div key={nIdx} className="flex items-center gap-1.5 shrink-0">
                                            {/* Node Card */}
                                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                                                <div className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-[#0F2F58]">
                                                    {node.icon === 'store' && <Package className="size-3.5" />}
                                                    {node.icon === 'courier' && <Truck className="size-3.5" />}
                                                    {node.icon === 'labor' && <Wrench className="size-3.5" />}
                                                    {node.icon === 'audit' && <FileCheck className="size-3.5" />}
                                                </div>
                                                <div>
                                                    <span className="text-[8.5px] font-extrabold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-xs uppercase">
                                                        {node.role}
                                                    </span>
                                                    <div className="text-[10.5px] font-extrabold text-slate-800">
                                                        {node.title}
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-mono">
                                                        {node.sub} · {node.price}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Connecting Wire SVG Arrow */}
                                            {nIdx < combo.nodes.length - 1 && (
                                                <div className="flex items-center text-slate-300 px-0.5">
                                                    <ArrowRight className="size-3.5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Descriptive Subtext */}
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    {combo.desc}
                                </p>
                            </article>
                        ))
                    )}
                </div>

                {/* Footer Assurance */}
                <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-[#0F2F58]" />
                        <span><strong>Non-Cascading Settlement:</strong> Each partner is held in an isolated escrow line.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

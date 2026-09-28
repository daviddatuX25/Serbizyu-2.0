import React, { useMemo, useState } from 'react';
import { Search, Sliders, Sparkles, Star, Truck, Wrench, ShieldCheck, Store } from 'lucide-react';
import type { DealChainTemplate } from './types';

export interface DealChainCatalogModalProps {
    open: boolean;
    onClose: () => void;
    categoryCode: string;
    recommended: DealChainTemplate[];
    otherRecipes: DealChainTemplate[];
    onSelectRecipe: (recipe: DealChainTemplate) => void;
    onBuildCustom: () => void;
}

const PATTERN_FILTERS = [
    { key: 'all', label: 'All Deal Chains' },
    { key: 'repair', label: 'Parts + Transit + Labor' },
    { key: 'delivery', label: 'Courier Transit' },
    { key: 'audit', label: 'Safety & Quality Audit' },
] as const;

export default function DealChainCatalogModal({
    open,
    onClose,
    categoryCode,
    recommended,
    otherRecipes,
    onSelectRecipe,
    onBuildCustom,
}: DealChainCatalogModalProps) {
    const [search, setSearch] = useState('');
    const [patternFilter, setPatternFilter] = useState<string>('all');
    const [tab, setTab] = useState<'recommended' | 'all'>(
        recommended.length > 0 ? 'recommended' : 'all',
    );

    const allRecipes = useMemo(() => {
        const map = new Map<string, DealChainTemplate>();
        for (const r of [...recommended, ...otherRecipes]) {
            if (!map.has(r.recipeId)) {
                map.set(r.recipeId, r);
            }
        }
        return Array.from(map.values());
    }, [recommended, otherRecipes]);

    const sourceList = tab === 'recommended' && recommended.length > 0 ? recommended : allRecipes;

    const filteredRecipes = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sourceList.filter((r) => {
            if (patternFilter !== 'all' && r.pattern !== patternFilter) {
                return false;
            }
            if (!q) return true;
            return (
                r.title.toLowerCase().includes(q) ||
                r.desc.toLowerCase().includes(q) ||
                r.patternCapsule.some((c) => c.toLowerCase().includes(q))
            );
        });
    }, [sourceList, patternFilter, search]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deal-chain-catalog-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 px-5 pt-5 pb-3.5">
                    <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-emerald-700 uppercase">
                            <Sparkles className="size-3.5" />
                            <span>Deal Chain Catalog Sets</span>
                        </div>
                        <h2
                            id="deal-chain-catalog-title"
                            className="mt-0.5 text-base font-extrabold text-[#0F2F58]"
                        >
                            Select or Build a Partner Deal Chain
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Pick a category-matched multi-party recipe or customize partner listing
                            nodes in Deal Chain Studio.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Deal Chain Catalog"
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                        ✕
                    </button>
                </div>

                {/* Search + Tabs */}
                <div className="space-y-2.5 border-b border-slate-100 bg-[#FAFCFB] px-5 py-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search Deal Chain sets by part, courier, audit, or trade..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3.5 pl-9 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setTab('recommended')}
                                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                                    tab === 'recommended'
                                        ? 'bg-[#0F2F58] text-white'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                Suggested for {categoryCode} ({recommended.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('all')}
                                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                                    tab === 'all'
                                        ? 'bg-[#0F2F58] text-white'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                Browse All Compatible ({allRecipes.length})
                            </button>
                        </div>

                        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
                            {PATTERN_FILTERS.map((pf) => (
                                <button
                                    key={pf.key}
                                    type="button"
                                    onClick={() => setPatternFilter(pf.key)}
                                    className={`cursor-pointer rounded-lg px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                                        patternFilter === pf.key
                                            ? 'bg-emerald-100 text-emerald-900'
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {pf.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recipe Cards List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
                    {tab === 'recommended' && recommended.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
                            <div className="font-extrabold">
                                No category-specific Deal Chain sets for {categoryCode} yet.
                            </div>
                            <p className="mt-0.5 text-[11px] text-amber-900/80">
                                Browse all compatible Deal Chain sets below or build a custom
                                multi-party chain in Deal Chain Studio.
                            </p>
                        </div>
                    )}

                    {filteredRecipes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                            No Deal Chain sets match your search filter.
                        </div>
                    ) : (
                        filteredRecipes.map((recipe) => {
                            const isSuggested = recommended.some(
                                (r) => r.recipeId === recipe.recipeId,
                            );
                            return (
                                <button
                                    key={recipe.recipeId}
                                    type="button"
                                    onClick={() => {
                                        onSelectRecipe(recipe);
                                        onClose();
                                    }}
                                    className="flex w-full cursor-pointer flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#0F2F58] hover:bg-[#F0F5FA]/40 shadow-2xs"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    {recipe.title}
                                                </span>
                                                <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white uppercase">
                                                    v{recipe.catalogVersion || 1}
                                                </span>
                                                {isSuggested && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800 uppercase">
                                                        Suggested
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                                {recipe.desc}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className="font-mono text-xs font-extrabold text-emerald-700">
                                                +₱{recipe.extraFee}
                                            </div>
                                            <div className="flex items-center justify-end gap-0.5 text-[10px] font-bold text-amber-700">
                                                <Star className="size-2.5 fill-amber-400 text-amber-500" />
                                                <span>{recipe.rating}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Node Capsule */}
                                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-[#F8FAFC] px-3 py-2">
                                        {recipe.nodes.map((node, idx) => (
                                            <React.Fragment key={`${node.key}-${idx}`}>
                                                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold text-[#0F2F58]">
                                                    {node.type === 'store' ? (
                                                        <Store className="size-3 text-amber-600" />
                                                    ) : node.type === 'delivery' ? (
                                                        <Truck className="size-3 text-sky-600" />
                                                    ) : node.type === 'audit' ? (
                                                        <ShieldCheck className="size-3 text-amber-700" />
                                                    ) : (
                                                        <Wrench className="size-3 text-emerald-600" />
                                                    )}
                                                    <span>{node.role}:</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {node.title}
                                                    </span>
                                                </span>
                                                {idx < recipe.nodes.length - 1 && (
                                                    <span className="text-xs font-bold text-emerald-600">
                                                        →
                                                    </span>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer: Build Custom Deal Chain in Studio */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[#FAFCFB] px-5 py-3.5">
                    <div className="text-[11px] text-slate-500">
                        Need a custom partner sequence or open role slots?
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onBuildCustom();
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74]"
                    >
                        <Sliders className="size-3.5 text-[#FFC72C]" />
                        <span>Build Custom Deal Chain in Studio ↗</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

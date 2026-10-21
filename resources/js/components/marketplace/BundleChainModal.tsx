import { useState, useMemo } from 'react';
import {
    Search,
    Star,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import { getRecipesForCategory } from '@/marketplace/dealChainRecipes';
import type { DealChainRecipeDefinition } from '@/marketplace/dealChainRecipes';
import type { BasketItem, PublishedDealChainRecipeId } from '@/marketplace/types';

interface BundleChainModalProps {
    open: boolean;
    onClose: () => void;
    item: BasketItem | null;
    recipes?: DealChainRecipeDefinition[];
    onSelectRecipe: (itemId: string, recipeId: PublishedDealChainRecipeId) => void;
}

export function BundleChainModal({
    open,
    onClose,
    item,
    recipes,
    onSelectRecipe,
}: BundleChainModalProps) {
    const [search, setSearch] = useState('');
    const [activePatternCapsule, setActivePatternCapsule] = useState<string>('all');

    // Scope the catalog to the listing category, type, and work shape.
    const categoryRecipes = useMemo(() => {
        if (!item?.category_code) return [];
        return getRecipesForCategory(
            item.category_code,
            item.listing_type,
            item.work_shape,
            recipes,
        );
    }, [item, recipes]);

    // Compact selectors are role-bearing node wires, not free-form pattern labels.
    const patternCapsules = useMemo(() => {
        const capsules = new Set<string>();
        categoryRecipes.forEach((recipe) => {
            capsules.add(recipe.patternCapsule.join(' → '));
        });

        return Array.from(capsules);
    }, [categoryRecipes]);

    const filteredCombinations = useMemo(() => {
        return categoryRecipes.filter((combo) => {
            if (
                activePatternCapsule !== 'all' &&
                combo.patternCapsule.join(' → ') !== activePatternCapsule
            ) {
                return false;
            }
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    combo.title.toLowerCase().includes(q) ||
                    combo.desc.toLowerCase().includes(q) ||
                    combo.nodes.some(
                        (n) => n.title.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q),
                    )
                );
            }
            return true;
        });
    }, [categoryRecipes, activePatternCapsule, search]);

    if (!open || !item) return null;

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title="Bundle & Chain Services"
            subtitle={`Verified fulfillment and partner combinations for ${item.title}`}
            headerSlot={
                <div className="mt-2 space-y-2.5">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search services, parts, or chain types..."
                            className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pr-4 pl-9 text-xs text-slate-900 transition-colors outline-none focus:border-[#0F2F58] focus:bg-white"
                        />
                    </div>

                    {/* Compact Node-Wire Pattern Selectors (Replaces Raw Text Chips) */}
                    <div className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto py-0.5">
                        <button
                            type="button"
                            aria-pressed={activePatternCapsule === 'all'}
                            onClick={() => setActivePatternCapsule('all')}
                            className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-[10.5px] font-bold transition-colors ${
                                activePatternCapsule === 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            All Pipelines
                        </button>

                        {patternCapsules.map((capsuleStr) => {
                            const isSelected = activePatternCapsule === capsuleStr;
                            const roles = capsuleStr.split(' → ');

                            return (
                                <button
                                    key={capsuleStr}
                                    type="button"
                                    aria-label={`Filter by pipeline ${capsuleStr}`}
                                    aria-pressed={isSelected}
                                    onClick={() => setActivePatternCapsule(capsuleStr)}
                                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold transition-all ${
                                        isSelected
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {roles.map((role, rIdx) => (
                                        <span key={rIdx} className="inline-flex items-center gap-1">
                                            <span
                                                className={`py-0.2 rounded px-1.5 font-mono text-[8.5px] uppercase ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : role === 'STORE' || role === 'PART'
                                                          ? 'bg-amber-100 text-amber-900'
                                                          : role === 'COURIER' || role === 'RIDER'
                                                            ? 'bg-sky-100 text-sky-900'
                                                            : role === 'LABOR'
                                                              ? 'bg-emerald-100 text-emerald-900'
                                                              : 'bg-purple-100 text-purple-900'
                                                }`}
                                            >
                                                {role}
                                            </span>
                                            {rIdx < roles.length - 1 && (
                                                <span
                                                    className={
                                                        isSelected
                                                            ? 'text-white/60'
                                                            : 'text-slate-400'
                                                    }
                                                >
                                                    →
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </button>
                            );
                        })}
                    </div>
                </div>
            }
            bottomSlot={
                <div className="flex w-full items-center justify-between pt-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-[#0F2F58]" />
                        <span>
                            <strong>Independent node terms:</strong> Provider agreements and
                            payments are confirmed later.
                        </span>
                    </div>
                </div>
            }
        >
            <div className="space-y-3.5 py-2">
                <div className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                    Suggested Combinations for this Offering
                </div>

                {filteredCombinations.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                        {item.category_code
                            ? `No combinations match "${search}". Try another search.`
                            : 'This staged item has no verified category context. Refresh it before attaching a partner pipeline.'}
                    </div>
                ) : (
                    filteredCombinations.map((combo) => (
                        <article
                            key={combo.recipeId}
                            onClick={() => {
                                onSelectRecipe(item.id, combo.recipeId);
                                onClose();
                            }}
                            className="group flex cursor-pointer flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-[#0F2F58] hover:shadow-md"
                        >
                            {/* Top Row */}
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-extrabold text-slate-900 transition-colors group-hover:text-[#0F2F58] sm:text-sm">
                                    {combo.title}
                                </h3>
                                <button
                                    type="button"
                                    className="shrink-0 cursor-pointer rounded-full bg-[#EBF2FA] px-3 py-1 text-xs font-extrabold text-[#0F2F58] transition-colors group-hover:bg-[#0F2F58] group-hover:text-white"
                                >
                                    + ₱{combo.extraFee.toFixed(2)}
                                </button>
                            </div>

                            {/* Community Trust Badge */}
                            <div className="flex w-fit items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                <Star className="size-3 fill-emerald-600 text-emerald-600" />
                                <span>{combo.rating}</span>
                                <span>·</span>
                                <span>{combo.bookedCount}</span>
                            </div>

                            {/* Compact node-wire preview */}
                            <div className="flex [scrollbar-width:none] items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-[#F8FAFC] p-2.5">
                                {combo.nodes.map((node, nIdx) => (
                                    <div key={nIdx} className="flex shrink-0 items-center gap-1.5">
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                                            <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-2xs">
                                                <img
                                                    src={
                                                        node.image ||
                                                        (node.type === 'store'
                                                            ? '/photos/ac-capacitor.jpg'
                                                            : node.type === 'delivery'
                                                              ? '/photos/courier.jpg'
                                                              : node.type === 'audit'
                                                                ? '/photos/req-electrician.jpg'
                                                                : '/photos/ac-clean.jpg')
                                                    }
                                                    alt={node.title}
                                                    className="size-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '/photos/ac-clean.jpg';
                                                    }}
                                                />
                                                <span className="absolute bottom-0 inset-x-0 bg-[#0F2F58]/80 text-[6.5px] font-extrabold text-white text-center uppercase py-0.2">
                                                    {node.role}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-[10.5px] font-extrabold text-slate-800">
                                                    {node.title}
                                                </div>
                                                <div className="text-[9px] text-slate-500">
                                                    {node.providerName || node.sub}
                                                </div>
                                            </div>
                                        </div>

                                        {nIdx < combo.nodes.length - 1 && (
                                            <div className="flex items-center px-0.5 text-slate-300">
                                                <ArrowRight className="size-3.5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] leading-relaxed text-slate-500">
                                {combo.desc}
                            </p>
                        </article>
                    ))
                )}
            </div>
        </GlovoWaveModal>
    );
}
